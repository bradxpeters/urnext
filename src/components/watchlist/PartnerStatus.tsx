import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { doc, onSnapshot } from 'firebase/firestore';
import { usersRef } from '../../services/firebase';
import { inviteToWatchlist } from '../../services/watchlist';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GroupIcon from '@mui/icons-material/Group';

export const PartnerStatus: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const activeWatchlist = useSelector((state: RootState) => state.watchlist.activeWatchlist);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partnerInfo, setPartnerInfo] = useState<{ email: string; displayName: string } | null>(null);

  useEffect(() => {
    if (!user || !activeWatchlist) return;

    // Find partner's info from the watchlist users array
    const partnerId = activeWatchlist.users.find(id => id !== user.id);
    if (!partnerId) return;

    // Subscribe to partner's user document
    const unsubscribe = onSnapshot(doc(usersRef, partnerId), (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        setPartnerInfo({
          email: userData.email,
          displayName: userData.displayName
        });
      }
    });

    return () => unsubscribe();
  }, [user, activeWatchlist]);

  const handleInvite = async () => {
    if (!activeWatchlist?.id) return;
    
    setLoading(true);
    setError(null);
    try {
      await inviteToWatchlist(partnerEmail, activeWatchlist.id);
      setIsInviteOpen(false);
      setPartnerEmail('');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!activeWatchlist) return null;

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {partnerInfo ? (
          <Chip
            icon={<GroupIcon />}
            label={`Watching with ${partnerInfo.displayName.split(' ')[0]}`}
            color="primary"
            variant="outlined"
          />
        ) : (
          <Button
            startIcon={<PersonAddIcon />}
            variant="outlined"
            size="small"
            onClick={() => setIsInviteOpen(true)}
          >
            Invite Partner
          </Button>
        )}
      </Box>

      <Dialog open={isInviteOpen} onClose={() => setIsInviteOpen(false)}>
        <DialogTitle>Invite Partner</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Partner's Email"
            type="email"
            fullWidth
            variant="outlined"
            value={partnerEmail}
            onChange={(e) => setPartnerEmail(e.target.value)}
            disabled={loading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsInviteOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleInvite} 
            variant="contained" 
            disabled={loading || !partnerEmail.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            Send Invite
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}; 