import { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

export const useFirebaseInit = () => {
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);
  const user = useSelector((state: RootState) => state.auth.user);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      setAuthChecked(true);
      setIsFirebaseLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // We're still loading if either Firebase is initializing or we have a Firebase user but Redux isn't updated yet
  const isLoading = isFirebaseLoading || (auth.currentUser && !user) || !authChecked;

  return { isLoading, isAuthenticated: !!user };
}; 