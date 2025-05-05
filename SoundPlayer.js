import { pauseGame } from "./controls.js";
export class SoundPlayer {
    constructor() {
      this.audioContext = null;
      this.bufferCache = {};
      this.musicSource = null;
      this.musicGain = null;
      this.sfxGain = null;
      this.musicVolume = 0.5;
      this.sfxVolume = 1.0;
      this.isMuted = false;
  
      this.initUI(); // Generate UI
      this.loadVolumeSettings(); // Load saved volume settings
    }
  
    // Create and manage AudioContext
    ensureAudioContext() {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.musicGain = this.audioContext.createGain();
        this.sfxGain = this.audioContext.createGain();
  
        this.musicGain.connect(this.audioContext.destination);
        this.sfxGain.connect(this.audioContext.destination);
  
        this.musicGain.gain.value = this.musicVolume;
        this.sfxGain.gain.value = this.sfxVolume;
      }
    }
  
    // Load audio file from URL
    async loadAudioFile(src) {
      const res = await fetch(src);
      const arrayBuffer = await res.arrayBuffer();
      return this.audioContext.decodeAudioData(arrayBuffer);
    }
  
    // Play a sound effect (SFX)
    async play(src, volume = 1, loop = false) {
      this.ensureAudioContext();
  
      if (!this.bufferCache[src]) {
        this.bufferCache[src] = await this.loadAudioFile(src);
      }
  
      this.playBuffer(this.bufferCache[src], volume, loop);
    }
  
    // Play a sound buffer
    playBuffer(buffer, volume = 1, loop = false) {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
  
      source.buffer = buffer;
      source.loop = loop;
  
      gainNode.gain.value = volume;
      source.connect(gainNode);
      gainNode.connect(this.sfxGain); // global SFX volume
  
      source.start(0);
    }
  
    // Play background music
    async playMusic(src, targetVolume = this.musicVolume, fadeDuration = 1.0) {
      this.ensureAudioContext();
  
      if (!this.bufferCache[src]) {
        this.bufferCache[src] = await this.loadAudioFile(src);
      }
  
      this.stopMusic();
  
      const source = this.audioContext.createBufferSource();
      source.buffer = this.bufferCache[src];
      source.loop = true;
  
      source.connect(this.musicGain);
      source.start(0);
  
      this.musicSource = source;
  
      // Fade in
      const now = this.audioContext.currentTime;
      this.musicGain.gain.setValueAtTime(0, now);
      this.musicGain.gain.linearRampToValueAtTime(targetVolume, now + fadeDuration);
    }
  
    // Fade out music over a period of time
    fadeOutMusic(fadeDuration = 1.0) {
      if (!this.musicGain) return;
  
      const now = this.audioContext.currentTime;
      this.musicGain.gain.linearRampToValueAtTime(0, now + fadeDuration);
      setTimeout(() => this.stopMusic(), fadeDuration * 1000); // Stop music after fade
    }
  
    // Pause the current music
    pauseMusic() {
      if (this.musicSource) {
        this.musicSource.stop();
        this.musicSource.disconnect();
        this.musicSource = null;
      }
    }
  
    // Resume playing music
    resumeMusic(src) {
      if (!this.musicSource) {
        this.playMusic(src, this.musicVolume); // Resume from the last song
      }
    }
  
    // Stop the current music
    stopMusic() {
      if (this.musicSource) {
        this.musicSource.stop();
        this.musicSource.disconnect();
        this.musicSource = null;
      }
    }
  
    // Set the music volume
    setMusicVolume(vol) {
      this.musicVolume = vol;
      if (!this.isMuted && this.musicGain) {
        this.musicGain.gain.setTargetAtTime(vol, this.audioContext.currentTime, 0.1);
        localStorage.setItem('musicVolume', vol); // Save to localStorage
      }
    }
  
    // Set the SFX volume
    setSfxVolume(vol) {
      this.sfxVolume = vol;
      if (!this.isMuted && this.sfxGain) {
        this.sfxGain.gain.setTargetAtTime(vol, this.audioContext.currentTime, 0.1);
        localStorage.setItem('sfxVolume', vol); // Save to localStorage
      }
    }
  
    // Mute or unmute all audio
    muteAll(mute = true) {
      this.isMuted = mute;
      const value = mute ? 0 : this.musicVolume;
      if (this.musicGain && this.sfxGain) {
        this.musicGain.gain.setTargetAtTime(value, this.audioContext.currentTime, 0.1);
        this.sfxGain.gain.setTargetAtTime(mute ? 0 : this.sfxVolume, this.audioContext.currentTime, 0.1);
      }
      document.getElementById("muteBtn").textContent = mute ? "Unmute" : "Mute";
    }
  
    // Play a voice-over
    async playVoiceOver(src, volume = 1) {
      this.ensureAudioContext();
  
      if (!this.bufferCache[src]) {
        this.bufferCache[src] = await this.loadAudioFile(src);
      }
  
      this.playBuffer(this.bufferCache[src], volume, false);
    }
  
    // Load saved volume settings from localStorage
    loadVolumeSettings() {
      const savedMusicVolume = parseFloat(localStorage.getItem('musicVolume')) || 0.5;
      const savedSfxVolume = parseFloat(localStorage.getItem('sfxVolume')) || 1.0;
  
      this.musicVolume = savedMusicVolume;
      this.sfxVolume = savedSfxVolume;
  
      if (this.musicGain) {
        this.musicGain.gain.value = this.musicVolume;
      }
  
      if (this.sfxGain) {
        this.sfxGain.gain.value = this.sfxVolume;
      }
    }
  
    // UI injected dynamically
    initUI() {
        // Create main wrapper
        const wrapper = document.createElement("div");
        wrapper.id = "audio-controls";
        wrapper.style.position = "fixed";
        wrapper.style.top = "0";
        wrapper.style.left = "0";
        wrapper.style.width = "100vw";
        wrapper.style.height = "100vh";
        wrapper.style.background = "rgba(0,0,0,0.6)";
        wrapper.style.color = "white";
        wrapper.style.fontFamily = "sans-serif";
        wrapper.style.zIndex = "999";
        wrapper.style.display = "flex";
        wrapper.style.justifyContent = "center";
        wrapper.style.alignItems = "center";
        wrapper.style.visibility = "hidden"; // Initially hidden
      
        // Gear icon toggle button
        const gearBtn = document.createElement("button");
        gearBtn.id = "gearBtn";
        gearBtn.innerHTML = "⚙️";
        gearBtn.style.position = "fixed";
        gearBtn.style.top = "10px";
        gearBtn.style.left = "10px";
        gearBtn.style.zIndex = "1000";
        gearBtn.style.background = "transparent";
        gearBtn.style.border = "none";
        gearBtn.style.fontSize = "24px";
        gearBtn.style.cursor = "pointer";
        gearBtn.title = "Settings";
      
        // Settings UI content
        const settingsContent = document.createElement("div");
        settingsContent.id = "settingsContent";
        settingsContent.style.display = "flex";
        settingsContent.style.flexDirection = "column";
        settingsContent.style.gap = "12px";
        settingsContent.style.padding = "20px";
        settingsContent.style.background = "rgba(0,0,0,0.8)";
        settingsContent.style.borderRadius = "8px";
      
        settingsContent.innerHTML = `
          <label>🎵 Music Volume:
            <input type="range" id="musicVolume" min="0" max="1" step="0.01" value="${this.musicVolume}">
          </label>
          <label>🔊 SFX Volume:
            <input type="range" id="sfxVolume" min="0" max="1" step="0.01" value="${this.sfxVolume}">
          </label>
          <button id="muteBtn">${this.isMuted ? "Unmute" : "Mute"}</button>
          <button id="pauseBtn">⏸️ Pause</button>
        `;
      
        wrapper.appendChild(settingsContent);
        document.body.appendChild(wrapper);
        document.body.appendChild(gearBtn);
      
        // Event Listeners
        document.getElementById("musicVolume").addEventListener("input", (e) => {
          this.setMusicVolume(parseFloat(e.target.value));
        });
      
        document.getElementById("sfxVolume").addEventListener("input", (e) => {
          this.setSfxVolume(parseFloat(e.target.value));
        });
      
        document.getElementById("muteBtn").addEventListener("click", () => {
          this.muteAll(!this.isMuted);
          console.log("muted")
          document.getElementById("muteBtn").textContent = this.isMuted ? "Unmute" : "Mute";
        });
      
        document.getElementById("pauseBtn").addEventListener("click", pauseGame);

      
        // Toggle visibility
        let isVisible = false;
        gearBtn.addEventListener("click", () => {
          isVisible = !isVisible;
          wrapper.style.visibility = isVisible ? "visible" : "hidden";
        });
      }
      
      
  }
  