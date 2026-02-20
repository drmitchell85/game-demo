import Phaser from 'phaser';
import { GameState } from '../state/GameState';
import { applyAction } from '../state/reducer';

// Owns the end-of-turn flow: transitioning from PLAYER → ENEMY, waiting 1 second,
// then transitioning back to PLAYER and incrementing the round counter.
//
// All side effects that live in GameScene (sceneMode, endTurnButton, roundText) are
// injected as callbacks so TurnSystem never imports SceneMode or UI types directly.
// This also keeps TurnSystem trivially testable — swap out the callbacks with mocks.
export class TurnSystem {
  constructor(
    private scene:          Phaser.Scene,
    private getState:       () => GameState,
    private setState:       (s: GameState) => void,
    private isInputFree:    () => boolean,         // () => sceneMode === 'IDLE'
    private lockInput:      () => void,            // sceneMode = 'MOVING' + button disabled
    private unlockInput:    () => void,            // sceneMode = 'IDLE'  + button enabled
    private clearSelection: () => void,            // delegates to SelectionManager
    private setRoundText:   (round: number) => void,
  ) {}

  // Called when the player clicks the End Turn button.
  // Guards against double-firing if the button is somehow clicked during an animation.
  handleEndTurn(): void {
    // isInputFree() checks sceneMode === 'IDLE'; activeTurn check is defense-in-depth.
    if (!this.isInputFree() || this.getState().activeTurn !== 'PLAYER') return;
    this.clearSelection();
    this.setState(applyAction(this.getState(), { type: 'END_TURN' }));
    this.lockInput();
    void this.runEnemyTurn();
  }

  // Simulates the enemy turn: waits 1 second, then flips back to the player.
  // Uses Phaser's timer (not setTimeout) so it respects game pause/resume.
  // The isActive() guard protects GameObjects from being accessed after the scene
  // is destroyed during the delay (e.g. hot-reload or scene.restart()).
  private async runEnemyTurn(): Promise<void> {
    await new Promise<void>(resolve => this.scene.time.delayedCall(1000, resolve));
    if (!this.scene.scene.isActive()) return;
    this.setState(applyAction(this.getState(), { type: 'END_TURN' }));
    this.unlockInput();
    this.setRoundText(this.getState().round);
  }
}
