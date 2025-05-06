import { VisualEffects } from "../VisualEffects.js";
import { IntervalManager } from "../IntervalManager.js";
import { BaseScene } from "./BaseScene.js";

export class GameScene extends BaseScene {
    constructor(game) {
      super(game);
      this.state = {
        health: 5,
        bullets: 30,
        totalBullets: 90,
        totalSpiders: 0,
        kills: 0,
      };
      this.intervals = new IntervalManager();
    }
  
    enter() {
      this.game.ui.showGameHUD();
      this.game.ui.updateHealth(this.state.health);
      this.setupGameLoop();
  
      document.addEventListener("keydown", this.pauseHandler);
    }
  
    exit() {
      document.removeEventListener("keydown", this.pauseHandler);
      this.intervals.clearAll();
      this.game.ui.clearAllUI();
    }
  
    pauseHandler = (e) => {
      if (e.key === "Escape") {
        this.isPaused = !this.isPaused;
        if (this.isPaused) this.game.ui.showPauseMenu();
        else this.game.ui.hidePauseMenu();
      }
    };
  
    setupGameLoop() {
      this.intervals.add(() => {
        if (this.isPaused) return;
  
        this.state.bullets = Math.max(0, this.state.bullets - 3);
        this.game.ui.updateBulletCount(this.state.bullets, this.state.totalBullets);
  
        if (this.state.bullets === 0) {
          this.game.ui.showReloadMessage();
          this.game.audio.play("reload");
        }
  
        if (this.state.bullets <= 0 && this.state.totalBullets <= 0) {
          this.game.sceneManager.switchTo("gameOver");
        }
      }, 2000);
  
      this.intervals.add(() => {
        if (this.isPaused) return;
  
        this.state.health--;
        VisualEffects.flash("red");
        VisualEffects.shake(document.body);
        this.game.audio.play("damage");
        this.game.ui.updateHealth(this.state.health);
  
        if (this.state.health <= 0) {
          this.game.sceneManager.switchTo("gameOver");
        }
      }, 6000);
  
      this.intervals.add(() => {
        if (this.isPaused) return;
  
        this.state.totalSpiders++;
        if (Math.random() > 0.4) {
          this.state.kills++;
          this.game.audio.play("kill");
        }
  
        this.game.ui.updateSpiderStats(this.state.totalSpiders, this.state.kills);
      }, 3000);
    }
  }