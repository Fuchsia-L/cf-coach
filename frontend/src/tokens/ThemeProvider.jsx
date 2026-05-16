import { createContext, useContext, useState, useEffect } from 'react';
import { THEMES, DENSITIES } from './themes';

const ThemeContext = createContext(null);

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('editorial-rose');
  const [density, setDensity] = useState('cozy');

  useEffect(() => {
    const el = document.documentElement;
    const tokens = { ...THEMES[theme], ...DENSITIES[density] };
    for (const [prop, value] of Object.entries(tokens)) {
      el.style.setProperty(prop, value);
    }
  }, [theme, density]);

  return (
    <ThemeContext.Provider value={{ theme, density, setTheme, setDensity }}>
      {children}
    </ThemeContext.Provider>
  );
}
