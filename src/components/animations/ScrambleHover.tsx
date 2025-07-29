import React, { useState, useEffect } from 'react';

interface ScrambleHoverProps {
  text: string;
  scrambleSpeed?: number;
  maxIterations?: number;
  className?: string;
}

const ScrambleHover: React.FC<ScrambleHoverProps> = ({
  text,
  scrambleSpeed = 50,
  maxIterations = 10,
  className,
  ...props
}) => {
  const [displayText, setDisplayText] = useState(text);
  const [isHovering, setIsHovering] = useState(false);
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let currentIteration = 0;
    
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+';
    
    const shuffleText = () => {
      return text
        .split('')
        .map((char) => {
          if (char === ' ') return ' ';
          return characters[Math.floor(Math.random() * characters.length)];
        })
        .join('');
    };
    
    if (isHovering) {
      interval = setInterval(() => {
        setDisplayText(shuffleText());
        currentIteration++;
        
        if (currentIteration >= maxIterations) {
          clearInterval(interval);
          setDisplayText(text);
        }
      }, scrambleSpeed);
    } else {
      setDisplayText(text);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isHovering, text, scrambleSpeed, maxIterations]);
  
  return (
    <span
      className={className}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      {...props}
    >
      {displayText}
    </span>
  );
};

export default ScrambleHover;
