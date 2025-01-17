import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  params: {
    api_key: process.env.REACT_APP_TMDB_API_KEY,
  },
});

export interface TMDBSearchResult {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  overview: string;
  media_type: 'movie' | 'tv';
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
}

export const searchMedia = async (query: string): Promise<TMDBSearchResult[]> => {
  try {
    console.log('Searching with API key:', process.env.REACT_APP_TMDB_API_KEY);
    const response = await api.get('/search/multi', {
      params: {
        query,
        include_adult: false,
        language: 'en-US',
        page: 1,
      },
    });
    
    console.log('API Response:', response.data);
    
    const filteredResults = response.data.results.filter(
      (item: any) => item.media_type === 'movie' || item.media_type === 'tv'
    );
    
    console.log('Filtered Results:', filteredResults);
    return filteredResults;
  } catch (error) {
    console.error('Error searching TMDB:', error);
    return [];
  }
}; 