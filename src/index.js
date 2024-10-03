import * as THREE from 'three';
import { createCar } from './car.js';
import { createGradient } from './bg.js';

let scene, camera, renderer, gradient, car, angle = 0;
let isMobile = false;

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    gradient = createGradient();
    scene.add(gradient);

    car = createCar();
    scene.add(car);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Detect if the device is mobile
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
        // Add touch event listeners for mobile
        renderer.domElement.addEventListener('touchstart', handleTouchStart, false);
        renderer.domElement.addEventListener('touchmove', handleTouchMove, false);
    } else {
        // Add mouse move event listener for desktop
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
    const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    const mouseY = (event.clientY / window.innerHeight) * 2 - 1;
    
    car.rotation.y = mouseX * Math.PI / 2;
    car.rotation.x = mouseY * Math.PI / 2;
}

// New touch event handlers
let lastTouchX, lastTouchY;

function handleTouchStart(event) {
    const touch = event.touches[0];
    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
}

function handleTouchMove(event) {
    event.preventDefault();
    const touch = event.touches[0];
    const deltaX = touch.clientX - lastTouchX;
    const deltaY = touch.clientY - lastTouchY;

    car.rotation.y += deltaX * 0.01;
    car.rotation.x += deltaY * 0.01;

    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
}

function animate() {
    requestAnimationFrame(animate);
    angle += 0.01;
    gradient.material.uniforms.uTime.value = angle;
    
    // Car rotation is now handled by mouse/gyro events
    
    renderer.render(scene, camera);
}

init();