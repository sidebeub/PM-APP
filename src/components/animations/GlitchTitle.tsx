import React from 'react';
import { Typography, TypographyProps } from '@mui/material';
import TextGlitch from './TextGlitch';

interface GlitchTitleProps extends Omit<TypographyProps, 'children'> {
  text: string;
  glitchInterval?: number;
  glitchDuration?: number;
  intensity?: number;
}

/**
 * A reusable component that applies the TextGlitch effect to Typography components.
 * This can be used for page titles and section headers throughout the app.
 */
const GlitchTitle: React.FC<GlitchTitleProps> = ({
  text,
  glitchInterval = 5000,
  glitchDuration = 300,
  intensity = 7,
  variant = 'h4',
  ...typographyProps
}) => {
  return (
    <Typography variant={variant} {...typographyProps}>
      <TextGlitch 
        text={text} 
        glitchInterval={glitchInterval} 
        glitchDuration={glitchDuration}
        intensity={intensity}
      />
    </Typography>
  );
};

export default GlitchTitle;
