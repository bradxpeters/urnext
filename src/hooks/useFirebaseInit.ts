import { useState, useEffect } from 'react';
import { auth, initializeFirebase, createOrUpdateUser } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

export const useFirebaseInit = () => {
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);
  const user = useSelector((state: RootState) => state.auth.user);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const initialize = async () => {
      try {
        console.log('useFirebaseInit: Starting Firebase initialization');
        await initializeFirebase();
        console.log('useFirebaseInit: Firebase initialized successfully');
        
        console.log('useFirebaseInit: Setting up auth state listener');
        console.log('Current auth state:', {
          currentUser: auth.currentUser,
          reduxUser: user,
          isFirebaseLoading,
          authChecked
        });

        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          console.log('Auth state changed:', {
            firebaseUser,
            reduxUser: user,
            isFirebaseLoading
          });

          if (firebaseUser) {
            try {
              await createOrUpdateUser(firebaseUser);
            } catch (error) {
              console.error('Error updating user document:', error);
            }
          }

          setAuthChecked(true);
          setIsFirebaseLoading(false);
        });
      } catch (error: unknown) {
        console.error('useFirebaseInit: Initialization failed:', error);
        setIsFirebaseLoading(false);
        setAuthChecked(true);
      }
    };

    initialize();

    return () => {
      console.log('Cleaning up auth state listener');
      unsubscribe?.();
    };
  }, []);

  // We're still loading if either Firebase is initializing or we have a Firebase user but Redux isn't updated yet
  const isLoading = isFirebaseLoading || (auth.currentUser && !user) || !authChecked;
  console.log('useFirebaseInit: Final loading state:', {
    isFirebaseLoading,
    hasCurrentUser: !!auth.currentUser,
    hasReduxUser: !!user,
    authChecked,
    finalIsLoading: isLoading
  });

  return { isLoading, isAuthenticated: !!user };
}; 