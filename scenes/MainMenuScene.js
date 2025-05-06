export class MainMenuScene {
    constructor(game) {
      this.game = game;
    }
  
    enter() {
      this.game.ui.showMainMenu();
      this.game.audio.play('click');
  
      document.getElementById('levelButtons').innerHTML = `<button id="startBtn">Start Level</button>`;
      document.getElementById('startBtn').addEventListener('click', () => {
        this.game.sceneManager.switchTo('game');
      });
  
      document.getElementById('resetProgress').addEventListener('click', () => {
        alert('Progress Reset!');
      });
    }
  
    exit() {
      this.game.ui.clearElement('menu');
    }
  }
  