import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Container,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signInWithGoogle, createOrUpdateUser } from '../../services/firebase';
import { acceptInvitation } from '../../services/watchlist';
import { PopcornLoader } from '../common/PopcornLoader';
import GoogleIcon from '@mui/icons-material/Google';

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inviteId = searchParams.get('invite');

  const handleGoogleSignup = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    try {
      console.log('Starting Google sign-in process...');
      const user = await signInWithGoogle();
      console.log('Sign-in successful, creating/updating user document');
      await createOrUpdateUser(user);

      if (inviteId) {
        console.log('Accepting watchlist invitation...');
        await acceptInvitation(user.uid, inviteId);
        setSuccess('Successfully joined the watchlist!');
        // Wait a moment to show the success message
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      console.log('Navigating to home');
      navigate('/', { replace: true });
    } catch (error: any) {
      console.error('Sign-up error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign up was cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Pop-up was blocked by your browser. Please allow pop-ups for this site.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        setError('Another sign up attempt is in progress. Please wait.');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection and try again.');
      } else if (error.code === 'permission-denied') {
        setError('Permission denied accessing Firestore. Please check your Firebase rules.');
      } else {
        console.error('Detailed error:', {
          code: error.code,
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        setError(`Failed to sign up: ${error.message || 'Unknown error occurred'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <PopcornLoader />;
  }

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        textAlign="center"
      >
        <Box mb={4}>
          <img
            src="/urnext-logo.png"
            alt="urNext Logo"
            style={{ width: '200px', height: 'auto' }}
          />
        </Box>

        <Typography variant="h5" gutterBottom>
          {inviteId ? "Accept Watchlist Invitation" : "Sign Up"}
        </Typography>

        {error && (
          <Box mb={3} width="100%">
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        {success && (
          <Box mb={3} width="100%">
            <Alert severity="success">{success}</Alert>
          </Box>
        )}

        <Button
          variant="contained"
          color="primary"
          onClick={handleGoogleSignup}
          disabled={isLoading}
          startIcon={!isLoading && <GoogleIcon />}
          size="large"
          sx={{ minWidth: 200 }}
        >
          {isLoading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            'Continue with Google'
          )}
        </Button>
      </Box>
    </Container>
  );
}; 