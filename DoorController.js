// import { GameState } from "./gameStates.js";

// export class DoorController {
//   constructor(params) {
//     this.building = params.building;
//     this.loader = params.loader;
//     this.filePath = params.filePath;
//     this.offset = params.offset || new THREE.Vector3();
//     this.rotationY = params.rotationY || 0;
//     this.triggerDistance = params.triggerDistance || 2.5;

//     this.doorObject = null;
//     this.mixer = null;
//     this.action = null;
//     this.doorOpen = false;
//     this.isLoaded = false;

//     this.loadDoor();
//   }

//   loadDoor() {
//     this.loader.load(this.filePath, (gltf) => {
//       this.doorObject = gltf.scene;
//       const clip = gltf.animations[0];
//       if (!clip) {
//         console.warn("❌ No animations in door model");
//         return;
//       }

//       this.mixer = new THREE.AnimationMixer(this.doorObject);
//       this.action = this.mixer.clipAction(clip);
//       this.action.clampWhenFinished = true;
//       this.action.setLoop(THREE.LoopOnce);

//       this.doorObject.position.copy(this.offset);
//       this.doorObject.rotation.y = this.rotationY;

//       this.building.add(this.doorObject);

//       this.isLoaded = true;
//       console.log("🎬 DoorController loaded with animation:", clip.name);
//     });
//   }

//   update(delta) {
//     console.log("[DoorController] update called");

//     if (!this.isLoaded) {
//       console.warn("[DoorController] Not loaded yet");
//       return;
//     }

//     if (!GameState.controls) {
//       console.warn("[DoorController] GameState.controls is not defined");
//       return;
//     }

//     const playerObj = GameState.controls.getObject();
//     if (!playerObj) {
//       console.warn(
//         "[DoorController] controls.getObject() returned null/undefined"
//       );
//       return;
//     }

//     if (!this.doorObject) {
//       console.warn("[DoorController] doorObject is null");
//       return;
//     }

//     // Force update of matrices for accurate world position
//     this.doorObject.updateMatrixWorld(true);

//     const playerPos = playerObj.position;
//     const doorWorldPos = this.doorObject.getWorldPosition(new THREE.Vector3());
//     const distance = playerPos.distanceTo(doorWorldPos);

//     console.log(
//       `[DoorController] Player Position: (${playerPos.x.toFixed(
//         2
//       )}, ${playerPos.y.toFixed(2)}, ${playerPos.z.toFixed(2)})`
//     );
//     console.log(
//       `[DoorController] Door Position: (${doorWorldPos.x.toFixed(
//         2
//       )}, ${doorWorldPos.y.toFixed(2)}, ${doorWorldPos.z.toFixed(2)})`
//     );
//     console.log(`[DoorController] Distance: ${distance.toFixed(2)}`);

//     this.mixer.update(delta);

//     if (distance < this.triggerDistance && !this.doorOpen) {
//       console.log("[DoorController] Within range. Opening door.");
//       this.playOpen();
//     } else if (distance >= this.triggerDistance && this.doorOpen) {
//       console.log("[DoorController] Out of range. Closing door.");
//       this.playClose();
//     }
//   }

//   playOpen() {
//     this.action.reset();
//     this.action.timeScale = 1;
//     this.action.play();
//     this.doorOpen = true;
//   }

//   playClose() {
//     this.action.reset();
//     this.action.time = this.action.getClip().duration;
//     this.action.timeScale = -1;
//     this.action.play();
//     this.doorOpen = false;
//   }
// }
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
      console.log("🚪 Door world position after load:", doorWorldPos);

      this.doors.push({
        object: doorObject,
        mixer,
        action,
        isOpen: false,
        clipDuration: clip.duration,
      });

      console.log("✅ Door added to building:", doorObject.name);
    });
  }

  isPlayerNearBuilding(playerPos) {
    if (!this.building || this.doors.length === 0) return false;

    // Ensure building matrices are up to date
    this.building.updateMatrixWorld(true);

    const doorObject = this.doors[0].object;
    doorObject.updateMatrixWorld(true);

    const doorPos = doorObject.getWorldPosition(new THREE.Vector3());

    console.log("👤 Player position:", playerPos);
    console.log("🚪 Door world position:", doorPos);

    const distance = playerPos.distanceTo(doorPos);
    const thresholdDistance = 50;

    const isNear = distance <= thresholdDistance;

    console.log(
      `[DoorController] Player distance to door: ${distance.toFixed(
        2
      )} (threshold: ${thresholdDistance})`
    );
    console.log(
      `[DoorController] Player NEAR building (door-based): ${isNear}`
    );

    return isNear;
  }

  update(delta) {
    if (!GameState.controls) return;

    const player = GameState.controls.getObject();
    if (!player) return;

    const playerPos = player.position;

    // 🔍 Call the building proximity check here
    const isNearBuilding = this.isPlayerNearBuilding(playerPos);

    // Optional: skip door checks if player is not near
    if (!isNearBuilding) return;

    this.doors.forEach((doorData) => {
      const { object, mixer, action, isOpen, clipDuration } = doorData;

      object.updateMatrixWorld(true);
      const doorWorldPos = object.getWorldPosition(new THREE.Vector3());
      const distance = playerPos.distanceTo(doorWorldPos);

      console.log(
        `[DoorController] Player ↔ Door: ${distance.toFixed(2)} units`
      );

      mixer.update(delta);

      if (distance < this.triggerDistance && !isOpen) {
        console.log("🚪 Opening door");
        action.reset();
        action.timeScale = 1;
        action.play();
        doorData.isOpen = true;
      } else if (distance >= this.triggerDistance && isOpen) {
        console.log("🚪 Closing door");
        action.reset();
        action.time = clipDuration;
        action.timeScale = -1;
        action.play();
        doorData.isOpen = false;
      }
    });
  }
}
