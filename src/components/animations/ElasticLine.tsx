import React, { useState, useEffect, useRef } from 'react';

interface Point {
  x: number;
  y: number;
}

interface ElasticLineProps {
  color?: string;
  thickness?: number;
  tension?: number; // Higher values make the line more elastic (0-1)
  damping?: number; // Higher values make the line settle faster (0-1)
  points?: number; // Number of control points in the line
  className?: string;
}

const ElasticLine: React.FC<ElasticLineProps> = ({
  color = '#1976d2',
  thickness = 2,
  tension = 0.5,
  damping = 0.5,
  points = 15,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const mousePos = useRef<Point>({ x: 0, y: 0 });
  const controlPointsRef = useRef<Point[]>([]);
  const [targetPoints, setTargetPoints] = useState<Point[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const isInitialized = useRef(false);

  // Initialize control points
  useEffect(() => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    setCanvasSize({ width, height });
    
    // Create initial control points along a horizontal line
    const initialPoints: Point[] = [];
    const initialTargets: Point[] = [];
    
    for (let i = 0; i < points; i++) {
      const x = (width / (points - 1)) * i;
      const y = height / 2;
      initialPoints.push({ x, y });
      initialTargets.push({ x, y });
    }
    
    controlPointsRef.current = initialPoints;
    setTargetPoints(initialTargets);
    isInitialized.current = true;
    
    // Set up resize handler
    const handleResize = () => {
      if (!containerRef.current) return;
      
      const newRect = containerRef.current.getBoundingClientRect();
      const newWidth = newRect.width;
      const newHeight = newRect.height;
      
      setCanvasSize({ width: newWidth, height: newHeight });
      
      // Reposition points proportionally
      const widthRatio = newWidth / width;
      const heightRatio = newHeight / height;
      
      controlPointsRef.current = controlPointsRef.current.map(point => ({
        x: point.x * widthRatio,
        y: point.y * heightRatio
      }));
      
      setTargetPoints(prevTargets => 
        prevTargets.map(point => ({
          x: point.x * widthRatio,
          y: point.y * heightRatio
        }))
      );
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [points]);

  // Handle mouse movement
  useEffect(() => {
    if (!containerRef.current || !isInitialized.current) return;
    
    // Reset line to original position
    const resetLine = () => {
      setTargetPoints(prevTargets => {
        return prevTargets.map((_, index) => {
          const originalX = (canvasSize.width / (points - 1)) * index;
          const originalY = canvasSize.height / 2;
          return { x: originalX, y: originalY };
        });
      });
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      
      // Check if mouse is within the container bounds
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        // Mouse is outside container, reset the line
        resetLine();
        return;
      }
      
      mousePos.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      // Update target positions based on mouse position
      setTargetPoints(prevTargets => {
        return prevTargets.map((target, index) => {
          const pointPosition = index / (points - 1);
          const distanceFromMouse = Math.abs(pointPosition - mousePos.current.x / canvasSize.width);
          const influence = Math.max(0, 1 - distanceFromMouse * 2);
          
          // Original horizontal position
          const originalX = (canvasSize.width / (points - 1)) * index;
          
          // Calculate new target position with influence from mouse
          return {
            x: originalX,
            y: canvasSize.height / 2 + (mousePos.current.y - canvasSize.height / 2) * influence * tension
          };
        });
      });
    };
    
    // Handle mouse leaving the window entirely
    const handleMouseLeave = () => {
      resetLine();
    };
    
    // Handle mouse leaving the container
    const handleMouseOut = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        resetLine();
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    containerRef.current.addEventListener('mouseout', handleMouseOut as EventListener);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (containerRef.current) {
        containerRef.current.removeEventListener('mouseout', handleMouseOut as EventListener);
      }
    };
  }, [canvasSize, points, tension]);

  // Animation loop
  useEffect(() => {
    if (!canvasRef.current || !isInitialized.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    const animate = () => {
      if (!canvasRef.current) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      
      // Only proceed if we have control points and target points
      if (controlPointsRef.current.length > 0 && targetPoints.length > 0 && 
          controlPointsRef.current.length === targetPoints.length) {
        
        // Update control points (move toward target with damping)
        controlPointsRef.current = controlPointsRef.current.map((point, index) => {
          if (!point || !targetPoints[index]) return point;
          
          const target = targetPoints[index];
          return {
            x: point.x + (target.x - point.x) * damping,
            y: point.y + (target.y - point.y) * damping
          };
        });
        
        // Draw the elastic line
        ctx.beginPath();
        
        // Only proceed if we have at least one control point
        if (controlPointsRef.current[0]) {
          ctx.moveTo(controlPointsRef.current[0].x, controlPointsRef.current[0].y);
          
          // Draw curve through control points
          for (let i = 0; i < controlPointsRef.current.length - 1; i++) {
            const current = controlPointsRef.current[i];
            const next = controlPointsRef.current[i + 1];
            
            if (!current || !next) continue;
            
            // Use quadratic curves for smoother line
            const cpX = (current.x + next.x) / 2;
            const cpY = (current.y + next.y) / 2;
            
            ctx.quadraticCurveTo(current.x, current.y, cpX, cpY);
          }
          
          // Connect to the last point
          const last = controlPointsRef.current[controlPointsRef.current.length - 1];
          if (last) {
            ctx.lineTo(last.x, last.y);
          }
          
          // Style and stroke the line
          ctx.strokeStyle = color;
          ctx.lineWidth = thickness;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
        }
      }
      
      // Request next frame
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [canvasSize, targetPoints, color, thickness, damping]);

  return (
    <div ref={containerRef} className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
};

export default ElasticLine;
