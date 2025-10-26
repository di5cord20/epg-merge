import { useState, useCallback } from 'react';

/**
 * Custom hook for making API calls
 * Handles loading, error states, and HTTP communication
 * 
 * @returns {Object} Object with call function, loading state, and error state
 */
export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const call = useCallback(async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use environment variable for API base URL, fallback to localhost:9193 for local dev
      const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:9193';
      const url = `${apiBase}${endpoint}`;
      
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { call, loading, error };
};