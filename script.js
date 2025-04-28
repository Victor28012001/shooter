import cannonEsDebugger from "https://cdn.jsdelivr.net/npm/cannon-es-debugger@1.0.0/+esm";
let scene, camera, renderer, controls, tommyGunLight;

let currentLevel = 0;
let unlockedLevels = parseInt(localStorage.getItem("unlockedLevels")) || 1;
const totalLevels = 8;
let levelData = [];
var abandonedBuilding;
var testRoom;
let bulletHoles = [];
let isFiring = false;
let isMoving = false;
var bulletCount = 0;
let maxMagazineSize = 30;
let totalBullets = 90;
let currentBullets = maxMagazineSize;
let isReloading = false;

let player = {
  health: 100,
  lastAttackTime: null,
  regenTimeout: null,
};
let totalSpiders;
let spawnedSpiders;
let paused = false;
let playerBody;
let roomBody;
let collisionState = false;
let collidedBody = null;
let animationFrameId;
let isEnded = false;
let audioContext;
let machineGunSoundBuffer;
let bulletRicochetSoundBuffer;
const clock = new THREE.Clock();
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var bullets = [];
let roomBodies;

let roomWidth = 9.5;
let wallHeight = 3.8;
let roomDepth = 9.5;

let animalMeshes = [];
let mixers = [];
let tommyGun,
  tommyGunAnimations = {};
let tommyGunMixer;
let limit = 12;
let lastMeshAdditionTime = 0;
let gameStarted = false;
const meshAdditionInterval = 100;
var currentAnimation = "";
// Keyboard controls
var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;

const currentCollisions = new Set();

// DOM Elements
const currentBulletsDisplay = document.getElementById("currentBullets");
const totalBulletsDisplay = document.getElementById("totalBullets");
const reloadMessage = document.getElementById("reloadMessage");
const splash = document.getElementById("splash");
const menu = document.getElementById("menu");
const levelButtons = document.getElementById("levelButtons");
const startButton = document.getElementById("startButton");
const resetProgress = document.getElementById("resetProgress");
var blocker = document.getElementById("blocker");
var instructions = document.getElementById("instructions");
var playButton = document.getElementById("playButton");

const loadingManager = new THREE.LoadingManager();
const world = new CANNON.World();
let cannonDebugger; // Initialize with a default value

var loader = new THREE.GLTFLoader(loadingManager);
let killedSpiders = 0;

const textureLoader = new THREE.TextureLoader(loadingManager);

startButton.addEventListener("click", async () => {
  splash.classList.add("hidden");
  await loadAllLevels();
  showLevelMenu();
});

resetProgress.addEventListener("click", async () => {
  resetProgressfunc();
});

const phongMaterial = new THREE.MeshPhongMaterial();

// Update loading bar on progress
loadingManager.onProgress = function (url, loaded, total) {
  let progress = (loaded / total) * 100;
  document.getElementById("loadingProgress").style.width = progress + "%";
  blocker.style.display = "none";
};

// Key handler for toggling pause/play on 'P' key
window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "p" || event.key.toUpperCase() === "p") {
    paused = !paused;

    if (paused) {
      controls.unlock();
    } else {
      controls.lock();
      animate();
    }
  }
});

// When all assets are loaded, show the play button
loadingManager.onLoad = function () {
  blocker.style.display = "block";
  document.getElementById("splashContent").style.display = "none";
};

// Function to Update HUD
function updateAmmoHUD() {
  currentBulletsDisplay.textContent = currentBullets;
  totalBulletsDisplay.textContent = totalBullets;

  // Show reload message when bullets are empty
  if (currentBullets === 0 && totalBullets > 0) {
    reloadMessage.style.display = "block";
  } else {
    reloadMessage.style.display = "none";
  }
}

function initScene() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.015, // near clipping plane
    1000
  );
  camera.position.set(12, 1, 12);
  camera.near = 0.015;
  camera.updateProjectionMatrix();

  // Renderer
  renderer = new THREE.WebGLRenderer({});
  renderer.physicallyCorrectLights = true;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 2);
  scene.add(ambientLight);

  tommyGunLight = new THREE.PointLight(0xb69f66, 100, 100);
  tommyGunLight.position.set(0, 0, 0);
  tommyGunLight.visible = false;
  scene.add(tommyGunLight);

  // PointerLock Controls
  controls = new THREE.PointerLockControls(camera, document.body);

  controls.addEventListener("lock", function () {
    instructions.style.display = "none";
    blocker.style.display = "none";
    document.getElementById("crosshair").style.display = "block";
  });

  controls.addEventListener("unlock", function () {
    instructions.style.display = "";
    document.getElementById("crosshair").style.display = "none";
  });

  scene.add(controls.getObject());

  // Handle window resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Add event listeners for the mouse down and mouse up events
  window.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  document.addEventListener("mousemove", onMouseMove, false);

  //   Event listener for mouse down event
  document.addEventListener("mousedown", function (event) {
    if (
      controls.isLocked &&
      event.button === 0 &&
      event.target.id !== "playButton" &&
      isFiring === true
    ) {
      playMachineGunSound();
    }
  });

  // Event listener for mouse up event
  document.addEventListener("mouseup", function (event) {
    if (event.button === 0) {
      setTimeout(() => {
        tommyGunLight.visible = false;
        isFiring = false;
      }, 100);
    }
  });

  // Optional: initialize physics after setting up scene
  if (typeof initPhysics === "function") {
    initPhysics();
  }
}

function initPhysics() {
  world.gravity.set(0, -9.82, 0);
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 10;

  const planeGeometry = new THREE.PlaneGeometry(250, 250, 250, 250);
  const planeMesh = new THREE.Mesh(planeGeometry, phongMaterial);
  planeMesh.rotateX(-Math.PI / 2);
  planeMesh.position.y = -0.5;
  planeMesh.receiveShadow = true;
  scene.add(planeMesh);

  const floorShape = new CANNON.Plane();
  const floorBody = new CANNON.Body({
    mass: 0,
    position: new CANNON.Vec3(0, 0, 0),
  });
  floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  floorBody.addShape(floorShape);
  floorBody.name = "Floor";
  world.addBody(floorBody);

  cannonDebugger = cannonEsDebugger(scene, world, {
    color: 0x00ff00,
  });

  world.addEventListener("postStep", () => {
    let stillColliding = new Set();

    world.contacts.forEach((contact) => {
      const { bi, bj } = contact;
      let other = null;

      if (bi === playerBody) other = bj;
      else if (bj === playerBody) other = bi;

      if (other && other.name === "Room") {
        stillColliding.add(other.id);

        if (!currentCollisions.has(other.id)) {
          console.log("Entered building:", other.id);
          currentCollisions.add(other.id);
          collisionState = true;
          if (moveForward) controls.moveForward(-controls.speed);
          else if (moveBackward) controls.moveForward(controls.speed);
          else if (moveLeft) controls.moveRight(controls.speed);
          else if (moveRight) controls.moveRight(-controls.speed);
          collisionState = false;
          // handle enter logic
        }
      }
    });

    // Exit logic
    for (const id of currentCollisions) {
      if (!stillColliding.has(id)) {
        // console.log("Exited building:", id);
        currentCollisions.delete(id);
        collisionState = false;
        // handle exit logic
      }
    }
  });
}

async function loadAllLevels() {
  levelData = [];
  for (let i = 1; i <= totalLevels; i++) {
    const res = await fetch(`levels/level${i}.json`);
    const json = await res.json();
    levelData.push(json);
  }
}

function showLevelMenu() {
  levelButtons.innerHTML = "";

  for (let i = 0; i < levelData.length; i++) {
    const level = levelData[i];

    const anchor = document.createElement("div");
    anchor.className = "level-card";
    anchor.style.position = "relative";

    // Level number
    const levelNumber = document.createElement("span");
    levelNumber.textContent = `Level ${i + 1}`;
    levelNumber.style.position = "absolute";
    levelNumber.style.top = "50px";
    levelNumber.style.left = "50%";
    levelNumber.style.transform = "translateX(-50%)";
    levelNumber.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    levelNumber.style.color = "#fff";
    levelNumber.style.fontSize = "20px";
    levelNumber.style.padding = "5px 10px";
    anchor.appendChild(levelNumber);

    const card = document.createElement("div");
    card.className = "card";

    const wrapper = document.createElement("div");
    wrapper.className = "wrapper";

    const coverImg = document.createElement("img");
    coverImg.src =
      "./assets/images/force_mage-cover.jpg";
    coverImg.className = "cover-image";

    const titleImg = document.createElement("img");
    titleImg.src =
      "./assets/images/force_mage-title.png";
    titleImg.className = "title";

    const charImg = document.createElement("img");
    charImg.src =
      "./assets/images/force_mage-character.webp";
    charImg.className = "character";

    wrapper.appendChild(coverImg);
    card.appendChild(wrapper);
    card.appendChild(titleImg);
    card.appendChild(charImg);
    anchor.appendChild(card);

    if (i >= unlockedLevels) {
      // If locked, make it visually and functionally unclickable
      anchor.classList.add("disabled-card");
      anchor.style.pointerEvents = "none"; // <-- This disables all clicks
      anchor.style.opacity = "0.4"; // Optional: visual indicator
    } else {
      // Only attach click event if the level is unlocked
      anchor.addEventListener("click", () => loadLevel(i));
    }

    levelButtons.appendChild(anchor);
  }

  menu.classList.remove("hidden");
}

function loadLevel(index) {
  currentLevel = index;
  menu.classList.add("hidden");
  initScene();
  buildLevel(levelData[index]);
}

const gridScale = 10;

function buildLevel(level) {
  // Wait until the model is loaded before placing anything
  if (!abandonedBuilding) {
    // console.warn("Model not loaded yet. Retrying...");
    setTimeout(() => buildLevel(level), 100); // Try again shortly
    return;
  }

  roomBodies = [];

  for (const box of level.objects) {
    const modelClone = abandonedBuilding.clone(); // Clone the model

    // Set the position of the clone based on grid scale
    modelClone.position.set(
      box[0] * gridScale,
      box[1] * gridScale,
      box[2] * gridScale
    );
    scene.add(modelClone); // Add the clone to the scene

    // Apply the physics body to the clone
    const roomBodyClone = new CANNON.Body({
      mass: 0, // Static body
      position: new CANNON.Vec3(
        box[0] * gridScale,
        box[1] * gridScale,
        box[2] * gridScale - 0.35
      ),
    });

    // Shape and size of the physics body based on room dimensions
    const boxShape = new CANNON.Box(
      new CANNON.Vec3(roomWidth / 2 + 0.25, wallHeight, roomDepth / 2 + 0.25)
    );
    roomBodyClone.addShape(boxShape); // Add the shape to the physics body

    // Set up collision response and properties for the body
    roomBodyClone.collisionResponse = true;
    roomBodyClone.name = "Room";
    roomBodies.push(roomBodyClone);

    // Add the physics body to the world
    world.addBody(roomBodyClone);
  }

  // Add the goal to the scene
  const goal = new THREE.Mesh(
    new THREE.SphereGeometry(0.5),
    new THREE.MeshBasicMaterial({ color: 0xffff00 })
  );

  const [x, y, z] = level.target;
  goal.position.set(x * gridScale, y * gridScale + 1.6, z * gridScale);
  goal.name = "goal";
  scene.add(goal);

  // Load the player and other level elements
  loadPlayer();
}

function resetProgressfunc() {
  localStorage.removeItem("unlockedLevels");
  unlockedLevels = 1;
  showLevelMenu();
}

playButton.addEventListener("click", function () {
  controls.lock();
  startGame();

  // 🟢 Fade out splash screen
  document.getElementById("splashScreen").style.opacity = "0";
  setTimeout(() => {
    document.getElementById("splashScreen").style.display = "none";
  }, 1000);
});

await loadAnimal();

function loadPlayer() {
  loader.load("./assets/models/fps_animations_lowpoly_mp5-opt.glb", function (gltf) {
    gltf.scene.scale.set(0.05, 0.05, 0.05);
    gltf.scene.updateMatrixWorld(true);

    // Store tommyGun globally
    tommyGun = gltf.scene;
    scene.add(tommyGun);

    // ✅ Store animations globally
    gltf.animations.forEach((animation) => {
      tommyGunAnimations[animation.name] = animation;
    });

    // ✅ Create and store an animation mixer
    tommyGunMixer = new THREE.AnimationMixer(tommyGun);
    mixers.push(tommyGunMixer); // Ensure it's updated in animate()

    // ✅ Create physics body for the player
    const playerShape = new CANNON.Box(new CANNON.Vec3(0.5, 1.5, 0.5)); // Adjust based on model size
    playerBody = new CANNON.Body({
      mass: 70, // Mass of the player
      position: new CANNON.Vec3(0, 5, 0), // Initial position
    });
    playerBody.collisionResponse = true;
    playerBody.name = "Player"; // Name the body for debugging
    playerBody.type = CANNON.Body.DYNAMIC; // Dynamic body for player

    // Add the shape to the physics body
    playerBody.addShape(playerShape);
    world.addBody(playerBody);

    playAnimation("Arms_Draw");

    setTimeout(() => {
      playAnimation("Arms_Idle");
    }, 1000); // Delay to allow for loading

    // Add a point light to the gun
    var tommyGunLight = new THREE.PointLight(0xb69f66, 0.5); //#b69f66
    tommyGunLight.position.set(-0.065, -0.45, 0);
    tommyGun.add(tommyGunLight);
  });
}

function startGame() {
  if (gameStarted) return; // Prevent multiple clicks
  gameStarted = true;

  spawnAnimals(); // Call function to add enemies
  animate(); // Start the animation loop
}

function playAnimation(name) {
  if (!tommyGunAnimations || !tommyGun) {
    return;
  }

  if (!tommyGunAnimations[name]) {
    return;
  }

  if (currentAnimation === name) return; // ✅ Prevent restarting the same animation

  currentAnimation = name;
  tommyGunMixer.stopAllAction();

  const action = tommyGunMixer.clipAction(tommyGunAnimations[name]);
  action.reset().fadeIn(0.2).play();
}

loader.load("./assets/models/low_poly_abandoned_brick_room-opt.glb", function (gltf) {
  abandonedBuilding = gltf.scene;
  abandonedBuilding.position.y = 0.01;
});

var onKeyDown = function (event) {
  switch (event.keyCode) {
    case 38: // up arrow
    case 87: // W key
      moveForward = true;
      break;
    case 32: // space bar
      isFiring = true;
      playAnimation("Arms_Fire");
      if (currentBullets > 0) {
        console.log(currentBullets)
        playMachineGunSound();
      }
      break;
    case 82: // R key
      // isReloading = true;
      reload();
      break;
    case 37: // left arrow
    case 65: // A key
      moveLeft = true;
      break;
    case 40: // down arrow
    case 83: // S key
      moveBackward = true;
      break;
    case 39: // right arrow
    case 68: // D key
      moveRight = true;
      break;
  }
};

var onKeyUp = function (event) {
  switch (event.keyCode) {
    case 38: // up arrow
    case 87: // W key
      moveForward = false;
      playAnimation("Arms_Idle");
      break;
    case 32: // spacebar
      isFiring = false;
      tommyGunLight.visible = false;
      playAnimation("Arms_Idle");
      break;
    case 37: // left arrow
    case 65: // A key
      moveLeft = false;
      playAnimation("Arms_Idle");
      break;
    case 40: // down arrow
    case 83: // S key
      moveBackward = false;
      playAnimation("Arms_Idle");
      break;
    case 39: // right arrow
    case 68: // D key
      moveRight = false;
      playAnimation("Arms_Idle");
      break;
  }
};
document.addEventListener("keydown", onKeyDown);
document.addEventListener("keyup", onKeyUp);

function checkCollision(position) {
  var gridSize = 250; // Match GridHelper size
  var halfGridSize = gridSize / 2;
  var margin = 0.1;

  if (
    position.x < -halfGridSize + margin ||
    position.x > halfGridSize - margin ||
    position.z < -halfGridSize + margin ||
    position.z > halfGridSize - margin
  ) {
    return true; // Collision detected (player hit boundary)
  }

  return false; // No collision
}

function disposeObject(obj) {
  if (obj.geometry) obj.geometry.dispose();
  if (obj.material) {
    if (Array.isArray(obj.material)) {
      obj.material.forEach((mat) => mat.dispose());
    } else {
      obj.material.dispose();
    }
  }
}

function cleanupScene() {
  console.log("🧹 cleanupScene called");
  // renderer.renderLists.dispose();

  // Dispose and remove all children
  while (scene.children.length > 0) {
    const child = scene.children[0];
    console.log("Disposing child:", child.name || child.type);
    disposeObject(child);
    scene.remove(child);
  }

  console.log("Scene children after:", scene.children.length);

  // Remove all physics bodies
  while (world.bodies.length > 0) {
    world.removeBody(world.bodies[0]);
  }

  console.log("World bodies after:", world.bodies.length);

  showLevelMenu(); // Optional UI step
}

let isEnded1

function animate() {
  const delta = clock.getDelta();

  if (paused) {
    cancelAnimationFrame(animationFrameId); // Stop animation
    return; // Exit the function early
  }

  if (playerBody && roomBodies.length > 0) {
    for (let roomBody of roomBodies) {
      const pos = playerBody.position;
      const up = roomBody.aabb.upperBound;
      const low = roomBody.aabb.lowerBound;

      const withinX = pos.x > low.x && pos.x < up.x;
      const withinY = pos.y > low.y && pos.y < up.y;
      const withinZ = pos.z > low.z && pos.z < up.z;

      if (withinX && withinY && withinZ) {
        // ✅ Collision logic
        collisionState = true;
        // controls.speed = 0;

        if (moveForward) controls.moveForward(-controls.speed);
        else if (moveBackward) controls.moveForward(controls.speed);
        else if (moveLeft) {
          controls.moveRight(controls.speed);
          controls.speed = 0;
        } else if (moveRight) {
          controls.moveRight(-controls.speed);
          controls.speed = 0;
        }
      } else {
        collisionState = false;
      }
    }
  }

  mixers.forEach((mixer) => mixer.update(delta)); // Ensure animations run

  world.step(delta);
  world.solver.iterations = 10;

  if (isEnded) {
    cancelAnimationFrame(animationFrameId); // Stop animation if the game ends
    return; // Exit the function to prevent further updates
  }

  updateBullets();
  updateAnimals();

  // Ramp up player movement speed and direction
  if (controls.isLocked) {
    var acceleration = 0.003; // Speed increment per frame
    var maxWalkSpeed = 0.05; // Max speed for walking
    var maxRunSpeed = 0.1; // Maximum speed
    var speedThreshold = 0.06; // Speed at which running starts

    if (moveForward) {
      controls.speed = Math.min(controls.speed + acceleration, maxRunSpeed);
      controls.moveForward(controls.speed);
      isMoving = true;
      if (
        checkCollision(controls.getObject().position) ||
        collisionState == true
      ) {
        controls.moveForward(-controls.speed); // Move back if collision
      }
    } else if (moveBackward) {
      controls.speed = Math.min(controls.speed + acceleration, maxRunSpeed);
      controls.moveForward(-controls.speed);
      isMoving = true;
      if (
        checkCollision(controls.getObject().position) ||
        collisionState == true
      ) {
        controls.moveForward(controls.speed); // Move back if collision
      }
    } else if (moveLeft) {
      controls.speed = Math.min(controls.speed + acceleration, maxRunSpeed);
      controls.moveRight(-controls.speed);
      isMoving = true;
      if (
        checkCollision(controls.getObject().position) ||
        collisionState == true
      ) {
        controls.moveRight(controls.speed); // Move back if collision
      }
    } else if (moveRight) {
      controls.speed = Math.min(controls.speed + acceleration, maxRunSpeed);
      controls.moveRight(controls.speed);
      isMoving = true;
      if (
        checkCollision(controls.getObject().position) ||
        collisionState == true
      ) {
        controls.moveRight(-controls.speed); // Move back if collision
      }
    } else {
      controls.speed = 0; // Reset speed when not moving
    }
  }

  // Check if the player is moving and update animations accordingly
  if (isMoving) {
    if (controls.speed >= speedThreshold) {
      playAnimation("Arms_Run"); // Running animation at high speed
    } else if (moveForward || moveBackward || moveLeft || moveRight) {
      playAnimation("Arms_Walk"); // Walking animation at low speed
    }
  } else if (isFiring) {
    if (currentBullets >= 0) {
      playAnimation("Arms_Fire");
    } else {
      playAnimation("Arms_Inspect"); // Optional: Play empty mag animation
    }
  } else if (moveForward || moveBackward || moveLeft || moveRight) {
    playAnimation("Arms_Walk");
  } else if (isReloading) {
    playAnimation("Arms_fullreload");
    setTimeout(() => {
      playAnimation("Arms_Idle");
    }, 3500);
  } else {
    playAnimation("Arms_Idle");
  }

  // Match tommy gun to player camera position
  if (tommyGun) {
    tommyGun.position.copy(camera.position);
    tommyGun.rotation.copy(camera.rotation);
    tommyGun.updateMatrix();
    tommyGun.translateZ(-0.025);
    tommyGun.translateY(-0.08);
    tommyGun.translateX(-0.018);
    tommyGun.rotateY(-Math.PI);
    playerBody.position.copy(tommyGun.position);
    playerBody.quaternion.copy(tommyGun.quaternion);
  }

  // Handle firing actions
  if (isFiring) {
    const currentTime = performance.now();

    if (currentTime - lastMeshAdditionTime >= meshAdditionInterval) {
      lastMeshAdditionTime = currentTime;

      const direction = raycaster.ray.direction.clone();

      let finLowObject = null;
      tommyGun.traverse(function (object) {
        if (object.name === "mag_82") {
          finLowObject = object;
        }
      });

      if (finLowObject) {
        // Ensure it exists before using it
        const worldPosition = new THREE.Vector3();
        finLowObject.getWorldPosition(worldPosition);

        if (currentBullets > 0) {
          currentBullets--; // Reduce bullets when shooting
          playAnimation("Arms_Fire"); // Play shooting animation

          createBullet(worldPosition, direction);
          updateGunMuzzleFlash(worldPosition);
        } else {
          //   isFiring = false;
          setTimeout(() => {
            playAnimation("Arms_Inspect"); // Optional: Play empty mag animation
          }, 1000);
        }

        updateAmmoHUD();
      }
    }

    checkBulletCollision();
  }


  const playerPos = controls.getObject().position;
  const goal = scene.getObjectByName("goal");

  if (goal && playerPos.distanceTo(goal.position) < 1) {
    controls.unlock();
    scene.remove(goal);
  
    if (currentLevel + 1 < totalLevels) {
      unlockedLevels = Math.max(unlockedLevels, currentLevel + 2);
      localStorage.setItem("unlockedLevels", unlockedLevels);
  
      isEnded = true;
  
      if (isEnded) {
        loadNextLevel(); // This now resets and loads the next level properly
      }
    }
  
    showLevelMenu(); // optional UI update
  }
  

  // Face bullet holes
  faceBulletHolesToCamera();

  // Update cannon debugger (if any)
  cannonDebugger.update();

  // Render the scene
  renderer.render(scene, camera);

  // Request the next animation frame
  animationFrameId = requestAnimationFrame(animate);
}

function loadNextLevel() {
  currentCollisions.clear();     // Clear previous collisions
  isEnded = true;               // Reset game end state
  currentLevel++;                // Go to the next level

  cancelAnimationFrame(animationFrameId); // Stop previous animation frame
  cleanupScene();               // Clean up scene and physics
  location.reload()
 console.log("ok")

  loadLevel(currentLevel);      // Load the new level using your method
}


updateAmmoHUD();

function reload() {
  if (isReloading || currentBullets === maxMagazineSize || totalBullets === 0)
    return;

  isReloading = true;
  playAnimation("Arms_fullreload"); // Play reload animation

  setTimeout(() => {
    let bulletsNeeded = maxMagazineSize - currentBullets;
    let bulletsToReload = Math.min(bulletsNeeded, totalBullets);

    currentBullets += bulletsToReload;
    totalBullets -= bulletsToReload;
    isFiring = false;
    //   playAnimation("Arms_fullreload");
    isReloading = false;

    updateAmmoHUD();
  }, 3500); // Reload takes 3 seconds
}

function onMouseDown(event) {
  // Check if the left mouse button is pressed (button code 0)
  if (
    controls.isLocked &&
    event.button === 0 &&
    event.target.id !== "playButton" &&
    !isFiring
  ) {
    // Set isFiring to true
    isFiring = true;
    playAnimation("Arms_Fire");
  }
}

function onMouseUp(event) {
  // Check if the left mouse button is released (button code 0)
  if (event.button === 0) {
    // Set isFiring to false
    isFiring = false;

    // ✅ Stop fire animation and return to idle
    playAnimation("Arms_Idle");
  }
}

function onMouseMove(event) {
  event.preventDefault();

  // Get the image element
  const imageElement = document.getElementById("crosshair");

  // Get the position of the image element on the screen
  const imageRect = imageElement.getBoundingClientRect();
  const imageCenterX = imageRect.left + imageRect.width / 2;
  const imageCenterY = imageRect.top + imageRect.height / 2;

  // Calculate the normalized device coordinates (-1 to 1) from the image center
  const mouse = new THREE.Vector2();
  mouse.x = (imageCenterX / window.innerWidth) * 2 - 1;
  mouse.y = -(imageCenterY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
}

// Mouse click event listener

function faceBulletHolesToCamera() {
  bulletHoles.forEach(function (bulletHole) {
    // Calculate the direction from the bullet hole to the camera
    var direction = camera.position
      .clone()
      .sub(bulletHole.position)
      .normalize();

    // Calculate the rotation quaternion that faces the camera
    var quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      direction
    );

    // Apply the rotation to the bullet hole
    bulletHole.setRotationFromQuaternion(quaternion);
  });
}

function checkBulletCollision() {
  bullets.forEach(function (bullet) {
    var bulletPosition = bullet.position;
    var bulletDirection = bullet.direction; // Assuming each bullet has a direction property

    // Create a raycaster for the current bullet
    var raycaster = new THREE.Raycaster(bulletPosition, bulletDirection);

    // Find intersections between the ray and the abandonedBuilding object
    var intersects = raycaster.intersectObject(abandonedBuilding, true);
    raycaster.camera = camera;
    animalMeshes.forEach((spider, index) => {
      var intersects = raycaster.intersectObject(spider, true);

      if (intersects.length > 0) {
        playSpiderAnimation(spider, "hit"); // Play hit animation
        //   removeBullet(bullet); // Remove bullet from scene

        // ✅ Reduce Spider Health
        spider.health -= 10;

        // Reduce spider speed (but not below a minimum threshold)
        spider.speed = Math.max(spider.speed * 0.9, 0.2); // Reduce speed by 10%, min speed 0.2

        // ✅ Temporarily change spider's color to red
        const originalColors = [];

        spider.traverse((child) => {
          if (child.isMesh) {
            originalColors.push({
              mesh: child,
              color: child.material.color.clone(),
            });
            child.material.color.set(0xff0000); // Set to red
          }
        });

        setTimeout(() => {
          originalColors.forEach(({ mesh, color }) => {
            mesh.material.color.copy(color); // Restore original color after 0.3s
          });
        }, 50);

        // Remove bullet
        if (bullet && bullet.mesh) {
          scene.remove(bullet.mesh);
          bullets.splice(index, 1);
        } else {
          // console.warn(
          //   `⚠️ Bullet at index ${index} does not exist or has no mesh.`
          // );
        }

        // ✅ Update Health Bar
        updateSpiderHUD();
        updateSpiderHealth(spider);
        if (spider.health <= 0) {
          scene.remove(spider);
          killedSpiders++;
          updateSpiderHUD();
          animalMeshes.splice(index, 1);
        }
      }
    });

    if (intersects.length > 0) {
      // Play the bullet ricochet sound every 5 bullets
      if (bulletCount % 15 === 0) {
        playBulletRicochetSound();
      }
      bulletCount++;

      var intersect = intersects[0];
      var point = intersect.point;
      var faceNormal = intersect.face.normal;

      // Create and position the mesh at the intersection point
      var offset = new THREE.Vector3(0, 0, 0.01); // Increase the offset value to avoid z-fighting
      var insertionOffset = new THREE.Vector3(0, 0.01, 0); // Adjust the insertion offset as needed

      var loader = new THREE.TextureLoader();
      var material = new THREE.MeshBasicMaterial({
        map: loader.load("./assets/images/bullet-hole.png"),
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: true,
      });

      var geometry = new THREE.PlaneGeometry(0.08, 0.08);
      var bulletHoleMesh = new THREE.Mesh(geometry, material);

      var insertionPoint = new THREE.Vector3()
        .copy(point)
        .add(offset)
        .add(insertionOffset);

      bulletHoleMesh.position.copy(insertionPoint);
      scene.add(bulletHoleMesh);
      bulletHoles.push(bulletHoleMesh);

      // Fade out the mesh gradually over time
      var opacity = 1.0;
      var fadeOutDuration = 5000; // 5 seconds
      var fadeOutInterval = 50; // Update every 50 milliseconds

      var fadeOutTimer = setInterval(function () {
        opacity -= fadeOutInterval / fadeOutDuration;
        if (opacity <= 0) {
          opacity = 0;
          clearInterval(fadeOutTimer);
          scene.remove(bulletHoleMesh);
          bulletHoles.splice(bulletHoles.indexOf(bulletHoleMesh), 1);
        }
        bulletHoleMesh.material.opacity = opacity;
      }, fadeOutInterval);
    }
  });
}

function showBloodOverlay() {
  const bloodOverlay = document.getElementById("blood-overlay");
  bloodOverlay.style.opacity = "1"; // Make it fully visible

  setTimeout(() => {
    bloodOverlay.style.opacity = "0"; // Fade out after 300ms
  }, 300);
}

// Function to toggle the light on or off based on the isFiring variable
function toggleLight(isFiring) {
  if (isFiring) {
    tommyGunLight.visible = !tommyGunLight.visible; // Toggle the light visibility
  } else {
    tommyGunLight.visible = false; // Ensure the light is off when not firing
  }
}

// Call the function whenever the value of isFiring changes
function updateGunMuzzleFlash(position) {
  toggleLight(isFiring);
  tommyGunLight.position.copy(camera.position);
}

// Function to create a bullets
function createBullet(position, direction) {
  //play machine gun sound bite
  playMachineGunSound();

  const bulletGeometry = new THREE.SphereGeometry(0.01, 8, 8);
  const bulletMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.5,
  });
  const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
  bullet.position.copy(position);
  bullet.direction = direction.clone().normalize();
  bullet.distanceTraveled = 0;

  // Add a point light to the bullet
  const pointLight = new THREE.PointLight(0xffffff, 10, 100);
  pointLight.position.copy(position);
  bullet.add(pointLight);

  scene.add(bullet);
  bullets.push(bullet);
}

// Function to update bullets
function updateBullets() {
  const maxDistance = 5; // Maximum distance a bullet can travel before removal

  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.position.addScaledVector(bullet.direction, 0.75); // Adjust the speed of the bullet here
    bullet.distanceTraveled += 0.4;

    if (bullet.distanceTraveled >= maxDistance) {
      scene.remove(bullet);
      bullets.splice(i, 1);
    }
  }
}

// Function to load an audio file
function loadAudioFile(url, callback) {
  const request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";

  request.onload = function () {
    audioContext.decodeAudioData(request.response, function (buffer) {
      if (typeof callback === "function") {
        callback(buffer);
      }
    });
  };

  request.send();
}

// Function to play a sound from a buffer
function playSound(buffer, volume, loop = false) {
  const source = audioContext.createBufferSource();
  const gainNode = audioContext.createGain();

  // Connect the audio nodes
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Set the buffer, volume, and loop
  source.buffer = buffer;
  gainNode.gain.value = volume;

  // Start playing the sound
  source.start();
}

// Function to play the machine gun sound
function playMachineGunSound() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (!machineGunSoundBuffer) {
    loadAudioFile("./sounds/tommy-gun-single-bullet.mp3", function (buffer) {
      machineGunSoundBuffer = buffer;
      playSound(buffer, 1, isFiring); // Pass the isFiring value to control continuous playback
    });
  } else {
    playSound(machineGunSoundBuffer, 1, isFiring); // Pass the isFiring value to control continuous playback
  }
}

// Function to play the bullet ricochet sound
function playBulletRicochetSound() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (!bulletRicochetSoundBuffer) {
    loadAudioFile("./sounds/bullet-ricochet.mp3", function (buffer) {
      bulletRicochetSoundBuffer = buffer;
      playSound(buffer, 1, false); // Play the sound once, not continuous playback
    });
  } else {
    playSound(bulletRicochetSoundBuffer, 1, false); // Play the sound once, not continuous playback
  }
}

async function loadAnimal() {
  const gltfLoader = new THREE.GLTFLoader(loadingManager).setPath("./");
  const animalGLTF = await gltfLoader.loadAsync(
    "./assets/models/voided_spider-opt.glb"
  );

  // Store the loaded model for reuse
  window.animalGLTF = animalGLTF;
}

function addAnimal(posX) {
  if (!window.animalGLTF) {
    console.error("Animal model not loaded yet!");
    return;
  }

  let model1 = THREE.SkeletonUtils.clone(window.animalGLTF.scene);

  model1.health = 100;
  // Create a new AnimationMixer for this cloned spider
  model1.mixer = new THREE.AnimationMixer(model1);
  model1.animations = {}; // Store animation clips

  // Store animations inside the cloned model
  window.animalGLTF.animations.forEach((animation) => {
    model1.animations[animation.name] = animation;
  });

  let actualAnimation = "running"; // Use correct name from log
  if (!model1.animations[actualAnimation]) {
    return;
  }

  // Play default running animation
  const action = model1.mixer.clipAction(model1.animations[actualAnimation]);
  action.setLoop(THREE.LoopRepeat);
  action.play();

  model1.traverse((child) => {
    if (child.isSkinnedMesh) {
      child.frustumCulled = false; // Important for skinned animations
    }
  });

  let healthBar = createHealthBar();
  model1.healthBar = healthBar;
  model1.add(healthBar);
  healthBar.position.y + 2;

  model1.position.set(posX, -3, -30);
  model1.rotation.y = Math.PI; // 🔥 Try setting rotation directly
  model1.rotateY(Math.PI); // 🔥 Use rotateY method as a fallback
  animalMeshes.push(model1);
  scene.add(model1);
  mixers.push(model1.mixer);
}

// 📌 Create Health Bar for Spiders
function createHealthBar() {
  let canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 12;
  let ctx = canvas.getContext("2d");

  // Draw Initial Full Green Bar
  ctx.fillStyle = "green";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let texture = new THREE.CanvasTexture(canvas);
  let material = new THREE.SpriteMaterial({ map: texture });
  let healthBar = new THREE.Sprite(material);

  healthBar.scale.set(1.5, 0.3, 1); // Size of health bar
  return healthBar;
}

// 📌 Update Spider Health Bar
function updateSpiderHealth(spider) {
  let canvas = spider.healthBar.material.map.image;
  let ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear old bar

  // Green for remaining health, red for lost health
  let healthPercent = Math.max(spider.health / 100, 0);
  ctx.fillStyle = "red";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "green";
  ctx.fillRect(0, 0, canvas.width * healthPercent, canvas.height);

  spider.healthBar.material.map.needsUpdate = true; // Refresh texture
}

function playSpiderAnimation(spider, animationName) {
  if (!spider.mixer) {
    console.error("❌ Spider mixer is undefined!", spider);
    return;
  }

  if (!spider.animations || !spider.animations[animationName]) {
    console.error(
      `❌ Animation "${animationName}" not found for spider!`,
      spider
    );
    return;
  }

  let attackAnimations = [
    "attack_jaw",
    "attack_inner_jaw",
    "attack_L",
    "attack_R",
  ];
  let isAttack = attackAnimations.includes(animationName);

  let runningAction = spider.mixer.clipAction(spider.animations["running"]);
  let newAction = spider.mixer.clipAction(spider.animations[animationName]);

  if (isAttack) {
    // 🎭 Blend attack animation with running animation
    newAction.reset();
    newAction.setLoop(THREE.LoopOnce); // Attack plays once
    newAction.clampWhenFinished = true;
    newAction.crossFadeFrom(runningAction, 0.3, false).play(); // Blend into attack

    // 📌 Resume running after attack finishes
    newAction.onFinish = function () {
      runningAction.reset().fadeIn(0.3).play();
    };
  } else {
    // 🏃‍♂️ Full running animation when not attacking
    newAction.fadeIn(0.3).play();
  }

  spider.currentAnimation = animationName;
}

// Update HUD
function updateSpiderHUD() {
  document.getElementById("total-spiders").textContent = totalSpiders;
  document.getElementById("spiders-killed").textContent = killedSpiders;
}

function spawnAnimals() {
  // totalSpiders = 24; // Limit to 12 spiders
  totalSpiders = 24; // Limit to 12 spiders
  spawnedSpiders = 0;

  const interval = setInterval(() => {
    if (spawnedSpiders >= totalSpiders) {
      clearInterval(interval); // Stop spawning after 12 spiders
      return;
    }

    let randomX = Math.floor(Math.random() * 20) - 10;
    addAnimal(randomX);
    spawnedSpiders++; // Track spawned spiders
    updateSpiderHUD();
  }, 2000);
}

function updateAnimals() {
  if (!tommyGun) return;

  const targetPosition = new THREE.Vector3();
  tommyGun.getWorldPosition(targetPosition); // Get tommyGun position

  animalMeshes.forEach((spider, index) => {
    const direction = new THREE.Vector3();
    direction.subVectors(targetPosition, spider.position).normalize();

    const speed = 0.05;
    spider.position.addScaledVector(direction, speed);

    // Keep the spider's Y position fixed
    spider.position.y = 0.2; // Adjust this to ground level

    // Make the spider face the tommyGun
    const lookAtPosition = new THREE.Vector3(
      targetPosition.x,
      spider.position.y,
      targetPosition.z
    );
    spider.lookAt(lookAtPosition);
    spider.rotateY(Math.PI);

    // Determine distance to tommyGun
    let distanceToGun = spider.position.distanceTo(targetPosition);

    if (distanceToGun < 2) {
      // 🟥 Close Range: Attack (blend with running)
      let attackType = Math.random() > 0.5 ? "attack_jaw" : "attack_inner_jaw";
      playSpiderAnimation(spider, attackType);
    } else if (distanceToGun < 6) {
      // 🟧 Mid Range: Attack with left/right attacks
      let attackType = Math.random() > 0.5 ? "attack_L" : "attack_R";
      playSpiderAnimation(spider, attackType);
    }

    checkSpiderAttacks();
  });
}

function checkSpiderAttacks() {
  if (!tommyGun) return;

  let currentTime = Date.now();
  const targetPosition = new THREE.Vector3();
  tommyGun.getWorldPosition(targetPosition);

  let isAttacked = false;

  animalMeshes.forEach((spider) => {
    let distanceToGun = spider.position.distanceTo(targetPosition);

    if (distanceToGun < 0.8) {
      isAttacked = true;

      if (
        !player.lastAttackTime ||
        currentTime - player.lastAttackTime >= 500
      ) {
        player.health = Math.max(0, player.health - 10);
        player.lastAttackTime = currentTime;
        showBloodOverlay();
        // playSpiderAttackSound();
        if (player.regenTimeout) {
          clearTimeout(player.regenTimeout);
          player.regenTimeout = null;
        }
      }
    }
  });

  // Update health bar
  document.getElementById("player-health").style.width = player.health + "%";

  if (player.health <= 0 && !isEnded) {
    isEnded = true; // Stop game
    document.getElementById("game-over-popup").style.display = "block";
    cancelAnimationFrame(animationFrameId);
    gameOver();
    return; // Exit function
  }

  // Health regeneration logic
  if (
    !isAttacked &&
    player.lastAttackTime &&
    currentTime - player.lastAttackTime >= 5000
  ) {
    if (!player.regenTimeout) {
      player.regenTimeout = setTimeout(regenerateHealth, 1000);
    }
  }
}

function regenerateHealth() {
  if (player.health < 100) {
    player.health = Math.min(100, player.health + 10);
    document.getElementById("player-health").style.width = player.health + "%";

    player.regenTimeout = setTimeout(regenerateHealth, 1000);
  } else {
    player.regenTimeout = null;
  }
}

// Game Over Logic
function gameOver() {
  isEnded = true;
  controls.unlock();
  document.getElementById("game-over-popup").style.display = "block";
  blocker.style.display = "none";
}

// Restart Game
document.getElementById("restart-game").addEventListener("click", function () {
  location.reload();
});
