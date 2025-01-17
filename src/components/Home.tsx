import React, { useEffect, useState } from 'react';
import { Box, Container, Tooltip, Fab, Typography } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { subscribeToWatchlist, subscribeToWatchlistItems } from '../services/watchlist';
import { setActiveWatchlist, setWatchlistItems, SerializedWatchlist } from '../store/slices/watchlistSlice';
import { setUser } from '../store/slices/authSlice';
import { WatchlistSetup } from './watchlist/WatchlistSetup';
import { MediaList } from './media/MediaList';
import { NowPlaying } from './media/NowPlaying';
import { PopcornLoader } from './common/PopcornLoader';
import { DBWatchlist, DBWatchlistItem, usersRef, auth } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useMinimumLoadingTime } from '../hooks/useMinimumLoadingTime';
import { AddMediaModal } from './media/AddMediaModal';
import { onAuthStateChanged } from 'firebase/auth';

// Helper function to convert Firestore timestamps to numbers
const convertWatchlistToSerialized = (watchlist: DBWatchlist): SerializedWatchlist => ({
  id: watchlist.id,
  name: watchlist.name,
  users: watchlist.users,
  currentTvShow: watchlist.currentTvShow,
  currentMovie: watchlist.currentMovie,
  lastTvShowAddedBy: watchlist.lastTvShowAddedBy,
  lastMovieAddedBy: watchlist.lastMovieAddedBy,
  lastAddedBy: watchlist.lastAddedBy,
  createdAt: watchlist.createdAt.toMillis(),
});

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const shouldShowLoader = useMinimumLoadingTime(isLoading);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const activeWatchlist = useSelector((state: RootState) => state.watchlist.activeWatchlist);

  // Store unsubscribe functions in refs
  const unsubscribeRefs = React.useRef<{
    auth?: (() => void);
    user?: (() => void);
    watchlist?: (() => void);
    items?: (() => void);
  }>({});

  // Effect for auth state changes
  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!isMounted) return;

      if (!firebaseUser) {
        // Clean up subscriptions first
        Object.entries(unsubscribeRefs.current).forEach(([key, unsub]) => {
          if (unsub && key !== 'auth') {
            unsub();
            unsubscribeRefs.current[key as keyof typeof unsubscribeRefs.current] = undefined;
          }
        });

        // Then clear Redux state
        dispatch(setUser(null));
        dispatch(setActiveWatchlist(null));
        dispatch(setWatchlistItems([]));

        // Finally navigate
        navigate('/login', { replace: true });
      }
    });

    unsubscribeRefs.current.auth = unsubscribe;

    return () => {
      isMounted = false;
      if (unsubscribeRefs.current.auth) {
        unsubscribeRefs.current.auth();
        unsubscribeRefs.current.auth = undefined;
      }
    };
  }, [dispatch, navigate]);

  // Effect for user document subscription
  useEffect(() => {
    if (!currentUser || !auth.currentUser) {
      setIsLoading(false);
      return;
    }

    // Clean up existing subscriptions before setting up new ones
    if (unsubscribeRefs.current.user) {
      unsubscribeRefs.current.user();
      unsubscribeRefs.current.user = undefined;
    }
    if (unsubscribeRefs.current.watchlist) {
      unsubscribeRefs.current.watchlist();
      unsubscribeRefs.current.watchlist = undefined;
    }
    if (unsubscribeRefs.current.items) {
      unsubscribeRefs.current.items();
      unsubscribeRefs.current.items = undefined;
    }

    // Set up user document listener
    const userUnsubscribe = onSnapshot(
      doc(usersRef, currentUser.id),
      (userDoc) => {
        if (!userDoc.exists()) {
          setIsLoading(false);
          return;
        }

        const userData = userDoc.data();
        const watchlistId = userData.activeWatchlist;

        if (!watchlistId) {
          dispatch(setActiveWatchlist(null));
          dispatch(setWatchlistItems([]));
          setIsLoading(false);
          return;
        }

        const watchlistUnsubscribe = subscribeToWatchlist(watchlistId, (watchlist: DBWatchlist) => {
          if (watchlist) {
            const serializedWatchlist = convertWatchlistToSerialized({
              ...watchlist,
              id: watchlistId
            });
            dispatch(setActiveWatchlist(serializedWatchlist));

            const itemsUnsubscribe = subscribeToWatchlistItems(watchlistId, (items: DBWatchlistItem[]) => {
              const serializedItems = items.map(item => ({
                ...item,
                addedAt: item.addedAt.toMillis(),
                finishedAt: item.finishedAt?.toMillis()
              }));
              dispatch(setWatchlistItems(serializedItems));
            });

            unsubscribeRefs.current.items = itemsUnsubscribe;
          } else {
            dispatch(setActiveWatchlist(null));
            dispatch(setWatchlistItems([]));
          }
          setIsLoading(false);
        });

        unsubscribeRefs.current.watchlist = watchlistUnsubscribe;
      },
      (error) => {
        console.error('Error listening to user document:', error);
        setIsLoading(false);
      }
    );

    unsubscribeRefs.current.user = userUnsubscribe;

    return () => {
      if (unsubscribeRefs.current.user) {
        unsubscribeRefs.current.user();
        unsubscribeRefs.current.user = undefined;
      }
      if (unsubscribeRefs.current.watchlist) {
        unsubscribeRefs.current.watchlist();
        unsubscribeRefs.current.watchlist = undefined;
      }
      if (unsubscribeRefs.current.items) {
        unsubscribeRefs.current.items();
        unsubscribeRefs.current.items = undefined;
      }
    };
  }, [currentUser, dispatch]);

  if (shouldShowLoader) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="#1a1a1a"
      >
        <PopcornLoader />
      </Box>
    );
  }

  if (!activeWatchlist && currentUser) {
    return <WatchlistSetup />;
  }

  if (!currentUser) {
    return null;
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {activeWatchlist && (
        <Typography 
          variant="h5" 
          component="h1" 
          sx={{ 
            mb: 3,
            color: 'text.secondary',
            fontWeight: 500,
            textAlign: 'center'
          }}
        >
          {activeWatchlist.name}
        </Typography>
      )}
      <Box sx={{ mb: 4 }}>
        <NowPlaying />
      </Box>
      <MediaList />
      <Tooltip title="Add to watchlist">
        <Fab
          color="primary"
          aria-label="add"
          onClick={() => setIsAddModalOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
          }}
        >
          <AddIcon />
        </Fab>
      </Tooltip>
      <AddMediaModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </Container>
  );
}; 