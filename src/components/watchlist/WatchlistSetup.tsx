import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Alert, Container, CircularProgress } from '@mui/material';
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
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        minHeight: '100vh',
        position: 'relative'
      }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create a Watchlist
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, textAlign: 'center' }}>
          Start by creating a watchlist. You can invite your partner to join later.
        </Typography>
        <Box component="form" onSubmit={handleCreateWatchlist} sx={{ width: '100%' }}>
          <TextField
            fullWidth
            label="Watchlist Name"
            variant="outlined"
            value={watchlistName}
            onChange={(e) => setWatchlistName(e.target.value)}
            sx={{ mb: 2 }}
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
            type="submit"
            fullWidth
            variant="contained"
            disabled={isLoading}
            sx={{ mt: 2 }}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Create Watchlist'}
          </Button>
        </Box>
        <Typography 
          variant="caption" 
          sx={{ 
            position: 'fixed', 
            bottom: '4px', 
            right: '4px', 
            opacity: 0.5 
          }}
        >
          v1.0.2
        </Typography>
      </Box>
    </Container>
  );
}; 