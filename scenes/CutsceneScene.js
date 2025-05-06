export class CutsceneScene {
    constructor(game, options) {
      this.game = game;
      this.dialogue = options.dialogue || [];
      this.background = options.background || '';
      this.nextScene = options.nextScene;
      this.currentIndex = 0;
      this.typing = false;
    }
  
    enter() {
      this.container = document.createElement('div');
      this.container.id = 'cutscene';
      this.container.style = `
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: url('${this.background}') center/cover no-repeat;
        display: flex; align-items: center; justify-content: center;
        color: white; text-shadow: 2px 2px 6px black;
        font-size: 1.4em; padding: 2rem;
        flex-direction: column; z-index: 10000;
      `;
  
      // Portrait
      this.portrait = document.createElement('img');
      this.portrait.id = 'cutscene-portrait';
      this.portrait.style = `
        height: 150px;
        margin-bottom: 20px;
        display: none;
      `;
      this.container.appendChild(this.portrait);
  
      // Text box
      this.textBox = document.createElement('div');
      this.textBox.id = 'cutscene-text';
      this.textBox.style = `
        max-width: 70%;
        background: rgba(0,0,0,0.6);
        padding: 20px;
        border-radius: 8px;
        text-align: center;
      `;
      this.container.appendChild(this.textBox);
  
      // Skip button
      const skip = document.createElement('button');
      skip.innerText = 'Skip';
      skip.style = `
        position: absolute;
        top: 20px;
        right: 20px;
        padding: 8px 12px;
        background: rgba(0,0,0,0.7);
        color: white;
        border: none;
        cursor: pointer;
      `;
      skip.onclick = () => this.finish();
      this.container.appendChild(skip);
  
      document.body.appendChild(this.container);
      document.addEventListener('keydown', this.skipHandler);
      this.container.addEventListener('click', this.advance);
  
      this.showNextDialogue();
    }
  
    skipHandler = (e) => {
      if (e.key === 'Escape') this.finish();
    };
  
    advance = () => {
      if (this.typing) {
        this.finishTyping(); // Fast-forward if still typing
      } else {
        this.showNextDialogue();
      }
    };
  
    showNextDialogue() {
      if (this.currentIndex >= this.dialogue.length) return this.finish();
  
      const line = this.dialogue[this.currentIndex];
      this.currentIndex++;
  
      // Portrait
      if (line.portrait) {
        this.portrait.src = line.portrait;
        this.portrait.style.display = 'block';
      } else {
        this.portrait.style.display = 'none';
      }
  
      // Voice line
      if (line.voice) {
        this.voice = new Audio(line.voice);
        this.voice.play();
      }
  
      this.typeText(line.text);
    }
  
    typeText(text) {
        this.textBox.innerText = '';
        this.typing = true;
        this.fullText = text;
        this.currentChar = 0;
      
        // Optional: preload audio
        if (!this.tickSound) {
          this.tickSound = new Audio('./assets/audio/type.wav');
          this.tickSound.volume = 0.4;
        }
      
        this.typingInterval = setInterval(() => {
          if (this.currentChar < this.fullText.length) {
            this.textBox.innerText += this.fullText[this.currentChar];
            this.currentChar++;
      
            if (this.currentChar % 2 === 0) {
              // Slightly stagger sound to avoid overload
              this.tickSound.currentTime = 0;
              this.tickSound.play();
            }
      
          } else {
            clearInterval(this.typingInterval);
            this.typing = false;
          }
        }, 30);
      }
      
  
    finishTyping() {
      clearInterval(this.typingInterval);
      this.textBox.innerText = this.fullText;
      this.typing = false;
    }
  
    finish() {
      this.exit();
      this.game.sceneManager.switchTo(this.nextScene);
    }
  
    exit() {
      document.removeEventListener('keydown', this.skipHandler);
      this.container.removeEventListener('click', this.advance);
      if (this.voice) this.voice.pause();
      this.container.remove();
    }
  }
  