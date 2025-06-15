import { GameState } from "./gameStates.js";

export class DoorController {
  constructor({
    targetParent,
    loader,
    filePath,
    gltf,
    offset = new THREE.Vector3(),
    rotationY = 0,
    triggerDistance = 2.5,
  }) {
    this.targetParent = targetParent;
    this.loader = loader;
    this.offset = offset;
    this.rotationY = rotationY;
    this.triggerDistance = triggerDistance;
    this.doors = [];
    this.tempVec = new THREE.Vector3();

    if (gltf) {
      // Clone scene and animations properly
      const clonedScene = gltf.scene.clone(true);
      this.setupDoor({ scene: clonedScene, animations: gltf.animations });
    } else if (filePath) {
      this.loadDoor(filePath);
    } else {
      throw new Error("Either gltf or filePath must be provided.");
    }
  }

  loadDoor(filePath) {
    this.loader.load(filePath, (gltf) => {
      this.setupDoor(gltf);
    });
  }

  setupDoor(gltf) {
    const doorObject = gltf.scene;
    const animations = gltf.animations;

    doorObject.name = "Door";
    doorObject.position.copy(this.offset);
    doorObject.rotation.y = this.rotationY;

    this.targetParent.add(doorObject);
    doorObject.updateMatrixWorld(true);

    if (!animations || animations.length === 0) {
      console.warn("No animations found on door GLTF.");
    }

    const clip = animations ? animations[0] : null;
    const mixer = new THREE.AnimationMixer(doorObject);
    const action = clip ? mixer.clipAction(clip) : null;

    if (action) {
      action.clampWhenFinished = true;
      action.setLoop(THREE.LoopOnce);
    }

    const doorWorldPos = doorObject.getWorldPosition(new THREE.Vector3());

    const triggerMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      opacity: 0.3,
      transparent: true,
      side: THREE.DoubleSide,
    });

    const triggerGeometry = new THREE.CircleGeometry(this.triggerDistance, 32);
    const triggerZone = new THREE.Mesh(triggerGeometry, triggerMaterial);
    triggerZone.rotation.x = -Math.PI / 2;
    triggerZone.position.copy(doorWorldPos);
    triggerZone.name = "TriggerZone";
    triggerZone.receiveShadow = false;
    triggerZone.castShadow = false;

    GameState.scene.add(triggerZone);

    this.doors.push({
      object: doorObject,
      mixer,
      action,
      isOpen: false,
      clipDuration: clip ? clip.duration : 0,
      triggerZone,
    });
  }

  update(delta) {
    if (!GameState.controls) return;
    const player = GameState.controls.getObject();
    if (!player) return;

    const playerPos = player.position;

    this.doors.forEach((doorData) => {
      const { object, mixer, action, isOpen, clipDuration } = doorData;

      if (!mixer || !action) return; // skip doors without animation
      if (!object) return;

      // Avoid creating new vector in loop
      object.updateMatrixWorld(true);
      object.getWorldPosition(this.tempVec);

      const dx = playerPos.x - this.tempVec.x;
      const dz = playerPos.z - this.tempVec.z;
      const distanceXZ = Math.sqrt(dx * dx + dz * dz);

      mixer.update(delta);

      const openTimeEnd = clipDuration / 2;

      if (distanceXZ < this.triggerDistance && !isOpen) {
        action.reset();
        action.time = 0;
        action.setLoop(THREE.LoopOnce);
        action.timeScale = 1;
        action.play();

        setTimeout(() => {
          action.paused = true;
          action.time = openTimeEnd;
          mixer.update(0);
        }, openTimeEnd * 1000);

        doorData.isOpen = true;
      } else if (distanceXZ >= this.triggerDistance && isOpen) {
        action.paused = false;
        action.reset();
        action.time = openTimeEnd;
        action.setLoop(THREE.LoopOnce);
        action.timeScale = -1;
        action.play();

        doorData.isOpen = false;
      }
    });
  }
}
