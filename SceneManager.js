import { SceneTransition } from "./SceneTransition.js";

export class SceneManager {
  constructor() {
    this.currentScene = null;
    this.scenes = {};
  }

  register(name, scene) {
    this.scenes[name] = scene;
  }

  async switchTo(name) {
    await SceneTransition.fadeBetween(async () => {
      if (this.currentScene && this.currentScene.exit) {
        await this.currentScene.exit();
      }

      const next = this.scenes[name];
      if (next && next.enter) {
        this.currentScene = next;
        await next.enter();
      } else {
        console.warn(`Scene "${name}" not found or has no enter() method.`);
      }
    }, 800); // You can adjust duration
  }
}
