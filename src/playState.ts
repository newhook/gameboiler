import * as THREE from "three";
import { IGameState } from "./gameStates";
import { GameStateManager } from "./gameStateManager";
import { GameConfig, defaultConfig } from "./config";
import { PhysicsWorld, createObstacleBody } from "./physics";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export class PlayState implements IGameState {
  public gameStateManager: GameStateManager;
  scene: THREE.Scene;
  physicsWorld: PhysicsWorld;
  private camera: THREE.PerspectiveCamera;
  private cameraControls: OrbitControls | null = null;
  config: GameConfig;

  private physicsDebugRenderer: THREE.LineSegments | null = null;
  private physicsCounterElement: HTMLElement | null;

  // Materials for cubes
  private cubeMaterials: THREE.Material[];
  // Click event listener
  private clickListener: (event: MouseEvent) => void;

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
      60, // FOV
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    // Position the camera to better view the falling cubes
    this.camera.position.set(15, 15, 15);
    this.camera.lookAt(0, 0, 0);

    // Add camera controls to allow user to rotate and zoom
    const renderer = this.gameStateManager.renderer;
    if (renderer) {
      this.cameraControls = new OrbitControls(this.camera, renderer.domElement);
      this.cameraControls.enableDamping = true;
      this.cameraControls.dampingFactor = 0.05;
      this.cameraControls.screenSpacePanning = false;
      this.cameraControls.minDistance = 5;
      this.cameraControls.maxDistance = 100;
      this.cameraControls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below ground
    }

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

    // Create pre-defined materials for cubes
    this.cubeMaterials = [
      new THREE.MeshStandardMaterial({ color: 0xff0000 }), // Red
      new THREE.MeshStandardMaterial({ color: 0x00ff00 }), // Green
      new THREE.MeshStandardMaterial({ color: 0x0000ff }), // Blue
      new THREE.MeshStandardMaterial({ color: 0xffff00 }), // Yellow
      new THREE.MeshStandardMaterial({ color: 0xff00ff }), // Magenta
      new THREE.MeshStandardMaterial({ color: 0x00ffff }), // Cyan
    ];

    // Create click event listener
    this.clickListener = () => {
      this.dropCube();
    };

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

    // Add surface mesh
    this.createSurfaceMesh();

    // Drop initial cubes
    this.dropInitialCubes(10);
  }

  // Create a surface-level mesh to represent the ground
  private createSurfaceMesh(): void {
    // Create a ground plane with texture
    const groundSize = this.config.worldSize;
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);

    // Rotate plane to be horizontal
    groundGeometry.rotateX(-Math.PI / 2);

    // Create a grid texture for the ground
    const gridTexture = new THREE.TextureLoader().load(
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF8WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDIgNzkuMTY0NDg4LCAyMDIwLzA3LzEwLTIyOjA2OjUzICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgKFdpbmRvd3MpIiB4bXA6Q3JlYXRlRGF0ZT0iMjAyMC0wOC0xMFQxMjo1MjozNyswMjowMCIgeG1wOk1vZGlmeURhdGU9IjIwMjAtMDgtMTBUMTI6NTU6NDMrMDI6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjAtMDgtMTBUMTI6NTU6NDMrMDI6MDAiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjQyZjYxZjc1LTcwZWUtNGE0YS04ZTcwLWYwMzEyODBjZTRhOCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpjNzNmNjkyYi00MDdlLTQzOTAtODBlNC1jNzVlYmU0ZTRmZDYiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpjNzNmNjkyYi00MDdlLTQzOTAtODBlNC1jNzVlYmU0ZTRmZDYiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOmM3M2Y2OTJiLTQwN2UtNDM5MC04MGU0LWM3NWViZTRlNGZkNiIgc3RFdnQ6d2hlbj0iMjAyMC0wOC0xMFQxMjo1MjozNyswMjowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIChXaW5kb3dzKSIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6NDJmNjFmNzUtNzBlZS00YTRhLThlNzAtZjAzMTI4MGNlNGE4IiBzdEV2dDp3aGVuPSIyMDIwLTA4LTEwVDEyOjU1OjQzKzAyOjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgKFdpbmRvd3MpIiBzdEV2dDpjaGFuZ2VkPSIvIi8+IDwvcmRmOlNlcT4gPC94bXBNTTpIaXN0b3J5PiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Ps3gIaEAAAFRSURBVHja7dpBDoMgEAVQ6L3qCt3D/U/gHu5dV5jYGI3owEyVCfMXJhiG8QvVaPR8nJcB8I+AAiiAAvgdIAfNGxF9XtNvXdYp/fQkACnFVNYlvX7TJU3Hf3QBZPt0gGTzwQBq9PQTwOzRmwDMHr1qAFUIFkAVggVQhWABXCEYAL2IzAJQSsoNMDN+HMAMAgZQQlgA7SCVgHtCqAFmEVgAsSOsAlQhWgBViB5AEaIHQIIo2YSQIEo2ISSIr06CCKJkE8KFCAsQQoQFCCHCAnQR2QCeEKEALUQ4QA0RDlBDhAPkjehlKhzA+kj9tAs8IGrWRx4QTYMYGsQiPe1qvl9tAD6ivgJrfV+H+P41Ig6dg/MQMeicnIOIQefkHEQMOifnIGLQOTkHkUZnA+IqXYN4ZLIHcZWWgXhk62A/AAAAAAAAAAAAzMcNlrWuLcW3oLkAAAAASUVORK5CYII="
    );

    // Set texture repeating
    gridTexture.wrapS = THREE.RepeatWrapping;
    gridTexture.wrapT = THREE.RepeatWrapping;
    gridTexture.repeat.set(groundSize / 10, groundSize / 10);

    // Create ground material with grid texture
    const groundMaterial = new THREE.MeshStandardMaterial({
      map: gridTexture,
      color: 0x999999,
      roughness: 0.8,
      metalness: 0.2,
    });

    // Create the ground mesh
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.receiveShadow = true;
    groundMesh.position.y = 0;

    // Add ground mesh to the scene
    this.scene.add(groundMesh);
  }

  // Drop random cube with physics
  private dropCube(): void {
    // Random size between 0.5 and 1.5
    const size = Math.random() * 1.0 + 0.5;

    // Create cube geometry
    const geometry = new THREE.BoxGeometry(size, size, size);

    // Select random material from predefined materials
    const material =
      this.cubeMaterials[Math.floor(Math.random() * this.cubeMaterials.length)];

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Random position with height between 5 and 15
    const posX = (Math.random() - 0.5) * this.config.worldSize * 0.8;
    const posY = Math.random() * 10 + 5;
    const posZ = (Math.random() - 0.5) * this.config.worldSize * 0.8;

    // Create physics body for the cube
    const body = createObstacleBody(
      { width: size, height: size, depth: size },
      { x: posX, y: posY, z: posZ },
      this.physicsWorld.world,
      1.0 // Mass of 1.0
    );

    // Create game object with mesh and body
    const gameObject = {
      mesh,
      body,
      mass: 1.0,
      size: { width: size, height: size, depth: size },
    };

    // Add to scene and physics world
    this.scene.add(mesh);
    this.physicsWorld.addBody(gameObject);
  }

  // Drop initial set of cubes
  private dropInitialCubes(count: number): void {
    for (let i = 0; i < count; i++) {
      this.dropCube();
    }
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

    // Update camera controls if they exist
    if (this.cameraControls) {
      this.cameraControls.update();
    }

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
    // This method is currently empty as we're using OrbitControls instead
    // of programmatically moving the camera
  }

  onEnter(): void {
    // Add click event listener when entering the play state
    document.addEventListener("click", this.clickListener);
  }

  onExit(): void {
    // Remove click event listener when exiting the play state
    document.removeEventListener("click", this.clickListener);
  }

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
