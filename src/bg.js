import * as THREE from 'three';

export function createGradient() {
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

    const gradient = new THREE.Mesh(planeGeometry, gradientMaterial);
    gradient.position.z = -1;

    return gradient;
}
