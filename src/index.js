import * as THREE from 'three';

let scene, camera, renderer, gradient, car, angle = 0;
let isMobile = false;

function init() {
    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Create gradient plane
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const gradientMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2() }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform vec2 uResolution;
            varying vec2 vUv;

            void main() {
                vec2 center = vec2(0.5, 0.5);
                float angle = uTime * 0.5;
                vec2 dir = vec2(cos(angle), sin(angle));
                float d = dot(vUv - center, dir) * 0.5 + 0.5;
                vec3 color = mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 0.84, 0.0), d);
                gl_FragColor = vec4(color, 1.0);
            }
        `
    });

    gradient = new THREE.Mesh(planeGeometry, gradientMaterial);
    gradient.position.z = -1;
    scene.add(gradient);

    // Create simple car model
    car = new THREE.Group();

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
    bodyMesh.position.y = 0.45;
    bodyMesh.position.z = -0.5;
    car.add(bodyMesh);

    // Angled front window
    const windowExtrudeSettings = {
        steps: 1,
        depth: 0.9,
        bevelEnabled: false
    };
    const windowShape = new THREE.Shape();
    windowShape.moveTo(0, 0);
    windowShape.lineTo(0.3, 0.3);
    windowShape.lineTo(0.1, 0);
    windowShape.lineTo(0, 0);

    const windowGeometry = new THREE.ExtrudeGeometry(windowShape, windowExtrudeSettings);
    const windowMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
    const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
    windowMesh.position.set(0.4, 0.65, 0.45);
    windowMesh.rotation.y = Math.PI;
    car.add(windowMesh);

    // Maroon soft-top
    const softTopGeometry = new THREE.BoxGeometry(0.4, 0.05, 0.9);
    const softTopMaterial = new THREE.MeshPhongMaterial({ color: 0x800000 }); // Maroon color
    const softTopMesh = new THREE.Mesh(softTopGeometry, softTopMaterial);
    softTopMesh.position.set(-0.4, 0.65, 0); 
    car.add(softTopMesh);

    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 32);
    const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const wheelPositions = [
        { x: -0.7, y: 0.3, z: 0.5 },
        { x: 0.7, y: 0.3, z: 0.5 },
        { x: -0.7, y: 0.3, z: -0.5 },
        { x: 0.7, y: 0.3, z: -0.5 }
    ];

    wheelPositions.forEach(position => {
        const wheelMesh = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelMesh.rotation.x = Math.PI / 2;
        wheelMesh.position.set(position.x, position.y, position.z);
        car.add(wheelMesh);
    });

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
    
    // Car rotation is now handled by mouse/gyro events
    
    renderer.render(scene, camera);
}

init();