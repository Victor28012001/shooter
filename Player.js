import { GameState } from "./gameStates.js";
import {
  playAnimation,
  updateAmmoHUD,
  checkCollision,
  getAnimationState,
  updateGunMuzzleFlash,
  createBullet,
} from "./utils.js";
import { endGame } from "./script.js";
import { audio } from "./audio.js";

export class Player {
  static gltf = null;
  static animations = {};

  constructor() {
    this.scene = GameState.scene;
    this.world = GameState.world;
    this.camera = GameState.camera;
    this.controls = GameState.controls;

    GameState.playerData.health = 100;
    GameState.currentBullets = 30;
    GameState.totalBullets = 90;
    GameState.maxMagazineSize = 30;
    GameState.isReloading = false;
    GameState.isFiring = false;
    GameState.currentAnimation = null;

    this.initPhysics();
    // === Footstep Sound Setup ===
    
    this.lastStepTime = 0;
    this.stepInterval = 400;
  }

  static async loadModel(loader) {
    return new Promise((resolve, reject) => {
      loader.load(
        "./assets/models/fps_animations_lowpoly_mp5-opt.glb",
        (gltf) => {
          gltf.scene.scale.set(0.05, 0.05, 0.05);
          gltf.scene.updateMatrixWorld(true);

          GameState.tommyGun = gltf.scene;
          // GameState.camera.add(GameState.tommyGun); // Attach to camera
          GameState.scene.add(GameState.tommyGun); // Ensure camera is in the scene

          gltf.animations.forEach((clip) => {
            GameState.tommyGunAnimations[clip.name] = clip;
          });

          GameState.tommyGunMixer = new THREE.AnimationMixer(
            GameState.tommyGun
          );
          GameState.mixers.push(GameState.tommyGunMixer);

          setTimeout(() => playAnimation("Arms_Draw"), 1500);
          setTimeout(() => playAnimation("Arms_Idle"), 2500);
          audio.play("./sounds/Breathing.wav", 0.4, true);

          Player.addLighting(); // Note: needs to be static if called like this

          resolve(); // ✅ Done loading
        },
        undefined,
        reject
      );
    });
  }

  initPhysics() {
    const playerShape = new CANNON.Box(new CANNON.Vec3(0.5, 1.5, 0.5)); // Adjust based on model size
    GameState.playerBody = new CANNON.Body({
      mass: 70, // Mass of the player
      position: new CANNON.Vec3(0, 5, 0), // Initial position
    });
    GameState.playerBody.collisionResponse = true;
    GameState.playerBody.name = "Player"; // Name the body for debugging
    GameState.playerBody.type = CANNON.Body.DYNAMIC; // Dynamic body for player

    // Add the shape to the physics body
    GameState.playerBody.addShape(playerShape);
    GameState.world.addBody(GameState.playerBody);
  }

  static addLighting() {
    const light = new THREE.PointLight(0xb69f66, 0.5);
    light.position.set(-0.065, -0.45, 0);
    if (GameState.tommyGun) {
      GameState.tommyGun.add(light);
    }
  }

  update(delta) {
    GameState.tommyGunMixer.update(delta);
    this.syncModelWithCamera();
    this.handleRegen();
    this.handleMovement(delta);
  }

  syncModelWithCamera() {
    if (!GameState.tommyGun) {
      console.log("Player model not loaded yet!");
      return; // Exit if the model isn't loaded
    }

    if (GameState.tommyGun) {
      GameState.tommyGun.position.copy(GameState.camera.position);
      GameState.tommyGun.rotation.copy(GameState.camera.rotation);
      GameState.tommyGun.updateMatrix();
      GameState.tommyGun.translateZ(-0.025);
      GameState.tommyGun.translateY(-0.08);
      GameState.tommyGun.translateX(-0.018);
      GameState.tommyGun.rotateY(-Math.PI);
      GameState.playerBody.position.copy(GameState.tommyGun.position);
      GameState.playerBody.quaternion.copy(GameState.tommyGun.quaternion);
    }
  }

  takeDamage(amount) {
    GameState.playerData.health = Math.max(
      0,
      GameState.playerData.health - amount
    );
    GameState.playerData.lastAttackTime = Date.now();
    this.clearRegen();

    this.updateHealthUI();
    if (GameState.playerData.health <= 0) {
      this.onDeath();
    }
  }

  onDeath() {
    GameState.isEnded = true;
    document.getElementById("game-over-popup").style.display = "block";
    cancelAnimationFrame(GameState.animationFrameId);
    endGame(false);
  }

  updateHealthUI() {
    document.getElementById("player-health").style.width =
      GameState.health + "%";
  }

  clearRegen() {
    if (GameState.playerData.regenTimeout) {
      clearTimeout(GameState.playerData.regenTimeout);
      GameState.playerData.regenTimeout = null;
    }
  }

  handleRegen() {
    if (GameState.playerData.health < 100) {
      GameState.playerData.health = Math.min(
        100,
        GameState.playerData.health + 10
      );
      this.updateHealthUI();

      GameState.playerData.regenTimeout = setTimeout(this.handleRegen(), 1000);
    } else {
      GameState.playerData.regenTimeout = null;
    }
  }

  playerRoomColl() {
    if (GameState.playerBody && GameState.roomBodies.length > 0) {
      for (let roomBody of GameState.roomBodies) {
        const pos = GameState.playerBody.position;
        const up = roomBody.aabb.upperBound;
        const low = roomBody.aabb.lowerBound;

        const withinX = pos.x > low.x && pos.x < up.x;
        const withinY = pos.y > low.y && pos.y < up.y;
        const withinZ = pos.z > low.z && pos.z < up.z;

        if (withinX && withinY && withinZ) {
          // ✅ Collision logic
          GameState.collisionState = true;
          // controls.speed = 0;

          if (GameState.moveForward)
            GameState.controls.moveForward(-GameState.controls.speed);
          else if (GameState.moveBackward)
            GameState.controls.moveForward(GameState.controls.speed);
          else if (GameState.moveLeft) {
            GameState.controls.moveRight(GameState.controls.speed);
            GameState.controls.speed = 0;
          } else if (GameState.moveRight) {
            GameState.controls.moveRight(-GameState.controls.speed);
            GameState.controls.speed = 0;
          }
        } else {
          GameState.collisionState = false;
        }
      }
    }
  }

  fire() {
    if (GameState.isFiring) {
      const currentTime = performance.now();

      if (
        currentTime - GameState.lastMeshAdditionTime >=
        GameState.meshAdditionInterval
      ) {
        GameState.lastMeshAdditionTime = currentTime;

        const direction = GameState.raycaster.ray.direction.clone();

        let finLowObject = null;
        GameState.tommyGun.traverse(function (object) {
          if (object.name === "mag_82") {
            finLowObject = object;
          }
        });

        if (finLowObject) {
          // Ensure it exists before using it
          const worldPosition = new THREE.Vector3();
          finLowObject.getWorldPosition(worldPosition);

          if (GameState.currentBullets > 0) {
            GameState.currentBullets--; // Reduce bullets when shooting
            playAnimation("Arms_Fire"); // Play shooting animation

            createBullet(worldPosition, direction);
            updateGunMuzzleFlash(worldPosition);
          } else {
            //   GameState.isFiring = false;
            setTimeout(() => {
              playAnimation("Arms_Inspect"); // Optional: Play empty mag animation
            }, 1000);
          }

          updateAmmoHUD(GameState.currentBullets, GameState.totalBullets);
        }
      }
    }
  }

  updateMovementAnimation(speedThreshold) {
    const bullets = GameState.currentBullets;
    const isMoving = GameState.isMoving;
    const speed = GameState.controls.speed;
    const firing = GameState.isFiring;
    const reloading = GameState.isReloading;
    const now = performance.now();

    let animationToPlay = "Arms_Idle";

    if (reloading) {
      animationToPlay = "Arms_fullreload";
    } else if (firing) {
      animationToPlay = bullets > 0 ? "Arms_Fire" : "Arms_Inspect";
    } else if (isMoving) {
      animationToPlay = speed >= speedThreshold ? "Arms_Run" : "Arms_Walk";

      if (now - this.lastStepTime > this.stepInterval) {
        const rate = 0.9 + Math.random() * 0.2;
        audio.play("./sounds/Step2.wav", 0.5, false, rate);
        this.lastStepTime = now;
      }
      
    }

    const nextAnim = getAnimationState(); // or use animationToPlay
    if (GameState.currentAnimation !== nextAnim) {
      playAnimation(nextAnim);
    }
  }

  handleMovement() {
    if (GameState.controls.isLocked) {
      var acceleration = 0.003; // Speed increment per frame
      var maxWalkSpeed = 0.05; // Max speed for walking
      var maxRunSpeed = 0.1; // Maximum speed
      var speedThreshold = 0.06; // Speed at which running starts

      if (GameState.moveForward) {
        GameState.controls.speed = Math.min(
          GameState.controls.speed + acceleration,
          maxRunSpeed
        );
        GameState.controls.moveForward(GameState.controls.speed);
        GameState.isMoving = true;
        if (
          checkCollision(GameState.controls.getObject().position) ||
          GameState.collisionState == true
        ) {
          GameState.controls.moveForward(-GameState.controls.speed); // Move back if collision
        }
      } else if (GameState.moveBackward) {
        GameState.controls.speed = Math.min(
          GameState.controls.speed + acceleration,
          maxRunSpeed
        );
        GameState.controls.moveForward(-GameState.controls.speed);
        GameState.isMoving = true;
        if (
          checkCollision(GameState.controls.getObject().position) ||
          GameState.collisionState == true
        ) {
          GameState.controls.moveForward(GameState.controls.speed); // Move back if collision
        }
      } else if (GameState.moveLeft) {
        GameState.controls.speed = Math.min(
          GameState.controls.speed + acceleration,
          maxRunSpeed
        );
        GameState.controls.moveRight(-GameState.controls.speed);
        GameState.isMoving = true;
        if (
          checkCollision(GameState.controls.getObject().position) ||
          GameState.collisionState == true
        ) {
          GameState.controls.moveRight(GameState.controls.speed); // Move back if collision
        }
      } else if (GameState.moveRight) {
        GameState.controls.speed = Math.min(
          GameState.controls.speed + acceleration,
          maxRunSpeed
        );
        GameState.controls.moveRight(GameState.controls.speed);
        GameState.isMoving = true;
        if (
          checkCollision(GameState.controls.getObject().position) ||
          GameState.collisionState == true
        ) {
          GameState.controls.moveRight(-GameState.controls.speed); // Move back if collision
        }
      } else {
        GameState.controls.speed = 0; // Reset speed when not moving
      }
    }
  }

  checkGoalReached() {
    const playerPos = GameState.controls.getObject().position;
    const goal = GameState.scene.getObjectByName("goal");

    if (goal && playerPos.distanceTo(goal.position) < 1) {
      GameState.controls.unlock();
      GameState.scene.remove(goal);

      if (GameState.currentLevel + 1 < GameState.totalLevels) {
        GameState.unlockedLevels = Math.max(
          GameState.unlockedLevels,
          GameState.currentLevel + 2
        );
        localStorage.setItem("unlockedLevels", GameState.unlockedLevels);

        GameState.isEnded = true;

        if (GameState.isEnded) {
          // loadLevel(); // This now resets and loads the next level properly
          endGame(true);
        }
      }

      // showLevelMenu(); // optional UI update
      // showMainMenu(); // Show main menu after level completion
      endGame(true); // Call endGame with true for victory
    }
  }
}
