import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';

function createCar() {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        
        loader.load(
            '/car.gltf',  // Note the leading slash
            (gltf) => {
                const car = gltf.scene;

                // Create materials with specified names
                const materials = {
                    Glass: new THREE.MeshPhysicalMaterial({
                        color: 0xffffff,
                        metalness: 0,
                        roughness: 0,
                        transmission: 1, // Transparent
                        thickness: 0.5, // Adjust for desired refraction
                        envMapIntensity: 1,
                        clearcoat: 1,
                        clearcoatRoughness: 0,
                        opacity: 0.3,
                        transparent: true
                    }),
                    RedGlass: new THREE.MeshPhysicalMaterial({
                        color: 0xff0000, // Red color
                        metalness: 0,
                        roughness: 0,
                        transmission: 1, // Transparent
                        thickness: 0.5, // Adjust for desired refraction
                        envMapIntensity: 1,
                        clearcoat: 1,
                        clearcoatRoughness: 0,
                        opacity: 0.5, // Adjust opacity for glass effect
                        transparent: true
                    }),
                    RedMetal: new THREE.MeshStandardMaterial({
                        color: 0xff0000,  // Red color
                        metalness: 0.8,
                        roughness: 0.2,
                    }),
                    BlackMetal: new THREE.MeshStandardMaterial({
                        color: 0x111111,  // Very dark gray, almost black
                        metalness: 0.9,
                        roughness: 0.1,
                    }),
                    Chrome: new THREE.MeshStandardMaterial({
                        color: 0xffffff,
                        metalness: 1.0,
                        roughness: 0.1,
                    }),
                    PearlWhite: new THREE.MeshPhysicalMaterial({
                        color: 0xffffff, // Bright white color
                        metalness: 0.1, // Adjusted for a slight sparkle
                        roughness: 0.2, // Slightly rough for a sparkling effect
                        clearcoat: 1, // Add clear coat for sparkle
                        clearcoatRoughness: 0.1, // Low roughness for a shiny effect
                    }),
                    BlackPlastic: new THREE.MeshStandardMaterial({
                        color: 0x222222, // Dark plastic
                        metalness: 0,
                        roughness: 0.8,
                    }),
                    GreyPlastic: new THREE.MeshStandardMaterial({
                        color: 0x888888, // Medium gray for plastic
                        metalness: 0,
                        roughness: 0.5,
                    }),
                    BlackCloth: new THREE.MeshStandardMaterial({
                        color: 0x000000, // Black color for cloth
                        metalness: 0,
                        roughness: 0.8, // Adjust roughness for a cloth-like appearance
                    }),
                    RawMetal: new THREE.MeshStandardMaterial({
                        color: 0x7f7f7f, // Gray color for raw metal
                        metalness: 0.9,
                        roughness: 0.5,
                    }),
                };

                // Find and apply materials to specific meshes
                car.traverse((child) => {
                    if (child.isMesh) {
                        const name = child.name.toLowerCase(); // Convert name to lower case
                        if (name.includes("glass")) { // Matches any glass-related parts
                            child.material = materials.Glass;
                        } else if (name.includes("brake rotors")) {
                            child.material = materials.RedMetal; // For brake rotors
                        } else if (name.includes("rims")) {
                            child.material = materials.BlackMetal; // For rims
                        } else if (name.startsWith("chrom") || name.includes("mirror")) { // Apply chrome material
                            child.material = materials.Chrome;
                        } else if (name.includes("body")) { // Apply pearl white to body parts
                            child.material = materials.PearlWhite;
                        } else if (name.includes("plastic")) { // For plastic parts
                            if (name.includes("black")) {
                                child.material = materials.BlackPlastic; // For black plastic parts
                            } else if (name.includes("grey")) {
                                child.material = materials.GreyPlastic; // For grey plastic parts
                            }
                        } else if (name.includes("steering wheel")) { // Apply black plastic to the steering wheel
                            child.material = materials.BlackPlastic;
                        } else if (name.includes("taillights")) { // Apply red glass to the taillights
                            child.material = materials.RedGlass;
                        } else if (name.includes("seat accents")) { // Apply black cloth to seat accents
                            child.material = materials.BlackCloth;
                        } else if (name.includes("exhaust")) { // Apply raw metal to exhaust
                            child.material = materials.RawMetal;
                        } else if (name.includes("infotainment")) { // Apply black plastic to infotainment
                            child.material = materials.BlackPlastic;
                        } else {
                            // Default material adjustments for other parts
                            child.material.metalness = 0.4;
                            child.material.roughness = 0.6;
                        }
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
                console.error('An error happened', error);
                reject(error);
            }
        );
    });
}

export { createCar };