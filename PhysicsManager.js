import cannonEsDebugger from "https://cdn.jsdelivr.net/npm/cannon-es-debugger@1.0.0/+esm";
import { GameState } from "./gameStates.js";

export class PhysicsManager {
  static init() {
    GameState.world.gravity.set(0, -9.82, 0);
    GameState.world.broadphase = new CANNON.NaiveBroadphase();
    GameState.world.solver.iterations = 10;

    const planeGeometry = new THREE.PlaneGeometry(250, 250, 250, 250);
    const planeMesh = new THREE.Mesh(planeGeometry, GameState.phongMaterial);
    planeMesh.rotateX(-Math.PI / 2);
    planeMesh.position.y = -0.5;
    planeMesh.receiveShadow = true;
    GameState.scene.add(planeMesh);

    const floorShape = new CANNON.Plane();
    const floorBody = new CANNON.Body({ mass: 0 });
    floorBody.addShape(floorShape);
    floorBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0),
      -Math.PI / 2
    );
    floorBody.name = "Floor";
    GameState.world.addBody(floorBody);

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
