import { useState, useEffect } from 'react';

interface ScreenSizeState {
  width: number;
  height: number;
  lessThan: (breakpoint: string) => boolean;
  greaterThan: (breakpoint: string) => boolean;
  between: (minBreakpoint: string, maxBreakpoint: string) => boolean;
}

// Define breakpoints (in pixels)
const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

type Breakpoint = keyof typeof breakpoints;

/**
 * A hook that provides the current screen size and utility functions
 * to check if the screen size is within certain breakpoints.
 */
const useScreenSize = (): ScreenSizeState => {
  const [screenSize, setScreenSize] = useState<ScreenSizeState>({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    lessThan: () => false,
    greaterThan: () => false,
    between: () => false,
  });

  useEffect(() => {
    // Function to update screen size
    const updateScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Function to check if screen is less than a breakpoint
      const lessThan = (breakpoint: string) => {
        const bp = breakpoints[breakpoint as Breakpoint];
        return width < bp;
      };

      // Function to check if screen is greater than a breakpoint
      const greaterThan = (breakpoint: string) => {
        const bp = breakpoints[breakpoint as Breakpoint];
        return width > bp;
      };

      // Function to check if screen is between two breakpoints
      const between = (minBreakpoint: string, maxBreakpoint: string) => {
        const minBp = breakpoints[minBreakpoint as Breakpoint];
        const maxBp = breakpoints[maxBreakpoint as Breakpoint];
        return width >= minBp && width < maxBp;
      };

      setScreenSize({
        width,
        height,
        lessThan,
        greaterThan,
        between,
      });
    };

    // Initial update
    updateScreenSize();

    // Add event listener for window resize
    window.addEventListener('resize', updateScreenSize);

    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('resize', updateScreenSize);
    };
  }, []);

  return screenSize;
};

export default useScreenSize;
