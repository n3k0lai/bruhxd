import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';

export async function createCar(debugMode) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        
        loader.load(
            '/Miata-mx-5.gltf',  // Note the leading slash
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
                    MaroonCloth: new THREE.MeshStandardMaterial({
                        color: 0x800000, // Maroon color
                        metalness: 0,
                        roughness: 0.8, // Adjust roughness for a cloth-like appearance
                    }),
                    RawMetal: new THREE.MeshStandardMaterial({
                        color: 0xaaaaaa, // Brighter gray color for raw metal
                        metalness: 0.9, // Higher metalness for a more reflective surface
                        roughness: 0.2, // Lower roughness for a shinier effect
                    }),
                    DebugMaterial: new THREE.MeshStandardMaterial({
                        color: 0x00ff00, // Bright green for debugging
                        metalness: 0.5,
                        roughness: 0.5,
                    }),
                    InvisibleMaterial: new THREE.MeshBasicMaterial({
                        transparent: true,
                        opacity: 0, // Fully transparent
                    }),
                };

                // Find and apply materials to specific meshes
                car.traverse((child) => {
                    if (child.isMesh) {
                        const name = child.name.toLowerCase(); // Convert name to lower case
                        if (name.includes("glass")) { // Matches any glass-related parts
                            child.material = materials.Glass;
                        } else if (name.includes("rims")) {
                            child.material = materials.BlackMetal; // For rims
                        } else if (name.startsWith("chrom") || name.includes("mirror")) { // Apply chrome material
                            child.material = materials.Chrome;
                        } else if (name.includes("body")) { // Apply pearl white to body parts
                            child.material = materials.PearlWhite;
                        } else if (name.includes("steering wheel")) { // Apply black plastic to the steering wheel
                            child.material = materials.BlackPlastic;
                        } else if (name.includes("brake light")) { // Apply red glass to the taillights
                            child.material = materials.RedGlass;
                        } else if (name.includes("seat") || name.includes("floormats")) { // Apply black cloth to seat accents
                            child.material = materials.BlackCloth;
                        } else if (name.includes("exhaust") || name.includes("base") || name.includes("suspension") || name.includes("rotor") || name.includes("??????")) { // Apply raw metal to exhaust
                            child.material = materials.RawMetal;
                        } else if (name.includes("infotainment") || name.includes("dashboard")  || name.includes("antannae") || name.includes("shifter")) { // Apply black plastic to infotainment
                            child.material = materials.BlackPlastic;
                        } else if (name.includes("backdrop") || name === "floor") { // Apply invisible material to backdrop
                            child.material = materials.InvisibleMaterial;
                        } else if (name.includes("back top-down panel")) { // Apply maroon cloth to back top-down panel
                            child.material = materials.MaroonCloth;
                        //} else if (name.includes("")) { // debug material
                        //    child.material = materials.DebugMaterial;
                        } else if (debugMode) {
                            // Apply DebugMaterial for debugging purposes
                            child.material = materials.DebugMaterial; // Apply debug material to any other parts
                        }
                    }
                });

                // Adjust the car's position, rotation, and scale if needed
                car.position.set(0, 0, 0);
                car.rotation.y = -Math.PI / 4; // Rotate 45 degrees around Y-axis
                car.rotation.x = Math.PI / 12; // Slight tilt downwards
                car.scale.set(1, 1, 1); // Adjust scale if needed
                
                // Add event listener for mouse wheel to change vehicle size
                window.addEventListener('wheel', (event) => {
                    event.preventDefault(); // Prevent default scroll behavior
                    const scaleChange = event.deltaY > 0 ? -0.1 : 0.1; // Determine scale change direction
                    car.scale.x += scaleChange; // Adjust scale on x-axis
                    car.scale.y += scaleChange; // Adjust scale on y-axis
                    car.scale.z += scaleChange; // Adjust scale on z-axis
                    car.scale.clampScalar(0.1, 5); // Limit scale to a range (0.1 to 5)
                });

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