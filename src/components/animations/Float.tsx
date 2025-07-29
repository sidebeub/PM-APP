import React, { useEffect, useRef } from 'react';

interface FloatProps {
  children: React.ReactNode;
  speed?: number;
  amplitude?: number;
  className?: string;
}

const Float: React.FC<FloatProps> = ({
  children,
  speed = 0.5,
  amplitude = 5,
  className,
  ...props
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const animate = () => {
      if (elementRef.current) {
        timeRef.current += speed * 0.01;
        const yPosition = Math.sin(timeRef.current) * amplitude;
        // Add a slight rotation for more noticeable effect
        const rotation = Math.sin(timeRef.current) * (amplitude / 2);
        
        elementRef.current.style.transform = `translateY(${yPosition}px) rotate(${rotation}deg)`;
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start with a random position in the animation cycle
    timeRef.current = Math.random() * Math.PI * 2;
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [speed, amplitude]);
  
  return (
    <div
      ref={elementRef}
      className={className}
      style={{ display: 'inline-block', transition: 'transform 0.1s ease-out' }}
      {...props}
    >
      {children}
    </div>
  );
};

export default Float;
