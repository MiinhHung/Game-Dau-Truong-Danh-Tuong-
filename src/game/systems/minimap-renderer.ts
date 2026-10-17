import * as THREE from 'three';
import { BIOMES } from '../../rendering/biomes/biomes';
import type { ArenaWorld } from '../../rendering/world/arena-world';
import type { Actor } from '../types';

export interface MinimapMonsterTarget {
  pos: THREE.Vector3;
  def: { boss?: boolean };
  dead?: boolean;
  affix?: number;
}

/**
 * Hệ thống vẽ bản đồ nhỏ 2D (HTML5 Canvas).
 * Hiển thị vị trí người chơi, đồng đội, quái thường, quái tinh anh và Boss.
 */
export class MinimapRenderer {
  private miniCtx: CanvasRenderingContext2D | null | undefined = undefined;
  private miniT = 0;

  constructor(private canvasId = 'minimap') {}

  reset(): void {
    this.miniCtx = undefined;
    this.miniT = 0;
  }

  draw(
    dt: number,
    world: ArenaWorld,
    arenaRadius: number,
    actors: Map<string, Actor>,
    me: Actor | null,
    monsters: MinimapMonsterTarget[],
  ): void {
    this.miniT -= dt;
    if (this.miniT > 0) return;
    this.miniT = 0.08;

    if (this.miniCtx === undefined) {
      const cv = document.getElementById(this.canvasId) as HTMLCanvasElement | null;
      this.miniCtx = cv ? cv.getContext('2d') : null;
    }
    const g = this.miniCtx;
    if (!g) return;

    const S = g.canvas.width;
    const R = S / 2;
    const k = (R - 8) / arenaRadius;
    const def = BIOMES[Math.max(0, world.biome)];

    g.clearRect(0, 0, S, S);
    g.save();
    g.beginPath();
    g.arc(R, R, R - 1, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = 'rgba(12,8,5,0.82)';
    g.fillRect(0, 0, S, S);
    g.fillStyle = def.mini;
    g.globalAlpha = 0.55;
    g.beginPath();
    g.arc(R, R, arenaRadius * k, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(255,255,255,0.28)';
    for (const o of world.obstacles) {
      g.beginPath();
      g.arc(R + o.x * k, R + o.z * k, Math.max(1.2, o.r * k), 0, Math.PI * 2);
      g.fill();
    }
    // vòng lưới
    g.strokeStyle = 'rgba(240,217,138,0.18)';
    g.lineWidth = 1;
    for (const f of [0.33, 0.66, 1]) {
      g.beginPath();
      g.arc(R, R, arenaRadius * k * f, 0, Math.PI * 2);
      g.stroke();
    }

    const dot = (x: number, z: number, r: number, col: string, ring?: string): void => {
      g.beginPath();
      g.arc(R + x * k, R + z * k, r, 0, Math.PI * 2);
      g.fillStyle = col;
      g.fill();
      if (ring) {
        g.strokeStyle = ring;
        g.lineWidth = 1.5;
        g.stroke();
      }
    };

    for (const m of monsters) {
      if (m.dead) continue;
      if (m.def.boss) dot(m.pos.x, m.pos.z, 5.5, '#ff8a20', '#fff2c0');
      else if (m.affix) dot(m.pos.x, m.pos.z, 3.2, '#ffd24a');
      else dot(m.pos.x, m.pos.z, 2.4, '#ff3a3a');
    }

    for (const a of actors.values()) {
      if (a === me) continue;
      dot(a.pos.x, a.pos.z, 3.6, a.alive ? '#5ae0ff' : '#667', '#0a2a38');
    }

    if (me) {
      const px = R + me.pos.x * k;
      const pz = R + me.pos.z * k;
      g.save();
      g.translate(px, pz);
      g.rotate(-me.yaw + Math.PI);
      g.beginPath();
      g.moveTo(0, -7);
      g.lineTo(4.5, 4);
      g.lineTo(-4.5, 4);
      g.closePath();
      g.fillStyle = me.alive ? '#ffffff' : '#889';
      g.fill();
      g.strokeStyle = '#f0c84a';
      g.lineWidth = 1.5;
      g.stroke();
      g.restore();
    }

    g.restore();
    g.strokeStyle = '#c8963e';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(R, R, R - 1.5, 0, Math.PI * 2);
    g.stroke();
  }
}
