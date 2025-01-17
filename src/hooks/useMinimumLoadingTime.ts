import { useState, useEffect } from 'react';

export const useMinimumLoadingTime = (isLoading: boolean, minimumLoadingTimeMs: number = 2000) => {
  const [shouldShowLoader, setShouldShowLoader] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setShouldShowLoader(true);
    } else {
      // When isLoading becomes false, wait for the minimum time before hiding the loader
      const timer = setTimeout(() => {
        setShouldShowLoader(false);
      }, minimumLoadingTimeMs);

      return () => clearTimeout(timer);
    }
  }, [isLoading, minimumLoadingTimeMs]);

  return shouldShowLoader;
}; 