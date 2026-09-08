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

  if (iconOnly) {
    return (
      <button
        type="button"
        className={`btn-icon ${className}`}
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        aria-label={theme === 'light' ? 'Ganti ke Mode Gelap' : 'Ganti ke Mode Terang'}
        title={theme === 'light' ? 'Ganti ke Mode Gelap' : 'Ganti ke Mode Terang'}
        style={{ width: '36px', height: '36px', borderRadius: '50%' }}
      >
        <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} style={{ fontSize: '13px' }} />
      </button>
    );
  }

  return (
    <div 
      className={`theme-switcher-segmented ${className}`}
      role="radiogroup" 
      aria-label="Mode Tema Aplikasi"
      title="Pilih tema aplikasi"
    >
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'light'}
        className={`theme-switcher-option ${theme === 'light' ? 'active' : ''}`}
        onClick={() => setTheme('light')}
        title="Mode Terang (Light Mode)"
      >
        <FontAwesomeIcon icon={faSun} className="text-[14px]" />
        {!compact && <span className="theme-switcher-text">Terang</span>}
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={theme === 'dark'}
        className={`theme-switcher-option ${theme === 'dark' ? 'active' : ''}`}
        onClick={() => setTheme('dark')}
        title="Mode Gelap (Dark Mode)"
      >
        <FontAwesomeIcon icon={faMoon} className="text-[14px]" />
        {!compact && <span className="theme-switcher-text">Gelap</span>}
      </button>
    </div>
  );
}
