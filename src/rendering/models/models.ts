/**
 * Re-export facade for rendering models.
 * Delegates to modular sub-packages:
 * - primitives: basic geometry helpers & material caches
 * - characters: human character rig & avatar construction
 * - weapons: folk weapons & historical weapons
 * - items: projectiles, coins, banh chung pickups
 * - monsters: monster rigs, mythical beasts & war elephants
 */

export * from '../primitives/shapes';
export * from '../characters/human-model';
export * from '../weapons/weapon-models';
export * from '../items/item-models';
export * from '../monsters/monster-models';
