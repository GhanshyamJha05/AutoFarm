import React, { useEffect, useRef } from 'react';
import { FarmTile } from '@autofarm/simulation';
import { useGameStore } from '../store/useGameStore';

export const FarmCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const gridSize = useGameStore((s) => s.gridSize);
  const tiles = useGameStore((s) => s.tiles);
  const drone = useGameStore((s) => s.drone);
  const ticks = useGameStore((s) => s.ticks);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI display
    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth || 500;
    const h = container.clientHeight || 500;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Background clear
    ctx.fillStyle = '#141e18';
    ctx.fillRect(0, 0, w, h);

    // 2. Tile grid math
    // Dynamic tile sizing based on container & grid dimensions
    const maxGridPixel = Math.min(w - 40, h - 40);
    const tileSize = Math.max(32, Math.min(64, Math.floor(maxGridPixel / gridSize)));
    const totalGridWidth = gridSize * tileSize;
    const totalGridHeight = gridSize * tileSize;
    const startX = Math.floor((w - totalGridWidth) / 2);
    const startY = Math.floor((h - totalGridHeight) / 2);

    // 3. Render Tiles
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const tile: FarmTile | undefined = tiles[y]?.[x];
        const tileX = startX + x * tileSize;
        const tileY = startY + y * tileSize;

        // Base tile color
        let soilColor = '#243a2b'; // deep grass
        if (tile?.soil === 'tilled') soilColor = '#4a3323'; // rich loam
        if (tile?.soil === 'hydrated') soilColor = '#2f3b2d'; // hydrated dark soil

        ctx.fillStyle = soilColor;
        ctx.beginPath();
        ctx.roundRect(tileX + 2, tileY + 2, tileSize - 4, tileSize - 4, 6);
        ctx.fill();

        // Border
        ctx.strokeStyle = '#1a291f';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Moisture indicator strip on left
        if (tile && tile.moisture > 0) {
          const mHeight = Math.min(tileSize - 8, ((tile.moisture / 100) * (tileSize - 8)));
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.roundRect(tileX + 4, tileY + tileSize - 4 - mHeight, 3, mHeight, 1.5);
          ctx.fill();
        }

        // Render Crop
        if (tile?.crop) {
          const crop = tile.crop;
          const centerX = tileX + tileSize / 2;
          const centerY = tileY + tileSize / 2;
          const progress = Math.min(1, Math.max(0.2, crop.growth / 100));
          const radius = (tileSize / 3) * (0.4 + progress * 0.6);

          let cropColor = '#84cc16'; // default green
          if (crop.type === 'hay') cropColor = crop.isMature ? '#f59e0b' : '#a3e635';
          if (crop.type === 'carrot') cropColor = crop.isMature ? '#f97316' : '#22c55e';
          if (crop.type === 'sunflower') cropColor = '#eab308';
          if (crop.type === 'pumpkin') cropColor = crop.isMature ? '#ea580c' : '#64748b';
          if (crop.type === 'treasure_maize') cropColor = '#facc15';
          if (crop.type === 'companion_herb') cropColor = '#c084fc';

          // Crop body
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fillStyle = cropColor;
          ctx.fill();

          // Maturity glow
          if (crop.isMature) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius + 3, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Petal count label for sunflowers
          if (crop.petalCount !== undefined) {
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(crop.petalCount), centerX, centerY);
          }
        }
      }
    }

    // 4. Render Drone
    if (drone) {
      const droneCenterX = startX + drone.x * tileSize + tileSize / 2;
      const droneCenterY = startY + drone.y * tileSize + tileSize / 2;

      ctx.save();
      ctx.translate(droneCenterX, droneCenterY);

      // Rotation based on facing
      let angle = 0;
      if (drone.facing === 'east') angle = Math.PI / 2;
      if (drone.facing === 'south') angle = Math.PI;
      if (drone.facing === 'west') angle = -Math.PI / 2;
      ctx.rotate(angle);

      // Drone shadow
      ctx.beginPath();
      ctx.ellipse(2, 4, 18, 14, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fill();

      // Drone Rotors (4 arms)
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(-18, -18, 6, 6);
      ctx.fillRect(12, -18, 6, 6);
      ctx.fillRect(-18, 12, 6, 6);
      ctx.fillRect(12, 12, 6, 6);

      // Crossbars
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-15, -15);
      ctx.lineTo(15, 15);
      ctx.moveTo(15, -15);
      ctx.lineTo(-15, 15);
      ctx.stroke();

      // Core Drone Body
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fillStyle = '#0ea5e9'; // high-tech cyan
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Forward direction arrow
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(6, -6);
      ctx.lineTo(-6, -6);
      ctx.closePath();
      ctx.fillStyle = '#f43f5e'; // red forward beacon
      ctx.fill();

      ctx.restore();
    }

    // 5. Day/Night ambient tint
    const cycleProgress = (ticks % 2400) / 2400;
    const nightFactor = Math.sin(cycleProgress * Math.PI * 2);
    if (nightFactor > 0.1) {
      ctx.fillStyle = `rgba(9, 15, 31, ${nightFactor * 0.35})`;
      ctx.fillRect(0, 0, w, h);
    } else if (nightFactor < -0.3) {
      ctx.fillStyle = `rgba(255, 140, 0, ${Math.abs(nightFactor) * 0.12})`;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
  }, [gridSize, tiles, drone, ticks]);

  // Handle window / container resize
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[300px] flex items-center justify-center bg-[var(--color-night)] rounded-lg overflow-hidden border border-[var(--color-border)] relative"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
