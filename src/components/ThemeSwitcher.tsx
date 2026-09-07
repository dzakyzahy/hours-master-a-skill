import { Sun, Moon } from '@phosphor-icons/react';
import { useStore } from '../store';

interface ThemeSwitcherProps {
  compact?: boolean;
  className?: string;
}

export function ThemeSwitcher({ compact = false, className = '' }: ThemeSwitcherProps) {
  const { theme, setTheme } = useStore();

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
        <Sun size={15} weight={theme === 'light' ? 'bold' : 'regular'} />
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
        <Moon size={15} weight={theme === 'dark' ? 'bold' : 'regular'} />
        {!compact && <span className="theme-switcher-text">Gelap</span>}
      </button>
    </div>
  );
}
