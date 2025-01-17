import React, { useEffect, useState } from 'react';
import { Box, Container, Typography, Fab, Tooltip } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { subscribeToWatchlist, subscribeToWatchlistItems } from '../services/watchlist';
import { setActiveWatchlist, setWatchlistItems, SerializedWatchlist } from '../store/slices/watchlistSlice';
import { WatchlistSetup } from './watchlist/WatchlistSetup';
import { MediaList } from './media/MediaList';
import { NowPlaying } from './media/NowPlaying';
import { PopcornLoader } from './common/PopcornLoader';
import { DBWatchlist, DBWatchlistItem, usersRef } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useMinimumLoadingTime } from '../hooks/useMinimumLoadingTime';
import { AddMediaModal } from './media/AddMediaModal';
import { PartnerStatus } from './watchlist/PartnerStatus';

// Helper function to convert Firestore timestamps to numbers
const convertWatchlistToSerialized = (watchlist: DBWatchlist): SerializedWatchlist => {
  console.log('Converting watchlist to serialized format:', watchlist);
  return {
    id: watchlist.id,
    name: watchlist.name,
    users: watchlist.users,
    currentTvShow: watchlist.currentTvShow,
    currentMovie: watchlist.currentMovie,
    lastTvShowAddedBy: watchlist.lastTvShowAddedBy,
    lastMovieAddedBy: watchlist.lastMovieAddedBy,
    lastAddedBy: watchlist.lastAddedBy,
    createdAt: watchlist.createdAt.toMillis(),
  };
};

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const shouldShowLoader = useMinimumLoadingTime(isLoading);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const activeWatchlist = useSelector((state: RootState) => state.watchlist.activeWatchlist);

  useEffect(() => {
    if (!currentUser) {
      console.log('No user found, redirecting to login');
      navigate('/login');
      return;
    }

    console.log('Setting up subscriptions for user:', currentUser.id);
    let unsubscribeUser: (() => void) | null = null;
    let unsubscribeWatchlist: (() => void) | null = null;
    let unsubscribeItems: (() => void) | null = null;

    const setupSubscriptions = async () => {
      try {
        console.log('Starting subscription setup...');
        // First, subscribe to the user document to get activeWatchlist
        unsubscribeUser = onSnapshot(doc(usersRef, currentUser.id), async (userDoc) => {
          console.log('User document updated:', {
            exists: userDoc.exists(),
            data: userDoc.data(),
            path: userDoc.ref.path
          });
          
          if (!userDoc.exists()) {
            console.log('No user document found');
            setIsLoading(false);
            return;
          }

          const userData = userDoc.data();
          const activeWatchlistId = userData.activeWatchlist;
          console.log('Active watchlist ID from user document:', activeWatchlistId);

          if (!activeWatchlistId) {
            console.log('No active watchlist found in user document');
            dispatch(setActiveWatchlist(null));
            dispatch(setWatchlistItems([]));
            setIsLoading(false);
            return;
          }

          // Clean up previous subscriptions before setting up new ones
          if (unsubscribeWatchlist) {
            console.log('Cleaning up previous watchlist subscription');
            unsubscribeWatchlist();
          }
          if (unsubscribeItems) {
            console.log('Cleaning up previous items subscription');
            unsubscribeItems();
          }

          console.log('Setting up watchlist subscription for:', activeWatchlistId);
          // Subscribe to active watchlist
          unsubscribeWatchlist = subscribeToWatchlist(activeWatchlistId, (watchlist: DBWatchlist) => {
            console.log('Watchlist updated:', {
              id: watchlist?.id,
              name: watchlist?.name,
              users: watchlist?.users
            });
            
            if (watchlist) {
              const serializedWatchlist = convertWatchlistToSerialized({
                ...watchlist,
                id: activeWatchlistId // Ensure the ID is set
              });
              console.log('Dispatching serialized watchlist:', serializedWatchlist);
              dispatch(setActiveWatchlist(serializedWatchlist));
              
              // Subscribe to watchlist items
              console.log('Setting up items subscription for watchlist:', activeWatchlistId);
              unsubscribeItems = subscribeToWatchlistItems(activeWatchlistId, (items: DBWatchlistItem[]) => {
                console.log('Watchlist items updated:', {
                  count: items.length,
                  items: items.map(item => ({
                    id: item.id,
                    title: item.title,
                    type: item.type
                  }))
                });
                const serializedItems = items.map(item => ({
                  id: item.id,
                  title: item.title,
                  posterPath: item.posterPath,
                  overview: item.overview,
                  type: item.type,
                  addedBy: item.addedBy,
                  watchlistId: item.watchlistId,
                  addedAt: item.addedAt ? item.addedAt.toMillis() : Date.now(),
                  ...(item.rating && { rating: item.rating }),
                  ...(item.comment && { comment: item.comment }),
                  ...(item.finishedAt && { finishedAt: item.finishedAt.toMillis() })
                }));
                dispatch(setWatchlistItems(serializedItems));
              });
            } else {
              console.log('No watchlist data found');
              dispatch(setActiveWatchlist(null));
              dispatch(setWatchlistItems([]));
            }
            setIsLoading(false);
          });
        });
      } catch (error) {
        console.error('Error setting up subscriptions:', error);
        setIsLoading(false);
      }
    };

    setupSubscriptions();

    return () => {
      console.log('Cleaning up all subscriptions');
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeWatchlist) unsubscribeWatchlist();
      if (unsubscribeItems) unsubscribeItems();
    };
  }, [currentUser, dispatch, navigate]);

  return (
    <Box sx={{ flexGrow: 1 }}>
      {isLoading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          bgcolor="#1a1a1a"
        >
          <PopcornLoader />
        </Box>
      ) : !activeWatchlist ? (
        <WatchlistSetup />
      ) : (
        <Container maxWidth="lg" sx={{ mt: 15, mb: 5 }}>
          <NowPlaying />
          <MediaList />
          {isAddModalOpen && (
            <AddMediaModal
              open={isAddModalOpen}
              onClose={() => setIsAddModalOpen(false)}
            />
          )}
          <Tooltip title="Add to Watchlist" arrow>
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
        </Container>
      )}
    </Box>
  );
}; 