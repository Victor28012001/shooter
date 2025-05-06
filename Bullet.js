import { GameState } from "./gameStates.js";
import { updateSpiderHUD } from "./utils.js";
import { audio } from "./audio.js";

export class Bullet {
  constructor(position, direction) {
    const geometry = new THREE.SphereGeometry(0.01, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.direction = direction.clone().normalize();
    this.distanceTraveled = 0;
    this.maxDistance = 5;
    // this.spider = new SpiderManager(GameState.scene, GameState.loadingManager)

    const light = new THREE.PointLight(0xffffff, 10, 100);
    light.position.copy(position);
    this.mesh.add(light);

    GameState.scene.add(this.mesh);
    this.audio = audio;
  }

  update() {
    this.mesh.position.addScaledVector(this.direction, 0.75);
    this.distanceTraveled += 0.4;

    return this.distanceTraveled < this.maxDistance;
  }

  checkCollision(spiderManager, abandonedBuilding, index, bullets) {
    const raycaster = new THREE.Raycaster(this.mesh.position, this.direction);
    raycaster.camera = GameState.camera;

    // SPIDER COLLISION
    spiderManager.spiderMeshes.forEach((spider, i) => {
      const intersects = raycaster.intersectObject(spider, true);
      if (intersects.length > 0) {
        spiderManager.playAnimation(spider, "hit");
        spider.health -= 10;
        spider.speed = Math.max(spider.speed * 0.9, 0.2);

        const originalColors = [];
        spider.traverse((child) => {
          if (child.isMesh) {
            originalColors.push({
              mesh: child,
              color: child.material.color.clone(),
            });
            child.material.color.set(0xff0000);
          }
        });

        setTimeout(() => {
          originalColors.forEach(({ mesh, color }) => {
            mesh.material.color.copy(color);
          });
        }, 50);

        GameState.scene.remove(this.mesh);
        bullets.splice(index, 1);

        spiderManager.updateHealthBar(spider);
        if (spider.health <= 0) {
          GameState.scene.remove(spider);
          GameState.killedSpiders++;
          updateSpiderHUD(GameState.totalSpiders, GameState.killedSpiders);
          spiderManager.spiderMeshes.splice(i, 1);
        } else {
          const playerPos = GameState.controls.getObject().position.clone();
          spiderManager.alertNearbySpiders(spider, playerPos);
          updateSpiderHUD(GameState.totalSpiders, GameState.killedSpiders);
        }
      }
    });

    // BUILDING COLLISION
    const buildingHits = raycaster.intersectObject(abandonedBuilding, true);
    if (buildingHits.length > 0) {
      if (GameState.bulletCount % 15 === 0) {
        this.audio.play("./sounds/bullet-ricochet.mp3", 1);
        this.audio.fadeOutMusic(3);
      }
      GameState.bulletCount++;

      const point = buildingHits[0].point;
      const offset = new THREE.Vector3(0, 0, 0.01);
      const insertionOffset = new THREE.Vector3(0, 0.01, 0);
      const insertionPoint = point.clone().add(offset).add(insertionOffset);

      const loader = new THREE.TextureLoader();
      const material = new THREE.MeshBasicMaterial({
        map: loader.load("./assets/images/bullet-hole.png"),
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: true,
      });

      const geometry = new THREE.PlaneGeometry(0.08, 0.08);
      const bulletHoleMesh = new THREE.Mesh(geometry, material);
      bulletHoleMesh.position.copy(insertionPoint);

      GameState.scene.add(bulletHoleMesh);
      GameState.bulletHoles.push(bulletHoleMesh);

      let opacity = 1.0;
      const fadeOutDuration = 5000;
      const fadeOutInterval = 50;

      const fadeOutTimer = setInterval(() => {
        opacity -= fadeOutInterval / fadeOutDuration;
        if (opacity <= 0) {
          clearInterval(fadeOutTimer);
          GameState.scene.remove(bulletHoleMesh);
          GameState.bulletHoles.splice(
            GameState.bulletHoles.indexOf(bulletHoleMesh),
            1
          );
        } else {
          bulletHoleMesh.material.opacity = opacity;
        }
      }, fadeOutInterval);
    }
  }
}
