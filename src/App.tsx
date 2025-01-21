import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, Box } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from './store/store';
import { useFirebaseInit } from './hooks/useFirebaseInit';
import { Home } from './components/Home';
import { Login } from './components/auth/Login';
import { Signup } from './components/auth/Signup';
import { AppDrawer } from './components/common/AppDrawer';
import { FinishedList } from './components/media/FinishedList';
import { PopcornLoader } from './components/common/PopcornLoader';
import { AppHeader } from './components/common/AppHeader';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#1a1a1a',
      paper: '#2d2d2d',
    },
    primary: {
      main: '#e31c79',
    },
    secondary: {
      main: '#d71f3b',
    },
  },
});

function App() {
  const { isLoading } = useFirebaseInit();
  const user = useSelector((state: RootState) => state.auth.user);

  if (isLoading) {
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
    <ThemeProvider theme={darkTheme}>
      {user && (
        <>
          <AppHeader />
          <AppDrawer />
        </>
      )}
      <Routes>
        <Route
          path="/"
          element={user ? <Home /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to="/" replace />}
        />
        <Route
          path="/signup"
          element={!user ? <Signup /> : <Navigate to="/" replace />}
        />
        <Route
          path="/finished"
          element={user ? <FinishedList /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </ThemeProvider>
  );
}

export default App; 