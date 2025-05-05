// import { GameUI } from './GameUI.js';
// import { showPauseMenu, hidePauseMenu } from './utils.js';
import { removeUI, removeAllUI, showGameHUD, showSplashScreen, showBlocker } from './ui.js';
import { LevelManager } from './LevelManager.js';

export class GameStateManager {
  constructor() {
    // this.ui = new GameUI();
    this.state = 'INIT';
    this.isPaused = false;

    // Gameplay state
    this.health = 5;
    this.totalSpiders = 0;
    this.spidersKilled = 0;

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.togglePause();
    });
  }

  start() {
    this.setState('LOADING');
  }

  setState(newState) {
    const levelManager = new LevelManager()

    this.state = newState;
    console.log(`[GameState] → ${newState}`);

    switch (newState) {
      case 'LOADING':
        showSplashScreen();
        // Simulate loading
        setTimeout(() => this.setState('MAIN_MENU'), 2000);
        break;

      case 'MAIN_MENU':
        removeUI('splashScreen');
        // this.ui.showMainMenu();
        // this.setupMenuEvents();
        levelManager.showLevelMenu()
        break;

      case 'SHOW_CONTROLS':
        removeUI('menu');
        showBlocker();
        this.setupBlockerEvents();
        break;

      case 'IN_GAME':
        removeUI('blocker');
        showGameHUD();
        this.simulateGameplayEvents();
        break;

      case 'GAME_OVER':
        removeAllUI();
        alert('Game Over! Restarting...');
        this.setState('MAIN_MENU');
        break;
    }
  }

  // setupMenuEvents() {
  //   const levelButtons = document.getElementById('levelButtons');
  //   levelButtons.innerHTML = `<button id="level1">Level 1</button>`;

  //   document.getElementById('level1').addEventListener('click', () => {
  //     this.setState('SHOW_CONTROLS');
  //   });

  //   document.getElementById('resetProgress').addEventListener('click', () => {
  //     alert('Progress Reset!');
  //   });
  // }

  // togglePause() {
  //   if (this.state !== 'IN_GAME') return;
  //   this.isPaused = !this.isPaused;
  //   if (this.isPaused) {
  //     showPauseMenu();
  //   } else {
  //     hidePauseMenu();
  //   }
  // }

  // setupBlockerEvents() {
  //   document.getElementById('playButton').addEventListener('click', () => {
  //     this.setState('IN_GAME');
  //   });
  // }

  simulateGameplayEvents() {
    this.ui.updateHealth(this.health);

    // Bullet drain already handled...
    let bullets = 30;
    let totalBullets = 90;
    let bulletInterval = setInterval(() => {
      if (this.isPaused) return;

      bullets = Math.max(0, bullets - 3);
      document.getElementById('currentBullets').textContent = bullets;
      document.getElementById('totalBullets').textContent = totalBullets;

      if (bullets === 0) {
        document.getElementById('reloadMessage').style.display = 'block';
      }

      if (bullets <= 0 && totalBullets <= 0) {
        clearInterval(bulletInterval);
        this.setState('GAME_OVER');
      }
    }, 2000);

    // Simulate health damage
    setInterval(() => {
      if (this.isPaused) return;

      this.health--;
      this.ui.updateHealth(this.health);
      if (this.health <= 0) {
        this.setState('GAME_OVER');
      }
    }, 6000);

    // Simulate spider spawns and kills
    setInterval(() => {
      if (this.isPaused) return;

      this.totalSpiders++;
      if (Math.random() > 0.5) this.spidersKilled++;

      this.ui.updateSpiderStats(this.totalSpiders, this.spidersKilled);
    }, 4000);
  }

}
