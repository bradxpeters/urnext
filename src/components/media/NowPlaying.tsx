import { Box, Typography, Card, CardContent, CardMedia, Chip, IconButton, Rating, Tooltip } from '@mui/material';
import { Delete as DeleteIcon, ArrowBack as ArrowBackIcon, Check as CheckIcon } from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { removeItemFromWatchlist, updateCurrentlyWatching, markAsFinished, addItemToWatchlist } from '../../services/watchlist';
import { keyframes } from '@mui/material';
import { SerializedWatchlistItem } from '../../store/slices/watchlistSlice';
import { MediaItem } from '../../store/slices/mediaSlice';

const glowAnimation = keyframes`
  0% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.5); }
  50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.8); }
  100% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.5); }
`;

const marqueeGlow = keyframes`
  0% { text-shadow: 0 0 10px #ff0000, 0 0 20px #ff0000, 0 0 30px #ff0000; }
  50% { text-shadow: 0 0 20px #ff0000, 0 0 30px #ff0000, 0 0 40px #ff0000; }
  100% { text-shadow: 0 0 10px #ff0000, 0 0 20px #ff0000, 0 0 30px #ff0000; }
`;

interface MediaCardProps {
  item: SerializedWatchlistItem;
  onMarkFinished: () => void;
  onMoveBack: () => void;
  onDelete: () => void;
  type: 'movie' | 'tv';
}

const MediaCard = ({ item, onMarkFinished, onMoveBack, onDelete, type }: MediaCardProps) => {
  if (!item) return null;

  return (
    <Card sx={{ 
      display: 'flex', 
      mb: 2,
      animation: `${glowAnimation} 2s infinite ease-in-out`,
      bgcolor: 'background.paper',
      borderRadius: 2,
      flexDirection: { xs: 'column', sm: 'row' }
    }}>
      <CardMedia
        component="img"
        sx={{ 
          width: { xs: '100%', sm: 140 },
          height: { xs: 200, sm: 'auto' },
          objectFit: 'cover'
        }}
        image={item.posterPath ? `https://image.tmdb.org/t/p/w500${item.posterPath}` : '/placeholder.png'}
        alt={item.title}
      />
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>{item.title}</Typography>
            <Chip label={type === 'movie' ? 'Movie' : 'TV Show'} color="primary" size="small" />
          </Box>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mb: 1,
              display: '-webkit-box',
              WebkitLineClamp: { xs: 2, sm: 3 },
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {item.overview}
          </Typography>
          {item.rating && (
            <Rating value={item.rating} readOnly size="small" sx={{ mb: 1 }} />
          )}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Mark as Finished">
              <IconButton size="small" onClick={onMarkFinished}>
                <CheckIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Move Back to Watchlist">
              <IconButton size="small" onClick={onMoveBack}>
                <ArrowBackIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" onClick={onDelete}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </CardContent>
      </Box>
    </Card>
  );
};

const EmptyCard = ({ type }: { type: 'movie' | 'tv' }) => (
  <Card sx={{ 
    display: 'flex', 
    mb: 2,
    animation: `${glowAnimation} 2s infinite ease-in-out`,
    bgcolor: 'background.paper',
    borderRadius: 2,
    height: { xs: '150px', sm: '200px' },
    alignItems: 'center',
    justifyContent: 'center',
  }}>
    <Box sx={{ textAlign: 'center', p: 3 }}>
      <Typography variant="h6" gutterBottom color="primary" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
        No {type === 'movie' ? 'Movie' : 'TV Show'} Playing
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Add something from your watchlist to start watching!
      </Typography>
    </Box>
  </Card>
);

const convertToSerializedItem = (item: MediaItem | null, watchlistId: string): SerializedWatchlistItem | null => {
  if (!item) return null;
  return {
    ...item,
    watchlistId,
    addedAt: Date.now(), // Current timestamp since this is the currently playing item
    addedBy: '', // We don't track who added currently playing items
  };
};

export const NowPlaying = () => {
  const dispatch = useDispatch();
  const activeWatchlist = useSelector((state: RootState) => state.watchlist.activeWatchlist);
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const handleMarkFinished = async (type: 'movie' | 'tv') => {
    if (!activeWatchlist?.id) return;
    try {
      await markAsFinished(activeWatchlist.id, type);
    } catch (error) {
      console.error('Error marking as finished:', error);
    }
  };

  const handleMoveBack = async (type: 'movie' | 'tv') => {
    if (!activeWatchlist?.id || !currentUser) return;
    try {
      const currentItem = type === 'movie' ? activeWatchlist.currentMovie : activeWatchlist.currentTvShow;
      if (!currentItem) return;

      // First add it back to the watchlist
      await addItemToWatchlist(activeWatchlist.id, {
        ...currentItem,
        addedBy: currentUser.id, // Set the current user as the one who moved it back
        addedAt: Date.now(),
      });

      // Then clear it from currently watching
      await updateCurrentlyWatching(activeWatchlist.id, null, type);
    } catch (error) {
      console.error('Error moving back to watchlist:', error);
    }
  };

  const handleDelete = async (type: 'movie' | 'tv') => {
    if (!activeWatchlist?.id) return;
    try {
      await updateCurrentlyWatching(activeWatchlist.id, null, type);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  if (!activeWatchlist) return null;

  const currentMovie = activeWatchlist.currentMovie && convertToSerializedItem(activeWatchlist.currentMovie, activeWatchlist.id);
  const currentTvShow = activeWatchlist.currentTvShow && convertToSerializedItem(activeWatchlist.currentTvShow, activeWatchlist.id);

  return (
    <Box sx={{ width: '100%' }}>
      <Typography 
        variant="h4" 
        align="center"
        sx={{ 
          mb: { xs: 2, sm: 4 },
          fontWeight: 'bold',
          color: '#ff0000',
          animation: `${marqueeGlow} 2s infinite ease-in-out`,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontFamily: '"Roboto Condensed", sans-serif',
          borderBottom: '2px solid #ff0000',
          paddingBottom: '8px',
          width: 'fit-content',
          margin: '0 auto',
          fontSize: { xs: '1.5rem', sm: '2.125rem' }
        }}
      >
        Now Playing
      </Typography>
      <Box sx={{ 
        display: 'flex', 
        gap: { xs: 2, sm: 4 }, 
        justifyContent: 'center', 
        width: '100%',
        flexDirection: { xs: 'column', sm: 'row' },
        px: { xs: 1, sm: 0 }
      }}>
        {/* Movies Section */}
        <Box sx={{ 
          flex: 1, 
          maxWidth: { xs: '100%', sm: '500px' },
          minWidth: { sm: '300px' }
        }}>
          <Typography 
            variant="h6" 
            gutterBottom 
            align="center"
            sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
          >
            Movie
          </Typography>
          {currentMovie ? (
            <MediaCard
              item={currentMovie}
              onMarkFinished={() => handleMarkFinished('movie')}
              onMoveBack={() => handleMoveBack('movie')}
              onDelete={() => handleDelete('movie')}
              type="movie"
            />
          ) : (
            <EmptyCard type="movie" />
          )}
        </Box>

        {/* TV Shows Section */}
        <Box sx={{ 
          flex: 1, 
          maxWidth: { xs: '100%', sm: '500px' },
          minWidth: { sm: '300px' }
        }}>
          <Typography 
            variant="h6" 
            gutterBottom 
            align="center"
            sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
          >
            TV Show
          </Typography>
          {currentTvShow ? (
            <MediaCard
              item={currentTvShow}
              onMarkFinished={() => handleMarkFinished('tv')}
              onMoveBack={() => handleMoveBack('tv')}
              onDelete={() => handleDelete('tv')}
              type="tv"
            />
          ) : (
            <EmptyCard type="tv" />
          )}
        </Box>
      </Box>
    </Box>
  );
}; 