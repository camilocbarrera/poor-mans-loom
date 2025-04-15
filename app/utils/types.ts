// Custom type definitions for the application

// Extend CanvasRenderingContext2D to include roundRect method polyfill
declare global {
  interface CanvasRenderingContext2D {
    roundRect(x: number, y: number, width: number, height: number, radius: number): CanvasRenderingContext2D;
  }
}

export {}; 