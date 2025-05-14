import { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard() {
  const [data, setData] = useState({ temperature: 0, humidity: 0, light: 0 });
  const [deviceId, setDeviceId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDeviceId = async () => {
      try {
        // Получаем device_id для текущего пользователя
        const response = await axios.get('http://213.171.15.35/user/device', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setDeviceId(response.data.device_id);
      } catch (err) {
        setError('Не удалось получить данные устройства');
        console.error('Error fetching device ID:', err);
      }
    };

    fetchDeviceId();
  }, []);

  useEffect(() => {
    if (!deviceId) return;

    const fetchData = async () => {
      try {
        const [tempRes, humRes, lightRes] = await Promise.all([
          axios.get(`http://213.171.15.35:3000/temperature?device_id=${deviceId}`),
          axios.get(`http://213.171.15.35:3000/humidity?device_id=${deviceId}`),
          axios.get(`http://213.171.15.35:3000/lightlevel?device_id=${deviceId}`),
        ]);
        setData({
          temperature: tempRes.data.temperature,
          humidity: humRes.data.humidity,
          light: lightRes.data.light,
        });
      } catch (err) {
        console.error('Error fetching sensor data:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [deviceId]);

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        {error}
      </div>
    );
  }

  if (!deviceId) {
    return (
      <div className="p-6 text-center">
        Загрузка данных устройства...
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-4xl text-black text-center mb-6">
        Показатели вашего устройства ({deviceId})
      </h1>
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="dark-green p-4 rounded-lg text-white text-center">
          <p>Температура</p>
          <p>{data.temperature} °C</p>
        </div>
        <div className="dark-green p-4 rounded-lg text-white text-center">
          <p>Свет</p>
          <p>{data.light} lux</p>
        </div>
        <div className="dark-green p-4 rounded-lg text-white text-center">
          <p>Влажность</p>
          <p>{data.humidity} %</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;