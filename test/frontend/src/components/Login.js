import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login({ setToken }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://213.171.15.35:3000/login', {
        login,
        password,
      });
      setToken(response.data.token);
      setError('');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen dark-green text-white">
      <div className="text-center bg-white rounded-xl p-8 shadow-lg max-w-sm w-full text-black">
        <p className="yellow-text mb-6 text-sm">
          Данные для аккаунта присылаются вместе с устройством
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="text-left">
            <label className="block yellow-text mb-1 font-medium">Логин</label>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="login-input"
              required
            />
          </div>
          <div className="text-left">
            <label className="block yellow-text mb-1 font-medium">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              required
            />
          </div>
          <button type="submit" className="login-button">
            Войти
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
