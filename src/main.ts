import * as THREE from "three";
import { GameStateManager } from "./gameStateManager";

// Function to initialize the app
async function init() {
  // Create renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x87ceeb, 1); // Set a light blue sky color
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // Better dynamic range
  renderer.toneMappingExposure = 1.5; // Increase overall brightness

  document.body.appendChild(renderer.domElement);
  const clock = new THREE.Clock();

  const loadingElement = document.getElementById("loading");
  if (loadingElement) {
    loadingElement.style.display = "none";
  }

  // FPS counter variables
  let frameCount = 0;
  let lastTime = performance.now();
  const fpsElement = document.getElementById("fps");

  // Update FPS counter
  function updateFPS() {
    frameCount++;

    const currentTime = performance.now();
    const elapsedTime = currentTime - lastTime;

    // Update FPS display once per second
    if (elapsedTime >= 1000) {
      const fps = Math.round((frameCount * 1000) / elapsedTime);
      if (fpsElement) {
        fpsElement.textContent = `FPS: ${fps}`;
      }

      // Reset values
      frameCount = 0;
      lastTime = currentTime;
    }
  }
  // Initialize game state manager
  let gameStateManager = new GameStateManager();

  // Set up animation loop
  function animate() {
    requestAnimationFrame(animate);

    // Update FPS counter
    updateFPS();

    // Get elapsed time since last frame
    const deltaTime = clock.getDelta();

    // Update game state
    gameStateManager.update(deltaTime);
    gameStateManager.render(renderer);
  }

  // Start the animation loop
  animate();

  // Handle window resize
  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// Start when the DOM is fully loaded
init();
