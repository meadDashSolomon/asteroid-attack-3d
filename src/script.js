// import three
import * as THREE from "three";
// import orbit controls
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
// import GUI from "lil-gui";

/**
 * Base
 */
// Debug
// const gui = new GUI();

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

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
  100
);
camera.position.z = 35;
scene.add(camera);

/**
 * Controls
 */
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Asteroids
 */
const generateAsteroids = (numOfAsteroids) => {
  const asteroidGeometry = new THREE.IcosahedronGeometry(1, 0);
  const asteroidMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });

  for (let i = 0; i < numOfAsteroids; i++) {
    const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
    asteroid.position.x = (Math.random() - 0.5) * 100;
    asteroid.position.y = (Math.random() - 0.5) * 100;
    asteroid.position.z = (Math.random() - 0.5) * 100;
    // Random scale for size variety
    asteroid.scale.multiplyScalar(Math.random() * 2 + 0.5);
    scene.add(asteroid);
  }
};

generateAsteroids(50);

/**
 * Player's Ship
 */
const shipGeometry = new THREE.ConeGeometry(2, 5, 4);
const shipMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const ship = new THREE.Mesh(shipGeometry, shipMaterial);
ship.position.set(0, -7, 5); // Position the ship closer to the camera
ship.rotation.x = -0.3 * Math.PI; // Rotate the ship to face "forward"
scene.add(ship);

/**
 * Light
 */
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Animate
 */
const clock = new THREE.Clock();

const tick = () => {
  const elapsedTime = clock.getElapsedTime();

  // Update controls
  controls.update();

  // // Rotate asteroid
  // asteroid.rotation.x = elapsedTime * 0.5;
  // asteroid.rotation.y = elapsedTime * 0.5;

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
