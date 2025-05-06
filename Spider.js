import { GameState } from "./gameStates.js";
import { updateSpiderHUD, checkSpiderAttacks } from "./utils.js";
import { Sound3DPlayer } from "./Sound3DPlayer.js";

export class SpiderManager {
  constructor(scene, loadingManager) {
    this.scene = scene;
    this.loadingManager = loadingManager;
    this.spiderGLTF = null;
    this.spiderMeshes = GameState.spiderMeshes || [];
    this.spawnedSpiders = 0;
    this.totalSpiders = 24;
    this.modelReady = GameState.modelReady || false;
    this.lastKnownPlayerPosition = null;
    this.audioPlayer = new Sound3DPlayer();;
    GameState.totalSpiders = this.totalSpiders;
  }

  async loadSpiderModel() {
    const gltfLoader = new THREE.GLTFLoader(this.loadingManager).setPath("./");
    this.spiderGLTF = await gltfLoader.loadAsync(
      "./assets/models/voided_spider-opt.glb"
    );
    this.spiderGLTF.scene.name = "spider";
    this.modelReady = true;
    GameState.modelReady = true;
  }

  createHealthBar() {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 12;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "green";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const healthBar = new THREE.Sprite(material);

    healthBar.scale.set(1.5, 0.3, 1);
    return healthBar;
  }

  updateHealthBar(spider) {
    const canvas = spider.healthBar.material.map.image;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const healthPercent = Math.max(spider.health / 100, 0);
    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "green";
    ctx.fillRect(0, 0, canvas.width * healthPercent, canvas.height);

    spider.healthBar.material.map.needsUpdate = true;
  }

  addSpider(posX) {
    if (!this.spiderGLTF) {
      console.error("Spider model not loaded yet!");
      return;
    }

    const model = THREE.SkeletonUtils.clone(this.spiderGLTF.scene);
    model.health = 100;

    model.mixer = new THREE.AnimationMixer(model);
    model.animations = {};

    this.spiderGLTF.animations.forEach((clip) => {
      model.animations[clip.name] = clip;
    });

    const defaultAnimation = "running";
    if (!model.animations[defaultAnimation]) return;

    const action = model.mixer.clipAction(model.animations[defaultAnimation]);
    action.setLoop(THREE.LoopRepeat);
    action.play();

    model.traverse((child) => {
      if (child.isSkinnedMesh) child.frustumCulled = false;
    });

    const healthBar = this.createHealthBar();
    model.healthBar = healthBar;
    model.add(healthBar);
    healthBar.position.y = 2;

    model.position.set(posX, 0, -30);
    model.rotation.y = Math.PI;
    model.rotateY(Math.PI);

    this.spiderMeshes.push(model);
    GameState.scene.add(model);
    GameState.mixers.push(model.mixer);
    
    // Play sound when spider is spawned at its position
    this.playSpiderSound(model, 'idle');
  }

  // Function to play the spider's sound based on state
  playSpiderSound(spider, state) {
    const soundMap = {
      idle: './sounds/StunSpider.wav',
      alert: './sounds/Shriek2.wav',
      attack: './sounds/Shriek2.wav'
    };

    const soundFile = soundMap[state];

    if (soundFile) {
      this.audioPlayer.playPositionalAudio(soundFile, spider.position, 0.5);
    }
  }


  playAnimation(spider, animationName) {
    if (
      !spider.mixer ||
      !spider.animations ||
      !spider.animations[animationName]
    ) {
      console.error(
        `Animation "${animationName}" not found for spider!`,
        spider
      );
      return;
    }

    const runningAction = spider.mixer.clipAction(spider.animations["running"]);
    const newAction = spider.mixer.clipAction(spider.animations[animationName]);

    // Ensure running animation is playing
    if (!runningAction.isRunning()) {
      runningAction.reset().setLoop(THREE.LoopRepeat).fadeIn(0.3).play();
    }

    // Configure the new animation
    newAction.reset();
    newAction.fadeIn(0.3).play();

    // If you want non-looping behavior for certain animations:
    const nonLoopingAnimations = [
      "attack_jaw",
      "attack_inner_jaw",
      "attack_L",
      "attack_R",
      // Add any others you want to play once
    ];

    if (nonLoopingAnimations.includes(animationName)) {
      newAction.setLoop(THREE.LoopOnce);
      newAction.clampWhenFinished = true;

      newAction.onFinished = () => {
        newAction.fadeOut(0.3);
      };
    } else {
      newAction.setLoop(THREE.LoopRepeat);
    }

    spider.currentAnimation = animationName;

    // Trigger the appropriate sound based on animation
    if (animationName.includes('attack')) {
      this.playSpiderSound(spider, 'attack');
    } else if (animationName === 'alert') {
      this.playSpiderSound(spider, 'alert');
    } else {
      this.playSpiderSound(spider, 'idle');
    }

  }

  spawnSpiders() {
    if (!GameState.modelReady) {
      console.warn("Model not ready yet, delaying spider spawn...");
      return;
    }

    this.spawnedSpiders = 0;

    const interval = setInterval(() => {
      if (this.spawnedSpiders >= this.totalSpiders) {
        clearInterval(interval);
        return;
      }
      if (GameState.paused) return;
      const randomX = Math.floor(Math.random() * 20) - 10;
      this.addSpider(randomX);
      this.spawnedSpiders++;
      updateSpiderHUD(GameState.totalSpiders, GameState.killedSpiders);
    }, 2000);
  }

  updateSpiders(player) {
    if (!player) return;

    const playerPosition = new THREE.Vector3();
    player.getWorldPosition(playerPosition);

    this.spiderMeshes.forEach((spider) => {
      const state = spider.userData.state || "idle";
      const distToPlayer = spider.position.distanceTo(playerPosition);

      // Set defaults
      spider.userData.state = state;
      spider.userData.wanderTarget = spider.userData.wanderTarget || null;

      // AI state machine using arrow functions to preserve "this"
      switch (state) {
        case "idle":
          this.wander(spider);
          this.detectPlayer(spider, playerPosition, player);
          break;
        case "alert":
          this.moveToPlayer(spider, playerPosition);
          break;
        case "attack":
          this.chasePlayer(spider, playerPosition, player);
          break;
      }

      // 🧠 Apply spacing logic
      this.applySeparationForce(spider);
      this.avoidObstacles(spider);

      this.updateHealthBar(spider);
      if (spider.mixer) spider.mixer.update(1 / 60);
    });
  }

  wander(spider) {
    if (
      !spider.userData.wanderTarget ||
      spider.position.distanceTo(spider.userData.wanderTarget) < 0.5
    ) {
      spider.userData.wanderTarget = this.getRandomPointNearby(
        spider.position,
        5
      );
    }
    this.moveTowards(spider, spider.userData.wanderTarget);
  }

  detectPlayer(spider, playerPos, player) {
    const dist = spider.position.distanceTo(playerPos);
    const dirToPlayer = playerPos.clone().sub(spider.position).normalize();
    const playerForward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      player.quaternion
    );
    const inSight = dirToPlayer.dot(playerForward) > 0.7;
    const lightOn = player.flashlightOn;

    if (dist < 10 || (lightOn && inSight && dist < 15)) {
      spider.userData.state = "attack";
    } else if (dist < 6) {
      spider.userData.state = "alert";
    }
  }

  moveToPlayer(spider, playerPos) {
    const dir = playerPos.clone().sub(spider.position).normalize();
    this.moveInDirection(spider, dir);
  }

  chasePlayer(spider, playerPos, player) {
    const targetPos = spider.userData.alertTarget || playerPos;

    const dir = targetPos.clone().sub(spider.position).normalize();
    const raycaster = new THREE.Raycaster(spider.position, dir, 0, 2);
    const intersects = raycaster
      .intersectObjects(this.scene.children, true)
      .filter((obj) => obj.object.name === "room");

    const moveDir = intersects.length > 0 ? this.steerAround(spider, dir) : dir;
    this.moveInDirection(spider, moveDir);

    const dist = spider.position.distanceTo(targetPos);

    // If they reach the target position but don't see the player, they wander
    if (dist < 1.5 && !this.canSeePlayer(spider, playerPos, player)) {
      spider.userData.state = "idle";
      spider.userData.wanderTarget = targetPos.clone();
      return;
    }

    // Play attacks if player is close
    const realPlayerDist = spider.position.distanceTo(playerPos);
    if (realPlayerDist < 2) {
      this.playAnimation(
        spider,
        Math.random() > 0.5 ? "attack_jaw" : "attack_inner_jaw"
      );
    } else if (realPlayerDist < 6) {
      this.playAnimation(spider, Math.random() > 0.5 ? "attack_L" : "attack_R");
    }

    checkSpiderAttacks();
  }

  moveTowards(spider, targetPos) {
    const flatTarget = targetPos.clone();
    flatTarget.y = spider.position.y; // prevent vertical movement

    const dir = flatTarget.sub(spider.position).normalize();
    this.moveInDirection(spider, dir);

    spider.position.y = 0; // enforce Y position
  }

  moveInDirection(spider, dir) {
    const speed = 0.05;
    const newPos = spider.position.clone().add(dir.clone().multiplyScalar(speed));
    newPos.y = 0;
  
    // Cast down from new position to check if inside a room
    const down = new THREE.Vector3(0, -1, 0);
    const raycaster = new THREE.Raycaster(newPos.clone().add(new THREE.Vector3(0, 1, 0)), down, 0, 2);
  
    const hits = raycaster
      .intersectObjects(this.scene.children, true)
      .filter((obj) => obj.object.name === "room" || obj.object.isRoom);
  
    if (hits.length === 0) {
      spider.position.copy(newPos); // only move if not in a room
    }
  
    spider.position.y = 0; // lock Y
  
    // ✨ Flatten the look target's Y to prevent spider tilting up
    const lookAt = spider.position.clone().add(dir);
    lookAt.y = spider.position.y;
  
    spider.lookAt(lookAt);
    spider.rotateY(Math.PI); // optional if model is backward-facing
  }
  
  getRandomPointNearby(position, radius) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius;
    return position
      .clone()
      .add(
        new THREE.Vector3(
          Math.cos(angle) * distance,
          0,
          Math.sin(angle) * distance
        )
      );
  }

  steerAround(spider, originalDir) {
    const angle = Math.PI / 4;
    for (let i = -2; i <= 2; i++) {
      const tryDir = originalDir
        .clone()
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), angle * i);
      const raycaster = new THREE.Raycaster(spider.position, tryDir, 0, 2);
      const hits = raycaster
        .intersectObjects(this.scene.children, true)
        .filter((obj) => obj.object.name === "room");

      if (hits.length === 0) return tryDir;
    }
    return originalDir.negate(); // fallback
  }

  alertNearbySpiders(spiderHit, playerPosition) {
    // Save the last known player position
    this.lastKnownPlayerPosition = playerPosition.clone();

    this.spiderMeshes.forEach((spider) => {
      // Skip the one that got hit (already aggro)
      if (spider === spiderHit) return;

      const dist = spider.position.distanceTo(playerPosition);

      // You can tweak this range
      if (dist < 45) {
        spider.userData.state = "attack";
        spider.userData.alertTarget = playerPosition.clone();
      }
    });
  }

  canSeePlayer(spider, playerPos, player) {
    const dirToPlayer = playerPos.clone().sub(spider.position).normalize();
    const playerForward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      player.quaternion
    );
    const inSight = dirToPlayer.dot(playerForward) > 0.7;
    const lightOn = player.flashlightOn;
    const dist = spider.position.distanceTo(playerPos);

    return dist < 10 || (lightOn && inSight && dist < 15);
  }

  applySeparationForce(spider) {
    const separationRadius = 1.5; // how far they should keep from each other
    const separationStrength = 0.03; // how strongly they react

    const separationForce = new THREE.Vector3();

    this.spiderMeshes.forEach((otherSpider) => {
      if (otherSpider === spider) return;

      const distance = spider.position.distanceTo(otherSpider.position);
      if (distance < separationRadius && distance > 0.0001) {
        // Move away from the other spider
        const away = spider.position.clone().sub(otherSpider.position);
        away.normalize().divideScalar(distance); // closer spiders = stronger repulsion
        separationForce.add(away);
      }
    });

    // Apply the force
    spider.position.add(separationForce.multiplyScalar(separationStrength));
  }

  avoidObstacles(spider) {
    const rayDistance = 1.2;
    const steerStrength = 0.08;
    const origin = spider.position.clone();
  
    const directions = [
      new THREE.Vector3(0, 0, -1), // center
      new THREE.Vector3(-0.5, 0, -1), // left
      new THREE.Vector3(0.5, 0, -1), // right
    ];

  
    let avoidanceForce = new THREE.Vector3();
  
    directions.forEach((dir) => {
      const worldDir = dir.clone().applyQuaternion(spider.quaternion).normalize();
      const raycaster = new THREE.Raycaster(origin, worldDir, 0, rayDistance);
  
      const hits = raycaster
        .intersectObjects(this.scene.children, true)
        .filter((obj) => obj.object.name === "room" || obj.object.isObstacle);
  
      if (hits.length > 0) {
        // Push away from the obstacle
        const pushAway = worldDir.clone().negate().multiplyScalar(1 / hits[0].distance);
        avoidanceForce.add(pushAway);
        console.log("ok")
      }
    });
  
    if (avoidanceForce.lengthSq() > 0) {
      avoidanceForce.normalize().multiplyScalar(steerStrength);
      spider.position.add(avoidanceForce);
    }
  }
  
  
}
