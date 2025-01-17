// Shared types
export interface Media {
  id: string;
  title: string;
  posterPath: string;
  overview: string;
  type: 'movie' | 'tv';
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
} 