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
      const response = await fetch(
        `${window.location.origin}${endpoint}`,
        {
          headers: { 'Content-Type': 'application/json' },
          ...options
        }
      );
      
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