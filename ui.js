import { GameState, setState } from "./gameStates.js";
import { LevelManager } from "./LevelManager.js";
import { startGame } from "./script.js";
import { audio } from "./audio.js";
// import { GameStateManager } from "./GameStateManager.js";

const levelManager = new LevelManager();
export function showSplashScreen(onFinish) {
  const splashHTML = `
    <div id="splashScreen">
      <div id="splashContent" style="text-align:center; display:flex; flex-direction:column; align-items:center; background-color:rgba(0,0,0,0.5); width:100%; height:100vh; justify-content:center;">
        <h1>Saving Victor</h1>
        <p id="paragraph">Loading assets...</p>
        <div id="loadingBarContainer">
          <div id="loadingProgress"></div>
        </div>
        <button id="loadingButton" disabled style="margin-top: 20px;">Start Game</button>
      </div>
    </div>
  `;
  document.body.appendChild(createElementFromHTML(splashHTML));

  GameState.loadingManager.onProgress = function (url, loaded, total) {
    const progressEl = document.getElementById("loadingProgress");
    if (progressEl) {
      const progress = (loaded / total) * 100;
      progressEl.style.width = progress + "%";
    }
  };

  GameState.loadingManager.onLoad = function () {
    const paragraph = document.getElementById("paragraph");
    paragraph.innerText = "Assets Loaded";
    // Enable the button now that loading is done
    const loadingButton = document.getElementById("loadingButton");
    if (loadingButton) {
      loadingButton.disabled = false;
      loadingButton.innerText = "Start Game";
      loadingButton.addEventListener("click", () => {
        removeUI("splashScreen");
        if (typeof onFinish === "function") onFinish();
      });
    }
  };
}

export function showInitialSplash() {
  const splash = `
    <div class="splash" id="splash">
    </div>`;
  document.body.appendChild(createElementFromHTML(splash));

  setTimeout(() => {
    removeUI("splash");
  }, 3000);
}

export function showGameHUD() {
  const hudHTML = `
      <div id="ammoHUD">
        <p><img src="./assets/images/bullet.png" alt="" />Bullets:
          <span id="currentBullets">30</span> /
          <span id="totalBullets">90</span>
        </p>
        <p id="reloadMessage" style="display: none; color: red">Press R to Reload</p>
      </div>
      <div id="player-hud">
        <div id="player-health-bar">
          <p>health:</p>
          <div id="player-health"><img src="./assets/images/heart.png" alt="" /></div>
        </div>
        <a href="https://www.vecteezy.com/free-png/game-hud" style="text-decoration: none; color: aliceblue">Game Hud PNGs by Vecteezy</a>
      </div>
      <div id="blood-overlay"></div>
      <div id="spider-hud">
        <p><img src="./assets/images/spider.png" alt="" width="24" />Spiders: <span id="total-spiders">0</span></p>
        <p><img src="./assets/images/skull.png" alt="" width="16" />Kills: <span id="spiders-killed">0</span></p>
      </div>
    `;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = hudHTML;
  document.body.appendChild(wrapper);

  const crosshair = document.createElement("img");
  crosshair.id = "crosshair";
  crosshair.src = "./assets/images/reticle.png";
  crosshair.alt = "Crosshair";
  GameState.dom.crosshair = crosshair
  document.body.appendChild(crosshair);
}

export function showGameOverPopup(renderer) {
  setState(GameState.GAME_OVER);
  console.log("Game over popup triggered");
  const popupHTML = `
      <div id="game-over-popup">
        <h2>Game Over</h2>
        <p>You were killed by the spiders!</p>
        <button id="restart-game">Restart</button>
      </div>
    `;
  document.body.appendChild(createElementFromHTML(popupHTML));
}

export function showBloodOverlay() {
  const overlayElement = createElementFromHTML(
    `<div id="blood-overlay"></div>`
  );
  overlayElement.style.opacity = "0.65";
  document.body.appendChild(overlayElement);

  setTimeout(() => {
    overlayElement.style.opacity = "0";
  }, 300);

  setTimeout(() => {
    const el = document.getElementById("blood-overlay");
    if (el) el.remove();
  }, 400);
}

export function showGameWonPopup(renderer) {
  setState(GameState.GAME_WON);
  console.log("Game won popup triggered");

  // Remove existing popup if present
  const existingPopup = document.getElementById("game-won-popup");
  if (existingPopup) {
    existingPopup.remove();
    console.log("Existing popup removed.");
  }

  const popupHTML = `
    <div id="game-won-popup">
      <h2>Game Won</h2>
      <p>You survived the spiders!</p>
      <button id="next-game">Next</button>
    </div>
  `;
  document.body.appendChild(createElementFromHTML(popupHTML));

  const nextGameButton = document.getElementById("next-game");
  if (!nextGameButton) {
    console.error("Next game button not found in the DOM.");
    return;
  }

  console.log("Next game button found in the DOM.");
  nextGameButton.addEventListener("click", () => {
    console.log("Next game button clicked");
    if (renderer && renderer.domElement && renderer.domElement.parentNode) {
      renderer.renderLists.dispose();
      renderer.domElement.parentNode.removeChild(renderer.domElement);
      removeAllUI();
      levelManager.showLevelMenu();
    } else {
      console.warn("Renderer not provided or invalid.");
    }
  });
}


export function removeAllUI() {
  const ids = [
    "splashScreen",
    "splash",
    "menu",
    "blocker",
    "ammoHUD",
    "player-hud",
    "blood-overlay",
    "spider-hud",
    "game-over-popup",
    "game-won-popup",
    "crosshair",
  ];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}

function createElementFromHTML(htmlString) {
  const div = document.createElement("div");
  div.innerHTML = htmlString.trim();
  return div.firstChild;
}

export function showBlocker() {
  const blockerHTML = `
    <div id="blocker-wrapper" style="
      width: 100vw;
      height: 100vh;
      background: url('./assets/images/splash_screen.png') no-repeat center center;
      background-size: cover;
      display: flex;
      justify-content: center;
      align-items: center;
      position: absolute;
      left: 0;
      top: 0;
    ">
      <div id="blocker" style="
        padding: 2rem;
        border-radius: 8px;
        text-align: center;
      ">
        <div id="instructions">
          <div id="playButton" style="cursor: pointer;">
            <h1 style="color: white; margin-bottom: 1rem;">Play Now</h1>
            <p style="color: white; font-size: small; font-weight: 500; margin: 0;">
              ESC - Menu<br>
              WASD / ARROWS - Move<br>
              LEFT MOUSE / Spacebar - Fire<br>
              R Key - Reload
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

  const wrapper = createElementFromHTML(blockerHTML);
  document.body.appendChild(wrapper);

  const playBtn = document.getElementById("playButton");
  if (playBtn) {
    playBtn.addEventListener("click", () => {
      // const gameStateManager = new GameStateManager()
      if (GameState.controls) {
        GameState.controls.lock();
      }
      // gameStateManager.setState('IN_GAME')
      startGame();
      audio.play("./sounds/Breathing.wav", 0.7, true);
      removeUI("blocker-wrapper"); // Remove the whole overlay
    });
  } else {
    console.error("Play button not found in showBlocker.");
  }
}

export function removeUI(uid) {
  const ui = document.getElementById(uid);
  if (ui) {
    ui.remove();
  }
}

export function showPauseMenu() {
  removeUI("pauseMenu");
  const pause = `
  <div
  id="pauseMenu"
    style ="position: absolute;
    top: 30%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0,0,0,0.8);
    padding: 30px;
    color: white;
    text-align: center;
    z-index: 1000;">
    <h2>Paused</h2>
    <p>Press ESC or p to resume</p>
    </div>`;
  const wrapper = createElementFromHTML(pause);
  document.body.appendChild(wrapper);
}

export function hidePauseMenu() {
  removeUI("pauseMenu");
}
