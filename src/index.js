import * as THREE from 'three';
import { createCar } from './car.js';
import { createGradient } from './bg.js';

let scene, camera, renderer, gradient, car;
let isInteracting = false;
let lastInteractionTime = 0;
const interactionTimeout = 3000; // 3 seconds of inactivity before auto-rotation starts
let lastTouchX, lastTouchY, lastUpdateTime;
let angularVelocity = new THREE.Vector2(0, 0);
const friction = 0.95; // Adjust this value to change how quickly the rotation slows down
const sensitivity = 0.001; // Reduce this value to decrease flick sensitivity

// Detect if the device is mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

async function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    gradient = createGradient();
    scene.add(gradient);

    try {
        car = await createCar();
        scene.add(car);
    } catch (error) {
        console.error('Failed to load car model:', error);
    }

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // Add environment map
    const envMapLoader = new THREE.CubeTextureLoader();
    const envMap = envMapLoader.load([
        'px.jpg', 'nx.jpg',
        'py.jpg', 'ny.jpg',
        'pz.jpg', 'nz.jpg'
    ]);
    scene.environment = envMap;

    if (isMobile) {
        renderer.domElement.addEventListener('touchstart', handleTouchStart, false);
        renderer.domElement.addEventListener('touchend', () => { isInteracting = false; }, false);
        renderer.domElement.addEventListener('touchmove', handleTouchMove, false);
    } else {
        // Add mouse move event listener for desktop
        window.addEventListener('mousedown', (event) => { 
            isInteracting = true; 
            lastInteractionTime = Date.now();
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;
        });
        window.addEventListener('mouseup', () => { isInteracting = false; });
        window.addEventListener('mousemove', handleMouseMove);
    }

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
    onWindowResize();

    // Start animation
    animate();
}

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    gradient.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
}

function handleMouseMove(event) {
    if (!isInteracting) return;

    const deltaX = event.clientX - lastMouseX;
    const deltaY = event.clientY - lastMouseY;

    car.rotation.y += deltaX * 0.005;
    car.rotation.x += deltaY * 0.005;

    // Clamp the vertical rotation to prevent flipping
    car.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, car.rotation.x));

    lastMouseX = event.clientX;
    lastMouseY = event.clientY;

    lastInteractionTime = Date.now();
}

function handleTouchMove(event) {
    if (!isInteracting || !car) return;
    event.preventDefault();
    
    const touch = event.touches[0];
    const deltaX = touch.clientX - lastTouchX;
    const deltaY = touch.clientY - lastTouchY;
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastUpdateTime) / 1000; // Convert to seconds

    // Calculate angular velocity
    angularVelocity.x = deltaY * 0.005 / deltaTime;
    angularVelocity.y = deltaX * 0.005 / deltaTime;

    // Apply rotation
    car.rotation.y += deltaX * 0.005;
    car.rotation.x += deltaY * 0.005;

    // Clamp the vertical rotation to prevent flipping
    car.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, car.rotation.x));

    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
    lastUpdateTime = currentTime;
    lastInteractionTime = currentTime;
}

function handleOrientation(event) {
    const beta = event.beta;  // X-axis rotation [0,360)
    const gamma = event.gamma; // Y-axis rotation [-180,180)

    if (beta !== null && gamma !== null) {
        car.rotation.x = beta * (Math.PI / 180) / 7.5;
        car.rotation.y = gamma * (Math.PI / 180) / 7.5;
    }
}

function animate() {
    requestAnimationFrame(animate);

    const currentTime = Date.now();
    if (car) {
        if (!isInteracting) {
            if (currentTime - lastInteractionTime > interactionTimeout) {
                // Auto-rotate when not interacting
                car.rotation.y += 0.005;
            } else {
                // Apply momentum
                car.rotation.y += angularVelocity.y;
                car.rotation.x += angularVelocity.x;

                // Apply friction
                angularVelocity.multiplyScalar(friction);

                // Clamp the vertical rotation
                car.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, car.rotation.x));

                // Stop very small rotations to prevent endless tiny rotations
                if (Math.abs(angularVelocity.x) < 0.0001) angularVelocity.x = 0;
                if (Math.abs(angularVelocity.y) < 0.0001) angularVelocity.y = 0;
            }
        }
    }

    renderer.render(scene, camera);
}

function handleTouchStart(event) {
    isInteracting = true;
    lastInteractionTime = Date.now();
    const touch = event.touches[0];
    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
    lastUpdateTime = Date.now();
    angularVelocity.set(0, 0);
}

function handleTouchEnd(event) {
    isInteracting = false;
}

init();