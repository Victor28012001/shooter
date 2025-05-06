export class VisualEffects {
    static flash(color = 'white') {
      const fx = document.getElementById('fx-overlay');
      fx.classList.remove('flash'); // reset
      fx.style.backgroundColor = color;
      void fx.offsetWidth; // force reflow
      fx.classList.add('flash');
    }
  
    static shake(element = document.body) {
      element.classList.remove('shake');
      void element.offsetWidth;
      element.classList.add('shake');
    }
  }
  