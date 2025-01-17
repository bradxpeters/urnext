import React from 'react';
import { Media } from '../../types';

interface MediaCardProps {
  media: Media;
  onPress: (media: Media) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ media, onPress }) => {
  const handlePress = () => {
    onPress(media);
  };

  return (
    <div onClick={handlePress}>
      <img src={media.posterPath} alt={media.title} />
      <h3>{media.title}</h3>
    </div>
  );
}; 