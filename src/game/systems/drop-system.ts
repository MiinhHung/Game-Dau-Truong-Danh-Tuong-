import * as THREE from 'three';
import { buildBanhChung, buildCoin } from '../../rendering/models/models';
import type { Actor, Coin } from '../types';

export interface DropCallbacks {
  nearestActor(p: THREE.Vector3): Actor | null;
  creditGold(a: Actor, amount: number): void;
  onHeal(a: Actor, amountRatio: number): void;
}

/**
 * Hệ thống rơi và nhặt vật phẩm trong trận đấu:
 * - Tiền vàng (Coin)
 * - Bánh chưng hồi máu (Heal pickup)
 * - Cơ chế hút nam châm (magnet homing) khi lại gần người chơi
 */
export class DropSystem {
  coins: Coin[] = [];
  private coinTemplate: THREE.Mesh;
  private nextId = 1;

  constructor(private scene: THREE.Scene) {
    this.coinTemplate = buildCoin();
  }

  clear(): void {
    for (const c of this.coins) {
      this.scene.remove(c.mesh);
    }
    this.coins = [];
  }

  spawnCoin(at: THREE.Vector3, value: number): void {
    const mesh = this.coinTemplate.clone();
    mesh.position.set(at.x, 0.9, at.z);
    const a = Math.random() * Math.PI * 2;
    const s = 2 + Math.random() * 3.5;
    this.scene.add(mesh);
    this.coins.push({
      id: this.nextId++,
      mesh,
      vel: new THREE.Vector3(Math.cos(a) * s, 5 + Math.random() * 3, Math.sin(a) * s),
      value,
      age: 0,
    });
  }

  spawnHeal(at: THREE.Vector3): void {
    const mesh = buildBanhChung();
    mesh.position.set(at.x, 0.9, at.z);
    this.scene.add(mesh);
    this.coins.push({
      id: this.nextId++,
      mesh,
      vel: new THREE.Vector3((Math.random() - 0.5) * 3, 6, (Math.random() - 0.5) * 3),
      value: 0.3,
      age: 0,
      heal: true,
    });
  }

  update(dt: number, cb: DropCallbacks): void {
    for (const c of this.coins) {
      c.age += dt;
      const p = c.mesh.position;
      const near = cb.nearestActor(p);
      const toP = near ? new THREE.Vector3(near.pos.x - p.x, 0.9 - p.y, near.pos.z - p.z) : new THREE.Vector3();
      const d = toP.length();
      const magnet = !!near && c.age > 0.45 && d < (c.heal ? 3.5 : 6);

      if (magnet && near) {
        p.addScaledVector(toP.normalize(), (10 + c.age * 6) * dt);
        if (d < 1.1) {
          c.age = -1;
          if (c.heal) {
            cb.onHeal(near, c.value);
          } else {
            cb.creditGold(near, c.value);
          }
        }
      } else {
        c.vel.y -= 22 * dt;
        p.addScaledVector(c.vel, dt);
        if (p.y < 0.35) {
          p.y = 0.35;
          c.vel.y = Math.abs(c.vel.y) * 0.35;
          c.vel.x *= 0.7;
          c.vel.z *= 0.7;
        }
      }

      if (c.heal) c.mesh.rotation.y += dt * 2;
      else c.mesh.rotation.z += dt * 5;
    }

    for (const c of this.coins) {
      if (c.age < 0) this.scene.remove(c.mesh);
    }
    this.coins = this.coins.filter((c) => c.age >= 0);
  }
}
