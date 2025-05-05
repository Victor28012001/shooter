export const GameState = {
  INITIAL: "initial",
  LOADING: "loading",
  MENU: "menu",
  PLAYING: "playing",
  GAME_OVER: "game_over",
  GAME_WON: "game_won",
  // Three.js and core scene components
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  tommyGunLight: null,

  //controls
  moveForward: false,
  moveBackward: false,
  moveLeft: false,
  moveRight: false,

  // Game levels
  currentLevel: 0,
  unlockedLevels: parseInt(localStorage.getItem("unlockedLevels")) || 1,
  totalLevels: 8,
  levelData: [],
  gridScale: 10,

  // Game state and environment
  abandonedBuilding: null,
  testRoom: null,
  roomBodies: null,
  roomWidth: 9.5,
  wallHeight: 3.8,
  roomDepth: 9.5,

  // Bullets & shooting
  bulletHoles: [],
  bullets: [],
  bulletCount: 0,
  maxMagazineSize: 30,
  totalBullets: 90,
  currentBullets: 30,
  isFiring: false,
  isReloading: false,

  // Player
  isMoving: false,
  player: null,
  playerData: {
    health: 100,
    lastAttackTime: null,
    regenTimeout: null,
  },
  playerBody: null,
  playerInstance: null,
  playerModel: null,
  playerModelLoaded: false,

  // Enemies
  totalSpiders: 0,
  spawnedSpiders: 0,
  killedSpiders: 0,
  modelReady: false,

  theRake: null,
  rakeMixer: null,

  // Game loop and status
  paused: false,
  isEnded: false,
  animationFrameId: null,
  gameStarted: false,
  gameRunning: false,

  // Collision
  roomBody: null,
  collisionState: false,
  collidedBody: null,
  currentCollisions: new Set(),

  // Audio
  audioContext: null,
  machineGunSoundBuffer: null,
  bulletRicochetSoundBuffer: null,

  // Time and input
  clock: new THREE.Clock(),
  raycaster: new THREE.Raycaster(),
  mouse: new THREE.Vector2(),

  // Animation
  currentAnimation: "",
  mixers: [],
  tommyGun: null,
  tommyGunAnimations: {},
  tommyGunMixer: null,
  limit: 12,
  lastMeshAdditionTime: 0,
  meshAdditionInterval: 100,

  // Environment / assets
  spiderMeshes: [],
  loadingManager: new THREE.LoadingManager(),
  loader: new THREE.GLTFLoader(new THREE.LoadingManager()),
  textureLoader: new THREE.TextureLoader(new THREE.LoadingManager()),
  phongMaterial: new THREE.MeshPhongMaterial(),
  cannonDebugger: null,
  world: new CANNON.World(),

  // DOM Elements (assign these at runtime!)
  dom: {
    currentBulletsDisplay: null,
    totalBulletsDisplay: null,
    reloadMessage: null,
    splash: null,
    menu: null,
    levelButtons: null,
    startButton: null,
    resetProgress: null,
    blocker: null,
    instructions: null,
    playButton: null,
    crosshair: null,
  },
};

export let currentState = GameState.INITIAL;

export function setState(state) {
  currentState = state;
}
