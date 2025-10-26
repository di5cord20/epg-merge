// removed "useEffect" - import { useState, useEffect } from 'react';
import { useState } from 'react';

/**
 * Custom hook for managing state with localStorage persistence
 * Automatically syncs state with browser localStorage
 * 
 * @param {string} key - localStorage key
 * @param {*} initialValue - Initial value if not in localStorage
 * @returns {Array} [storedValue, setValue] - Similar to useState
 */
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (err) {
      console.error(`Error reading localStorage[${key}]:`, err);
      return initialValue;
    }
  });
  
  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (err) {
      console.error(`Error writing to localStorage[${key}]:`, err);
    }
  };
  
  return [storedValue, setValue];
};