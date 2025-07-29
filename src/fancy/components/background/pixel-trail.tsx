import React, { useState, useEffect, useRef } from 'react';
import './pixel-trail.css';

interface Pixel {
  id: number;
  x: number;
  y: number;
  opacity: number;
  timestamp: number;
}

interface PixelTrailProps {
  pixelSize?: number;
  fadeDuration?: number;
  pixelClassName?: string;
  maxPixels?: number;
}

const PixelTrail: React.FC<PixelTrailProps> = ({
  pixelSize = 24,
  fadeDuration = 500,
  pixelClassName = '',
  maxPixels = 100,
}) => {
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const pixelIdCounter = useRef(0);
  const lastMousePosition = useRef({ x: 0, y: 0 });
  const isMouseMoving = useRef(false);

  // Handle mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / pixelSize) * pixelSize;
      const y = Math.floor((e.clientY - rect.top) / pixelSize) * pixelSize;

      // Only add a pixel if the mouse has moved to a new pixel grid position
      if (x !== lastMousePosition.current.x || y !== lastMousePosition.current.y) {
        lastMousePosition.current = { x, y };
        isMouseMoving.current = true;

        // Add a new pixel
        const newPixel: Pixel = {
          id: pixelIdCounter.current++,
          x,
          y,
          opacity: 1,
          timestamp: Date.now(),
        };

        setPixels(prevPixels => {
          // Limit the number of pixels to prevent performance issues
          const updatedPixels = [...prevPixels, newPixel];
          if (updatedPixels.length > maxPixels) {
            return updatedPixels.slice(updatedPixels.length - maxPixels);
          }
          return updatedPixels;
        });
      }
    };

    // Add mouse movement tracking
    document.addEventListener('mousemove', handleMouseMove);

    // Clean up
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [pixelSize, maxPixels]);

  // Fade out and remove pixels
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setPixels(prevPixels => 
        prevPixels
          .map(pixel => {
            const age = now - pixel.timestamp;
            const opacity = 1 - age / fadeDuration;
            return { ...pixel, opacity };
          })
          .filter(pixel => pixel.opacity > 0)
      );
    }, 50);

    return () => clearInterval(interval);
  }, [fadeDuration]);

  // Add random pixels when mouse is not moving
  useEffect(() => {
    // Add initial pixels immediately
    for (let i = 0; i < 20; i++) {
      if (!containerRef.current) continue;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.floor(Math.random() * rect.width);
      const y = Math.floor(Math.random() * rect.height);
      
      const newPixel: Pixel = {
        id: pixelIdCounter.current++,
        x,
        y,
        opacity: 0.9,
        timestamp: Date.now(),
      };
      
      setPixels(prevPixels => [...prevPixels, newPixel]);
    }
    
    const addRandomPixel = () => {
      if (isMouseMoving.current) {
        isMouseMoving.current = false;
        return;
      }

      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.floor(Math.random() * (rect.width / pixelSize)) * pixelSize;
      const y = Math.floor(Math.random() * (rect.height / pixelSize)) * pixelSize;
      
      const newPixel: Pixel = {
        id: pixelIdCounter.current++,
        x,
        y,
        opacity: 0.9,
        timestamp: Date.now(),
      };
      
      setPixels(prevPixels => {
        const updatedPixels = [...prevPixels, newPixel];
        if (updatedPixels.length > maxPixels) {
          return updatedPixels.slice(updatedPixels.length - maxPixels);
        }
        return updatedPixels;
      });
    };
    
    const interval = setInterval(addRandomPixel, 300);
    
    return () => clearInterval(interval);
  }, [pixelSize, maxPixels]);

  return (
    <div
      ref={containerRef}
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {pixels.map(pixel => (
        <div
          key={pixel.id}
          className={pixelClassName || 'default-pixel'}
          style={{
            position: 'absolute',
            left: `${pixel.x}px`,
            top: `${pixel.y}px`,
            width: `${pixelSize}px`,
            height: `${pixelSize}px`,
            opacity: pixel.opacity,
            transition: 'opacity 0.05s linear',
            backgroundColor: pixelClassName ? undefined : 'white',
            borderRadius: pixelClassName ? undefined : '2px',
            boxShadow: pixelClassName ? undefined : '0 0 8px rgba(255, 255, 255, 0.8)',
          }}
        />
      ))}
    </div>
  );
};

export default PixelTrail;
