import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Container,
  CircularProgress,
  Alert,
} from '@mui/material';
import { signInWithGoogle } from '../../services/firebase';
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
      await signInWithGoogle();
      console.log('Sign-in successful, navigating to home');
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
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {!imgError ? (
          <img 
            src={`${process.env.PUBLIC_URL}/urnext-logo.png`}
            alt="urNext" 
            style={{ 
              height: '160px',
              marginBottom: '2rem',
              cursor: 'pointer'
            }}
            onError={() => setImgError(true)}
          />
        ) : (
          <Typography variant="h3" component="h1" gutterBottom>
            urNext
          </Typography>
        )}

        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {error}
          </Alert>
        )}

        <Button
          variant="contained"
          size="large"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : <GoogleIcon />}
          sx={{
            mt: 3,
            mb: 2,
            py: 1.5,
            px: 4,
            borderRadius: 2,
            textTransform: 'none',
            fontSize: '1.1rem',
          }}
        >
          {isLoading ? 'Signing in...' : 'Sign in with Google'}
        </Button>
      </Box>
    </Container>
  );
};

export default Login; 