import React, { useEffect, useRef } from 'react';
import { PixiFarmRenderer } from '../renderer/PixiFarmRenderer';
import { useGameStore } from '../store/useGameStore';

export const FarmCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<PixiFarmRenderer | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const gridSize = useGameStore((s) => s.gridSize);
  const tiles = useGameStore((s) => s.tiles);
  const drone = useGameStore((s) => s.drone);
  const ticks = useGameStore((s) => s.ticks);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const renderer = new PixiFarmRenderer();
    rendererRef.current = renderer;

    const width = containerRef.current.clientWidth || 500;
    const height = containerRef.current.clientHeight || 500;

    renderer.init(canvasRef.current, width, height).then(() => {
      renderer.renderFarm(gridSize, tiles, drone, ticks);
    });

    const handleResize = () => {
      if (containerRef.current && rendererRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        rendererRef.current.resize(w, h);
        rendererRef.current.renderFarm(gridSize, tiles, drone, ticks);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.destroy();
    };
  }, []);

  // Continuous render sync
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.renderFarm(gridSize, tiles, drone, ticks);
    }
  }, [gridSize, tiles, drone, ticks]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative rounded-lg overflow-hidden border border-[var(--color-border)] bg-[var(--color-night)] flex items-center justify-center shadow-inner"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

