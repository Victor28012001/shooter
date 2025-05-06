export class CameraEffects {
    static async zoomIn(factor, duration) {
      const originalFov = camera.fov;
      const targetFov = originalFov / factor;
      const startTime = Date.now();
      
      function animateZoom() {
        const timeElapsed = Date.now() - startTime;
        const progress = timeElapsed / duration;
        
        if (progress < 1) {
          camera.fov = THREE.MathUtils.lerp(originalFov, targetFov, progress);
          camera.updateProjectionMatrix();
          requestAnimationFrame(animateZoom);
        } else {
          camera.fov = targetFov;
          camera.updateProjectionMatrix();
        }
      }
  
      animateZoom();
    }
  }
  