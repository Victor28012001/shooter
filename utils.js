import { GameState } from "./gameStates.js";
import { Bullet } from "./Bullet.js";
import { endGame } from "./script.js";
import { showBloodOverlay } from "./ui.js";
import { audio } from "./audio.js";
// Update HUD
export function updateSpiderHUD(totalSpiders, killedSpiders) {
  document.getElementById("total-spiders").textContent = totalSpiders;
  document.getElementById("spiders-killed").textContent = killedSpiders;
}

export function updateAmmoHUD(currentBullets, totalBullets) {
  const dom = GameState.dom;
  if (
    !dom.currentBulletsDisplay ||
    !dom.totalBulletsDisplay ||
    !dom.reloadMessage
  )
    return;
  dom.currentBulletsDisplay.textContent = currentBullets;
  dom.totalBulletsDisplay.textContent = totalBullets;

  if (currentBullets === 0 && totalBullets > 0) {
    dom.reloadMessage.style.display = "block";
  } else {
    dom.reloadMessage.style.display = "none";
  }
}

// Load audio into buffer
export function loadAudioFile(url, callback) {
  fetch(url)
    .then((response) => response.arrayBuffer())
    .then((arrayBuffer) => GameState.audioContext.decodeAudioData(arrayBuffer))
    .then((buffer) => {
      if (typeof callback === "function") {
        callback(buffer);
      }
    })
    .catch((err) => console.error("Audio loading error:", err));
}

export function assignDOMElements() {
  GameState.dom.currentBulletsDisplay =
    document.getElementById("currentBullets");
  GameState.dom.totalBulletsDisplay = document.getElementById("totalBullets");
  GameState.dom.reloadMessage = document.getElementById("reloadMessage");
  GameState.dom.splash = document.getElementById("splash");
  GameState.dom.menu = document.getElementById("menu");
  GameState.dom.levelButtons = document.getElementById("levelButtons");
  GameState.dom.startButton = document.getElementById("startButton");
  GameState.dom.resetProgress = document.getElementById("resetProgress");
  GameState.dom.blocker = document.getElementById("blocker");
  GameState.dom.instructions = document.getElementById("instructions");
  GameState.dom.playButton = document.getElementById("playButton");
  GameState.dom.crosshair = document.getElementById("crosshair");
}

export function playAnimation(name) {
  if (!GameState.tommyGunAnimations || !GameState.tommyGun) {
    console.error("Tommy gun or animations not loaded yet.");
    return false;
  }

  const clip = GameState.tommyGunAnimations[name];
  if (!clip) {
    console.error("Animation not found:", name);
    return false;
  }

  const mixer = GameState.tommyGunMixer;
  const newAction = mixer.clipAction(clip);

  // If already playing this action, skip
  const currentAction = mixer._actions.find((action) => action.isRunning());

  if (currentAction?.getClip()?.name === name) {
    return false;
  }

  mixer.stopAllAction();
  newAction.reset().fadeIn(0.2).play();
  GameState.currentAnimation = name;
}

export function getAnimationState() {
  if (GameState.isReloading) return "Arms_fullreload";
  if (GameState.isFiring) {
    return GameState.currentBullets > 0 ? "Arms_Fire" : "Arms_Inspect";
  }
  if (GameState.isMoving) {
    return GameState.controls.speed >= 0.06 ? "Arms_Run" : "Arms_Walk";
  }
  return "Arms_Idle";
}

export function checkCollision(position) {
  const half = GameState.halfGridSize;
  const margin = GameState.margin;

  if (
    position.x < -half + margin ||
    position.x > half - margin ||
    position.z < -half + margin ||
    position.z > half - margin
  ) {
    return true;
  }

  return false;
}

export function reload() {
  if (
    GameState.isReloading ||
    GameState.currentBullets === GameState.maxMagazineSize ||
    GameState.totalBullets === 0
  )
    return;

  GameState.isReloading = true;
  GameState.isFiring = false;

  playAnimation("Arms_fullreload");
  audio.play("./sounds/ShotgunReload.wav", 1);

  setTimeout(() => {
    let bulletsNeeded = GameState.maxMagazineSize - GameState.currentBullets;
    let bulletsToReload = Math.min(bulletsNeeded, GameState.totalBullets);

    GameState.currentBullets += bulletsToReload;
    GameState.totalBullets -= bulletsToReload;
    GameState.isReloading = false;

    updateAmmoHUD(GameState.currentBullets, GameState.totalBullets);

    playAnimation("Arms_Idle");
  }, 3500);
}

export function toggleLight(isFiring) {
  if (isFiring) {
    GameState.tommyGunLight.visible = !GameState.tommyGunLight.visible; // Toggle the light visibility
  } else {
    GameState.tommyGunLight.visible = false; // Ensure the light is off when not firing
  }
}

export function updateGunMuzzleFlash(position) {
  toggleLight(GameState.isFiring);
  GameState.tommyGunLight.position.copy(GameState.camera.position);
}

// Function to create a bullets
export function createBullet(position, direction) {
  audio.play("./sounds/tommy-gun-single-bullet.mp3", 1);
  // audio.fadeOutMusic(3);
  const bullet = new Bullet(position, direction);
  GameState.bullets.push(bullet);
}

// Function to update bullets
export function updateBullets(spiderManager, abandonedBuilding) {
  for (let i = GameState.bullets.length - 1; i >= 0; i--) {
    const bullet = GameState.bullets[i];
    const stillActive = bullet.update();

    if (!stillActive) {
      GameState.scene.remove(bullet.mesh);
      GameState.bullets.splice(i, 1);
      continue;
    }

    bullet.checkCollision(
      spiderManager,
      abandonedBuilding,
      i,
      GameState.bullets
    );
  }
}

export function faceBulletHolesToCamera() {
  GameState.bulletHoles.forEach(function (bulletHole) {
    // Calculate the direction from the bullet hole to the camera
    var direction = GameState.camera.position
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

export function checkSpiderAttacks() {
  if (!GameState.tommyGun) return;

  let currentTime = Date.now();
  const targetPosition = new THREE.Vector3();
  GameState.tommyGun.getWorldPosition(targetPosition);

  let isAttacked = false;

  GameState.spiderMeshes.forEach((spider) => {
    // let distanceToGun = spider.position.distanceTo(targetPosition);

    let horizontalSpiderPos = spider.position.clone();
    horizontalSpiderPos.y = 0;

    let horizontalGunPos = targetPosition.clone();
    horizontalGunPos.y = 0;

    let distanceToGun = horizontalSpiderPos.distanceTo(horizontalGunPos);

    if (distanceToGun < 0.8) {
      isAttacked = true;

      if (
        !GameState.playerData.lastAttackTime ||
        currentTime - GameState.playerData.lastAttackTime >= 500
      ) {
        GameState.playerData.health = Math.max(
          0,
          GameState.playerData.health - 10
        );
        GameState.playerData.lastAttackTime = currentTime;
        showBloodOverlay();
        // playSpiderAttackSound();
        audio.play("./sounds/BitePlayer.wav", 1);
        audio.play("./sounds/mixkit-scream-in-pain-2200.wav", 1);
        if (GameState.playerData.regenTimeout) {
          clearTimeout(GameState.playerData.regenTimeout);
          GameState.playerData.regenTimeout = null;
        }
      }
    }
  });

  // Update health bar
  document.getElementById("player-health").style.width =
    GameState.playerData.health + "%";

  if (GameState.playerData.health <= 0 && !GameState.isEnded) {
    GameState.isEnded = true; // Stop game
    endGame(false);
    cancelAnimationFrame(GameState.animationFrameId);
    return;
  }

  if (
    !isAttacked &&
    GameState.playerData.lastAttackTime &&
    currentTime - GameState.playerData.lastAttackTime >= 5000
  ) {
    GameState.player.handleRegen();
  }
}
