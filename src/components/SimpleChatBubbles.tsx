
import { useRef, useEffect } from 'react';

interface BubbleSceneProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export const BubbleScene = ({ canvasRef }: BubbleSceneProps) => {
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Get canvas context
    const ctx = canvasRef.current.getContext('2d');
    
    if (!ctx) return;
    
    // Set canvas size
    const resizeCanvas = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Create bubbles
    const bubbles: {
      x: number;
      y: number;
      radius: number;
      color: string;
      speedX: number;
      speedY: number;
    }[] = [];
    
    const bubbleCount = 30;
    
    for (let i = 0; i < bubbleCount; i++) {
      // Changed color to use red hues (0-30 degrees in HSL)
      bubbles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: 5 + Math.random() * 20,
        // Changed from purple (240+) to red (0-30) hues
        color: `hsla(${Math.random() * 30}, 70%, 70%, ${0.1 + Math.random() * 0.2})`,
        speedX: Math.random() * 0.5 - 0.25,
        speedY: Math.random() * 0.5 - 0.25
      });
    }
    
    // Animation loop
    const animate = () => {
      if (!canvasRef.current || !ctx) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Draw and update bubbles
      bubbles.forEach(bubble => {
        // Draw bubble
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.fillStyle = bubble.color;
        ctx.fill();
        
        // Update position
        bubble.x += bubble.speedX;
        bubble.y += bubble.speedY;
        
        // Bounce off edges
        if (bubble.x < 0 || bubble.x > canvasRef.current!.width) {
          bubble.speedX *= -1;
        }
        
        if (bubble.y < 0 || bubble.y > canvasRef.current!.height) {
          bubble.speedY *= -1;
        }
      });
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [canvasRef]);
  
  return null;
};
