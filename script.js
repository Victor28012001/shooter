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
import {
  SUBTRACTION,
  Brush,
  Evaluator,
} from "https://cdn.jsdelivr.net/npm/three-bvh-csg@0.0.17/+esm";

// audio.fadeOutMusic(3); // Fade out over 3 seconds
// audio.pauseMusic();
// audio.resumeMusic('./assets/audio/music/creepy_loop.mp3');
// audio.playVoiceOver('./assets/audio/vo/line1.mp3', 0.8);

const UNION = 0;

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
  
  // Log all objects in the scene here:
  GameState.scene.traverse((obj) => {
    console.log(`Object: ${obj.name} | Type: ${obj.type || obj.constructor.name}`);
  });

  cutDoorHole(building);
});

function createDoorArea(building, doorPos) {
  const doorWidth = 1.3;
  const doorHeight = 3.01;
  const doorDepth = 2.0;

  // Debug material — semi-transparent red box
  const doorMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    opacity: 0.3,
    transparent: true,
  });

  console.log("Creating door area at", doorPos);

  const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth);
  const doorAreaMesh = new THREE.Mesh(doorGeometry, doorMaterial);
  doorAreaMesh.position.copy(doorPos);
  doorAreaMesh.name = "DoorArea";

  building.add(doorAreaMesh);

  // Cannon.js physics body for door area (no collision response)
  const doorShape = new CANNON.Box(new CANNON.Vec3(doorWidth / 2, doorHeight / 2, doorDepth / 2));
  const doorBody = new CANNON.Body({ mass: 0 });
  doorBody.addShape(doorShape);
  doorBody.position.set(doorPos.x, doorPos.y, doorPos.z);
  doorBody.name = "DoorArea";
  doorBody.collisionResponse = false; // important!

  GameState.world.addBody(doorBody);

  return doorAreaMesh;
}



function cutDoorHole(building) {
  const doorWidth = 1.3; // Slightly bigger
  const doorHeight = 3.01;
  const doorDepth = 2.0; // Longer depth to fully cut

  const bbox = new THREE.Box3().setFromObject(building);
  const floorY = bbox.min.y;

  const doorHoleBrush = new Brush(
    new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth)
  );
  doorHoleBrush.position.set(0, floorY + doorHeight / 2, 4.47);
  const doorPos = new THREE.Vector3(0, floorY + doorHeight / 2, 4.47);
  doorHoleBrush.updateMatrixWorld();
  console.log("Door hole brush created at", doorPos);


  const brushes = [];

  building.traverse((child) => {
    if (child.isMesh) {
      let geom = child.geometry.clone();
      geom = THREE.BufferGeometryUtils.mergeVertices(geom);
      geom.applyMatrix4(child.matrixWorld); // Apply full transform
      const brush = new Brush(geom);
      brush.updateMatrixWorld();
      brushes.push(brush);
    }
  });

  if (brushes.length === 0) {
    console.error("No brushes found in building");
    return;
  }

  let buildingBrush = brushes[0];
  const evaluator = new Evaluator();

  for (let i = 1; i < brushes.length; i++) {
    buildingBrush = evaluator.evaluate(buildingBrush, brushes[i], UNION);
  }

  const resultBrush = evaluator.evaluate(
    buildingBrush,
    doorHoleBrush,
    SUBTRACTION
  );

  // Optional simplify if your Evaluator supports it
  if (evaluator.simplify) evaluator.simplify(resultBrush);

  const resultMesh = new THREE.Mesh(
    resultBrush.geometry,
    building.children[0].material
  );
  resultMesh.geometry = THREE.BufferGeometryUtils.mergeVertices(
    resultMesh.geometry
  );
  resultMesh.geometry.computeVertexNormals();

  resultMesh.material.side = THREE.DoubleSide;
  resultMesh.material.flatShading = true;
  resultMesh.material.needsUpdate = true;

  resultMesh.castShadow = true;
  resultMesh.receiveShadow = true;

  building.clear();
  building.add(resultMesh);


  createDoorArea(building, doorPos);

  console.log("=== Physics Bodies in World ===");
  GameState.world.bodies.forEach((body, i) => {
    console.log(
      `[${i}] Name: ${body.name || "Unnamed"}, Position: ${body.position.toString()}, Type: ${body.type}, Mass: ${body.mass}`
    );

    body.shapes.forEach((shape, j) => {
      console.log(
        `  Shape[${j}] Type: ${shape.type}, HalfExtents: ${
          shape.halfExtents ? shape.halfExtents.toString() : "N/A"
        }`
      );
    });
  });
}

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
