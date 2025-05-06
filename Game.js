import { GameUI } from "./GameUI.js";
import { GameAudio } from "./GameAudio.js";
import { SceneManager } from "./SceneManager.js";

import { MainMenuScene } from "./scenes/MainMenuScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { GameOverScene } from "./scenes/GameOverScene.js";
import { CutsceneScene } from "./scenes/CutsceneScene.js";


export class Game {
  constructor() {
    this.ui = new GameUI();
    this.audio = new GameAudio();
    this.sceneManager = new SceneManager();
  }

  async init() {
    this.sceneManager.register("mainMenu", new MainMenuScene(this));
    this.sceneManager.register("game", new GameScene(this));
    this.sceneManager.register("gameOver", new GameOverScene(this));

    
    const response = await fetch("./CutScenes.json");
    const cutscenes = await response.json();

    for (const cutscene of cutscenes) {
      this.sceneManager.register(
        cutscene.id,
        new CutsceneScene(this, {
          dialogue: cutscene.dialogue,
          background: "./assets/images/cutscene-bg.jpg",
          nextScene: cutscene.nextScene,
        })
      );
    }
  
    this.sceneManager.switchTo("mainMenu");
  }
}