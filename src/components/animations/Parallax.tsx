import React, { useState, useEffect, useRef } from 'react';

interface ParallaxProps {
  children: React.ReactNode;
  speed?: number; // Speed of parallax effect (higher = more movement)
  direction?: 'horizontal' | 'vertical'; // Direction of parallax movement
  reverse?: boolean; // Reverse the direction of movement
  className?: string;
}

const Parallax: React.FC<ParallaxProps> = ({
  children,
  speed = 0.5,
  direction = 'vertical',
  reverse = false,
  className,
}) => {
  const [offset, setOffset] = useState(0);
  const elementRef = useRef<HTMLDivElement>(null);
  const frameId = useRef<number>(0);

  // Calculate the transform based on scroll position
  const calculateTransform = () => {
    if (!elementRef.current) return;
    
    const rect = elementRef.current.getBoundingClientRect();
    const elementTop = rect.top;
    const elementHeight = rect.height;
    const windowHeight = window.innerHeight;
    
    // Calculate how far the element is from the center of the viewport
    // Normalized to a value between -1 and 1
    const viewportCenter = windowHeight / 2;
    const elementCenter = elementTop + elementHeight / 2;
    const distanceFromCenter = (elementCenter - viewportCenter) / (windowHeight / 2);
    
    // Apply the parallax effect
    const movement = distanceFromCenter * speed * 100 * (reverse ? -1 : 1);
    setOffset(movement);
  };

  // Set up scroll listener
  useEffect(() => {
    const handleScroll = () => {
      // Use requestAnimationFrame for better performance
      cancelAnimationFrame(frameId.current);
      frameId.current = requestAnimationFrame(calculateTransform);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    
    // Initial calculation
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      cancelAnimationFrame(frameId.current);
    };
  }, [speed, reverse]);

  // Generate the transform style
  const getTransformStyle = () => {
    if (direction === 'horizontal') {
      return `translateX(${offset}px)`;
    }
    return `translateY(${offset}px)`;
  };

  return (
    <div
      ref={elementRef}
      className={className}
      style={{
        transform: getTransformStyle(),
        transition: 'transform 0.1s ease-out',
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  );
};

export default Parallax;
