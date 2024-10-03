import * as THREE from 'three';

export function createCar() {
    const car = new THREE.Group();

    // Angled car body
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-1, -0.2);
    bodyShape.lineTo(1, -0.2);
    bodyShape.lineTo(1, 0.1);
    bodyShape.lineTo(0.5, 0.2);
    bodyShape.lineTo(-1, 0.2);
    bodyShape.lineTo(-1, -0.2);

    const extrudeSettings = {
        steps: 1,
        depth: 1,
        bevelEnabled: false
    };

    const bodyGeometry = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF, emissive: 0x111111 });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.y = 0.3; // Adjusted from 0.25 to 0.3
    bodyMesh.position.z = -0.5;
    car.add(bodyMesh);

    // Angled front window
    const windowShape = new THREE.Shape();
    windowShape.moveTo(0, 0);
    windowShape.lineTo(0.3, 0.3);  // Reverted back to 0.5
    windowShape.lineTo(0.1, 0);    // Reverted back to 0.1
    windowShape.lineTo(0, 0);

    const windowExtrudeSettings = {
        steps: 1,
        depth: 0.9,
        bevelEnabled: false
    };
    const windowGeometry = new THREE.ExtrudeGeometry(windowShape, windowExtrudeSettings);
    const windowMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
    const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
    windowMesh.position.set(0.4, 0.5, 0.45);  // Reverted x back to 0.4
    windowMesh.rotation.y = Math.PI;
    car.add(windowMesh);

    // Maroon soft-top
    const softTopGeometry = new THREE.BoxGeometry(0.4, 0.08, 0.9); // Adjusted width from 0.8 to 0.72, height from 0.1 to 0.08, depth from 1 to 0.9
    const softTopMaterial = new THREE.MeshPhongMaterial({ color: 0x800000 });
    const softTopMesh = new THREE.Mesh(softTopGeometry, softTopMaterial);
    softTopMesh.position.set(-0.36, 0.54, 0); // Adjusted x from -0.4 to -0.36, y from 0.55 to 0.54
    car.add(softTopMesh);

    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 32);
    const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const wheelPositions = [
        { x: -0.7, y: 0.19, z: 0.5 },  // Adjusted from 0.2 to 0.19
        { x: 0.7, y: 0.19, z: 0.5 },   // Adjusted from 0.2 to 0.19
        { x: -0.7, y: 0.19, z: -0.5 }, // Adjusted from 0.2 to 0.19
        { x: 0.7, y: 0.19, z: -0.5 }   // Adjusted from 0.2 to 0.19
    ];

    wheelPositions.forEach(position => {
        const wheelMesh = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelMesh.rotation.x = Math.PI / 2;
        wheelMesh.position.set(position.x, position.y, position.z);
        car.add(wheelMesh);
    });

    // Initialize car rotation towards bottom right corner
    car.rotation.y = -Math.PI / 4; // Rotate 45 degrees around Y-axis
    car.rotation.x = Math.PI / 12; // Slight tilt downwards

    return car;
}
