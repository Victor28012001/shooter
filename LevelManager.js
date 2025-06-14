import { GameState } from "./gameStates.js";
import { Scene } from "./Scene.js";
import { PhysicsManager } from "./PhysicsManager.js";
import { Player } from "./Player.js";
import { showBlocker, removeUI } from "./ui.js";
import { DoorController } from "./DoorController.js";

export class LevelManager {
  constructor(spiderManager) {
    this.spiderManager = spiderManager;
  }

  async loadAllLevels() {
    GameState.levelData = [];
    for (let i = 1; i <= GameState.totalLevels; i++) {
      const res = await fetch(`levels/level${i}.json`);
      const json = await res.json();
      GameState.levelData.push(json);
    }
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

  async buildLevel(level) {
    GameState.roomBodies = [];
    var loader = new THREE.GLTFLoader(GameState.loadingManager);

    for (const box of level.objects) {
      const clone = GameState.abandonedBuilding.clone(true);
      const position = new THREE.Vector3(
        box[0] * GameState.gridScale,
        box[1] * GameState.gridScale,
        box[2] * GameState.gridScale
      );
      clone.position.copy(position);
      GameState.scene.add(clone);

      // 📌 Add a door to this specific building clone
      const doorController = new DoorController({
        targetParent: clone,
        loader,
        filePath: "./assets/models/door_wood.glb",
        offset: new THREE.Vector3(0, 0, 4.47), // adjust relative to clone's structure
        rotationY: Math.PI,
        triggerDistance: 2.5,
      });
      GameState.doorControllers.push(doorController);

      // Physics body
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

    // Goal setup (unchanged)
    const [x, y, z] = level.target;
    const goal = new THREE.Mesh(
      new THREE.SphereGeometry(0.5),
      new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );
    goal.position.set(
      x * GameState.gridScale,
      y * GameState.gridScale + 1.6,
      z * GameState.gridScale
    );
    goal.name = "goal";
    GameState.scene.add(goal);

    await Player.loadModel(new THREE.GLTFLoader(GameState.loadingManager));
    GameState.player = new Player();
  }
}
