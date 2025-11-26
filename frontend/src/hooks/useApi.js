import { useState, useCallback } from 'react';

/**
 * Custom hook for making API calls with retry logic
 * Handles loading, error states, HTTP communication, and automatic retries
 * 
 * @returns {Object} Object with call function, loading state, and error state
 */
export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const call = useCallback(async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);
    
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second
    const apiBase = process.env.REACT_APP_API_BASE || '';
    const url = `${apiBase}${endpoint}`;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
          ...options
        });
        
        if (!response.ok) {
          // Don't retry on 4xx errors (client errors)
          if (response.status >= 400 && response.status < 500) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          // Retry on 5xx errors (server errors)
          if (attempt < maxRetries - 1) {
            const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
            console.warn(
              `API call failed (attempt ${attempt + 1}/${maxRetries}). Retrying in ${delay}ms...`
            );
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setLoading(false);
        return data;
        
      } catch (err) {
        // Network errors or timeouts - retry
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.warn(
            `API call error: ${err.message} (attempt ${attempt + 1}/${maxRetries}). Retrying in ${delay}ms...`
          );
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        
        // Final attempt failed
        const errorMsg = `API Error: ${err.message} (after ${maxRetries} attempts)`;
        setError(errorMsg);
        setLoading(false);
        throw new Error(errorMsg);
      }
    }
  }, []);
  
  return { call, loading, error };
};