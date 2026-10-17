/**
 * Barrel export tập trung cho toàn bộ ứng dụng Hồn Việt 3D.
 * Cung cấp public API chuẩn mực giữa các tầng kiến trúc.
 */

// Configuration & Shared
export * from './config/env';
export * from './config/storage-keys';
export * from './config/game-constants';
export * from './shared/logger';

// Game Engine & Types
export * from './game/types';
export { Arena } from './game/arena';

// Domain: Data, Combat & Progression
export * from './domain/data';
export * from './domain/combat/stats';
export * from './domain/combat/cards';
export * from './domain/progression/quests';
export * from './domain/progression/shop';

// Infrastructure: Network, Persistence & Audio
export * from './infrastructure/network/net-client';
export * from './infrastructure/persistence/save-repository';
export * from './infrastructure/persistence/settings-repository';
export * from './infrastructure/audio/sfx-engine';
export * from './infrastructure/audio/ambience-engine';

// Rendering & 3D World
export * from './rendering/primitives/shapes';
export * from './rendering/models/models';
export * from './rendering/loaders/glb-avatar';
export * from './rendering/world/arena-world';
export * from './rendering/world/world-kit';
export * from './rendering/biomes/biomes';
export * from './rendering/fx/hazards';
export * from './rendering/fx/eskill-fx';
export * from './rendering/shaders/swamp';

// UI & Controls
export * from './ui/screens/hud';
export * from './ui/screens/lobby-scene';
export * from './ui/screens/online-modal';
export * from './ui/input/touch-controls';
