export class SceneTransition {
    static fadeIn(duration = 1000) {
      return new Promise((resolve) => {
        const overlay = document.getElementById('fade-overlay');
        overlay.style.transition = `opacity ${duration}ms ease`;
        overlay.style.opacity = '1';
        setTimeout(resolve, duration);
      });
    }
  
    static fadeOut(duration = 1000) {
      return new Promise((resolve) => {
        const overlay = document.getElementById('fade-overlay');
        overlay.style.transition = `opacity ${duration}ms ease`;
        overlay.style.opacity = '0';
        setTimeout(resolve, duration);
      });
    }
  
    static async fadeBetween(callback, duration = 1000) {
      await this.fadeIn(duration);
      await callback(); // switch scene
      await this.fadeOut(duration);
    }
  }
  