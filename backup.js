// Set up the scene
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1, 0); // Set camera position 0.1 units above the grid

// Adjust the camera's near clipping plane value
camera.near = 0.015; // Set a smaller value, like 0.1
camera.updateProjectionMatrix();

// Setup Gun Object
// 3D Abandoned Building MOdel
var abandonedBuilding;
//Array for bullet hole meshes
let bulletHoles = [];
//Gun Firing Variable to track when gun is firing
let isFiring = false;
let isMoving = false;
// Counter variable to keep track of the number of bullets
var bulletCount = 0;
let maxMagazineSize = 30; // Bullets per reload
let totalBullets = 90; // Total bullets player has
let currentBullets = maxMagazineSize; // Start with full magazine
let isReloading = false;

// DOM Elements
const currentBulletsDisplay = document.getElementById("currentBullets");
const totalBulletsDisplay = document.getElementById("totalBullets");
const reloadMessage = document.getElementById("reloadMessage");
let playerHealth = 100;
let player = {
  health: 100,
  lastAttackTime: null,
  regenTimeout: null,
};
let totalSpiders;
let spawnedSpiders;

const loadingManager = new THREE.LoadingManager();

// Update loading bar on progress
loadingManager.onProgress = function (url, loaded, total) {
  let progress = (loaded / total) * 100;
  document.getElementById("loadingProgress").style.width = progress + "%";
  blocker.style.display = "none";
};

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

// Create the renderer
var renderer = new THREE.WebGLRenderer({});
renderer.physicallyCorrectLights;
// Configure renderer settings
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

//Create ray caster instance
var raycaster = new THREE.Raycaster();
//Create mouse instance
var mouse = new THREE.Vector2();
//Create array to store bullets
var bullets = [];

let animalMeshes = []; // Declare the array to store animal models
let mixers = []; // Declare mixers array
let tommyGun,
  tommyGunAnimations = {};
let tommyGunMixer;
let limit = 12; // Limit the number of spiders

// Variables for tracking time and adding bullet hole meshes
let lastMeshAdditionTime = 0;
const meshAdditionInterval = 100; // Interval duration in milliseconds

// Keyboard controls
var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;

///flashing light // Create a point light
const tommyGunLight = new THREE.PointLight(0xb69f66, 100, 100); // Adjust the light color and intensity as needed
tommyGunLight.position.set(0, 0, 0); // Set the light position
tommyGunLight.visible = false;
// Add the light to the scene initially
scene.add(tommyGunLight);

// Gravity effect variables
var gravity = new THREE.Vector3(0, -0.01, 0); // Adjust the gravity strength as needed
var maxGravityDistance = 2; // Adjust the maximum distance affected by gravity as needed

// Add PointerLockControls
var controls = new THREE.PointerLockControls(camera, document.body);

// Create a grid
var gridHelper = new THREE.GridHelper(20, 20);
scene.add(gridHelper);

// Set up pointer lock controls
var blocker = document.getElementById("blocker");
var instructions = document.getElementById("instructions");
var playButton = document.getElementById("playButton");

playButton.addEventListener("click", function () {
  controls.lock();
  startGame();

  // 🟢 Fade out splash screen
  document.getElementById("splashScreen").style.opacity = "0";
  setTimeout(() => {
    document.getElementById("splashScreen").style.display = "none";
  }, 1000); // Remove after fade out

  // 🟢 Show HUD
  // document.getElementById("hud").style.display = "block";
});

controls.addEventListener("lock", function () {
  instructions.style.display = "none";
  blocker.style.display = "none";
  document.getElementById("crosshair").style.display = "block"; // Show the crosshair when screen is locked
});

controls.addEventListener("unlock", function () {
  //   blocker.style.display = "block";
  instructions.style.display = "";
  document.getElementById("crosshair").style.display = "none"; // Hide the crosshair when screen is unlocked
});

// Resize renderer when window size changes
window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let gameStarted = false;

scene.add(controls.getObject());

// Create an ambient light with brightness
var ambientLight = new THREE.AmbientLight(0xffffff, 2); // Adjust the color as needed
scene.add(ambientLight);

await loadAnimal();

var loader = new THREE.GLTFLoader(loadingManager);
loader.load("./models/fps_animations_lowpoly_mp5-opt.glb", function (gltf) {
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

  // ✅ Play idle animation by default
  playAnimation("Arms_Draw");

  setTimeout(() => {
    playAnimation("Arms_Idle");
  }, 1000); // Delay to allow for loading

  // Add a point light to the gun
  var tommyGunLight = new THREE.PointLight(0xb69f66, 0.5); //#b69f66
  tommyGunLight.position.set(-0.065, -0.45, 0);
  tommyGun.add(tommyGunLight);
});

var currentAnimation = "";

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
  // ✅ Stop previous animations
  tommyGunMixer.stopAllAction();

  // ✅ Play the new animation
  const action = tommyGunMixer.clipAction(tommyGunAnimations[name]);
  action.reset().fadeIn(0.2).play();
}

//Load building model
loader.load("./models/low_poly_abandoned_brick_room-opt.glb", function (gltf) {
  abandonedBuilding = gltf.scene;
  abandonedBuilding.position.y = 0.008;
  scene.add(abandonedBuilding);
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
      playMachineGunSound();
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

// Check collision with the grid
function checkCollision(position) {
  var gridSize = 20;
  var halfGridSize = gridSize / 2;
  var margin = 0.1;

  if (
    position.x < -halfGridSize + margin ||
    position.x > halfGridSize - margin ||
    position.z < -halfGridSize + margin ||
    position.z > halfGridSize - margin
  ) {
    return true; // Collision detected
  }

  return false; // No collision
}

function fireShotGunSpheres() {
  // Loop 20 times to create 20 spheres
  for (var i = 0; i < 20; i++) {
    // Create a sphere geometry with a radius of 0.05 units and 32 segments on each axis
    var sphere = new THREE.SphereGeometry(0.05, 32, 32);

    // Create a basic mesh material with a yellow color
    var material = new THREE.MeshBasicMaterial({ color: 0xffff00 });

    // Combine the sphere geometry and material to create a mesh
    var sphereMesh = new THREE.Mesh(sphere, material);

    // Set the sphere position to a random position within a 0.5 unit cube area relative to the shotgun object position
    sphereMesh.position.x = camera.position.x + (Math.random() * 0.5 - 0.25);
    sphereMesh.position.y =
      camera.position.y + (Math.random() * 0.5 - 0.25) - 1;
    sphereMesh.position.z = camera.position.z + (Math.random() * 0.5 - 0.25);

    // Add the sphere to the scene
    scene.add(sphereMesh);

    // Add the sphere to the shotGunSpheres array
    shotGunSpheres.push(sphereMesh);
  }
}

function animateShotGunParticles() {
  // Loop through each sphere in the shotGunSpheres array
  for (var i = 0; i < shotGunSpheres.length; i++) {
    // Get the current sphere
    var sphere = shotGunSpheres[i];

    // Copy the rotation of the camera to the sphere
    sphere.rotation.copy(camera.rotation);

    // Calculate the distance between the sphere and the starting position
    var distance = sphere.position.distanceTo(shotgunObject.position);

    // If the distance is less than 10 units, move the sphere in a random direction on the x and y axis and down the -z axis
    if (distance < 10) {
      sphere.translateX(Math.random() * 2 - 1);
      sphere.translateY(Math.random() * 2 - 1);
      sphere.translateZ(-3);
    }

    // If the distance is less than 1 unit, hide the sphere
    if (distance < 1) {
      sphere.visible = false;
    }

    // If the distance is greater than 1 unit, show the sphere
    if (distance > 1) {
      sphere.visible = true;
    }

    // If the distance is greater than or equal to 10 units, remove the sphere from the scene and splice it from the shotGunSpheres array
    if (distance >= 10) {
      scene.remove(sphere);
      shotGunSpheres.splice(i, 1);
    }
  }
}

let animationFrameId;
let isEnded = false;

function animate() {
  const delta = clock.getDelta();
  mixers.forEach((mixer) => mixer.update(delta)); // Ensure animations run

  if (isEnded) {
    cancelAnimationFrame(animationFrameId); // Stop animation
    return; // Exit function to prevent further updates
  }

  updateBullets();
  updateAnimals();

  //ramp up player movement speed and direction
  if (controls.isLocked) {
    var acceleration = 0.003; // Speed increment per frame
    var maxWalkSpeed = 0.05; // Max speed for walking
    var maxRunSpeed = 0.1; // Maximum speed
    var speedThreshold = 0.06; // Speed at which running starts

    if (moveForward) {
      controls.speed = Math.min(controls.speed + acceleration, maxRunSpeed);
      controls.moveForward(controls.speed);
      isMoving = true;
      if (checkCollision(controls.getObject().position)) {
        controls.moveForward(-controls.speed); // Move back if collision
      }
    } else if (moveBackward) {
      controls.speed = Math.min(controls.speed + acceleration, maxRunSpeed);
      controls.moveForward(-controls.speed);
      isMoving = true;
      if (checkCollision(controls.getObject().position)) {
        controls.moveForward(controls.speed); // Move back if collision
      }
    } else if (moveLeft) {
      controls.speed = Math.min(controls.speed + acceleration, maxRunSpeed);
      controls.moveRight(-controls.speed);
      isMoving = true;
      if (checkCollision(controls.getObject().position)) {
        controls.moveRight(controls.speed); // Move back if collision
      }
    } else if (moveRight) {
      controls.speed = Math.min(controls.speed + acceleration, maxRunSpeed);
      controls.moveRight(controls.speed);
      isMoving = true;
      if (checkCollision(controls.getObject().position)) {
        controls.moveRight(-controls.speed); // Move back if collision
      }
    } else {
      controls.speed = 0; // Reset speed when not moving
    }
  }

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
  } else {
    playAnimation("Arms_Idle");
  }

  if (tommyGun) {
    // Match tommy gun to player camera position
    tommyGun.position.copy(camera.position);
    tommyGun.rotation.copy(camera.rotation);
    tommyGun.updateMatrix();
    tommyGun.translateZ(-0.025);
    tommyGun.translateY(-0.08);
    tommyGun.translateX(-0.018);
    tommyGun.rotateY(-Math.PI);
  }

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
        // ✅ Ensure it exists before using it
        const worldPosition = new THREE.Vector3();
        finLowObject.getWorldPosition(worldPosition);
        // if (isReloading) return;

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
      } else {
      }
    }

    checkBulletCollision();
  }

  //face bullet holes
  faceBulletHolesToCamera();

  renderer.render(scene, camera);

  animationFrameId = requestAnimationFrame(animate);
}

updateAmmoHUD();

// **Reloading Mechanic**
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
  }, 2000); // Reload takes 2 seconds
}

// Add event listeners for the mouse down and mouse up events
window.addEventListener("mousedown", onMouseDown);
window.addEventListener("mouseup", onMouseUp);

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
document.addEventListener("mousemove", onMouseMove, false);

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

let killedSpiders = 0;

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
          console.warn(
            `⚠️ Bullet at index ${index} does not exist or has no mesh.`
          );
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

// Variables for audio context and machine gun sound
let audioContext;
let machineGunSoundBuffer;
let bulletRicochetSoundBuffer;

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
  const animalGLTF = await gltfLoader.loadAsync("./models/voided_spider-opt.glb");

  // Store the loaded model for reuse
  window.animalGLTF = animalGLTF;
}
let model1;

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


function CreateTriMesh(mesh, size_ = { x: 1, y: 1, z: 1 }) {
  // Ensure mesh has valid geometry
  if (
    !mesh.geometry ||
    !mesh.geometry.attributes.position ||
    !mesh.geometry.index
  ) {
    console.warn(`Mesh ${mesh.name} is missing required geometry attributes.`);
    return null;
  }

  // Extract position and index from the mesh geometry
  const position = mesh.geometry.attributes.position;
  const indices = mesh.geometry.index;

  // Arrays to store vertices and faces
  let vertices = [],
    faces = [];

  // Loop through the position array and scale the vertices
  for (let i = 0; i < position.array.length; i += 3) {
    vertices.push(position.array[i] * (size_.x * 4 - 0.01)); // Apply scaling
    vertices.push(position.array[i + 1] * (size_.y * 4 - 0.01));
    vertices.push(position.array[i + 2] * (size_.z * 4 - 0.01));
  }

  // console.log(`position: ${position}`);

  console.log(`Vertices count: ${vertices.length / 3}`);
  console.log(`Faces count: ${indices.array.length / 3}`);

  // Loop through the index array to create faces (triangles)
  for (let i = 0; i < indices.array.length; i += 3) {
    faces.push([indices.array[i], indices.array[i + 1], indices.array[i + 2]]);
  }

  // Create and return a new Trimesh object
  return new CANNON.Trimesh(vertices, faces);
}

// function loadHouse1() {


function loadHouse2() {
  loader.load("./models/testing_rooms-opt.glb", function (gltf) {
    testRoom = gltf.scene;

    // Set scale — flatten Y more
    const scaleXZ = 0.05;
    const scaleY = 0.03;
    testRoom.scale.set(scaleXZ, scaleY, scaleXZ);

    // After scaling, raise it a bit so it doesn't sink
    testRoom.position.y = 0.03; // try increasing if it’s still hidden

    scene.add(testRoom);

    // Traverse through all child meshes in the model and apply physics
    testRoom.traverse(function (child) {
      if (child.isMesh) {
        // Create the Trimesh for the mesh
        const trimesh = CreateTriMesh(child);
        console.log(`child.postion: ${child.geometry.attributes.position}`);

        // If trimesh creation was successful
        if (trimesh) {
          // Create the physics body for the mesh
          const body = new CANNON.Body({
            mass: 1, // Adjust mass as necessary
            position: new CANNON.Vec3(
              child.position.x,
              child.position.y,
              child.position.z
            ),
            quaternion: new CANNON.Quaternion().setFromEuler(
              child.rotation.x,
              child.rotation.y,
              child.rotation.z
            ),
          });

          // Add the Trimesh shape to the body
          body.addShape(trimesh);

          body.name = child.name;

          // Add the body to the world
          world.addBody(body);

          // Debugging: Log the body being added
          console.log(`Physics body added for mesh: ${child.name}`);

          // Optional: log the world bodies to check if the body is in the world
          console.log(`Bodies in world: ${world.bodies.length}`);

          console.log("Bodies in world:");
          world.bodies.forEach((b, index) => {
            console.log(`Body ${index + 1}:`, b);
            // You can log more specific properties if needed
            console.log(
              `Name: ${b.name}, Position: ${b.position}, Mass: ${b.mass}`
            );
          });
        }
      }
    });
  });
}


// function updateCollisionState() {
//   if (collidedBody && collisionState) {
//     const pos = playerBody.position;
//     const { lowerBound, upperBound } = collidedBody.aabb;

//     const margin = 0.1;

//     const outsideX =
//       pos.x < lowerBound.x - margin || pos.x > upperBound.x + margin;
//     const outsideZ =
//       pos.z < lowerBound.z - margin || pos.z > upperBound.z + margin;

//     if (outsideX || outsideZ) {
//       collisionState = false;
//       collidedBody = null;
//       // console.log("Exited collision with Room");
//     } else {
//       collisionState = true;
//     }
//   }
// }


// playerBody.addEventListener("collide", (e) => {
    //   if (e.body.name === "Room") {
    //     collidedBody = e.body;
    //     collisionState = true;
    //     const pos = playerBody.position;
    
    //     const up = e.body.aabb.upperBound;
    //     const low = e.body.aabb.lowerBound;
    
    //     const withinX = pos.x > low.x && pos.x < up.x;
    //     const withinZ = pos.z > low.z && pos.z < up.z;
    
    //     if (withinX && withinZ) {
    //       // Player has entered the Room — move them back
    //       collisionState = true;
    //       controls.speed = 0; // Stop player movement
    //       // console.log("Player is within the Room bounds.");
    //     }
    
    //     // console.log("Entered collision with Room");
    //     // console.log("Upper Bound:", up);
    
    //     // console.log(collisionState);
    
    //     // Optional bounce back
    //     if (moveForward && collisionState == true)
    //       controls.moveForward(-controls.speed);
    //     else if (moveBackward && collisionState == true)
    //       controls.moveForward(controls.speed);
    //     else if (moveLeft && collisionState == true)
    //       controls.moveRight(controls.speed);
    //     else if (moveRight && collisionState == true)
    //       controls.moveRight(-controls.speed);
    //   }else{
    //     collisionState = false
    //   }
    // });

    // ✅ Play idle animation by default
    