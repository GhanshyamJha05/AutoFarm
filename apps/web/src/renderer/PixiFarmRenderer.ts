import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { FarmTile, SoilType } from '@autofarm/simulation';

export class PixiFarmRenderer {
  private app: Application | null = null;
  private container: Container | null = null;
  private tileGraphics: Map<string, Graphics> = new Map();
  private droneGraphic: Container | null = null;
  private cropGraphics: Map<string, Container> = new Map();
  private tileSize = 64;

  public async init(canvas: HTMLCanvasElement, width: number, height: number): Promise<void> {
    this.app = new Application();
    await this.app.init({
      canvas,
      width,
      height,
      backgroundColor: 0x17251d,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true,
    });

    this.container = new Container();
    this.app.stage.addChild(this.container);
  }

  public resize(width: number, height: number): void {
    if (this.app) {
      this.app.renderer.resize(width, height);
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
        let color = 0x3d5a45; // Grass
        if (tile.soil === 'tilled') color = 0x5a3e2b; // Brown dirt
        if (tile.soil === 'hydrated') color = 0x3b4239; // Dark wet soil

        g.rect(x * this.tileSize, y * this.tileSize, this.tileSize - 2, this.tileSize - 2);
        g.fill(color);

        // Grid outline
        g.stroke({ width: 1, color: 0x243328 });

        // Moisture indicator strip
        if (tile.moisture > 0) {
          const moistureH = Math.min(this.tileSize - 4, (tile.moisture / 100) * (this.tileSize - 4));
          g.rect(
            x * this.tileSize + 2,
            y * this.tileSize + this.tileSize - 2 - moistureH,
            3,
            moistureH
          );
          g.fill(0x56a3a6);
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
          const scale = 0.3 + (tile.crop.growth / 100) * 0.7;

          let cropColor = 0xa8ce79; // Hay green/yellow
          if (tile.crop.type === 'hay') cropColor = tile.crop.isMature ? 0xf3c875 : 0xa8ce79;
          if (tile.crop.type === 'carrot') cropColor = tile.crop.isMature ? 0xe67e22 : 0x7cb342;
          if (tile.crop.type === 'sunflower') cropColor = 0xffd54f;
          if (tile.crop.type === 'pumpkin') cropColor = tile.crop.isMature ? 0xd35400 : 0x85929e;
          if (tile.crop.type === 'treasure_maize') cropColor = 0xf1c40f;
          if (tile.crop.type === 'companion_herb') cropColor = 0x9b59b6;

          // Crop circle / sprite shape
          cropG.circle(centerX, centerY, (this.tileSize / 3) * scale);
          cropG.fill(cropColor);

          // Maturity glow or petal count
          if (tile.crop.isMature) {
            cropG.circle(centerX, centerY, (this.tileSize / 3) * scale + 2);
            cropG.stroke({ width: 2, color: 0xffffff });
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
      // Draw stylized high-tech quadcopter drone
      droneBody.circle(0, 0, 14);
      droneBody.fill(0x38bdf8); // Sky blue neon core
      droneBody.stroke({ width: 3, color: 0xffffff });

      // Rotors
      droneBody.rect(-18, -18, 6, 6);
      droneBody.rect(12, -18, 6, 6);
      droneBody.rect(-18, 12, 6, 6);
      droneBody.rect(12, 12, 6, 6);
      droneBody.fill(0xe2e8f0);

      // Facing indicator arrow
      droneBody.poly([0, -14, 6, -6, -6, -6]);
      droneBody.fill(0xf43f5e);

      this.droneGraphic.addChild(droneBody);
      this.container.addChild(this.droneGraphic);
    }

    const targetX = droneState.x * this.tileSize + this.tileSize / 2;
    const targetY = droneState.y * this.tileSize + this.tileSize / 2;

    // Smooth movement interpolation or instant positioning
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

