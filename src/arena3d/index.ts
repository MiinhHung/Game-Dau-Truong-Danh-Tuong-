/**
 * Barrel export tập trung cho toàn bộ các mô-đun trong arena3d.
 * Giúp việc import giữa các phần và từ ngoài vào trở nên trực quan và gọn gàng.
 */

// Core & Game loop
export * from './arenaTypes';
export { Arena } from './arena';
export { LobbyScene } from './lobby';

// Networking & Online
export { NetClient, CODE_RE, normalizeServerUrl, defaultServerUrl } from './net';
export { OnlineUI, type StartInfo, type OnlineHooks } from './online';

// Systems, Data & Progression
export * from './data';
export * from './save';
export * from './stats';
export * from './cards';
export * from './quests';
export * from './shop';
export * from './settings';
export * from './sfx';

// 3D World & Rendering
export * from './models';
export * from './glbAvatar';
export * from './world';
export * from './worldKit';
export * from './biomes';
export * from './hazards';
export * from './swamp';
export * from './ambience';
export * from './eskillFx';

// UI & Controls
export * from './ui';
export * from './touch';
