import { showInitialSplash, showSplashScreen, showGameHUD } from "./ui.js";
import { GameState } from "./gameStates.js";
import {
  faceBulletHolesToCamera,
  assignDOMElements,
  updateBullets,
} from "./utils.js";
import {
  onKeyDown,
  onKeyUp,
  pauseGame,
  onMouseDown,
  onMouseMove,
  onMouseUp,
} from "./controls.js";
import { SpiderManager } from "./Spider.js";
import { LevelManager } from "./LevelManager.js";
import { Sound3DPlayer } from "./Sound3DPlayer.js";

import { audio } from "./audio.js";

// audio.fadeOutMusic(3); // Fade out over 3 seconds
// audio.pauseMusic();
// audio.resumeMusic('./assets/audio/music/creepy_loop.mp3');
// audio.playVoiceOver('./assets/audio/vo/line1.mp3', 0.8);

GameState.scene = new THREE.Scene();
GameState.loadingManager = new THREE.LoadingManager();
GameState.camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
GameState.camera.position.z = 7;
GameState.renderer = new THREE.WebGLRenderer({ antialias: true });
GameState.renderer.toneMapping = THREE.ACESFilmicToneMapping;
GameState.renderer.toneMappingExposure = 1.2; // tweak for brightness
GameState.renderer.outputEncoding = THREE.sRGBEncoding;
GameState.renderer.shadowMap.enabled = true;
GameState.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const audio1 = new Sound3DPlayer();
const spiderManager = new SpiderManager(
  GameState.scene,
  GameState.loadingManager
);
window.addEventListener("load", async () => {
  showInitialSplash(); // Fake splash for 3s
  assignDOMElements();

  const levelManager = new LevelManager(spiderManager);

  showSplashScreen(async () => {
    await spiderManager.loadSpiderModel();
    await levelManager.loadAllLevels();
    levelManager.showLevelMenu();
  });

  // Input listeners
  window.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  document.addEventListener("mousemove", onMouseMove, false);
});

window.addEventListener("keydown", pauseGame);
document.addEventListener("keydown", onKeyDown);
document.addEventListener("keyup", onKeyUp);
window.addEventListener("keydown", pauseGame);
var loader = new THREE.GLTFLoader(GameState.loadingManager);

const textureLoader = new THREE.TextureLoader(GameState.loadingManager);

export function startGame() {
  if (GameState.gameStarted) return;
  GameState.gameStarted = true;
  showGameHUD();
  assignDOMElements();
  audio.playMusic("./sounds/level ambience/1-01 Encounter.mp3", 0.7);

  spiderManager.spawnSpiders();

  animate();
}


loader.load("./assets/models/low_poly_abandoned_brick_room-opt.glb", (gltf) => {
  const building = gltf.scene;
  GameState.abandonedBuilding = building;

  building.traverse((child) => {
    if (child.isMesh) {
      const mat = child.material;
      child.material = new THREE.MeshStandardMaterial({
        map: mat.map || null,
        metalness: 0,
        roughness: 1,
        emissive: new THREE.Color(0x000000),
        envMap: null,
        side: THREE.DoubleSide,
      });
      child.castShadow = false;
      child.receiveShadow = true;
    }
  });
  
});



loader.load("./assets/models/the_rake.glb", function (gltf) {
  GameState.theRake = gltf.scene;
  GameState.theRake.position.set(100, 0.9, 100);
  GameState.theRake.position.y = 2;

  // Setup animation
  if (gltf.animations && gltf.animations.length > 0) {
    const mixer = new THREE.AnimationMixer(GameState.theRake);
    const action = mixer.clipAction(gltf.animations[0]);
    // console.log(gltf.animations)
    action.play();

    // Store the mixer so you can update it in your animation loop
    GameState.rakeMixer = mixer;
  }
});

function getPlayerBossDist() {
  const playerPos = GameState.controls.getObject().position;
  console.log(playerPos.distanceTo(GameState.theRake.position));
}

export function endGame(won) {
  GameState.isEnded = true;
  GameState.controls.unlock();

  if (won) {
    import("./ui.js").then(({ showGameWonPopup }) =>
      showGameWonPopup(GameState.renderer)
    );
  } else {
    import("./ui.js").then(({ showGameOverPopup }) =>
      showGameOverPopup(GameState.renderer)
    );
  }
}

export function animate() {
  const delta = GameState.clock.getDelta();
  var speedThreshold = 0.06;

  GameState.doorControllers.forEach((controller) => {
    controller.update(delta);
  });

  if (GameState.paused) {
    cancelAnimationFrame(GameState.animationFrameId);
    return;
  }

  audio1.updateListenerPosition(GameState.camera);

  if (GameState.player) {
    GameState.player.playerRoomColl();

    GameState.mixers.forEach((mixer) => mixer.update(delta));

    GameState.world.step(delta);
    GameState.world.solver.iterations = 10;

    if (GameState.isEnded) {
      cancelAnimationFrame(GameState.animationFrameId);
      return;
    }

    updateBullets(spiderManager, GameState.abandonedBuilding);
    spiderManager.updateSpiders(GameState.tommyGun);
    // getPlayerBossDist()

    GameState.player.handleMovement();
    GameState.player.updateMovementAnimation(speedThreshold);
    GameState.player.syncModelWithCamera();
    GameState.player.fire();
    GameState.player.checkGoalReached();
  }

  // Face bullet holes
  faceBulletHolesToCamera();

  // Update cannon debugger (if any)
  // GameState.cannonDebugger.update();

  // Render the scene
  GameState.renderer.render(GameState.scene, GameState.camera);

  // Request the next animation frame
  GameState.animationFrameId = requestAnimationFrame(animate);
}
