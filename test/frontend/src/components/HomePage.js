import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div style={{
      padding: '40px',
      maxWidth: '800px',
      margin: '0 auto',
      textAlign: 'center',
      minHeight: 'calc(100vh - 150px)'
    }}>
      <h1 style={{ 
        color: '#1a4314', 
        fontSize: '2.5rem',
        marginBottom: '30px'
      }}>
        Аквапоника
      </h1>
      
      <p style={{ 
        fontSize: '1.2rem',
        lineHeight: '1.6',
        marginBottom: '40px',
        color: '#333'
      }}>
        Высокотехнологичный способ ведения сельского хозяйства,<br />
        сочетающий аквакультуру и гидропонику.<br />
        Мы предлагаем вам опробовать новый мир домашнего выращивания растений.
      </p>
      
      <button 
        onClick={() => navigate('/plants')} // Перенаправление на логин
        style={{
          backgroundColor: '#1a4314',
          color: '#f5d742',
          padding: '15px 30px',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.05)';
          e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = 'none';
        }}
      >
        Окунуться!
      </button>
    </div>
  );
}