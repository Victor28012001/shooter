import { GameState } from "./gameStates.js";
import { Scene } from "./Scene.js";
import { PhysicsManager } from "./PhysicsManager.js";
import { Player } from "./Player.js";
import { showBlocker, removeUI } from "./ui.js";
import { DoorController } from "./DoorController.js";

export class LevelManager {
  constructor(spiderManager) {
    this.spiderManager = spiderManager;

    this.doorGLB = null;
    this.loader = new THREE.GLTFLoader(GameState.loadingManager);
  }

  async loadAllLevels() {
    const promises = [];
    for (let i = 1; i <= GameState.totalLevels; i++) {
      promises.push(fetch(`levels/level${i}.json`).then((res) => res.json()));
    }
    GameState.levelData = await Promise.all(promises);
  }

  showLevelMenu() {
    // 1. Create the menu HTML structure dynamically
    // const gameStateManager = new GameStateManager()
    const menuHTML = `
      <div class="menu hidden" id="menu">
        <h2>Select Level</h2>
        <div class="body">
          <div id="levelButtons"></div>
        </div>
        <button id="resetProgress">Reset Progress</button>
      </div>`;

    // 2. Append the menu to the body if it's not already there
    if (!document.getElementById("menu")) {
      document.body.insertAdjacentHTML("beforeend", menuHTML); // Injecting the menu into the body
    }

    // 3. Function to create and populate the level buttons
    const populateLevelButtons = () => {
      const container = document.getElementById("levelButtons");

      if (!container) {
        console.warn("Level buttons container missing – delaying menu setup.");
        setTimeout(populateLevelButtons, 100); // Retry after a short delay
        return; // Exit early to avoid errors if the container is not ready yet
      }

      container.innerHTML = ""; // Clear the container before adding new level buttons

      GameState.levelData.forEach((_, i) => {
        const anchor = document.createElement("div");
        anchor.className = "level-card";
        anchor.style.position = "relative";

        // Level number
        const levelNumber = document.createElement("span");
        levelNumber.textContent = `Level ${i + 1}`;
        levelNumber.style.position = "absolute";
        levelNumber.style.top = "50px";
        levelNumber.style.left = "50%";
        levelNumber.style.transform = "translateX(-50%)";
        levelNumber.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        levelNumber.style.color = "#fff";
        levelNumber.style.fontSize = "20px";
        levelNumber.style.padding = "5px 10px";
        anchor.appendChild(levelNumber);

        // Level card structure
        const card = document.createElement("div");
        card.className = "card";

        const wrapper = document.createElement("div");
        wrapper.className = "wrapper";

        const coverImg = document.createElement("img");
        coverImg.src = "./assets/images/force_mage-cover.jpg";
        coverImg.className = "cover-image";

        const titleImg = document.createElement("img");
        titleImg.src = "./assets/images/force_mage-title.png";
        titleImg.className = "title";

        const charImg = document.createElement("img");
        charImg.src = "./assets/images/force_mage-character.webp";
        charImg.className = "character";

        wrapper.appendChild(coverImg);
        card.appendChild(wrapper);
        card.appendChild(titleImg);
        card.appendChild(charImg);
        anchor.appendChild(card);

        // If the level is locked, apply the disabled styling
        if (i >= GameState.unlockedLevels) {
          anchor.classList.add("disabled-card");
          anchor.style.pointerEvents = "none"; // Disable clicks
          anchor.style.opacity = "0.4"; // Optional: make it look disabled
        } else {
          anchor.addEventListener("click", () => {
            // gameStateManager.setState('SHOW_CONTROLS');
            this.loadLevel(i);
          });
        }

        container.appendChild(anchor); // Append the level button (card) to the container
      });

      // Finally, reveal the menu
      document.getElementById("menu").classList.remove("hidden");
    };

    const resetBtn = document.getElementById("resetProgress");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => this.resetProgress());
    }
    // Call the function to populate the buttons
    populateLevelButtons();
  }

  resetProgress() {
    localStorage.removeItem("unlockedLevels");
    GameState.unlockedLevels = 1;
    this.showLevelMenu();
  }

  async loadLevel(index) {
    GameState.currentLevel = index;

    Scene.init();
    PhysicsManager.init();
    await this.buildLevel(GameState.levelData[index]);
    removeUI("menu");
    showBlocker();
  }

  async loadDoorModel() {
    if (!this.doorGLB) {
      this.doorGLB = await new Promise((resolve, reject) => {
        this.loader.load(
          "./assets/models/door_wood.glb",
          (gltf) => resolve(gltf),
          undefined,
          (err) => reject(err)
        );
      });
    }
    return this.doorGLB;
  }

  async buildLevel(level) {
    GameState.roomBodies = [];

    const doorGLTF = await this.loadDoorModel();

    const idleCallback =
      window.requestIdleCallback ||
      function (cb) {
        return setTimeout(() => cb({ timeRemaining: () => 50 }), 1);
      };

    const objects = level.objects;
    const batchSize = 5;
    let i = 0;

    const processBatch = () => {
      const start = i;
      const end = Math.min(i + batchSize, objects.length);

      for (; i < end; i++) {
        const box = objects[i];
        const clone = GameState.abandonedBuilding.clone(true);
        const position = new THREE.Vector3(
          box[0] * GameState.gridScale,
          box[1] * GameState.gridScale,
          box[2] * GameState.gridScale
        );
        clone.position.copy(position);
        GameState.scene.add(clone);

        const doorController = new DoorController({
          targetParent: clone,
          loader: this.loader,
          gltf: doorGLTF, // pass cloned door model
          offset: new THREE.Vector3(0, 0, 4.47),
          rotationY: Math.PI,
          triggerDistance: 2.5,
        });
        GameState.doorControllers.push(doorController);

        const roomBody = new CANNON.Body({ mass: 0 });
        const shape = new CANNON.Box(
          new CANNON.Vec3(
            GameState.roomWidth / 2 + 0.25,
            GameState.wallHeight,
            GameState.roomDepth / 2 + 0.25
          )
        );
        roomBody.addShape(shape);
        roomBody.name = "Room";
        roomBody.position.set(position.x, position.y, position.z - 0.35);
        roomBody.computeAABB();
        GameState.roomBodies.push(roomBody);
        GameState.world.addBody(roomBody);
      }

      if (i < objects.length) {
        idleCallback(processBatch);
      }
    };

    await new Promise((resolve) => {
      processBatch();
      resolve();
    });

    const loader = new THREE.GLTFLoader(GameState.loadingManager);
    // const [x, y, z] = [10, 0, 12];
    const [x, y, z] = level.target;

    loader.load(
      "./assets/models/trapdoor.glb",
      (gltf) => {
        const trapdoor = gltf.scene;

        trapdoor.position.set(
          x * GameState.gridScale,
          y * GameState.gridScale,
          z * GameState.gridScale
        );

        trapdoor.name = "goal"; // Keep this so your goal-checking logic still works

        trapdoor.scale.set(18, 18, 18);
        trapdoor.position.y -= 0.6; // Adjust height to match the original sphere goal
        trapdoor.rotation.set(0, -Math.PI / 2, 0); // Rotate to face the player

        console.log("Trapdoor loaded:", trapdoor);
        console.log("Trapdoor position:", trapdoor.position);
        console.log("Trapdoor children:", trapdoor.children);

        // const helper = new THREE.BoxHelper(trapdoor, 0x00ff00);
        // GameState.scene.add(helper);

        // Optional: Red transparent debug box
        const trapdoorMaterial = new THREE.MeshBasicMaterial({
          color: 0xff0000,
          opacity: 0.3,
          transparent: true,
        });
        const trapdoorGeometry = new THREE.BoxGeometry(1.3, 3.01, 2.0);
        const trapdoorAreaMesh = new THREE.Mesh(
          trapdoorGeometry,
          trapdoorMaterial
        );
        trapdoorAreaMesh.position.copy(trapdoor.position);
        trapdoorAreaMesh.name = "TrapdoorArea";

        GameState.scene.add(trapdoor);
        GameState.scene.add(trapdoorAreaMesh);
      },
      undefined,
      (error) => {
        console.error("Error loading model:", error);
      }
    );

    await Player.loadModel(this.loader);
    GameState.player = new Player();
  }
}
