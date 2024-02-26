import * as THREE from "three";
import atmosphereVertexShader from "./shaders/vertex.glsl";
import atmosphereFragmentShader from "./shaders/fragment.glsl";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import GUI from "lil-gui";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import shot from "../static/sounds/shot.mp3";
import explode from "../static/sounds/explode.mp3";

/**
 * Loaders
 */
const rgbeLoader = new RGBELoader();
const gltfLoader = new GLTFLoader();

/**
 * Base
 */
// Debug
const gui = new GUI();
gui.hide();
const global = {};

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

/**
 * Update all materials
 */
const updateAllMaterials = () => {
  scene.traverse((child) => {
    if (child.isMesh && child.isMeshStandardMaterial) {
      child.material.envMapIntensity = global.envMapIntensity;
    }
  });
};

/**
 * Environment map
 */
scene.backgroundBlurriness = 0;
scene.backgroundIntensity = 6;

gui.add(scene, "backgroundBlurriness").min(0).max(0.05).step(0.001);
gui.add(scene, "backgroundIntensity").min(0).max(10).step(0.001);

// Global intensity
global.envMapIntensity = 1;
gui
  .add(global, "envMapIntensity")
  .min(0)
  .max(10)
  .step(0.001)
  .onChange(updateAllMaterials);

// Environment map
rgbeLoader.load("/environmentMaps/blender-2k.hdr", (environmentMap) => {
  environmentMap.mapping = THREE.EquirectangularReflectionMapping;

  scene.background = environmentMap;
  scene.environment = environmentMap;
});

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Update effect composer
  effectComposer.setSize(sizes.width, sizes.height);
  effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.z = 35;
scene.add(camera);

/**
 * Asteroids
 */
let asteroids = [];

const generateAsteroids = (numOfAsteroids) => {
  const asteroidGeometry = new THREE.IcosahedronGeometry(1, 0);
  const asteroidMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
  const safeZoneRadius = 10; // Distance from the ship where asteroids cannot spawn

  for (let i = 0; i < numOfAsteroids; i++) {
    let asteroidPosition = new THREE.Vector3(
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100
    );

    // Ensure the asteroid does not spawn too close to the ship
    while (asteroidPosition.distanceTo(ship.position) < safeZoneRadius) {
      asteroidPosition = new THREE.Vector3(
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100
      );
    }

    const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
    asteroid.position.copy(asteroidPosition);
    // Random scale for size variety
    asteroid.scale.multiplyScalar(Math.random() * 2 + 0.5);
    // Assign random rotation speeds
    asteroid.rotationSpeeds = {
      x: Math.random() * 0.7,
      y: Math.random() * 0.7,
      z: Math.random() * 0.7,
    };
    asteroid.movementVector = new THREE.Vector3(
      (Math.random() - 0.5) * 0.2,
      (Math.random() - 0.5) * 0.2,
      (Math.random() - 0.5) * 0.2
    );
    scene.add(asteroid);
    asteroids.push(asteroid);
  }
};

/**
 * Player's Ship
 */
let ship;
gltfLoader.load("/models/ship.glb", (gltf) => {
  ship = gltf.scene;
  ship.position.set(0, -7, 5);
  ship.scale.set(2, 2, 2);
  scene.add(ship);

  const target = new THREE.Object3D();
  ship.add(target);
  target.position.set(0, 0, -50);
});

/**
 * Movement
 */
const cursor = { x: 0, y: 0 };

window.addEventListener("mousemove", (event) => {
  cursor.x = (event.clientX / sizes.width) * 2 - 1;
  cursor.y = -(event.clientY / sizes.height) * 2 + 1;
});

const movementBounds = {
  minX: -50,
  maxX: 50,
  minY: -50,
  maxY: 50,
  minZ: -50,
  maxZ: 50,
};

/**
 * Projectiles
 */
let projectiles = [];
const projectileGeometry = new THREE.CylinderGeometry(0.3, 0.3, 2, 8);
const projectileMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

const shoot = () => {
  if (!gameIsActive) return;

  const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
  projectile.position.copy(ship.position);
  projectile.quaternion.copy(ship.quaternion);

  // Set the projectile's velocity
  const velocity = new THREE.Vector3(0, 0, -5).applyQuaternion(ship.quaternion);
  projectile.userData.velocity = velocity; // Store velocity in userData for movement updates

  const audio = new Audio(shot);
  audio.volume = 0.02;
  audio.play();

  scene.add(projectile);
  projectiles.push(projectile);
};

// Click to fire
canvas.addEventListener("click", () => {
  shoot();
});

// Collision detection function
const checkCollisions = () => {
  for (let p = projectiles.length - 1; p >= 0; p--) {
    const projectile = projectiles[p];
    const projectileBox = new THREE.Box3().setFromObject(projectile);

    for (let a = asteroids.length - 1; a >= 0; a--) {
      const asteroid = asteroids[a];
      const asteroidBox = new THREE.Box3().setFromObject(asteroid);

      // Check for collison
      if (projectileBox.intersectsBox(asteroidBox)) {
        const audio = new Audio(explode);
        audio.volume = 0.1;
        audio.play();

        // remove projectile
        scene.remove(projectile);
        projectiles.splice(p, 1);
        // remove asteroid
        scene.remove(asteroid);
        asteroids.splice(a, 1);
        // break loop to prevent checking other asteroids for this projectile
        break;
      }
    }
  }
};

/**
 * Collisions bw ship and asteroids
 */
const checkShipAsteroidCollisions = () => {
  const shipHitBox = new THREE.Box3().setFromObject(ship);

  for (let i = 0; i < asteroids.length; i++) {
    const asteroid = asteroids[i];
    const asteroidHitBox = new THREE.Box3().setFromObject(asteroid);
    if (shipHitBox.intersectsBox(asteroidHitBox)) {
      const audio = new Audio(explode);
      audio.volume = 0.05;
      audio.play();
      triggerExplosion();
      setTimeout(() => {
        endGame();
      }, 50);
      break;
    }
  }
};

let explosionParticles = [];

const triggerExplosion = () => {
  // Remove the ship from the scene
  scene.remove(ship);

  const particleCount = 50;
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const velocities = [];
  const particleMaterial = new THREE.PointsMaterial({
    color: 0xff0a00,
    size: 0.5,
    transparent: true,
    opacity: 1,
  });

  for (let i = 0; i < particleCount; i++) {
    // Initial positions set to the ship's last position
    const x = ship.position.x;
    const y = ship.position.y;
    const z = ship.position.z;
    positions.push(x, y, z);

    // Assign random velocities to each particle to simulate the explosion effect
    const vx = (Math.random() * 2 - 1) * 0.2;
    const vy = (Math.random() * 2 - 1) * 0.2;
    const vz = (Math.random() * 2 - 1) * 0.2;
    velocities.push(vx, vy, vz);
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );

  // Create a particle system with the specified geometry and material
  const particles = new THREE.Points(geometry, particleMaterial);
  scene.add(particles);

  // Store the particle system for updating
  explosionParticles.push({
    geometry,
    velocities,
    material: particleMaterial,
    mesh: particles,
  });
};

// Updates the explosion particles' positions and fades them out over time.
const updateExplosionParticles = (deltadTime) => {
  explosionParticles.forEach((particleSystem) => {
    const positions = particleSystem.geometry.attributes.position.array;

    // Update positions based on velocities and deltaTime to simulate movement
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] += particleSystem.velocities[i] * deltadTime * 50;
      positions[i + 1] += particleSystem.velocities[i + 1] * deltadTime * 50;
      positions[i + 2] += particleSystem.velocities[i + 2] * deltadTime * 50;
    }
    particleSystem.geometry.attributes.position.needsUpdate = true;

    // Fade out the particles over time
    particleSystem.material.opacity *= 0.95;
    // If opacity is very low, remove the particle system from the scene and the tracking array
    if (particleSystem.material.opacity < 0.01) {
      scene.remove(particleSystem.mesh);
      explosionParticles = explosionParticles.filter(
        (p) => p !== particleSystem
      );
    }
  });
};

/**
 * New game/Game over
 */
document.addEventListener("DOMContentLoaded", () => {
  const introModal = document.getElementById("introModal");
  const startGameButton = document.getElementById("startGameButton");

  // Show the intro modal when the page loads
  introModal.style.display = "block";

  // Start the game and hide the modal when the "Start Game" button is clicked
  startGameButton.addEventListener("click", () => {
    introModal.style.display = "none";
    gameIsActive = true;
    if (!ship) {
      setTimeout(() => {
        tick();
      }, 500);
    } else {
      tick();
    }
  });
});

let startTime = Date.now();
let endTime;

const endGame = () => {
  if (!gameIsActive) return; // Prevent multiple triggers

  endTime = Date.now();
  const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);
  setTimeout(() => {
    isPaused = true;
    gameIsActive = false;

    document.getElementById(
      "finalScore"
    ).textContent = `Your Score: ${elapsedTime} seconds`;
    document.getElementById("endGameModal").style.display = "block";
  }, 500);
};

const restartGame = () => {
  document.getElementById("endGameModal").style.display = "none";
  isPaused = false;
  resetGame();
};

const resetGame = () => {
  // Hide the modal
  document.getElementById("endGameModal").style.display = "none";

  // Clear existing asteroids
  asteroids.forEach((asteroid) => {
    scene.remove(asteroid);
  });
  asteroids = []; // Reset the asteroids array

  // Reset ship position and visibility
  ship.position.set(0, -7, 5);
  if (!scene.children.includes(ship)) {
    scene.add(ship);
  }

  // Reset projectiles
  projectiles.forEach((projectile) => {
    scene.remove(projectile);
  });
  projectiles = []; // Clear the projectiles array

  // Reset the game clock
  startTime = Date.now();
  isPaused = false;
  gameIsActive = true;

  // Restart the game loop
  requestAnimationFrame(tick);
};

document.addEventListener("DOMContentLoaded", () => {
  const restartButton = document.getElementById("restartButton");
  if (restartButton) {
    restartButton.addEventListener("click", resetGame);
  }
});

/**
 * Movement Boundaries
 */
let boundaryPlanes = [];

const atmosphereGeometry = new THREE.PlaneGeometry(100, 100, 32, 32);
const atmosphereMaterial = new THREE.ShaderMaterial({
  vertexShader: atmosphereVertexShader,
  fragmentShader: atmosphereFragmentShader,
  transparent: true,
  side: THREE.DoubleSide,
  uniforms: {
    uTime: { value: 0.0 },
    uOpacity: { value: 0.5 },
    uColorStrength: { value: 0.5 },
  },
});

let boundaryPosition = 106;
let boundaryScale = 1.1;
const breathingRoom = 1; // Fixed offset for boundary placement

// Utility functions
const clearBoundaryPlanes = () => {
  boundaryPlanes.forEach((plane) => {
    scene.remove(plane);
  });
  boundaryPlanes = [];
};

const createBoundaryPlane = (position, rotation, scale) => {
  const plane = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
  plane.position.set(position.x, position.y, position.z);
  plane.rotation.set(rotation.x, rotation.y, rotation.z);
  plane.scale.set(scale, scale, scale);
  scene.add(plane);
  boundaryPlanes.push(plane);
};

function refreshBoundaryPlanes() {
  clearBoundaryPlanes(); // Remove existing boundary planes
  boundaries = calculateBoundaries(); // Recalculate boundary positions and rotations
  boundaries.forEach((boundary) => {
    createBoundaryPlane(boundary.pos, boundary.rot, boundaryScale); // Use updated scale
  });
}

// Dynamically calculate positions and rotations for boundary planes based on boundaryPosition
const calculateBoundaries = () => {
  const halfPosition = boundaryPosition / 2;
  return [
    {
      pos: new THREE.Vector3(-halfPosition - breathingRoom, 0, 0),
      rot: new THREE.Vector3(0, Math.PI / 2, 0),
    },
    {
      pos: new THREE.Vector3(halfPosition + breathingRoom, 0, 0),
      rot: new THREE.Vector3(0, -Math.PI / 2, 0),
    },
    {
      pos: new THREE.Vector3(0, -halfPosition - breathingRoom, 0),
      rot: new THREE.Vector3(-Math.PI / 2, 0, 0),
    },
    {
      pos: new THREE.Vector3(0, halfPosition + breathingRoom, 0),
      rot: new THREE.Vector3(Math.PI / 2, 0, 0),
    },
    {
      pos: new THREE.Vector3(0, 0, -halfPosition - breathingRoom),
      rot: new THREE.Vector3(0, Math.PI, 0),
    },
    {
      pos: new THREE.Vector3(0, 0, halfPosition + breathingRoom),
      rot: new THREE.Vector3(0, 0, 0),
    },
  ];
};

let boundaries = calculateBoundaries(); // Initialize boundaries based on the initial boundaryPosition
refreshBoundaryPlanes(); // Create initial boundary planes

gui
  .add({ boundaryPosition }, "boundaryPosition", 100, 200)
  .step(1)
  .name("Boundary Position")
  .onChange((newPosition) => {
    boundaryPosition = newPosition;
    refreshBoundaryPlanes(); // Refresh planes to reflect updated positions and scale
  });

gui
  .add({ boundaryScale }, "boundaryScale", 1, 1.15)
  .step(0.01)
  .name("Boundary Scale")
  .onChange((newScale) => {
    boundaryScale = newScale;
    refreshBoundaryPlanes(); // Refresh planes with new scale
  });

const boundaryControls = {
  opacity: 0.5,
  colorStrength: 0.5,
};

gui
  .add(boundaryControls, "opacity", 0, 1, 0.01)
  .name("Boundary Opacity")
  .onChange((value) => {
    atmosphereMaterial.uniforms.uOpacity.value = value;
  });

gui
  .add(boundaryControls, "colorStrength", 0, 1, 0.01)
  .name("Color Strength")
  .onChange((value) => {
    atmosphereMaterial.uniforms.uColorStrength.value = value;
  });

/**
 * Light
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.07);
const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
sunLight.position.set(5, 3, 5);
scene.add(ambientLight, sunLight);

/**
 * Worlds
 */
const sunGeometry = new THREE.SphereGeometry(40, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
sunMesh.position.set(50, 30, 200); // Position it where the directional light is
scene.add(sunMesh);

const createPlanets = () => {
  const planetData = [
    { color: 0xaaaaaa, size: 12, position: [88, 200, 9] },
    { color: 0xffd700, size: 24, position: [140, 315, 70] },
    { color: 0x0000ff, size: 25.5, position: [407, 60, 19] },
    { color: 0xff4500, size: 13.5, position: [150, -100, 0] },
    // New planets
    { color: 0x8a2be2, size: 20, position: [-300, -50, 100] },
    { color: 0xdeb887, size: 22, position: [100, 70, -200] },
    { color: 0xcd853f, size: 18, position: [-200, 20, 300] },
    { color: 0x48d1cc, size: 20, position: [450, -100, 50] },
    { color: 0x4682b4, size: 15, position: [-450, 100, -50] },
    { color: 0xd2691e, size: 17, position: [350, -90, 250] },
    { color: 0x2e8b57, size: 19, position: [-350, 80, -250] },
    { color: 0x9acd32, size: 16, position: [250, -70, 350] },
  ];

  planetData.forEach((planet) => {
    const geometry = new THREE.SphereGeometry(planet.size, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: planet.color });
    const planetMesh = new THREE.Mesh(geometry, material);
    planetMesh.position.set(...planet.position);
    scene.add(planetMesh);
  });
};

createPlanets();

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Post Processing
 */
// Render target
const renderTarget = new THREE.WebGLRenderTarget(800, 600);

// Effect composer
const effectComposer = new EffectComposer(renderer, renderTarget);
effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
effectComposer.setSize(sizes.width, sizes.height);

// Render pass
const renderPass = new RenderPass(scene, camera);
effectComposer.addPass(renderPass);

// Unreal bloom pass
const unrealBloomPass = new UnrealBloomPass();
unrealBloomPass.strength = 0.3;
unrealBloomPass.radius = 1;
unrealBloomPass.threshold = 0.6;
effectComposer.addPass(unrealBloomPass);

gui.add(unrealBloomPass, "enabled");
gui.add(unrealBloomPass, "strength").min(0).max(2).step(0.001);
gui.add(unrealBloomPass, "radius").min(0).max(2).step(0.001);
gui.add(unrealBloomPass, "threshold").min(0).max(1).step(0.001);

/**
 * Pausing the Game
 */
let isPaused = false;
let gameIsActive = false;

// Event listener for the spacebar to toggle the pause state
document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    isPaused = !isPaused;
    if (!isPaused) {
      clock.start();
      tick();
    }
  }
});

/**
 * Animate
 */
const clock = new THREE.Clock();
const rotationSpeed = 0.5;
const movementSpeed = 3.5;

const tick = () => {
  if (isPaused || !gameIsActive) {
    return;
  }

  const deltaTime = clock.getDelta();

  // Movement threshold for turning and moving up/down
  const threshold = 0.2;

  // Turn the ship based on cursor x position
  if (cursor.x < -threshold) {
    ship.rotation.y += rotationSpeed * deltaTime;
  } else if (cursor.x > threshold) {
    ship.rotation.y -= rotationSpeed * deltaTime;
  }

  // Move the ship up or down based on cursor y position
  if (cursor.y < -threshold) {
    ship.position.y -= movementSpeed * deltaTime; // Move up
  } else if (cursor.y > threshold) {
    ship.position.y += movementSpeed * deltaTime; // Move down
  }

  // Move the ship forward constantly
  const forwardDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(
    ship.quaternion
  );
  ship.position.add(forwardDirection.multiplyScalar(movementSpeed * deltaTime));

  // Constrain the ship's movement
  ship.position.x = Math.max(
    Math.min(ship.position.x, movementBounds.maxX),
    movementBounds.minX
  );
  ship.position.y = Math.max(
    Math.min(ship.position.y, movementBounds.maxY),
    movementBounds.minY
  );
  ship.position.z = Math.max(
    Math.min(ship.position.z, movementBounds.maxZ),
    movementBounds.minZ
  );

  // Calculate the forward direction vector of the ship
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);
  const lookAtPosition = forward.multiplyScalar(10).add(ship.position);

  // Determine the camera's desired position relative to the ship's orientation
  const relativeCameraOffset = new THREE.Vector3(0, 5, 15);
  const cameraOffset = relativeCameraOffset.applyMatrix4(ship.matrixWorld);

  // Smoothly interpolate the camera's position
  camera.position.lerp(cameraOffset, 0.1);

  // Have the camera look at the ship
  camera.lookAt(ship.position);

  atmosphereMaterial.uniforms.uTime.value += deltaTime * 0.25;

  if (Math.random() < 0.2) {
    generateAsteroids(1);
  }

  // Rotate each asteroid
  asteroids.forEach((asteroid) => {
    asteroid.rotation.x += asteroid.rotationSpeeds.x * deltaTime;
    asteroid.rotation.y += asteroid.rotationSpeeds.y * deltaTime;
    asteroid.rotation.z += asteroid.rotationSpeeds.z * deltaTime;
    asteroid.position.add(asteroid.movementVector);
  });

  // Move projectiles
  projectiles.forEach((projectile, index) => {
    if (projectile.userData.velocity) {
      projectile.position.add(projectile.userData.velocity);
    }

    // Remove projectiles after a certain distance
    if (projectile.position.z < -200) {
      scene.remove(projectile);
      projectiles.splice(index, 1);
    }
  });

  // Update explosion particles
  updateExplosionParticles(deltaTime);

  // Check collisions each frame
  checkCollisions();
  checkShipAsteroidCollisions();

  // Render using EffectComposer
  effectComposer.render();

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};
