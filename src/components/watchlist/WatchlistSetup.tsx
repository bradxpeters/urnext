import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Alert, Container } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { createWatchlist, inviteToWatchlist } from '../../services/watchlist';
import { PopcornLoader } from '../common/PopcornLoader';
import { useMinimumLoadingTime } from '../../hooks/useMinimumLoadingTime';

export const WatchlistSetup: React.FC = () => {
  const [watchlistName, setWatchlistName] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const shouldShowLoader = useMinimumLoadingTime(isLoading);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const handleCreateWatchlist = async () => {
    if (!currentUser) {
      setError('Please sign in to create a watchlist');
      return;
    }

    if (!watchlistName.trim()) {
      setError('Please enter a watchlist name');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('Creating watchlist...');
      const watchlistId = await createWatchlist(watchlistName, currentUser.id);
      console.log('Watchlist created:', watchlistId);

      if (partnerEmail.trim()) {
        console.log('Inviting partner...');
        if (partnerEmail.toLowerCase() === currentUser.email?.toLowerCase()) {
          throw new Error("You can't invite yourself");
        }
        await inviteToWatchlist(partnerEmail, watchlistId);
        console.log('Partner invited successfully');
        setSuccess('Watchlist created and partner invited successfully!');
      } else {
        setSuccess('Watchlist created successfully!');
      }

      setWatchlistName('');
      setPartnerEmail('');
    } catch (error: any) {
      console.error('Error creating watchlist:', error);
      if (error.message.includes('permission-denied')) {
        setError('Permission denied. Please check your account settings.');
      } else if (error.message.includes('User not found')) {
        setError('Partner email not found. Please check the email address.');
      } else if (error.message.includes("can't invite yourself")) {
        setError(error.message);
      } else {
        setError(error.message || 'Failed to create watchlist');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (shouldShowLoader) {
    return <PopcornLoader />;
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom>
          Create Your Watchlist
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <TextField
          fullWidth
          label="Watchlist Name"
          value={watchlistName}
          onChange={(e) => setWatchlistName(e.target.value)}
          margin="normal"
          variant="outlined"
          disabled={isLoading}
        />

        <TextField
          fullWidth
          label="Partner's Email (Optional)"
          value={partnerEmail}
          onChange={(e) => setPartnerEmail(e.target.value)}
          margin="normal"
          variant="outlined"
          disabled={isLoading}
          helperText="Invite your partner to join your watchlist"
        />

        <Button
          fullWidth
          variant="contained"
          onClick={handleCreateWatchlist}
          disabled={isLoading || !watchlistName.trim()}
          sx={{ mt: 2 }}
        >
          Create Watchlist
        </Button>
      </Box>
    </Container>
  );
}; 