import { GameState } from "./gameStates.js";
export class Sound3DPlayer {
    constructor() {
      this.audioContext = null;
      this.bufferCache = {};
      this.musicSource = null;
      this.musicGain = null;
      this.sfxGain = null;
      this.musicVolume = 0.5;
      this.sfxVolume = 1.0;
      this.isMuted = false;
      this.listener = null; // Positional audio listener
      this.initAudio(); // Initialize audio
    }
  
    // Initialize audio context and listener
    initAudio() {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.musicGain = this.audioContext.createGain();
        this.sfxGain = this.audioContext.createGain();
        this.listener = new THREE.AudioListener();
  
        // Assuming you're using Three.js to manage the camera
        GameState.camera.add(this.listener); // Add the listener to the camera or the player
  
        this.musicGain.connect(this.audioContext.destination);
        this.sfxGain.connect(this.audioContext.destination);
  
        this.musicGain.gain.value = this.musicVolume;
        this.sfxGain.gain.value = this.sfxVolume;
      }
    }
  
    // Ensure the audio context is created
    ensureAudioContext() {
      if (!this.audioContext) {
        this.initAudio(); // Initialize audio if not already done
      }
    }
  
    // Load audio file
    async loadAudioFile(src) {
      const res = await fetch(src);
      const arrayBuffer = await res.arrayBuffer();
      return this.audioContext.decodeAudioData(arrayBuffer);
    }
  
    // Play positional audio
    async playPositionalAudio(src, position, volume = 1) {
      this.ensureAudioContext();
  
      if (!this.bufferCache[src]) {
        this.bufferCache[src] = await this.loadAudioFile(src);
      }
  
      // Create a PositionalAudio source and set its position
      const sound = new THREE.PositionalAudio(this.listener);
      sound.setBuffer(this.bufferCache[src]);
      sound.setRefDistance(20);  // Distance at which the sound will reach full volume
      sound.setMaxDistance(50);   // Max distance at which the sound can still be heard
      sound.setDistanceModel('linear');  // How the sound volume decays with distance
      sound.setVolume(volume);
  
      // Set the sound position in 3D space (e.g., spider position)
      sound.position.set(position.x, position.y, position.z);
  
      // Add the sound to a 3D object (e.g., a spider mesh or object)
      const soundObject = new THREE.Object3D();
      soundObject.add(sound);
      soundObject.position.set(position.x, position.y, position.z);
      GameState.scene.add(soundObject);
  
      sound.play();
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
  
    // Update 3D audio listener in the animation loop
    updateListenerPosition(camera) {
      // Update listener position based on camera or player movement
      this.listener.position.set(camera.position.x, camera.position.y, camera.position.z);
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
    }
  }
  