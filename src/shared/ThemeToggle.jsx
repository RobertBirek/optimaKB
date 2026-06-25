import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

const MODES = [
  { key: 'light', icon: Sun, label: 'Jasny' },
  { key: 'dark', icon: Moon, label: 'Ciemny' },
  { key: 'system', icon: Monitor, label: 'Systemowy' },
];

export default function ThemeToggle() {
  const [mode, setMode] = useState(() => localStorage.getItem('theme-preference') || 'system');

  useEffect(() => {
    if (mode === 'system') {
      document.documentElement.removeAttribute('data-theme');
      localStorage.removeItem('theme-preference');
    } else {
      document.documentElement.setAttribute('data-theme', mode);
      localStorage.setItem('theme-preference', mode);
    }
  }, [mode]);

  function cycle() {
    const idx = MODES.findIndex((m) => m.key === mode);
    setMode(MODES[(idx + 1) % MODES.length].key);
  }

  const current = MODES.find((m) => m.key === mode);
  const Icon = current.icon;

  return (
    <button type="button" className="themeToggle" onClick={cycle} aria-label={`Motyw: ${current.label}`} title={`Motyw: ${current.label}`}>
      <Icon className="buttonIcon" aria-hidden="true" />
    </button>
  );
}
