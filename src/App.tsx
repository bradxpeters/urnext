import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useFirebaseInit } from './hooks/useFirebaseInit';
import { useSelector } from 'react-redux';
import { RootState } from './store/store';
import { Box } from '@mui/material';
import Login from './components/auth/Login';
import { Signup } from './components/auth/Signup';
import { Home } from './components/Home';
import { AppHeader } from './components/common/AppHeader';
import { PopcornLoader } from './components/common/PopcornLoader';

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
    <>
      {user && <AppHeader />}
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
      </Routes>
    </>
  );
}

export default App; 