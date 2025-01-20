import React, { useEffect, useState } from 'react';
import { Box, Container, Tooltip, Fab, Typography, IconButton } from '@mui/material';
import { Add as AddIcon, HelpOutline } from '@mui/icons-material';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { subscribeToWatchlist, subscribeToWatchlistItems } from '../services/watchlist';
import { setActiveWatchlist, setWatchlistItems, SerializedWatchlist, SerializedWatchlistItem } from '../store/slices/watchlistSlice';
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
  createdAt: watchlist.createdAt ? watchlist.createdAt.toMillis() : Date.now(),
});

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const shouldShowLoader = useMinimumLoadingTime(isLoading);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const activeWatchlist = useSelector((state: RootState) => state.watchlist.activeWatchlist);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fromInviteAcceptance = location.state?.fromInviteAcceptance || localStorage.getItem('acceptedWatchlistId');
  const acceptedWatchlistId = location.state?.acceptedWatchlistId || localStorage.getItem('acceptedWatchlistId');

  useEffect(() => {
    if (fromInviteAcceptance && acceptedWatchlistId) {
      console.log('Detected invite acceptance, waiting for watchlist setup...', {
        acceptedWatchlistId,
        currentUser,
        activeWatchlist
      });
    }
  }, [fromInviteAcceptance, acceptedWatchlistId, currentUser, activeWatchlist]);

  // Clear the localStorage item once we have an active watchlist
  useEffect(() => {
    if (activeWatchlist && localStorage.getItem('acceptedWatchlistId')) {
      console.log('Clearing acceptedWatchlistId from localStorage');
      localStorage.removeItem('acceptedWatchlistId');
    }
  }, [activeWatchlist]);

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

    console.log('Setting up user document listener...', {
      userId: currentUser.id,
      fromInviteAcceptance,
      acceptedWatchlistId
    });

    // Set up user document listener
    const userUnsubscribe = onSnapshot(
      doc(usersRef, currentUser.id),
      (userDoc) => {
        if (!userDoc.exists()) {
          setIsLoading(false);
          return;
        }

        const userData = userDoc.data();
        console.log('User document updated:', {
          hasActiveWatchlist: !!userData.activeWatchlist,
          activeWatchlist: userData.activeWatchlist,
          fromInviteAcceptance,
          acceptedWatchlistId
        });

        const watchlistId = userData.activeWatchlist;

        if (!watchlistId) {
          dispatch(setActiveWatchlist(null));
          dispatch(setWatchlistItems([]));
          setIsLoading(false);
          setIsInitialLoad(false);
          return;
        }

        const watchlistUnsubscribe = subscribeToWatchlist(watchlistId, (watchlist) => {
          if (watchlist) {
            const serializedWatchlist = convertWatchlistToSerialized({
              ...watchlist,
              id: watchlistId
            });
            dispatch(setActiveWatchlist(serializedWatchlist));

            const itemsUnsubscribe = subscribeToWatchlistItems(watchlistId, (items) => {
              dispatch(setWatchlistItems(items));
            });

            unsubscribeRefs.current.items = itemsUnsubscribe;
          } else {
            dispatch(setActiveWatchlist(null));
            dispatch(setWatchlistItems([]));
          }
          setIsLoading(false);
          setIsInitialLoad(false);
        });

        unsubscribeRefs.current.watchlist = watchlistUnsubscribe;
      },
      (error) => {
        console.error('Error listening to user document:', error);
        setIsLoading(false);
        setIsInitialLoad(false);
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

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // Show loading state while waiting for watchlist after invite acceptance
  if (fromInviteAcceptance && !activeWatchlist && !isInitialLoad) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="#1a1a1a"
      >
        <PopcornLoader />
        <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
          Setting up your watchlist...
        </Typography>
      </Box>
    );
  }

  // Only show WatchlistSetup if we're not coming from an invite acceptance
  if (!activeWatchlist && currentUser && !isInitialLoad && !fromInviteAcceptance) {
    console.log('Showing WatchlistSetup because:', {
      noActiveWatchlist: !activeWatchlist,
      hasCurrentUser: !!currentUser,
      notInitialLoad: !isInitialLoad,
      notFromInviteAcceptance: !fromInviteAcceptance,
      state: location.state,
      localStorage: localStorage.getItem('acceptedWatchlistId')
    });
    return <WatchlistSetup />;
  }

  if (shouldShowLoader || isInitialLoad) {
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

  return (
    <Container maxWidth="md" sx={{ 
      mt: { xs: 10, sm: 4 },
      mb: 4,
      pt: { xs: 2, sm: 0 }
    }}>
      {activeWatchlist && (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          width: '100%', 
          mb: { xs: 2, sm: 3 },
          px: 2,
          position: 'relative',
          zIndex: 1
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1 
          }}>
            <Typography 
              variant="h5" 
              component="h1" 
              sx={{ 
                color: 'text.secondary',
                fontWeight: 500,
                textAlign: 'center',
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                wordBreak: 'break-word',
                maxWidth: '100%',
                mt: { xs: 1, sm: 0 }
              }}
            >
              {activeWatchlist.name}
            </Typography>
            <Tooltip 
              title={
                <Box sx={{ p: 1 }}>
                  <Typography variant="body2" gutterBottom>
                    This is a turn-based watchlist shared between you and your partner.
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    • Each person can add one movie and one TV show at a time
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    • After you add something, wait for your partner to add their choice before adding again
                  </Typography>
                  <Typography variant="body2">
                    • Click the play button (▶️) on an item to move it to "Now Playing"
                  </Typography>
                </Box>
              }
              arrow
              placement="right"
              enterTouchDelay={0}
              leaveTouchDelay={5000}
            >
              <IconButton 
                size="small" 
                color="inherit"
                sx={{ 
                  '&:hover': { 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)' 
                  }
                }}
              >
                <HelpOutline sx={{ fontSize: '1.2rem', opacity: 0.7 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
      <Box sx={{ 
        mb: { xs: 2, sm: 4 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        px: { xs: 1, sm: 2 }
      }}>
        <NowPlaying />
      </Box>
      <Box sx={{ px: { xs: 1, sm: 2 } }}>
        <MediaList />
      </Box>
      <Tooltip title="Add to watchlist">
        <Fab
          color="primary"
          aria-label="add"
          onClick={() => setIsAddModalOpen(true)}
          sx={{
            position: 'fixed',
            bottom: { xs: '16px', sm: '32px' },
            right: { xs: '16px', sm: '32px' },
            zIndex: 9999,
            margin: 0
          }}
        >
          <AddIcon />
        </Fab>
      </Tooltip>
      <AddMediaModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
      <Typography 
        variant="caption" 
        sx={{ 
          position: 'fixed', 
          bottom: '4px', 
          right: '4px', 
          opacity: 0.5 
        }}
      >
        v1.0.1
      </Typography>
    </Container>
  );
}; 