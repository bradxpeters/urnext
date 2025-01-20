import React from 'react';
import { Box, keyframes } from '@mui/material';

// Create multiple popcorn animations with different trajectories
const createPopAnimation = (x: number, height: number, startX: number) => keyframes`
  0% {
    transform: translate(${startX}px, 0) rotate(0deg) scale(0.8);
    opacity: 0;
  }
  15% {
    transform: translate(${startX + x * 0.2}px, ${-height * 0.3}px) rotate(${x > 0 ? 90 : -90}deg) scale(0.9);
    opacity: 1;
  }
  50% {
    transform: translate(${startX + x * 0.6}px, ${-height * 0.8}px) rotate(${x > 0 ? 180 : -180}deg) scale(1);
  }
  100% {
    transform: translate(${startX + x}px, ${-height}px) rotate(${x > 0 ? 360 : -360}deg) scale(0.8);
    opacity: 0;
  }
`;

// Create a bounce animation for the bowl
const bowlBounce = keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
`;

const Popcorn = ({ delay, x, height, startX }: { delay: number; x: number; height: number; startX: number }) => {
  const popAnimation = createPopAnimation(x, height, startX);
  
  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: '50px', // Align with the top rim of the bowl
        left: '50%', // Start at the horizontal center of the bowl
        width: '8px',
        height: '8px',
        backgroundColor: '#fff',
        borderRadius: '50%',
        animation: `${popAnimation} 1.5s ${delay}s infinite`,
        boxShadow: '0 0 2px rgba(0,0,0,0.3)',
        transformOrigin: 'center bottom', // Originate from the center bottom
        transform: 'translateX(-50%)', // Adjust horizontally to center
      }}
    />
  );
};

export const PopcornLoader = () => {
  // Generate random trajectories for popcorn pieces
  const popcornPieces = Array.from({ length: 12 }, (_, i) => ({
    delay: i * 0.12,
    x: Math.random() * 100 - 50, // Random x between -50 and 50
    height: Math.random() * 30 + 40, // Random height between 40 and 70
    startX: Math.random() * 60 - 30, // Random starting point within the bowl (-30 to 30)
  }));

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '120px',
          height: '120px',
          margin: '0 auto', // Center horizontally
        }}
      >
        {/* Bowl */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100px',
            height: '50px',
            background: 'linear-gradient(135deg, #e31c79 0%, #d71f3b 100%)',
            borderRadius: '0 0 50px 50px',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '10px',
              background: 'linear-gradient(90deg, #fff3 0%, #fff6 50%, #fff3 100%)',
              borderRadius: '50px 50px 0 0',
            },
            animation: `${bowlBounce} 1s ease-in-out infinite`, // Bowl bounce animation
          }}
        />

        {/* Popcorn pieces */}
        {popcornPieces.map((piece, index) => (
          <Popcorn
            key={index}
            delay={piece.delay}
            x={piece.x}
            height={piece.height}
            startX={piece.startX}
          />
        ))}
      </Box>
    </Box>
  );
};
