import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

function createCar() {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        
        loader.load(
            '/car.gltf',  // Note the leading slash
            (gltf) => {
                const car = gltf.scene;
                
                // Adjust material properties
                car.traverse((child) => {
                    if (child.isMesh) {
                        child.material.metalness = 0.4;
                        child.material.roughness = 0.6;
                    }
                });

                // Adjust the car's position, rotation, and scale if needed
                car.position.set(0, 0, 0);
                car.rotation.y = -Math.PI / 4; // Rotate 45 degrees around Y-axis
                car.rotation.x = Math.PI / 12; // Slight tilt downwards
                car.scale.set(1, 1, 1); // Adjust scale if needed
                
                resolve(car);
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                console.error('Error loading model:', error);
                if (error.target && error.target.status === 404) {
                    console.error('File not found. Make sure both .gltf and .bin files are in the public directory.');
                }
                reject(error);
            }
        );
    });
}

export { createCar };
