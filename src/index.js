import * as THREE from 'three';
import { createCar } from './car.js';
import { createGradient } from './bg.js';

let scene, camera, renderer, gradient, car, angle = 0;
let isMobile = false;
let isInteracting = false;
let lastInteractionTime = 0;
const interactionTimeout = 1000; // 1 second of inactivity before auto-rotation starts

let lastMouseX, lastMouseY;

let isCarLoaded = false;

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
        isCarLoaded = true;
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

    // Detect if the device is mobile
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
        // Request permission for gyroscope on mobile
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(response => {
                    if (response == 'granted') {
                        window.addEventListener('deviceorientation', handleOrientation);
                    }
                })
                .catch(console.error);
        } else {
            window.addEventListener('deviceorientation', handleOrientation);
        }
        
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
    if (!isInteracting) return;
    event.preventDefault();
    
    const touch = event.touches[0];
    const deltaX = touch.clientX - lastMouseX;
    const deltaY = touch.clientY - lastMouseY;

    car.rotation.y += deltaX * 0.005;
    car.rotation.x += deltaY * 0.005;

    // Clamp the vertical rotation to prevent flipping
    car.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, car.rotation.x));

    lastMouseX = touch.clientX;
    lastMouseY = touch.clientY;

    lastInteractionTime = Date.now();
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
    angle += 0.01;
    gradient.material.uniforms.uTime.value = angle;
    
    const currentTime = Date.now();
    if (isCarLoaded && !isInteracting && (currentTime - lastInteractionTime > interactionTimeout)) {
        // Gentle rotation when not interacting
        car.rotation.y += 0.005;
    }

    renderer.render(scene, camera);
}

function handleTouchStart(event) {
    isInteracting = true;
    lastInteractionTime = Date.now();
    const touch = event.touches[0];
    lastMouseX = touch.clientX;
    lastMouseY = touch.clientY;
}

init();