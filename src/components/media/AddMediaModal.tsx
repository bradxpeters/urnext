import React, { useState } from 'react';
import {
  Modal,
  Box,
  TextField,
  IconButton,
  Typography,
  Button,
  Card,
  CardMedia,
  CardContent,
  Grid,
  Rating,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import { Close as CloseIcon, Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';
import { searchMedia, TMDBSearchResult } from '../../services/tmdb';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { addItemToWatchlist } from '../../services/watchlist';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: 800,
  maxHeight: '90vh',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  overflow: 'auto',
};

interface AddMediaModalProps {
  open: boolean;
  onClose: () => void;
}

export const AddMediaModal: React.FC<AddMediaModalProps> = ({ open, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  
  const user = useSelector((state: RootState) => state.auth.user);
  const { activeWatchlist, watchlistItems } = useSelector((state: RootState) => state.watchlist);

  const isMyTurn = !watchlistItems?.length || !activeWatchlist?.lastAddedBy || activeWatchlist.lastAddedBy !== user?.id;

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const results = await searchMedia(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        setError('No results found. Try a different search term.');
      }
    } catch (error) {
      console.error('Error searching:', error);
      setError('An error occurred while searching. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToWatchlist = async (media: TMDBSearchResult) => {
    if (!user) {
      setFeedback('Please sign in to add items to your watchlist');
      return;
    }

    if (!activeWatchlist?.id) {
      setFeedback('No active watchlist found');
      return;
    }

    if (!isMyTurn) {
      setFeedback("It's not your turn! Waiting for the other person to add something");
      return;
    }

    try {
      await addItemToWatchlist(activeWatchlist.id, {
        id: media.id.toString(),
        title: media.title || media.name || '',
        posterPath: media.poster_path || '',
        overview: media.overview,
        type: media.media_type,
        addedBy: user.id,
        addedAt: Date.now(),
      });
      setFeedback('Added to watchlist successfully!');
      setSearchResults([]);
      setSearchQuery('');
      onClose();
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      setFeedback('Failed to add to watchlist. Please try again.');
    }
  };

  const getYear = (date?: string) => {
    if (!date) return '';
    return new Date(date).getFullYear();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Add to Watchlist</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {!isMyTurn && (
          <Alert severity="info" sx={{ mb: 2 }}>
            It's not your turn! Waiting for the other person to add something.
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search for movies or TV shows"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            disabled={isLoading}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
            disabled={isLoading || !searchQuery.trim()}
          >
            Search
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!isLoading && searchResults.length > 0 && (
          <Grid container spacing={2}>
            {searchResults.map((result) => (
              <Grid item xs={12} sm={6} key={result.id}>
                <Card sx={{ display: 'flex', height: '100%' }}>
                  <CardMedia
                    component="img"
                    sx={{ width: 100 }}
                    image={
                      result.poster_path
                        ? `https://image.tmdb.org/t/p/w200${result.poster_path}`
                        : 'https://via.placeholder.com/200x300?text=No+Poster'
                    }
                    alt={result.title || result.name}
                  />
                  <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <CardContent sx={{ flex: '1 0 auto' }}>
                      <Typography variant="h6" component="div">
                        {result.title || result.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <Chip
                          label={result.media_type === 'tv' ? 'TV Show' : 'Movie'}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Chip
                          label={getYear(result.release_date || result.first_air_date)}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                      <Rating
                        value={result.vote_average / 2}
                        precision={0.5}
                        readOnly
                        size="small"
                      />
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {result.overview}
                      </Typography>
                    </CardContent>
                    <Box sx={{ p: 1 }}>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        fullWidth
                        onClick={() => handleAddToWatchlist(result)}
                        disabled={!isMyTurn}
                      >
                        {isMyTurn ? 'Add to Watchlist' : "It's not your turn"}
                      </Button>
                    </Box>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {!isLoading && searchResults.length === 0 && searchQuery && (
          <Box sx={{ textAlign: 'center', my: 4 }}>
            <Typography color="text.secondary">
              No results found. Try a different search term.
            </Typography>
          </Box>
        )}

        <Snackbar
          open={!!feedback}
          autoHideDuration={3000}
          onClose={() => setFeedback(null)}
          message={feedback}
        />
      </Box>
    </Modal>
  );
}; 