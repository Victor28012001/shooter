import cannonEsDebugger from "https://cdn.jsdelivr.net/npm/cannon-es-debugger@1.0.0/+esm";
import { GameState } from "./gameStates.js";

export class PhysicsManager {
  static init() {
    GameState.world.gravity.set(0, -9.82, 0);
    GameState.world.broadphase = new CANNON.NaiveBroadphase();
    GameState.world.solver.iterations = 10;

    const textureLoader = new THREE.TextureLoader(GameState.loadingManager);

    // Load base texture once
    const baseDiffuseMap = textureLoader.load(
      "assets/textures/ground/ground_diffuse.jpg"
    );
    const baseNormalMap = textureLoader.load(
      "assets/textures/ground/ground_normal.jpg"
    );
    const baseRoughnessMap = textureLoader.load(
      "assets/textures/ground/ground_roughness.jpg"
    );
    const baseAOMap = textureLoader.load(
      "assets/textures/ground/ground_ao.jpg"
    );

    const tileSize = 10;

    // ----------------------------
    // Ground Textures and Material
    // ----------------------------
    const groundDiffuseMap = baseDiffuseMap.clone();
    const groundNormalMap = baseNormalMap.clone();
    const groundRoughnessMap = baseRoughnessMap.clone();
    const groundAOMap = baseAOMap.clone();

    const groundRepeat = GameState.gridSize / tileSize; // 250 / 10 = 25

    [
      groundDiffuseMap,
      groundNormalMap,
      groundRoughnessMap,
      groundAOMap,
    ].forEach((map) => {
      map.wrapS = THREE.RepeatWrapping;
      map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(groundRepeat, groundRepeat); // 25 x 25 tiling
    });

    const groundMaterial = new THREE.MeshStandardMaterial({
      map: groundDiffuseMap,
      normalMap: groundNormalMap,
      roughnessMap: groundRoughnessMap,
      aoMap: groundAOMap,
      side: THREE.DoubleSide,
    });

    const planeGeometry = new THREE.PlaneGeometry(
      GameState.gridSize,
      GameState.gridSize,
      250,
      250
    );
    planeGeometry.attributes.uv2 = planeGeometry.attributes.uv;

    const planeMesh = new THREE.Mesh(planeGeometry, groundMaterial);
    planeMesh.rotation.x = -Math.PI / 2;
    planeMesh.position.y = -0.5;
    planeMesh.receiveShadow = true;
    GameState.scene.add(planeMesh);

    // ----------------------------
    // Wall Textures and Material
    // ----------------------------
    const wallDiffuseMap = baseDiffuseMap.clone();
    const wallNormalMap = baseNormalMap.clone();
    const wallRoughnessMap = baseRoughnessMap.clone();
    const wallAOMap = baseAOMap.clone();

    const wallWidth = GameState.gridSize;
    const wallHeight = 10;
    const wallRepeatX = wallWidth / tileSize; // 250 / 10 = 25
    const wallRepeatY = wallHeight / tileSize; // 10 / 10 = 1

    [wallDiffuseMap, wallNormalMap, wallRoughnessMap, wallAOMap].forEach(
      (map) => {
        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.repeat.set(wallRepeatX, wallRepeatY); // 25 x 1 tiling
      }
    );

    const wallMaterial = new THREE.MeshStandardMaterial({
      map: wallDiffuseMap,
      normalMap: wallNormalMap,
      roughnessMap: wallRoughnessMap,
      aoMap: wallAOMap,
      side: THREE.DoubleSide,
    });

    const wallGeometry = new THREE.PlaneGeometry(wallWidth, wallHeight);

    function createWall(rotationY, posX, posZ) {
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.position.set(posX, wallHeight / 2 - 0.5, posZ); // align base with floor
      wall.rotation.y = rotationY;
      wall.receiveShadow = true;
      wall.castShadow = true;
      GameState.scene.add(wall);
    }

    const half = GameState.halfGridSize;

    createWall(0, 0, half); // North
    createWall(Math.PI, 0, -half); // South
    createWall(-Math.PI / 2, -half, 0); // West
    createWall(Math.PI / 2, half, 0); // East

    // ---------- Ceiling (Top Wall) ----------
    const ceilingGeometry = new THREE.PlaneGeometry(
      GameState.gridSize,
      GameState.gridSize
    );
    const ceiling = new THREE.Mesh(ceilingGeometry, wallMaterial);
    ceiling.rotation.x = Math.PI / 2; // Flip to face downward
    ceiling.position.set(0, wallHeight - 0.5, 0); // Position at the top
    ceiling.receiveShadow = true;
    ceiling.castShadow = true;
    GameState.scene.add(ceiling);

    // ----------------------------
    // Physics Floor (CANNON.js)
    // ----------------------------
    const floorShape = new CANNON.Plane();
    const floorBody = new CANNON.Body({ mass: 0 });
    floorBody.addShape(floorShape);
    floorBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0),
      -Math.PI / 2
    );
    floorBody.name = "Floor";
    GameState.world.addBody(floorBody);

    // ----------------------------
    // Physics Debugging
    // ----------------------------
    GameState.cannonDebugger = cannonEsDebugger(
      GameState.scene,
      GameState.world,
      {
        color: 0x00ff00,
      }
    );

    GameState.world.addEventListener(
      "postStep",
      PhysicsManager.handleCollisions
    );
  }

  static handleCollisions() {
    const stillColliding = new Set();

    GameState.world.contacts.forEach(({ bi, bj }) => {
      let other = bi === GameState.playerBody ? bj : bi;
      if (other?.name === "Room") {
        stillColliding.add(other.id);

        if (!GameState.currentCollisions.has(other.id)) {
          GameState.currentCollisions.add(other.id);
          GameState.collisionState = true;

          if (GameState.moveForward)
            GameState.controls.moveForward(-GameState.controls.speed);
          else if (GameState.moveBackward)
            GameState.controls.moveForward(GameState.controls.speed);
          else if (GameState.moveLeft)
            GameState.controls.moveRight(GameState.controls.speed);
          else if (GameState.moveRight)
            GameState.controls.moveRight(-GameState.controls.speed);

          GameState.collisionState = false;
        }
      }
    });

    for (const id of GameState.currentCollisions) {
      if (!stillColliding.has(id)) {
        GameState.currentCollisions.delete(id);
        GameState.collisionState = false;
      }
    }
  }
}
