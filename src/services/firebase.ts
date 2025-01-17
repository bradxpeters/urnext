// Platform-agnostic Firebase configuration
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  Timestamp,
  DocumentReference,
  CollectionReference
} from 'firebase/firestore';
import { store } from '../store/store';
import { setUser } from '../store/slices/authSlice';
import { MediaItem } from '../store/slices/mediaSlice';
import { setActiveWatchlist, setWatchlistItems } from '../store/slices/watchlistSlice';

// Types
export interface DBWatchlist {
  id: string;
  name: string;
  users: string[];
  currentTvShow: MediaItem | null;
  currentMovie: MediaItem | null;
  lastTvShowAddedBy: string | null;
  lastMovieAddedBy: string | null;
  lastAddedBy: string | null;
  createdAt: Timestamp;
}

export interface DBPendingInvite {
  email: string;
  watchlistId: string;
  watchlistName: string;
  invitedBy: string;
  invitedByName: string;
  createdAt: Timestamp;
}

export interface DBWatchlistItem {
  watchlistId: string;
  id: string;
  title: string;
  posterPath: string;
  overview: string;
  type: 'movie' | 'tv';
  addedBy: string;
  addedAt: Timestamp;
  rating?: number;
  comment?: string;
  finishedAt?: Timestamp;
}

export interface DBUser {
  id: string;
  email: string;
  displayName: string;
  activeWatchlist: string | null;
  watchlistInvites: string[];
  isWatchlistCreator: boolean;
}

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

console.log('Firebase config:', {
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId
});

// Initialize Firebase
console.log('Starting Firebase initialization...');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Collection references
const watchlistsRef = collection(db, 'watchlists');
const watchlistItemsRef = collection(db, 'watchlistItems');
const usersRef = collection(db, 'users');
const pendingInvitesRef = collection(db, 'pendingInvites');

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Firebase Auth persistence
let isInitialized = false;

export const initializeFirebase = async () => {
  if (isInitialized) return;
  
  try {
    await setPersistence(auth, browserLocalPersistence);
    console.log('Auth persistence set to local');
    isInitialized = true;
    console.log('Firebase initialization completed successfully');
  } catch (error: unknown) {
    console.error('Error setting auth persistence:', error);
    throw error;
  }
};

// User management
export const createOrUpdateUser = async (user: FirebaseUser) => {
  await initializeFirebase();
  
  if (!user.uid) {
    console.error('Invalid user object:', user);
    throw new Error('Invalid user object: missing UID');
  }

  try {
    console.log('Starting user creation/update process for:', user.uid);
    const userRef = doc(usersRef, user.uid);
    
    console.log('Checking if user document exists...');
    const userDoc = await getDoc(userRef);
    console.log('User document check result:', {
      exists: userDoc.exists(),
      path: userDoc.ref.path
    });

    const firstName = user.displayName?.split(' ')[0] || '';
    console.log('Updating Redux store with user data:', {
      id: user.uid,
      hasEmail: !!user.email,
      displayName: firstName
    });
    
    // Update Redux store first
    store.dispatch(setUser({
      id: user.uid,
      email: user.email || '',
      displayName: firstName,
    }));

    if (!userDoc.exists()) {
      console.log('Creating new user document...');
      const userData: DBUser = {
        id: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        activeWatchlist: null,
        watchlistInvites: [],
        isWatchlistCreator: false,
      };
      
      await setDoc(userRef, userData);
      console.log('User document created successfully');
    } else {
      console.log('User document exists, no need to create');
    }

    return true;
  } catch (error: any) {
    console.error('Error in createOrUpdateUser:', error);
    throw error;
  }
};

// Auth functions
export const signInWithGoogle = async () => {
  await initializeFirebase();
  
  try {
    console.log('Starting Google sign-in process...');
    const result = await signInWithPopup(auth, googleProvider);
    console.log('Google sign-in successful');
    return result.user;
  } catch (error: any) {
    console.error('Sign-in error:', error);
    throw error;
  }
};

// Keep track of active listeners
const activeListeners: (() => void)[] = [];

export const registerListener = (unsubscribe: () => void) => {
  activeListeners.push(unsubscribe);
};

export const unregisterListener = (unsubscribe: () => void) => {
  const index = activeListeners.indexOf(unsubscribe);
  if (index > -1) {
    activeListeners.splice(index, 1);
  }
};

export const signOut = async () => {
  try {
    console.log('Starting sign out process...');
    
    // First sign out from Firebase
    await firebaseSignOut(auth);
    
    // Then clear Redux state
    store.dispatch(setUser(null));
    store.dispatch(setActiveWatchlist(null));
    store.dispatch(setWatchlistItems([]));
    
    console.log('Sign out successful');
  } catch (error: any) {
    console.error('Error signing out:', error);
    // Even if there's an error, we want to make sure the user is signed out
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.error('Error in final sign out attempt:', e);
    }
  }
};

export { app, auth, db, watchlistsRef, watchlistItemsRef, usersRef, pendingInvitesRef }; 