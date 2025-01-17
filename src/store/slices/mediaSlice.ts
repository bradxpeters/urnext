import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface MediaItem {
  id: string;
  title: string;
  posterPath: string;
  overview: string;
  type: 'movie' | 'tv';
  addedBy: string;
  addedAt: number;
  rating?: number;
  comment?: string;
  finishedAt?: number;
}

interface MediaState {
  currentlyWatching: MediaItem | null;
  watchlist: MediaItem[];
  finishedList: MediaItem[];
  lastAddedBy: string | null;
}

const initialState: MediaState = {
  currentlyWatching: null,
  watchlist: [],
  finishedList: [],
  lastAddedBy: null,
};

const mediaSlice = createSlice({
  name: 'media',
  initialState,
  reducers: {
    setCurrentlyWatching: (state, action: PayloadAction<MediaItem | null>) => {
      state.currentlyWatching = action.payload;
    },
    addToWatchlist: (state, action: PayloadAction<MediaItem>) => {
      // If this is the first item, or if it's not the same user who added the last item
      if (state.lastAddedBy === null || state.lastAddedBy !== action.payload.addedBy) {
        state.watchlist.push({
          ...action.payload,
          addedAt: Date.now(),
        });
        state.lastAddedBy = action.payload.addedBy;
      }
    },
    removeFromWatchlist: (state, action: PayloadAction<string>) => {
      const index = state.watchlist.findIndex(item => item.id === action.payload);
      if (index !== -1) {
        // If we're removing the only item, reset lastAddedBy
        if (state.watchlist.length === 1) {
          state.lastAddedBy = null;
        }
        state.watchlist.splice(index, 1);
      }
    },
    markAsFinished: (state) => {
      if (state.currentlyWatching) {
        // Add to finished list with timestamp
        state.finishedList.push({
          ...state.currentlyWatching,
          finishedAt: Date.now()
        });
        
        // If there are items in the watchlist, move the first one to currently watching
        if (state.watchlist.length > 0) {
          state.currentlyWatching = state.watchlist[0];
          state.watchlist.splice(0, 1);
        } else {
          state.currentlyWatching = null;
        }
      }
    },
    moveBackToWatchlist: (state) => {
      if (state.currentlyWatching) {
        // Add to beginning of watchlist
        state.watchlist.unshift(state.currentlyWatching);
        state.currentlyWatching = null;
      }
    },
    updateMediaItem: (state, action: PayloadAction<{ id: string; updates: Partial<MediaItem> }>) => {
      const { id, updates } = action.payload;
      const item = state.watchlist.find(item => item.id === id);
      if (item) {
        Object.assign(item, updates);
      }
    },
  },
});

export const {
  setCurrentlyWatching,
  addToWatchlist,
  removeFromWatchlist,
  markAsFinished,
  moveBackToWatchlist,
  updateMediaItem,
} = mediaSlice.actions;

export default mediaSlice.reducer; 