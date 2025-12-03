import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  isAiSpeaking: boolean;
  analyser: AnalyserNode | null;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ 
  isActive, 
  isAiSpeaking,
  analyser
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);
  
  // Adjusted colors for the "Orange/Purple" Mobile Theme
  const blobsRef = useRef([
    { r: 0, speed: 0.3, offset: 0, color: [249, 115, 22] },   // Orange
    { r: 0, speed: 0.5, offset: 2, color: [147, 51, 234] },  // Purple
    { r: 0, speed: 0.2, offset: 4, color: [236, 72, 153] },  // Pink
    { r: 0, speed: 0.4, offset: 1, color: [245, 158, 11] },  // Amber
    { r: 0, speed: 0.6, offset: 3, color: [99, 102, 241] },  // Indigo
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use ResizeObserver for perfect sizing without cutting
    const observer = new ResizeObserver((entries) => {
       const entry = entries[0];
       if (entry) {
         // Use dpr for sharp rendering
         const dpr = window.devicePixelRatio || 1;
         const { width, height } = entry.contentRect;
         
         canvas.width = width * dpr;
         canvas.height = height * dpr;
         
         // Fix CSS size
         canvas.style.width = `${width}px`;
         canvas.style.height = `${height}px`;
         
         ctx.scale(dpr, dpr);
       }
    });
    
    observer.observe(container);

    // Safe buffer length check
    const bufferLength = analyser ? analyser.frequencyBinCount : 0;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      // Re-get dimensions from style in case dpr changed or init lag
      const width = parseFloat(canvas.style.width) || canvas.width;
      const height = parseFloat(canvas.style.height) || canvas.height;

      if (!width || !height) {
         animationRef.current = requestAnimationFrame(render);
         return;
      }

      const centerX = width / 2;
      const centerY = height / 2;

      // GET VOLUME
      let volume = 0;
      if (analyser && isActive && bufferLength > 0) {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        const count = Math.floor(bufferLength * 0.5) || 1; 
        for (let i = 0; i < count; i++) {
          sum += dataArray[i];
        }
        volume = sum / count; 
      }
      
      const normVol = volume / 255;
      
      // PHYSICS
      const timeSpeed = (isAiSpeaking ? 0.04 : 0.01) + (normVol * 0.02);
      timeRef.current += timeSpeed;

      ctx.clearRect(0, 0, width, height);
      
      // Additive Blending for Neon Effect
      ctx.globalCompositeOperation = 'screen'; 

      // Dynamic Radius based on screen size (never cut off)
      const minDim = Math.min(width, height);
      const baseRadius = minDim * 0.3; // 30% of screen width

      blobsRef.current.forEach((blob, i) => {
        const t = timeRef.current * blob.speed + blob.offset;
        
        // Organic movement confined to center
        // Amplitude is limited to 20% of screen to prevent clipping
        const moveAmp = (minDim * 0.15) + (normVol * 50);
        
        // Variation in movement pattern
        const offsetX = Math.cos(t + i) * moveAmp;
        const offsetY = Math.sin(t * 1.5 + i) * moveAmp;

        const x = centerX + offsetX;
        const y = centerY + offsetY;

        // Radius Expansion
        let calculatedRadius = baseRadius * 0.8 + (Math.sin(t * 3) * 10);
        
        if (isAiSpeaking) {
           calculatedRadius += normVol * (minDim * 0.4); 
        } else {
           calculatedRadius += normVol * (minDim * 0.2); 
        }

        const radius = Math.max(1, calculatedRadius);

        const [r, g, b] = blob.color;
        
        try {
          // Draw Gradient Orb
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
          
          const alpha = 0.6 + (normVol * 0.4);
          
          gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
          gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${alpha * 0.2})`);
          gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        } catch (e) {
           // Prevent crash
        }
      });

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      observer.disconnect();
    };
  }, [isActive, isAiSpeaking, analyser]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
       <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};

export default AudioVisualizer;