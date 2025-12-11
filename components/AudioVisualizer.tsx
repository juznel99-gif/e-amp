import React, { useRef, useEffect } from 'react';

export type VisualizerStyle = 'gradient' | 'neon' | 'classic' | 'onepunch';

interface AudioVisualizerProps {
  analyserNode: AnalyserNode | null;
  style: VisualizerStyle;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ analyserNode, style }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameIdRef = useRef<number>(0);

  // Effect for handling canvas resizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    // Create an observer to watch for size changes on the parent element
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Update canvas drawing buffer size to match the element's CSS size
        canvas.width = width;
        canvas.height = height;
      }
    });

    resizeObserver.observe(parent);

    // Set initial size
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;

    // Cleanup observer on component unmount
    return () => {
      resizeObserver.disconnect();
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount

  // Effect for drawing the visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    // Don't start drawing if the canvas or analyserNode isn't ready
    if (!canvas || !analyserNode) return;

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameIdRef.current = requestAnimationFrame(draw);

      analyserNode.getByteFrequencyData(dataArray);

      // Width and height are now always up-to-date thanks to the ResizeObserver
      const { width, height } = canvas;
      canvasCtx.clearRect(0, 0, width, height);

      // Reset effects for each frame
      canvasCtx.shadowBlur = 0;
      canvasCtx.shadowColor = 'transparent';

      switch (style) {
        case 'onepunch':
          const opGradient = canvasCtx.createLinearGradient(0, 0, 0, height);
          opGradient.addColorStop(0, '#facc15'); // yellow-400
          opGradient.addColorStop(1, '#dc2626'); // red-600
          canvasCtx.fillStyle = opGradient;
          canvasCtx.shadowBlur = 15;
          canvasCtx.shadowColor = '#facc15';
          break;
        case 'neon':
          const neonColor = '#00f6ff';
          canvasCtx.fillStyle = neonColor;
          canvasCtx.shadowBlur = 15;
          canvasCtx.shadowColor = neonColor;
          break;
        case 'classic':
          canvasCtx.fillStyle = '#33ff00'; // Classic green
          break;
        case 'gradient':
        default:
          const gradient = canvasCtx.createLinearGradient(0, 0, 0, height);
          gradient.addColorStop(0, '#06b6d4'); // cyan-500
          gradient.addColorStop(0.5, '#6366f1'); // indigo-500
          gradient.addColorStop(1, '#ec4899'); // pink-500
          canvasCtx.fillStyle = gradient;
          break;
      }

      const barWidth = width / bufferLength;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * height;
        
        const barVisualWidth = style === 'classic' ? barWidth * 0.7 : barWidth * 0.9;
        canvasCtx.fillRect(x, height - barHeight, barVisualWidth, barHeight);

        x += barWidth;
      }
    };

    draw();

    // Cleanup function to cancel the animation frame and clear the canvas
    return () => {
      cancelAnimationFrame(animationFrameIdRef.current);
      if(canvasCtx){
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [analyserNode, style]); // Rerun this effect if the analyser or style changes

  // The canvas element no longer needs width/height attributes here; they are managed by the effect.
  return <canvas ref={canvasRef} className="w-full h-full" />;
};

export default AudioVisualizer;