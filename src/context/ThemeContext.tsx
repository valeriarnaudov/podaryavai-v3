import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    // Attempt to load from DB first to persist across devices 
    const fetchUserTheme = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('users').select('app_theme').eq('id', user.id).single();
        if (data?.app_theme) {
          setThemeState(data.app_theme as Theme);
          return;
        }
      }
      
      // Fallback to local storage if not logged in or no DB pref
      const stored = localStorage.getItem('app-theme') as Theme;
      if (stored) {
        setThemeState(stored);
      }
    };

    fetchUserTheme();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    const { data: { user } } = await supabase.auth.getUser();
    if(user) {
        await supabase.from('users').update({ app_theme: newTheme }).eq('id', user.id);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
