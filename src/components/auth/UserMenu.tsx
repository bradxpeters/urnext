import React, { useState, useCallback } from 'react';
import { Avatar, Menu, MenuItem, IconButton, Typography, Box } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { signOut } from '../../services/firebase';

export const UserMenu: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);
  const open = Boolean(anchorEl);

  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (isSigningOut) return;
    setAnchorEl(event.currentTarget);
  }, [isSigningOut]);

  const handleClose = useCallback(() => {
    if (isSigningOut) return;
    setAnchorEl(null);
  }, [isSigningOut]);

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return;
    
    setIsSigningOut(true);
    handleClose();
    
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      setIsSigningOut(false);
    }
  }, [isSigningOut, handleClose]);

  if (!user) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <IconButton
        onClick={handleClick}
        size="small"
        aria-controls={open ? 'user-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        disabled={isSigningOut}
      >
        <Avatar
          alt={user.displayName}
          sx={{ width: 32, height: 32 }}
        >
          {user.displayName?.[0]}
        </Avatar>
      </IconButton>
      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
          },
        }}
      >
        <MenuItem sx={{ minWidth: 150 }}>
          <Typography variant="body2">{user.displayName}</Typography>
        </MenuItem>
        <MenuItem onClick={handleSignOut} disabled={isSigningOut}>
          {isSigningOut ? 'Signing out...' : 'Sign out'}
        </MenuItem>
      </Menu>
    </Box>
  );
}; 