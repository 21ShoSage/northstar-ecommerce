import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const KEY = 'northstar_theme';

function readTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* storage unavailable */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#0e1116' : '#f4f4f1');
}

export function ThemeToggle() {
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => { applyTheme(theme); }, [theme]);

  const next = theme === 'dark' ? 'light' : 'dark';
  const toggle = () => {
    const root = document.documentElement;
    root.classList.add('theme-fade');
    window.setTimeout(() => root.classList.remove('theme-fade'), 400);
    try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
    setTheme(next);
  };

  return (
    <button type="button" className="icon-button theme-toggle" onClick={toggle}
      aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
