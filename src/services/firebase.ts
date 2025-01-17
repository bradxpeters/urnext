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

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase with error handling
let app: ReturnType<typeof initializeApp>;
let db: ReturnType<typeof getFirestore>;
let auth: ReturnType<typeof getAuth>;

// Collection references
let watchlistsRef: CollectionReference;
let watchlistItemsRef: CollectionReference;
let usersRef: CollectionReference;
let pendingInvitesRef: CollectionReference;

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

// Collection references with enhanced error handling
const createCollectionRef = (path: string) => {
  if (!db) {
    console.error('Firestore not initialized');
    throw new Error('Firestore not initialized');
  }
  
  try {
    console.log(`Creating collection reference for: ${path}`);
    const collRef = collection(db, path);
    console.log(`Collection reference created for: ${path}`);
    return collRef;
  } catch (error) {
    console.error(`Error creating collection reference for ${path}:`, error);
    throw error;
  }
};

// User management
export const createOrUpdateUser = async (user: FirebaseUser) => {
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

    const firstName = user.displayName?.split(' ')[0] || '';
    console.log('Updating Redux store with user data:', {
      id: user.uid,
      hasEmail: !!user.email,
      displayName: firstName
    });
    
    store.dispatch(setUser({
      id: user.uid,
      email: user.email || '',
      displayName: firstName,
    }));

    return true;
  } catch (error: any) {
    console.error('Error in createOrUpdateUser:', error);
    throw error;
  }
};

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Firebase asynchronously
const initializeFirebase = async () => {
  try {
    console.log('Initializing Firebase...');
    
    // Initialize Firebase
    initializeApp(firebaseConfig);
    
    // Initialize Auth with persistence
    auth = getAuth();
    await setPersistence(auth, browserLocalPersistence);
    
    // Initialize Firestore
    db = getFirestore();
    
    // Initialize collection references
    watchlistsRef = createCollectionRef('watchlists');
    watchlistItemsRef = createCollectionRef('watchlistItems');
    usersRef = createCollectionRef('users');
    pendingInvitesRef = createCollectionRef('pendingInvites');
    
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
};

// Initialize Firebase immediately
initializeFirebase().catch(error => {
  console.error('Failed to initialize Firebase:', error);
});

// Auth functions
export const signInWithGoogle = async () => {
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

export const signOut = async () => {
  try {
    console.log('Starting sign out process...');
    await firebaseSignOut(auth);
    console.log('Sign out successful');
  } catch (error: any) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export { app, auth, db, watchlistsRef, watchlistItemsRef, usersRef, pendingInvitesRef }; 