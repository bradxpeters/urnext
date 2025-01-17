import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { auth } from '../../services/firebase';
import LogoutIcon from '@mui/icons-material/Logout';
import { PartnerStatus } from '../watchlist/PartnerStatus';

export const AppHeader: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const activeWatchlist = useSelector((state: RootState) => state.watchlist.activeWatchlist);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [imgError, setImgError] = useState(false);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      handleClose();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, mb: 8 }}>
      <AppBar 
        position="static" 
        color="default" 
        elevation={1}
        sx={{ 
          borderRadius: '16px',
          overflow: 'visible'
        }}
      >
        <Toolbar sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          minHeight: '64px',
          height: '64px'
        }}>
          {/* Logo/Title Section */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            position: 'relative',
            minWidth: '200px',
            height: '64px',
            overflow: 'visible'
          }}>
            {!imgError ? (
              <img 
                src={`${process.env.PUBLIC_URL}/urnext-logo.png`}
                alt="urNext" 
                style={{ 
                  height: '200px',
                  cursor: 'pointer',
                  position: 'absolute',
                  top: '-20px',
                  left: '16px',
                  maxWidth: '280px',
                  objectFit: 'contain'
                }}
                onError={() => setImgError(true)}
              />
            ) : (
              <Typography variant="h4" component="div" sx={{ mr: 2 }}>
                urNext
              </Typography>
            )}
          </Box>

          {/* Center Section with Partner Status */}
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <PartnerStatus />
          </Box>

          {/* User Menu Section */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body1" sx={{ mr: 2 }}>
              {user?.displayName}
            </Typography>
            <IconButton
              size="large"
              aria-label="account menu"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <Avatar 
                src={user?.photoURL || undefined}
                sx={{ width: 32, height: 32 }}
              />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleLogout}>
                <LogoutIcon sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
    </Box>
  );
}; 