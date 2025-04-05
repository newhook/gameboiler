import * as THREE from "three";
import { IGameState } from "./gameStates";
import { GameStateManager } from "./gameStateManager";
import { GameConfig, defaultConfig } from "./config";
import { PhysicsWorld } from "./physics";

export class PlayState implements IGameState {
  public gameStateManager: GameStateManager;
  scene: THREE.Scene;
  physicsWorld: PhysicsWorld;
  private camera: THREE.PerspectiveCamera;
  config: GameConfig;

  private physicsDebugRenderer: THREE.LineSegments | null = null;
  private physicsCounterElement: HTMLElement | null;

  constructor(gameStateManager: GameStateManager) {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Light sky blue
    this.physicsCounterElement = document.getElementById("physics-counter");

    // Setup game state with configuration
    this.config = {
      ...defaultConfig,
    };

    this.gameStateManager = gameStateManager;
    this.physicsWorld = new PhysicsWorld(this.config);

    // Set up camera with increased far plane and narrower FOV for first person view
    this.camera = new THREE.PerspectiveCamera(
      60, // Reduced FOV for more realistic first person view
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    // Initial position will be adjusted by updateCamera, these are just starting values
    this.camera.position.set(0, 1.5, 0);
    this.camera.lookAt(0, 1.5, 10);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x6b8cff, 4.0); // Increased from 2.0, with a blue tint
    this.scene.add(ambientLight);

    // Main directional light (like the sun)
    const directionalLight = new THREE.DirectionalLight(0xffffcc, 2.5); // Increased from 1.5, warmer color
    directionalLight.position.set(100, 200, 100);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    // Add a distant point light to simulate sky lighting
    const skyLight = new THREE.HemisphereLight(0x87ceeb, 0x648c4a, 2.0); // Sky blue and ground green
    this.scene.add(skyLight);

    // Add a fill light from another angle to reduce harsh shadows
    const fillLight = new THREE.DirectionalLight(0xffffee, 1.0);
    fillLight.position.set(-100, 50, -50);
    this.scene.add(fillLight);

    // Add camera mode indicator to the UI
    const cameraMode = document.createElement("div");
    cameraMode.id = "camera-mode";
    cameraMode.textContent = "CAMERA: TANK MODE";
    cameraMode.style.position = "absolute";
    cameraMode.style.top = "60px";
    cameraMode.style.left = "10px";
    cameraMode.style.color = "#00ff00";
    cameraMode.style.fontFamily = "monospace";
    cameraMode.style.fontSize = "20px";
    cameraMode.style.opacity = "0";
    cameraMode.style.transition = "opacity 0.5s ease-in-out";
    document.body.appendChild(cameraMode);

    // Add coordinate display
    const coordDisplay = document.createElement("div");
    coordDisplay.id = "coordinates";
    coordDisplay.style.position = "absolute";
    coordDisplay.style.top = "100px";
    coordDisplay.style.left = "10px";
    coordDisplay.style.color = "#00ff00";
    coordDisplay.style.fontFamily = "monospace";
    coordDisplay.style.fontSize = "16px";
    coordDisplay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    coordDisplay.style.padding = "5px";
    coordDisplay.style.border = "1px solid #00ff00";
    document.body.appendChild(coordDisplay);

    // Handle window resize
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  render(renderer: THREE.WebGLRenderer): void {
    renderer.render(this.scene, this.camera);
    // Render orientation guide if it exists and game has started
    if (this.scene.userData.orientationGuide) {
      const { scene: guideScene, camera: guideCamera } =
        this.scene.userData.orientationGuide;

      // Update orientation guide to match main camera's rotation
      // This keeps the guide aligned with your current view direction
      const guideHelper = guideScene.children[0] as THREE.AxesHelper;
      if (guideHelper) {
        guideHelper.quaternion.copy(this.camera.quaternion);
      }

      // Set up the viewport for the guide in the bottom-right corner
      const guideSize = Math.min(150, window.innerWidth / 5);
      renderer.setViewport(
        window.innerWidth - guideSize - 10,
        window.innerHeight - guideSize - 10,
        guideSize,
        guideSize
      );
      renderer.setScissor(
        window.innerWidth - guideSize - 10,
        window.innerHeight - guideSize - 10,
        guideSize,
        guideSize
      );
      renderer.setScissorTest(true);

      // Clear depth buffer to ensure guide renders on top
      renderer.clearDepth();

      // Render the guide
      renderer.render(guideScene, guideCamera);

      // Reset viewport and scissor test
      renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
      renderer.setScissor(0, 0, window.innerWidth, window.innerHeight);
      renderer.setScissorTest(false);
    }
  }

  // Update physics objects counter
  updatePhysicsCounter(): void {
    if (this.physicsCounterElement) {
      const count = this.physicsWorld.getPhysicsObjectCount();
      this.physicsCounterElement.textContent = `PHYSICS OBJECTS: ${count}`;
    }
  }

  update(deltaTime: number): void {
    this.updatePhysicsCounter();

    this.physicsWorld.update(deltaTime);

    // Update physics debug rendering if enabled
    if (this.physicsDebugRenderer) {
      // Get fresh debug rendering data
      const buffers = this.physicsWorld.world.debugRender();

      // Update the geometry with new vertex data
      const positions =
        this.physicsDebugRenderer.geometry.getAttribute("position");
      const colors = this.physicsDebugRenderer.geometry.getAttribute("color");

      // Make sure buffer sizes match
      if (
        positions.array.length === buffers.vertices.length &&
        colors.array.length === buffers.colors.length
      ) {
        // Update position and color data
        positions.array.set(buffers.vertices);
        positions.needsUpdate = true;

        colors.array.set(buffers.colors);
        colors.needsUpdate = true;
      } else {
        // Buffer sizes changed, create new geometry
        const vertices = new Float32Array(buffers.vertices);
        const newColors = new Float32Array(buffers.colors);

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(vertices, 3)
        );
        geometry.setAttribute("color", new THREE.BufferAttribute(newColors, 4));

        // Replace the old geometry
        this.physicsDebugRenderer.geometry.dispose();
        this.physicsDebugRenderer.geometry = geometry;
      }
    }

    this.updateCamera();
  }

  private toggleWireframeMode(scene: THREE.Scene, isWireframe: boolean) {
    // Create a notification about wireframe mode
    const wireframeNotification = document.createElement("div");
    wireframeNotification.style.position = "absolute";
    wireframeNotification.style.top = "140px";
    wireframeNotification.style.left = "10px";
    wireframeNotification.style.color = "#00ff00";
    wireframeNotification.style.fontFamily = "monospace";
    wireframeNotification.style.fontSize = "16px";
    wireframeNotification.style.padding = "5px";
    wireframeNotification.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    wireframeNotification.style.border = "1px solid #00ff00";
    wireframeNotification.style.transition = "opacity 0.5s ease-in-out";
    wireframeNotification.style.opacity = "1";
    wireframeNotification.textContent = isWireframe
      ? "WIREFRAME MODE: ON"
      : "WIREFRAME MODE: OFF";

    document.body.appendChild(wireframeNotification);

    // Fade out after 2 seconds
    setTimeout(() => {
      wireframeNotification.style.opacity = "0";
      // Remove from DOM after fade out
      setTimeout(() => {
        document.body.removeChild(wireframeNotification);
      }, 500);
    }, 2000);

    // Process the scene to toggle wireframe for all materials
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        // Handle array of materials
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => {
            if (
              material instanceof THREE.MeshStandardMaterial ||
              material instanceof THREE.MeshBasicMaterial ||
              material instanceof THREE.MeshPhongMaterial
            ) {
              material.wireframe = isWireframe;
            }
          });
        }
        // Handle single material
        else if (
          object.material instanceof THREE.MeshStandardMaterial ||
          object.material instanceof THREE.MeshBasicMaterial ||
          object.material instanceof THREE.MeshPhongMaterial
        ) {
          object.material.wireframe = isWireframe;
        }
      }
    });
  }

  // Update the camera to follow the player in first person view
  private updateCamera() {
    // // Get the turret container safely using the getter method
    // const turretContainer = this.player.getTurretContainer();
    // if (!turretContainer) return;
    // // Position camera under the cannon
    // const cameraOffset = new THREE.Vector3(0, 1.25, 0); // Slightly below turret height
    // // Apply tank's position and rotation
    // this.camera.position.copy(this.player.mesh.position).add(cameraOffset);
    // // Create forward direction based on tank and turret rotation
    // const forward = new THREE.Vector3(0, 0, 1);
    // const combinedRotation = new THREE.Quaternion().multiplyQuaternions(
    //   this.player.mesh.quaternion,
    //   turretContainer.quaternion
    // );
    // forward.applyQuaternion(combinedRotation);
    // // Look in the direction the turret is facing
    // const lookAtPoint = this.camera.position
    //   .clone()
    //   .add(forward.multiplyScalar(10));
    // this.camera.lookAt(lookAtPoint);
  }

  onEnter(): void {}

  onExit(): void {}

  // Creates a small orientation guide that stays in the corner of the screen
  createOrientationGuide(scene: THREE.Scene): void {
    // Create a separate scene for the orientation guide
    const guideScene = new THREE.Scene();

    // Add axes to the guide
    const axesHelper = new THREE.AxesHelper(10);
    guideScene.add(axesHelper);

    // Add labels
    const createGuideLabel = (
      text: string,
      position: THREE.Vector3,
      color: string
    ) => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 32;

      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "rgba(0, 0, 0, 0.5)";
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.font = "bold 20px Arial";
        context.fillStyle = color;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(text, canvas.width / 2, canvas.height / 2);
      }

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(material);

      sprite.position.copy(position);
      sprite.scale.set(2, 1, 1);

      guideScene.add(sprite);
      return sprite;
    };

    // Add axis labels for the guide
    createGuideLabel("X", new THREE.Vector3(12, 0, 0), "#ff0000");
    createGuideLabel("Y", new THREE.Vector3(0, 12, 0), "#00ff00");
    createGuideLabel("Z", new THREE.Vector3(0, 0, 12), "#0000ff");

    // Create camera for the guide
    const guideCamera = new THREE.PerspectiveCamera(50, 1, 1, 1000);
    guideCamera.position.set(15, 15, 15);
    guideCamera.lookAt(0, 0, 0);

    // Add the guide elements to the main scene
    scene.userData.orientationGuide = {
      scene: guideScene,
      camera: guideCamera,
    };
  }

  private toggleDebugPhysics(isDebugMode: boolean): void {
    // Clean up existing physics debug renderer if it exists
    if (this.physicsDebugRenderer) {
      if (this.physicsDebugRenderer.geometry) {
        this.physicsDebugRenderer.geometry.dispose();
      }
      // if (this.physicsDebugRenderer.material) {
      // this.physicsDebugRenderer.material.dispose();
      // }
      this.scene.remove(this.physicsDebugRenderer);
      this.physicsDebugRenderer = null;
    }

    // If debug mode is enabled, create the debug renderer
    if (isDebugMode) {
      // Use RAPIER.World.debugRender() to get physics visualization
      const buffers = this.physicsWorld.world.debugRender();

      // Create debug rendering geometry
      const vertices = new Float32Array(buffers.vertices);
      const colors = new Float32Array(buffers.colors);

      // Create buffer geometry and set attributes
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 4));

      // Create material with vertex colors
      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
      });

      // Create the debug renderer mesh and add it to the scene
      this.physicsDebugRenderer = new THREE.LineSegments(geometry, material);
      this.scene.add(this.physicsDebugRenderer);
    }

    // Create a notification about debug physics mode
    const debugNotification = document.createElement("div");
    debugNotification.style.position = "absolute";
    debugNotification.style.top = "170px";
    debugNotification.style.left = "10px";
    debugNotification.style.color = "#ff0000";
    debugNotification.style.fontFamily = "monospace";
    debugNotification.style.fontSize = "16px";
    debugNotification.style.padding = "5px";
    debugNotification.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    debugNotification.style.border = "1px solid #ff0000";
    debugNotification.style.transition = "opacity 0.5s ease-in-out";
    debugNotification.style.opacity = "1";
    debugNotification.textContent = isDebugMode
      ? "PHYSICS DEBUG MODE: ON"
      : "PHYSICS DEBUG MODE: OFF";

    document.body.appendChild(debugNotification);

    // Fade out after 2 seconds
    setTimeout(() => {
      debugNotification.style.opacity = "0";
      // Remove from DOM after fade out
      setTimeout(() => {
        document.body.removeChild(debugNotification);
      }, 500);
    }, 2000);
  }
}
