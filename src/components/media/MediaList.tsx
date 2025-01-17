import React from 'react';
import { Box, Card, CardContent, CardMedia, Typography, IconButton, Tooltip, Grid } from '@mui/material';
import { PlayCircle as PlayCircleIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { updateCurrentlyWatching, removeItemFromWatchlist } from '../../services/watchlist';
import { SerializedWatchlistItem } from '../../store/slices/watchlistSlice';

export const MediaList = () => {
  const { activeWatchlist, watchlistItems } = useSelector((state: RootState) => state.watchlist);
  const currentUser = useSelector((state: RootState) => state.auth.user);

  if (!activeWatchlist || !currentUser) return null;

  const handleMoveToNowPlaying = async (item: SerializedWatchlistItem) => {
    if (!activeWatchlist?.id) {
      alert('No active watchlist found');
      return;
    }

    const isMovie = item.type === 'movie';
    const currentlyPlaying = isMovie ? activeWatchlist.currentMovie : activeWatchlist.currentTvShow;
    const lastAddedBy = isMovie ? activeWatchlist.lastMovieAddedBy : activeWatchlist.lastTvShowAddedBy;
    const isUsersTurn = watchlistItems.length <= 1 || !lastAddedBy || lastAddedBy !== currentUser?.id;

    if (currentlyPlaying && currentlyPlaying.id) {
      alert(`A ${isMovie ? 'movie' : 'TV show'} is already playing. Please finish or move it back to the watchlist first.`);
      return;
    }

    if (!isUsersTurn) {
      alert(`It's not your turn to pick a ${isMovie ? 'movie' : 'TV show'}. Let your partner choose next!`);
      return;
    }

    try {
      await updateCurrentlyWatching(activeWatchlist.id, item, item.type);
      await removeItemFromWatchlist(item.id);
    } catch (error) {
      console.error('Error moving to now playing:', error);
      alert('Failed to move item to Now Playing');
    }
  };

  const handleRemove = async (itemId: string) => {
    try {
      await removeItemFromWatchlist(itemId);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  if (watchlistItems.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          Your watchlist is empty. Add some movies or TV shows!
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {watchlistItems.map((item) => {
        // Determine if the button should be disabled
        const isMovie = item.type === 'movie';
        const currentlyPlaying = isMovie ? activeWatchlist.currentMovie : activeWatchlist.currentTvShow;
        const lastAddedBy = isMovie ? activeWatchlist.lastMovieAddedBy : activeWatchlist.lastTvShowAddedBy;
        const isDisabled = Boolean(
          (currentlyPlaying && currentlyPlaying.id) || 
          (watchlistItems.length > 1 && lastAddedBy === currentUser.id)
        );

        const tooltipTitle = isDisabled 
          ? (currentlyPlaying && currentlyPlaying.id)
            ? `There is already a ${isMovie ? 'movie' : 'TV show'} playing`
            : `It's not your turn to pick a ${isMovie ? 'movie' : 'TV show'}`
          : 'Move to Now Playing';

        return (
          <Grid item xs={12} sm={6} md={4} key={item.id}>
            <Card sx={{ display: 'flex', height: '100%' }}>
              <CardMedia
                component="img"
                sx={{ width: 100 }}
                image={`https://image.tmdb.org/t/p/w200${item.posterPath}`}
                alt={item.title}
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <CardContent sx={{ flex: '1 0 auto' }}>
                  <Typography variant="h6" component="div" noWrap>
                    {item.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Added by: {item.addedBy === currentUser.id ? 'You' : 'Partner'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {new Date(item.addedAt).toLocaleDateString()}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Tooltip title={tooltipTitle}>
                      <span>
                        <IconButton 
                          onClick={() => handleMoveToNowPlaying(item)}
                          disabled={isDisabled}
                        >
                          <PlayCircleIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    {item.addedBy === currentUser.id && (
                      <Tooltip title="Remove">
                        <IconButton onClick={() => handleRemove(item.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </CardContent>
              </Box>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}; 