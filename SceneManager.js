import { GameState } from "./gameStates.js";
import { onMouseDown, onMouseUp, onMouseMove } from "./controls.js";

export class SceneManager {
  static init() {
    GameState.scene = new THREE.Scene();
    GameState.scene.background = new THREE.Color(0x000000);

    GameState.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.015,
      1000
    );
    GameState.camera.position.set(12, 1, 12);

    GameState.renderer = new THREE.WebGLRenderer();
    GameState.renderer.setPixelRatio(window.devicePixelRatio);
    GameState.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(GameState.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    GameState.scene.add(ambientLight);

    GameState.tommyGunLight = new THREE.PointLight(0xb69f66, 100, 100);
    GameState.tommyGunLight.visible = false;
    GameState.scene.add(GameState.tommyGunLight);

    GameState.controls = new THREE.PointerLockControls(
      GameState.camera,
      document.body
    );

    GameState.controls.addEventListener("lock", function () {
      document.getElementById("crosshair").style.display = "block";
    });

    GameState.controls.addEventListener("unlock", function () {
      document.getElementById("crosshair").style.display = "none";
    });

    GameState.scene.add(GameState.controls.getObject());
    GameState.scene.add(GameState.theRake);

    window.addEventListener("resize", SceneManager.onResize);

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousemove", onMouseMove, false);

    //   Event listener for mouse down event
    document.addEventListener("mousedown", function (event) {
      if (
        GameState.controls.isLocked &&
        event.button === 0 &&
        event.target.id !== "playButton" &&
        GameState.isFiring === true
      ) {
        playMachineGunSound(
          GameState.audioContext,
          GameState.machineGunSoundBuffer,
          loadAudioFile
        );
      }
    });

    // Event listener for mouse up event
    document.addEventListener("mouseup", function (event) {
      if (event.button === 0) {
        setTimeout(() => {
          GameState.tommyGunLight.visible = false;
          GameState.isFiring = false;
        }, 100);
      }
    });
  }

  static onResize() {
    GameState.camera.aspect = window.innerWidth / window.innerHeight;
    GameState.camera.updateProjectionMatrix();
    GameState.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
