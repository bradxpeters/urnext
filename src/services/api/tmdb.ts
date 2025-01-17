// Platform-agnostic API calls
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  params: {
    api_key: process.env.REACT_APP_TMDB_API_KEY,
  },
});

export const searchMedia = async (query: string) => {
  const response = await api.get('/search/multi', {
    params: { query },
  });
  return response.data;
}; 