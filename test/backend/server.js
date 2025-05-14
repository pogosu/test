const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const mqtt = require('mqtt');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// Конфигурация
const JWT_SECRET = 'your_jwt_secret_key'; // Замените на свой секретный ключ
const DEVICES = [
  {
    device_id: 'dev1',
    login: 'device1',
    password: '123',
  },
  {
    device_id: 'dev2',
    login: 'device2',
    password: '456',
  },
];

// SQLite подключение
const db = new sqlite3.Database('aquaponics.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error(`SQLite error: ${err.message}`);
    process.exit(1);
  }
});

// Настройка SQLite: таймаут и режим WAL
db.run('PRAGMA busy_timeout = 5000'); // Таймаут 5 секунд
db.run('PRAGMA journal_mode = WAL'); // Включение Write-Ahead Logging

// Инициализация таблиц
db.serialize(async () => {
  db.run(`
    CREATE TABLE IF NOT EXISTS devices (
      device_id TEXT PRIMARY KEY,
      login TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS temperature (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      value REAL NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (device_id) REFERENCES devices(device_id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS humidity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      value REAL NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (device_id) REFERENCES devices(device_id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS light (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      value REAL NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (device_id) REFERENCES devices(device_id)
    )
  `);

  // Вставка устройств в базу
  for (const device of DEVICES) {
    try {
      const passwordHash = await bcrypt.hash(device.password, 10);
      db.run(
        'INSERT OR IGNORE INTO devices (device_id, login, password_hash) VALUES (?, ?, ?)',
        [device.device_id, device.login, passwordHash],
        (err) => {
          if (err) console.error(`SQLite insert device error: ${err.message}`);
        }
      );
    } catch (err) {
      console.error(`Bcrypt error for device ${device.device_id}: ${err.message}`);
    }
  }
});

// Очередь для операций вставки
const insertQueue = [];
let isProcessingQueue = false;

async function processInsertQueue() {
  if (isProcessingQueue || insertQueue.length === 0) return;
  isProcessingQueue = true;

  const { table, deviceId, value, timestamp } = insertQueue.shift();
  db.run(
    `INSERT INTO ${table} (device_id, value, timestamp) VALUES (?, ?, ?)`,
    [deviceId, value, timestamp],
    (err) => {
      if (err) console.error(`SQLite insert error (${table}): ${err.message}`);
      isProcessingQueue = false;
      processInsertQueue(); // Обрабатываем следующую операцию
    }
  );
}

// Форматирование локального времени для EEST в формате YYYY-MM-DD hh:mm:ss
function getLocalTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`; // Формат: 2025-05-14 22:39:37
}

// Middleware для проверки JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user; // Сохраняем device_id из токена
    next();
  });
}

// MQTT подключение
const mqttClient = mqtt.connect('mqtt://213.171.15.35:1883', {
  reconnectPeriod: 1000,
});
const latestData = new Map(); // Хранит последние значения: Map<device_id, {temperature, humidity, light}>

mqttClient.on('connect', () => {
  mqttClient.subscribe(['aquaponics/+/temperature', 'aquaponics/+/humidity', 'aquaponics/+/light'], (err) => {
    if (err) {
      console.error(`MQTT subscribe error: ${err.message}`);
    }
  });
});

mqttClient.on('message', (topic, message) => {
  const value = parseFloat(message.toString());
  if (isNaN(value)) {
    console.error(`Invalid value received on topic ${topic}: ${message.toString()}`);
    return;
  }

  const topicParts = topic.split('/');
  if (topicParts.length !== 3) {
    console.error(`Invalid topic format: ${topic}`);
    return;
  }
  const deviceId = topicParts[1];
  const sensorType = topicParts[2];

  // Проверяем, существует ли устройство
  db.get('SELECT 1 FROM devices WHERE device_id = ?', [deviceId], (err, row) => {
    if (err) {
      console.error(`SQLite select error (device): ${err.message}`);
      return;
    }
    if (!row) {
      console.error(`Unknown device_id: ${deviceId}`);
      return;
    }

    // Логируем полученные данные
    console.log(`Received ${sensorType} from device ${deviceId}: ${value}`);

    // Обновляем последние значения
    if (!latestData.has(deviceId)) {
      latestData.set(deviceId, { temperature: 0, humidity: 0, light: 0 });
    }
    const deviceData = latestData.get(deviceId);

    // Получаем локальное время EEST
    const timestamp = getLocalTimestamp();

    // Добавляем в очередь вставку
    if (sensorType === 'temperature') {
      deviceData.temperature = value;
      insertQueue.push({ table: 'temperature', deviceId, value, timestamp });
    } else if (sensorType === 'humidity') {
      deviceData.humidity = value;
      insertQueue.push({ table: 'humidity', deviceId, value, timestamp });
    } else if (sensorType === 'light') {
      deviceData.light = value;
      insertQueue.push({ table: 'light', deviceId, value, timestamp });
    }
    processInsertQueue();
  });
});

mqttClient.on('error', (err) => {
  console.error(`MQTT error: ${err.message}`);
});

// API для аутентификации
app.post('/login', async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ error: 'login and password are required' });
  }

  db.get('SELECT device_id, password_hash FROM devices WHERE login = ?', [login], async (err, row) => {
    if (err) {
      console.error(`SQLite select error (login): ${err.message}`);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(401).json({ error: 'Invalid login' });
    }

    try {
      const match = await bcrypt.compare(password, row.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      // Создаём JWT-токен
      const token = jwt.sign({ device_id: row.device_id }, JWT_SECRET, { expiresIn: '1h' });
      res.json({ token });
    } catch (err) {
      console.error(`Bcrypt error: ${err.message}`);
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// API для текущих данных (защищено JWT)
app.get('/temperature', authenticateToken, (req, res) => {
  const deviceId = req.query.device_id;
  if (!deviceId || deviceId !== req.user.device_id) {
    return res.status(403).json({ error: 'Unauthorized device access' });
  }
  if (!latestData.has(deviceId)) {
    return res.status(404).json({ error: 'Device not found' });
  }
  res.json({ temperature: latestData.get(deviceId).temperature });
});

app.get('/humidity', authenticateToken, (req, res) => {
  const deviceId = req.query.device_id;
  if (!deviceId || deviceId !== req.user.device_id) {
    return res.status(403).json({ error: 'Unauthorized device access' });
  }
  if (!latestData.has(deviceId)) {
    return res.status(404).json({ error: 'Device not found' });
  }
  res.json({ humidity: latestData.get(deviceId).humidity });
});

app.get('/lightlevel', authenticateToken, (req, res) => {
  const deviceId = req.query.device_id;
  if (!deviceId || deviceId !== req.user.device_id) {
    return res.status(403).json({ error: 'Unauthorized device access' });
  }
  if (!latestData.has(deviceId)) {
    return res.status(404).json({ error: 'Device not found' });
  }
  res.json({ light: latestData.get(deviceId).light });
});

// API для исторических данных (защищено JWT)
app.get('/data/temperature', authenticateToken, (req, res) => {
  const { device_id, start, end, limit, timezone } = req.query;
  if (!device_id || device_id !== req.user.device_id) {
    return res.status(403).json({ error: 'Unauthorized device access' });
  }
  const queryLimit = parseInt(limit) || 100;
  const startTime = start ? start : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  const endTime = end ? end : new Date().toISOString().slice(0, 19).replace('T', ' ');

  const format = timezone === 'utc' ? `strftime('%Y-%m-%d %H:%M:%S', datetime(timestamp, '-3 hours'))` : `timestamp`;
  db.all(
    `SELECT value, ${format} as timestamp 
     FROM temperature 
     WHERE device_id = ? AND timestamp BETWEEN ? AND ? 
     ORDER BY timestamp ASC LIMIT ?`,
    [device_id, startTime, endTime, queryLimit],
    (err, rows) => {
      if (err) {
        console.error(`SQLite select error (temperature): ${err.message}`);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

app.get('/data/humidity', authenticateToken, (req, res) => {
  const { device_id, start, end, limit, timezone } = req.query;
  if (!device_id || device_id !== req.user.device_id) {
    return res.status(403).json({ error: 'Unauthorized device access' });
  }
  const queryLimit = parseInt(limit) || 100;
  const startTime = start ? start : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  const endTime = end ? end : new Date().toISOString().slice(0, 19).replace('T', ' ');

  const format = timezone === 'utc' ? `strftime('%Y-%m-%d %H:%M:%S', datetime(timestamp, '-3 hours'))` : `timestamp`;
  db.all(
    `SELECT value, ${format} as timestamp 
     FROM humidity 
     WHERE device_id = ? AND timestamp BETWEEN ? AND ? 
     ORDER BY timestamp ASC LIMIT ?`,
    [device_id, startTime, endTime, queryLimit],
    (err, rows) => {
      if (err) {
        console.error(`SQLite select error (humidity): ${err.message}`);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

app.get('/data/light', authenticateToken, (req, res) => {
  const { device_id, start, end, limit, timezone } = req.query;
  if (!device_id || device_id !== req.user.device_id) {
    return res.status(403).json({ error: 'Unauthorized device access' });
  }
  const queryLimit = parseInt(limit) || 100;
  const startTime = start ? start : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  const endTime = end ? end : new Date().toISOString().slice(0, 19).replace('T', ' ');

  const format = timezone === 'utc' ? `strftime('%Y-%m-%d %H:%M:%S', datetime(timestamp, '-3 hours'))` : `timestamp`;
  db.all(
    `SELECT value, ${format} as timestamp 
     FROM light 
     WHERE device_id = ? AND timestamp BETWEEN ? AND ? 
     ORDER BY timestamp ASC LIMIT ?`,
    [device_id, startTime, endTime, queryLimit],
    (err, rows) => {
      if (err) {
        console.error(`SQLite select error (light): ${err.message}`);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// API для получения списка устройств (защищено JWT)
app.get('/devices', authenticateToken, (req, res) => {
  db.all('SELECT device_id FROM devices WHERE device_id = ?', [req.user.device_id], (err, rows) => {
    if (err) {
      console.error(`SQLite select error (devices): ${err.message}`);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ devices: rows.map(row => row.device_id) });
  });
});

// Добавьте этот endpoint перед другими API-роутами
app.get('/user/device', authenticateToken, (req, res) => {
  // device_id уже содержится в токене (req.user.device_id)
  res.json({ device_id: req.user.device_id });
});

// Запуск сервера
const server = app.listen(3000, '0.0.0.0', () => {
  console.log('Server running on http://0.0.0.0:3000');
});
// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Shutting down gracefully...');
  server.close(() => {
    db.close((err) => {
      if (err) console.error(`Error closing SQLite: ${err.message}`);
      mqttClient.end();
      console.log('Server stopped');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT. Shutting down gracefully...');
  server.close(() => {
    db.close((err) => {
      if (err) console.error(`Error closing SQLite: ${err.message}`);
      mqttClient.end();
      console.log('Server stopped');
      process.exit(0);
    });
  });
});