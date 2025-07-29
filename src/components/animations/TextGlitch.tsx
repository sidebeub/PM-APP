import React, { useState, useEffect } from 'react';

interface TextGlitchProps {
  text: string;
  glitchInterval?: number; // Time between glitch effects in ms
  glitchDuration?: number; // Duration of each glitch effect in ms
  intensity?: number; // Intensity of the glitch (1-10)
  className?: string;
  style?: React.CSSProperties;
}

const TextGlitch: React.FC<TextGlitchProps> = ({
  text,
  glitchInterval = 3000,
  glitchDuration = 200,
  intensity = 5,
  className,
  style,
}) => {
  const [displayText, setDisplayText] = useState(text);
  const [isGlitching, setIsGlitching] = useState(false);

  // Characters to use for glitch effect
  const glitchChars = '!<>-_\\/[]{}—=+*^?#________';

  // Generate a glitched version of the text
  const generateGlitchedText = (originalText: string) => {
    // Determine how many characters to glitch based on intensity (1-10)
    const glitchCount = Math.max(1, Math.floor((originalText.length * intensity) / 10));
    
    // Create a copy of the original text as an array
    const textArray = originalText.split('');
    
    // Randomly replace characters with glitch characters
    for (let i = 0; i < glitchCount; i++) {
      const randomIndex = Math.floor(Math.random() * textArray.length);
      const randomGlitchChar = glitchChars[Math.floor(Math.random() * glitchChars.length)];
      textArray[randomIndex] = randomGlitchChar;
    }
    
    return textArray.join('');
  };

  // Set up the glitch effect interval
  useEffect(() => {
    const glitchIntervalId = setInterval(() => {
      // Start glitching
      setIsGlitching(true);
      
      // Create multiple rapid glitch effects during the glitch duration
      let glitchCount = 0;
      const maxGlitches = 5; // Number of rapid glitches during the effect
      
      const rapidGlitchInterval = setInterval(() => {
        setDisplayText(generateGlitchedText(text));
        glitchCount++;
        
        // End the rapid glitching after reaching max count
        if (glitchCount >= maxGlitches) {
          clearInterval(rapidGlitchInterval);
          setDisplayText(text); // Reset to original text
          setIsGlitching(false);
        }
      }, glitchDuration / maxGlitches);
      
    }, glitchInterval);
    
    // Clean up intervals on unmount
    return () => {
      clearInterval(glitchIntervalId);
    };
  }, [text, glitchInterval, glitchDuration, intensity]);

  return (
    <span 
      className={className}
      style={{
        ...style,
        display: 'inline-block',
        fontFamily: isGlitching ? 'monospace' : 'inherit',
        position: 'relative',
        ...(isGlitching && {
          textShadow: `
            0.05em 0 0 rgba(255, 0, 0, 0.75),
            -0.025em -0.05em 0 rgba(0, 255, 0, 0.75),
            0.025em 0.05em 0 rgba(0, 0, 255, 0.75)
          `,
          animation: 'glitch 500ms infinite',
        }),
      }}
    >
      {displayText}
    </span>
  );
};

export default TextGlitch;
