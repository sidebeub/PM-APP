import React from 'react';
import { CardHeader, CardHeaderProps } from '@mui/material';
import GlitchTitle from './GlitchTitle';

interface GlitchCardHeaderProps extends Omit<CardHeaderProps, 'title'> {
  title: string;
  glitchInterval?: number;
  glitchDuration?: number;
  intensity?: number;
  titleVariant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

/**
 * A custom CardHeader component that uses GlitchTitle for the title.
 * This can be used for card headers throughout the app.
 */
const GlitchCardHeader: React.FC<GlitchCardHeaderProps> = ({
  title,
  glitchInterval = 5000,
  glitchDuration = 300,
  intensity = 6,
  titleVariant = 'h6',
  ...cardHeaderProps
}) => {
  return (
    <CardHeader
      {...cardHeaderProps}
      title={
        <GlitchTitle 
          text={title} 
          variant={titleVariant}
          glitchInterval={glitchInterval} 
          glitchDuration={glitchDuration}
          intensity={intensity}
        />
      }
    />
  );
};

export default GlitchCardHeader;
