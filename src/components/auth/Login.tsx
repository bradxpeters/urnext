import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Container,
  CircularProgress,
  Alert,
} from '@mui/material';
import { signInWithGoogle, createOrUpdateUser } from '../../services/firebase';
import { useNavigate } from 'react-router-dom';
import GoogleIcon from '@mui/icons-material/Google';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const handleGoogleLogin = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    try {
      console.log('Starting Google sign-in process...');
      const user = await signInWithGoogle();
      console.log('Sign-in successful, creating/updating user document');
      await createOrUpdateUser(user);
      console.log('User document updated, navigating to home');
      navigate('/', { replace: true });
    } catch (error: any) {
      console.error('Sign-in error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign in was cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Pop-up was blocked by your browser. Please allow pop-ups for this site.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        setError('Another sign in attempt is in progress. Please wait.');
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
        setError(`Failed to sign in: ${error.message || 'Unknown error occurred'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

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
            style={{ 
              width: '200px', 
              height: 'auto',
              display: imgError ? 'none' : 'block' 
            }}
            onError={() => setImgError(true)}
          />
        </Box>

        {error && (
          <Box mb={3} width="100%">
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        <Button
          variant="contained"
          color="primary"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          startIcon={!isLoading && <GoogleIcon />}
          size="large"
          sx={{ minWidth: 200 }}
        >
          {isLoading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            'Sign in with Google'
          )}
        </Button>
      </Box>
    </Container>
  );
};

export default Login; 