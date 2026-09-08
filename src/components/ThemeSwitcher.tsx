import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
import { useStore } from '../store';

interface ThemeSwitcherProps {
  compact?: boolean;
  iconOnly?: boolean;
  className?: string;
}

export function ThemeSwitcher({ compact = false, iconOnly = false, className = '' }: ThemeSwitcherProps) {
  const { theme, setTheme } = useStore();
  const isLight = theme === 'light';

  if (iconOnly) {
    return (
      <button
        type="button"
        className={`theme-switcher-toggle-btn ${className}`}
        onClick={() => setTheme(isLight ? 'dark' : 'light')}
        aria-label={isLight ? 'Ganti ke Mode Gelap' : 'Ganti ke Mode Terang'}
        title={isLight ? 'Ganti ke Mode Gelap' : 'Ganti ke Mode Terang'}
      >
        <FontAwesomeIcon 
          icon={isLight ? faMoon : faSun} 
          className="theme-switcher-toggle-icon" 
        />
      </button>
    );
  }

  return (
    <div 
      className={`theme-switcher-segmented ${className}`}
      role="radiogroup" 
      aria-label="Mode Tema Aplikasi"
    >
      <button
        type="button"
        role="radio"
        aria-checked={isLight}
        className={`theme-switcher-option ${isLight ? 'active' : ''}`}
        onClick={() => setTheme('light')}
        title="Mode Terang"
        aria-label="Pilih Mode Terang"
      >
        <FontAwesomeIcon icon={faSun} style={{ fontSize: '13px' }} />
        {!compact && <span className="theme-switcher-text">Terang</span>}
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={!isLight}
        className={`theme-switcher-option ${!isLight ? 'active' : ''}`}
        onClick={() => setTheme('dark')}
        title="Mode Gelap"
        aria-label="Pilih Mode Gelap"
      >
        <FontAwesomeIcon icon={faMoon} style={{ fontSize: '13px' }} />
        {!compact && <span className="theme-switcher-text">Gelap</span>}
      </button>
    </div>
  );
}

