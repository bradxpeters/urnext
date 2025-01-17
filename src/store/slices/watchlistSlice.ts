import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MediaItem } from './mediaSlice';

export interface SerializedWatchlist {
  id: string;
  name: string;
  users: string[];
  currentTvShow: MediaItem | null;
  currentMovie: MediaItem | null;
  lastTvShowAddedBy: string | null;
  lastMovieAddedBy: string | null;
  lastAddedBy: string | null;
  createdAt: number;
}

export interface SerializedWatchlistItem extends MediaItem {
  id: string;
  watchlistId: string;
  addedAt: number;
  finishedAt?: number;
}

interface WatchlistState {
  activeWatchlist: SerializedWatchlist | null;
  watchlistItems: SerializedWatchlistItem[];
}

const initialState: WatchlistState = {
  activeWatchlist: null,
  watchlistItems: [],
};

const watchlistSlice = createSlice({
  name: 'watchlist',
  initialState,
  reducers: {
    setActiveWatchlist: (state, action: PayloadAction<SerializedWatchlist | null>) => {
      state.activeWatchlist = action.payload;
    },
    setWatchlistItems: (state, action: PayloadAction<SerializedWatchlistItem[]>) => {
      state.watchlistItems = action.payload;
    },
  },
});

export const { setActiveWatchlist, setWatchlistItems } = watchlistSlice.actions;
export default watchlistSlice.reducer; 