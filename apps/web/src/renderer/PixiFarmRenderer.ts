import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { FarmTile } from '@autofarm/simulation';

interface Particle {
  g: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  life: number;
  color: number;
}

export class PixiFarmRenderer {
  private app: Application | null = null;
  private container: Container | null = null;
  private tileGraphics: Map<string, Graphics> = new Map();
  private droneGraphic: Container | null = null;
  private cropGraphics: Map<string, Container> = new Map();
  private particles: Particle[] = [];
  private particleContainer: Container | null = null;
  private ambientSkyOverlay: Graphics | null = null;
  private tileSize = 64;

  public async init(canvas: HTMLCanvasElement, width: number, height: number): Promise<void> {
    this.app = new Application();
    await this.app.init({
      canvas,
      width,
      height,
      backgroundColor: 0x141e18,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true,
    });

    this.container = new Container();
    this.app.stage.addChild(this.container);

    this.particleContainer = new Container();
    this.app.stage.addChild(this.particleContainer);

    this.ambientSkyOverlay = new Graphics();
    this.app.stage.addChild(this.ambientSkyOverlay);

    // Pixi Ticker for fluid particles and animations
    this.app.ticker.add((ticker) => {
      this.updateParticles(ticker.deltaTime);
    });
  }

  public resize(width: number, height: number): void {
    if (this.app) {
      this.app.renderer.resize(width, height);
      if (this.ambientSkyOverlay) {
        this.ambientSkyOverlay.clear();
        this.ambientSkyOverlay.rect(0, 0, width, height);
      }
    }
  }

  /**
   * Spawn particle burst on harvest or action
   */
  public spawnBurst(x: number, y: number, color: number = 0xf59e0b, count: number = 10): void {
    if (!this.particleContainer) return;

    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      g.circle(0, 0, 3 + Math.random() * 2);
      g.fill(color);
      this.particleContainer.addChild(g);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;

      this.particles.push({
        g,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2, // slight upward float
        alpha: 1,
        life: 25 + Math.random() * 20,
        color,
      });
    }
  }

  private updateParticles(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.vy += 0.1 * delta; // gravity
      p.life -= delta;
      p.alpha = Math.max(0, p.life / 40);

      p.g.x = p.x;
      p.g.y = p.y;
      p.g.alpha = p.alpha;

      if (p.life <= 0) {
        this.particleContainer?.removeChild(p.g);
        p.g.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  public renderFarm(
    gridSize: number,
    tiles: FarmTile[][],
    droneState: { x: number; y: number; facing: string },
    currentTick: number
  ): void {
    if (!this.container || !this.app) return;

    // Center the grid inside the canvas
    const gridPixelWidth = gridSize * this.tileSize;
    const gridPixelHeight = gridSize * this.tileSize;
    const offsetX = Math.floor((this.app.screen.width - gridPixelWidth) / 2);
    const offsetY = Math.floor((this.app.screen.height - gridPixelHeight) / 2);

    this.container.x = offsetX;
    this.container.y = offsetY;

    // Ambient day/night tint overlay tied to ticks (cycle every 2400 ticks)
    if (this.ambientSkyOverlay) {
      this.ambientSkyOverlay.clear();
      const cycleProgress = (currentTick % 2400) / 2400; // 0 to 1
      // Calculate night factor (peak darkness at midnight = 0.5)
      const nightFactor = Math.sin(cycleProgress * Math.PI * 2);
      if (nightFactor > 0.1) {
        // Evening / night tint
        this.ambientSkyOverlay.rect(0, 0, this.app.screen.width, this.app.screen.height);
        this.ambientSkyOverlay.fill({ color: 0x090f1f, alpha: nightFactor * 0.35 });
      } else if (nightFactor < -0.3) {
        // Warm sunset tint
        this.ambientSkyOverlay.rect(0, 0, this.app.screen.width, this.app.screen.height);
        this.ambientSkyOverlay.fill({ color: 0xff8c00, alpha: Math.abs(nightFactor) * 0.12 });
      }
    }

    // Render Tiles
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const key = `${x},${y}`;
        const tile = tiles[y]?.[x];
        if (!tile) continue;

        let g = this.tileGraphics.get(key);
        if (!g) {
          g = new Graphics();
          this.container.addChild(g);
          this.tileGraphics.set(key, g);
        }

        g.clear();

        // Base soil color
        let color = 0x2e4734; // Deep pasture grass
        if (tile.soil === 'tilled') color = 0x5a3e2b; // Rich tilled loam
        if (tile.soil === 'hydrated') color = 0x364335; // Wet nutrient-rich soil

        g.roundRect(x * this.tileSize, y * this.tileSize, this.tileSize - 2, this.tileSize - 2, 6);
        g.fill(color);

        // Tile border
        g.stroke({ width: 1, color: 0x1f2f24 });

        // Moisture indicator strip
        if (tile.moisture > 0) {
          const moistureH = Math.min(this.tileSize - 6, (tile.moisture / 100) * (this.tileSize - 6));
          g.roundRect(
            x * this.tileSize + 3,
            y * this.tileSize + this.tileSize - 3 - moistureH,
            3,
            moistureH,
            1.5
          );
          g.fill(0x38bdf8);
        }

        // Render Crops
        let cropContainer = this.cropGraphics.get(key);
        if (!cropContainer) {
          cropContainer = new Container();
          this.container.addChild(cropContainer);
          this.cropGraphics.set(key, cropContainer);
        }
        cropContainer.removeChildren();

        if (tile.crop) {
          const cropG = new Graphics();
          const centerX = x * this.tileSize + this.tileSize / 2;
          const centerY = y * this.tileSize + this.tileSize / 2;
          const scale = 0.35 + (tile.crop.growth / 100) * 0.65;

          let cropColor = 0xa8ce79; // Hay green/yellow
          if (tile.crop.type === 'hay') cropColor = tile.crop.isMature ? 0xf59e0b : 0x84cc16;
          if (tile.crop.type === 'carrot') cropColor = tile.crop.isMature ? 0xf97316 : 0x22c55e;
          if (tile.crop.type === 'sunflower') cropColor = 0xfacc15;
          if (tile.crop.type === 'pumpkin') cropColor = tile.crop.isMature ? 0xea580c : 0x64748b;
          if (tile.crop.type === 'treasure_maize') cropColor = 0xeab308;
          if (tile.crop.type === 'companion_herb') cropColor = 0xa855f7;

          // Crop circle / stylized fruit
          cropG.circle(centerX, centerY, (this.tileSize / 3) * scale);
          cropG.fill(cropColor);

          // Maturity glow aura
          if (tile.crop.isMature) {
            cropG.circle(centerX, centerY, (this.tileSize / 3) * scale + 3);
            cropG.stroke({ width: 2, color: 0xffffff, alpha: 0.85 });
          }

          cropContainer.addChild(cropG);

          if (tile.crop.petalCount !== undefined) {
            const text = new Text({
              text: `${tile.crop.petalCount}`,
              style: new TextStyle({
                fontFamily: 'monospace',
                fontSize: 10,
                fill: 0x000000,
                fontWeight: 'bold',
              }),
            });
            text.x = centerX - 4;
            text.y = centerY - 5;
            cropContainer.addChild(text);
          }
        }
      }
    }

    // Render Drone
    if (!this.droneGraphic) {
      this.droneGraphic = new Container();
      const droneBody = new Graphics();
      // Stylized high-tech quadcopter drone
      droneBody.circle(0, 0, 15);
      droneBody.fill(0x0ea5e9); // Electric cyan core
      droneBody.stroke({ width: 3, color: 0xffffff });

      // Rotors
      droneBody.roundRect(-20, -20, 7, 7, 2);
      droneBody.roundRect(13, -20, 7, 7, 2);
      droneBody.roundRect(-20, 13, 7, 7, 2);
      droneBody.roundRect(13, 13, 7, 7, 2);
      droneBody.fill(0xf1f5f9);

      // Facing indicator arrow
      droneBody.poly([0, -16, 7, -7, -7, -7]);
      droneBody.fill(0xf43f5e);

      this.droneGraphic.addChild(droneBody);
      this.container.addChild(this.droneGraphic);
    }

    const targetX = droneState.x * this.tileSize + this.tileSize / 2;
    const targetY = droneState.y * this.tileSize + this.tileSize / 2;

    this.droneGraphic.x = targetX;
    this.droneGraphic.y = targetY;

    // Rotate facing indicator
    if (droneState.facing === 'north') this.droneGraphic.rotation = 0;
    if (droneState.facing === 'east') this.droneGraphic.rotation = Math.PI / 2;
    if (droneState.facing === 'south') this.droneGraphic.rotation = Math.PI;
    if (droneState.facing === 'west') this.droneGraphic.rotation = -Math.PI / 2;
  }

  public destroy(): void {
    if (this.app) {
      this.app.destroy(true, { children: true });
      this.app = null;
    }
  }
}
