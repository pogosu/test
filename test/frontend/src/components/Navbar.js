import { useNavigate } from 'react-router-dom';

function Navbar({ token, setToken }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Очищаем токен и localStorage
    setToken(null);
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <nav style={{
      backgroundColor: '#1a4314',
      padding: '20px 40px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Левый блок */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
          <span style={{
            color: '#f5d742',
            fontSize: '24px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }} onClick={() => navigate('/')}>
            Fish & Greens
          </span>

          {/* Центральные кнопки */}
          <div style={{ display: 'flex', gap: '25px' }}>
            <NavButton onClick={() => navigate('/')}>Главная</NavButton>
            <NavButton onClick={() => token ? navigate('/plants') : navigate('/login')}>
              Наши растения
            </NavButton>
            {token && <NavButton onClick={() => navigate('/dashboard')}>Мое устройство</NavButton>}
          </div>
        </div>

        {/* Правая кнопка (Вход/Выход) */}
        {token ? (
          <NavButton onClick={handleLogout}>Выход</NavButton>
        ) : (
          <NavButton onClick={() => navigate('/login')}>Вход</NavButton>
        )}
      </div>
    </nav>
  );
}

function NavButton({ children, onClick, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        color: '#f5d742',
        fontSize: '16px',
        fontWeight: '600',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '8px 12px',
        borderRadius: '6px',
        transition: 'all 0.3s ease',
        ...style
      }}
      onMouseEnter={(e) => {
        e.target.style.backgroundColor = 'rgba(245, 215, 66, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.target.style.backgroundColor = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

export default Navbar;
