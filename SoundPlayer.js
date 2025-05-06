import { pauseGame } from "./controls.js";
import { hidePauseMenu } from "./ui.js";
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
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
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
  // Play sound with optional playbackRate
  async play(src, volume = 1, loop = false, playbackRate = 1) {
    this.ensureAudioContext();

    if (!this.bufferCache[src]) {
      this.bufferCache[src] = await this.loadAudioFile(src);
    }

    this.playBuffer(this.bufferCache[src], volume, loop, playbackRate);
  }

  // Internal method to play a decoded audio buffer
  playBuffer(buffer, volume = 1, loop = false, playbackRate = 1) {
    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;
    source.loop = loop;
    source.playbackRate.setValueAtTime(
      playbackRate,
      this.audioContext.currentTime
    );

    gainNode.gain.value = volume;
    source.connect(gainNode);
    gainNode.connect(this.sfxGain);

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
    this.musicGain.gain.linearRampToValueAtTime(
      targetVolume,
      now + fadeDuration
    );
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
      this.musicGain.gain.setTargetAtTime(
        vol,
        this.audioContext.currentTime,
        0.1
      );
      localStorage.setItem("musicVolume", vol); // Save to localStorage
    }
  }

  // Set the SFX volume
  setSfxVolume(vol) {
    this.sfxVolume = vol;
    if (!this.isMuted && this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(
        vol,
        this.audioContext.currentTime,
        0.1
      );
      localStorage.setItem("sfxVolume", vol); // Save to localStorage
    }
  }

  // Mute or unmute all audio
  muteAll(mute = true) {
    this.isMuted = mute;
    const value = mute ? 0 : this.musicVolume;
    if (this.musicGain && this.sfxGain) {
      this.musicGain.gain.setTargetAtTime(
        value,
        this.audioContext.currentTime,
        0.1
      );
      this.sfxGain.gain.setTargetAtTime(
        mute ? 0 : this.sfxVolume,
        this.audioContext.currentTime,
        0.1
      );
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
    const savedMusicVolume =
      parseFloat(localStorage.getItem("musicVolume")) || 0.5;
    const savedSfxVolume = parseFloat(localStorage.getItem("sfxVolume")) || 1.0;

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
    Object.assign(wrapper.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      background: "rgba(0,0,0,0.6)",
      color: "white",
      fontFamily: "sans-serif",
      zIndex: "999",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      visibility: "hidden",
    });

    // Gear icon toggle button
    const gearBtn = document.createElement("button");
    gearBtn.id = "gearBtn";
    gearBtn.innerHTML = "⚙️";
    Object.assign(gearBtn.style, {
      position: "fixed",
      top: "10px",
      left: "10px",
      zIndex: "1000",
      background: "transparent",
      border: "none",
      fontSize: "24px",
      cursor: "pointer",
    });
    gearBtn.title = "Settings";

    // Settings UI container
    const settingsContent = document.createElement("div");
    settingsContent.id = "settingsContent";
    Object.assign(settingsContent.style, {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      padding: "20px",
      background: "rgba(0,0,0,0.8)",
      borderRadius: "8px",
    });

    // Music volume slider
    const musicLabel = document.createElement("label");
    musicLabel.textContent = "🎵 Music Volume: ";
    const musicSlider = document.createElement("input");
    musicSlider.type = "range";
    musicSlider.id = "musicVolume";
    musicSlider.min = "0";
    musicSlider.max = "1";
    musicSlider.step = "0.01";
    musicSlider.value = this.musicVolume;
    musicLabel.appendChild(musicSlider);

    // SFX volume slider
    const sfxLabel = document.createElement("label");
    sfxLabel.textContent = "🔊 SFX Volume: ";
    const sfxSlider = document.createElement("input");
    sfxSlider.type = "range";
    sfxSlider.id = "sfxVolume";
    sfxSlider.min = "0";
    sfxSlider.max = "1";
    sfxSlider.step = "0.01";
    sfxSlider.value = this.sfxVolume;
    sfxLabel.appendChild(sfxSlider);

    // Mute button
    const muteBtn = document.createElement("button");
    muteBtn.id = "muteBtn";
    muteBtn.textContent = this.isMuted ? "Unmute" : "Mute";

    // Pause button
    const pauseBtn = document.createElement("button");
    pauseBtn.id = "pauseBtn";
    pauseBtn.textContent = "⏸️ Pause";

    // Assemble UI
    settingsContent.appendChild(musicLabel);
    settingsContent.appendChild(sfxLabel);
    settingsContent.appendChild(muteBtn);
    settingsContent.appendChild(pauseBtn);
    wrapper.appendChild(settingsContent);
    document.body.appendChild(wrapper);
    document.body.appendChild(gearBtn);

    // Event listeners
    musicSlider.addEventListener("input", (e) => {
      this.setMusicVolume(parseFloat(e.target.value));
    });

    sfxSlider.addEventListener("input", (e) => {
      this.setSfxVolume(parseFloat(e.target.value));
    });

    muteBtn.addEventListener("click", () => {
      this.muteAll(!this.isMuted);
      muteBtn.textContent = this.isMuted ? "Unmute" : "Mute";
    });

    let isVisible = false;

    pauseBtn.addEventListener("click", (e) => {
      pauseGame(e); // Call your pause logic

      isVisible = !isVisible;
      wrapper.style.visibility = isVisible ? "visible" : "hidden";
    });

    // Toggle visibility
    gearBtn.addEventListener("click", () => {
      isVisible = !isVisible;
      wrapper.style.visibility = isVisible ? "visible" : "hidden";
    });
  }
}
