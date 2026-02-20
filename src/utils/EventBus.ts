import Phaser from 'phaser';

// Singleton event emitter for cross-scene communication.
// Scenes emit events here; other scenes listen without holding direct references.
// This avoids tight coupling via scene.get() or the Phaser registry.
export const EventBus = new Phaser.Events.EventEmitter();
