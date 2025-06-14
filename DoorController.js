import { GameState } from "./gameStates.js";

export class DoorController {
  constructor(params) {
    this.loader = params.loader;
    this.filePath = params.filePath;
    this.triggerDistance = params.triggerDistance || 2.5;

    this.building = params.targetParent;
    this.offset = params.offset || new THREE.Vector3();
    this.rotationY = params.rotationY || 0;

    this.doors = []; // Store { object, mixer, action, isOpen }

    this.loadDoor();
  }

  loadDoor() {
    this.loader.load(this.filePath, (gltf) => {
      const doorObject = gltf.scene;
      doorObject.name = "Door";

      const clip = gltf.animations[0];
      if (!clip) {
        console.warn("❌ No animation clip found for door.");
        return;
      }

      doorObject.position.copy(this.offset);
      doorObject.rotation.y = this.rotationY;

      const mixer = new THREE.AnimationMixer(doorObject);
      const action = mixer.clipAction(clip);
      action.clampWhenFinished = true;
      action.setLoop(THREE.LoopOnce);

      this.building.add(doorObject);
      doorObject.updateMatrixWorld(true);

      const doorWorldPos = doorObject.getWorldPosition(new THREE.Vector3());

      const triggerMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        opacity: 0.3,
        transparent: true,
        side: THREE.DoubleSide,
      });

      const triggerGeometry = new THREE.CircleGeometry(
        this.triggerDistance,
        32
      );
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
        clipDuration: clip.duration,
        triggerZone,
    });

    });
  }

  update(delta) {
    if (!GameState.controls) return;

    const player = GameState.controls.getObject();
    if (!player) return;

    const playerPos = player.position;

    this.doors.forEach((doorData) => {
      const { object, mixer, action, isOpen, clipDuration } = doorData;

      object.updateMatrixWorld(true);
      const doorWorldPos = object.getWorldPosition(new THREE.Vector3());

      const dx = playerPos.x - doorWorldPos.x;
      const dz = playerPos.z - doorWorldPos.z;
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
