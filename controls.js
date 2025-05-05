import { GameState } from "./gameStates.js";
import { animate } from "./script.js";
import { playAnimation, reload } from "./utils.js";
import { hidePauseMenu, showPauseMenu } from "./ui.js";
import { SoundPlayer } from "./SoundPlayer.js";
// import { GameStateManager } from "./GameStateManager.js";
export var onKeyDown = function (event) {
  const audio = new SoundPlayer()
  switch (event.keyCode) {
    case 38: // up arrow
    case 87: // W key
      GameState.moveForward = true;
      break;
    case 32: // space bar
      GameState.isFiring = true;
      playAnimation("Arms_Fire");
      if (currentBullets > 0) {
        audio.play("./sounds/tommy-gun-single-bullet.mp3", 1);
        audio.fadeOutMusic(3);
      }
      break;
    case 82: // R key
      //   GameState.isReloading = true;
      reload();
      break;
    case 37: // left arrow
    case 65: // A key
      GameState.moveLeft = true;
      break;
    case 40: // down arrow
    case 83: // S key
      GameState.moveBackward = true;
      break;
    case 39: // right arrow
    case 68: // D key
      GameState.moveRight = true;
      break;
  }
};

export var onKeyUp = function (event) {
  switch (event.keyCode) {
    case 38: // up arrow
    case 87: // W key
      GameState.moveForward = false;
      GameState.isMoving = false;
      playAnimation("Arms_Idle");
      break;
    case 32: // spacebar
      GameState.isFiring = false;
      GameState.tommyGunLight.visible = false;
      GameState.isMoving = false;
      playAnimation("Arms_Idle");
      break;
    case 37: // left arrow
    case 65: // A key
      GameState.moveLeft = false;
      GameState.isMoving = false;
      playAnimation("Arms_Idle");
      break;
    case 40: // down arrow
    case 83: // S key
      GameState.moveBackward = false;
      GameState.isMoving = false;
      playAnimation("Arms_Idle");
      break;
    case 39: // right arrow
    case 68: // D key
      GameState.moveRight = false;
      GameState.isMoving = false;
      playAnimation("Arms_Idle");
      break;
  }
};

export var pauseGame = function (event) {
  // const gameStateManager = new GameStateManager()
  // if(!gameStateManager.setState('IN_GAME')) return;
  const isKeyboard = event && "key" in event && 
    (event.key.toLowerCase() === "p" || event.key === "Escape");

  const isButtonClick = event && event.type === "click";

  if (isKeyboard || isButtonClick) {
    console.log("ok");
    GameState.paused = !GameState.paused;

    if (GameState.paused) {
      GameState.controls.unlock();
      showPauseMenu();
    } else {
      GameState.controls.lock();
      animate();
      hidePauseMenu();
    }
  }
};

export function onMouseDown(event) {
  if (
    GameState.controls &&
    GameState.controls.isLocked &&
    event.button === 0 &&
    event.target.id !== "playButton" &&
    !GameState.isFiring
  ) {
    GameState.isFiring = true;
    playAnimation("Arms_Fire");
  }
}

export function onMouseUp(event) {
  if (event.button === 0) {
    GameState.isFiring = false;
    playAnimation("Arms_Idle");
  }
}

export function onMouseMove(event) {
  event.preventDefault();

  const imageElement = GameState.dom.crosshair;
  if (!imageElement) return; // ✅ Prevent error if not yet in DOM

  const imageRect = imageElement.getBoundingClientRect();
  const imageCenterX = imageRect.left + imageRect.width / 2;
  const imageCenterY = imageRect.top + imageRect.height / 2;

  const mouse = new THREE.Vector2();
  mouse.x = (imageCenterX / window.innerWidth) * 2 - 1;
  mouse.y = -(imageCenterY / window.innerHeight) * 2 + 1;

  GameState.raycaster.setFromCamera(mouse, GameState.camera);
}
