import { useLocalStorage } from './useLocalStorage';
import { useEffect } from 'react';

/**
 * Custom hook for managing theme (dark/light mode)
 * Persists theme preference to localStorage
 * Automatically applies theme to document body
 * 
 * @returns {Object} Object with darkMode state and toggleTheme function
 */
export const useTheme = () => {
  const [darkMode, setDarkMode] = useLocalStorage('theme_mode', true);
  
  useEffect(() => {
    const isDark = darkMode === true || darkMode === 'dark';
    if (isDark) {
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
    }
  }, [darkMode]);
  
  const toggleTheme = () => {
    setDarkMode(prev => !prev);
  };
  
  return { darkMode, toggleTheme };
};