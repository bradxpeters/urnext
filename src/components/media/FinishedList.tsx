import React from 'react';
import { Box, Typography, Card, CardContent, CardMedia, Grid, Rating, Container } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { SerializedWatchlistItem } from '../../store/slices/watchlistSlice';
import { subscribeToFinishedItems } from '../../services/watchlist';
import { PopcornLoader } from '../common/PopcornLoader';
import { useMinimumLoadingTime } from '../../hooks/useMinimumLoadingTime';

export const FinishedList = () => {
  const [finishedItems, setFinishedItems] = React.useState<SerializedWatchlistItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const shouldShowLoader = useMinimumLoadingTime(isLoading);
  const activeWatchlist = useSelector((state: RootState) => state.watchlist.activeWatchlist);
  const currentUser = useSelector((state: RootState) => state.auth.user);

  React.useEffect(() => {
    if (!activeWatchlist?.id) return;

    setIsLoading(true);
    // Subscribe to finished items
    const unsubscribe = subscribeToFinishedItems(activeWatchlist.id, (items) => {
      // Sort by finished date, most recent first
      const sortedItems = items.sort((a, b) => {
        const dateA = a.finishedAt || 0;
        const dateB = b.finishedAt || 0;
        return dateB - dateA;
      });
      setFinishedItems(sortedItems);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [activeWatchlist?.id]);

  if (!activeWatchlist || !currentUser) return null;

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

  return (
    <Container maxWidth="md" sx={{ 
      mt: { xs: 10, sm: 4 },
      mb: 4,
      pt: { xs: 2, sm: 0 }
    }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        width: '100%', 
        mb: { xs: 2, sm: 3 },
        px: 2
      }}>
        <Typography 
          variant="h5" 
          component="h1" 
          sx={{ 
            color: 'text.secondary',
            fontWeight: 500,
            textAlign: 'center',
            fontSize: { xs: '1.25rem', sm: '1.5rem' }
          }}
        >
          Finished Watching
        </Typography>
      </Box>

      {finishedItems.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            You haven't finished watching anything yet!
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {finishedItems.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <Card sx={{ display: 'flex', height: '100%' }}>
                <CardMedia
                  component="img"
                  sx={{ width: 100 }}
                  image={item.posterPath ? `https://image.tmdb.org/t/p/w200${item.posterPath}` : '/placeholder.png'}
                  alt={item.title}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <CardContent>
                    <Typography variant="h6" component="div" noWrap>
                      {item.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Finished: {new Date(item.finishedAt || 0).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Added by: {item.addedBy === currentUser.id ? 'You' : 'Partner'}
                    </Typography>
                    {item.rating && (
                      <Rating value={item.rating} readOnly size="small" sx={{ mt: 1 }} />
                    )}
                  </CardContent>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
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