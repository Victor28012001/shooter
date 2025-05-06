export class BaseScene {
    constructor(game) {
      this.game = game;
      this.isPaused = false;
    }
  
    enter() {}
    exit() {}
    pause() {
      this.isPaused = true;
    }
    resume() {
      this.isPaused = false;
    }
  }
  