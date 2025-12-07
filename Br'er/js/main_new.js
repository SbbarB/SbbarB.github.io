// Three.js setup for STL rendering
let scene, camera, renderer, stlObject;
let deviceGroup, outerCylinder, innerCylinder, cartridgeComponent;
let mouseX = 0, mouseY = 0;
let animationTime = 0;

function init() {
    console.log('Initializing Three.js scene...');

    // Create scene
    scene = new THREE.Scene();

    // Create camera
    const canvas = document.getElementById('three-canvas');
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);

    // Create renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Enhanced lighting with purple glow effects
    const ambientLight = new THREE.AmbientLight(0x1a1a1a, 0.5);
    scene.add(ambientLight);

    // Main key light
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(5, 5, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);

    // Fill light from opposite side
    const fillLight = new THREE.DirectionalLight(0xcccccc, 0.4);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    // Purple glow lights
    const purpleFrontLight = new THREE.PointLight(0x8b5cf6, 1.2, 15);
    purpleFrontLight.position.set(0, 0, 4);
    scene.add(purpleFrontLight);

    const purpleBackLight = new THREE.PointLight(0x8b5cf6, 0.8, 12);
    purpleBackLight.position.set(0, 0, -4);
    scene.add(purpleBackLight);

    const purpleTopLight = new THREE.PointLight(0x8b5cf6, 0.6, 10);
    purpleTopLight.position.set(0, 5, 0);
    scene.add(purpleTopLight);

    const purpleBottomLight = new THREE.PointLight(0x8b5cf6, 0.5, 8);
    purpleBottomLight.position.set(0, -3, 0);
    scene.add(purpleBottomLight);

    // Load device
    loadDevice();

    // Mouse movement handler
    document.addEventListener('mousemove', onMouseMove, false);

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
}

function loadDevice() {
    console.log('Loading Br\'er device from STL files...');

    deviceGroup = new THREE.Group();

    const stlLoader = new THREE.STLLoader();

    // Load outer cylinder STL
    stlLoader.load('Cylinder_Main_V2.stl',
        function(geometry) {
            console.log('Outer cylinder STL loaded successfully');
            createOuterCylinderFromSTL(geometry);
            finalizeDevice();
        },
        undefined,
        function(error) {
            console.log('Could not load outer STL:', error);
            createOuterCylinderFromSTL(null);
            finalizeDevice();
        }
    );

    // Load inner cylinder/cap STL
    stlLoader.load('Cylinder_Cap.stl',
        function(geometry) {
            console.log('Inner cylinder/cap STL loaded successfully');
            createInnerCylinderFromSTL(geometry);
            finalizeDevice();
        },
        undefined,
        function(error) {
            console.log('Could not load cap STL:', error);
            createInnerCylinderFromSTL(null);
            finalizeDevice();
        }
    );

    // Create perfect cartridge
    createCartridge();
}

let deviceFinalized = false;
function finalizeDevice() {
    if (deviceFinalized) return;
    if (!outerCylinder || !innerCylinder || !cartridgeComponent) return;

    deviceFinalized = true;

    // Scale entire device group
    deviceGroup.scale.setScalar(1.8);

    stlObject = deviceGroup;
    scene.add(stlObject);
    console.log('Br\'er device assembled and ready');
}

function createOuterCylinderFromSTL(geometry) {
    const deviceMaterial = new THREE.MeshPhongMaterial({
        color: 0x606060,
        shininess: 70,
        specular: 0x808080,
        emissive: 0x8b5cf6,
        emissiveIntensity: 0.2
    });

    outerCylinder = new THREE.Group();
    outerCylinder.userData = {
        originalPosition: new THREE.Vector3(0, 0, 0)
    };

    if (geometry) {
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();

        const box = geometry.boundingBox;
        const center = new THREE.Vector3();
        box.getCenter(center);
        geometry.translate(-center.x, -center.y, -center.z);

        const mesh = new THREE.Mesh(geometry, deviceMaterial);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Scale to match expected size (2.0 units tall)
        const size = new THREE.Vector3();
        box.getSize(size);
        const scale = 2.0 / Math.max(size.x, size.y, size.z);
        mesh.scale.setScalar(scale);

        outerCylinder.add(mesh);
    }

    outerCylinder.position.copy(outerCylinder.userData.originalPosition);
    deviceGroup.add(outerCylinder);
}

function createInnerCylinderFromSTL(geometry) {
    const deviceMaterial = new THREE.MeshPhongMaterial({
        color: 0x606060,
        shininess: 70,
        specular: 0x808080,
        emissive: 0x8b5cf6,
        emissiveIntensity: 0.2
    });

    innerCylinder = new THREE.Group();
    innerCylinder.userData = {
        originalPosition: new THREE.Vector3(0, 0, 0),
        upPosition: new THREE.Vector3(0, 0.3, 0),
        downPosition: new THREE.Vector3(0, 0, 0)
    };

    if (geometry) {
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();

        const box = geometry.boundingBox;
        const center = new THREE.Vector3();
        box.getCenter(center);
        geometry.translate(-center.x, -center.y, -center.z);

        const mesh = new THREE.Mesh(geometry, deviceMaterial);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Scale to match expected size
        const size = new THREE.Vector3();
        box.getSize(size);
        const scale = 2.0 / Math.max(size.x, size.y, size.z);
        mesh.scale.setScalar(scale);

        innerCylinder.add(mesh);
    }

    innerCylinder.position.copy(innerCylinder.userData.upPosition);
    deviceGroup.add(innerCylinder);
}

function createCartridge() {
    // Materials
    const cartridgeMaterial = new THREE.MeshPhongMaterial({
        color: 0xaaaaaa,
        shininess: 100,
        specular: 0xffffff,
        transparent: true,
        opacity: 0.6,
        emissive: 0x8b5cf6,
        emissiveIntensity: 0.3
    });

    const darkDeviceMaterial = new THREE.MeshPhongMaterial({
        color: 0x404040,
        shininess: 60,
        specular: 0x606060,
        emissive: 0x8b5cf6,
        emissiveIntensity: 0.15
    });

    const contentsMaterial = new THREE.MeshPhongMaterial({
        color: 0x6a4c93,
        shininess: 50,
        emissive: 0x8b5cf6,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.7
    });

    // Cartridge dimensions
    const cartridgeRadius = 0.1;
    const cartridgeHeight = 0.75;

    // Main cartridge body
    const cartridgeGeometry = new THREE.CylinderGeometry(cartridgeRadius, cartridgeRadius, cartridgeHeight, 24);
    cartridgeComponent = new THREE.Mesh(cartridgeGeometry, cartridgeMaterial);
    cartridgeComponent.castShadow = true;
    cartridgeComponent.receiveShadow = true;
    cartridgeComponent.userData = {
        originalPosition: new THREE.Vector3(0, 0, 0),
        outPosition: new THREE.Vector3(0, 0, 0.8)
    };
    cartridgeComponent.position.copy(cartridgeComponent.userData.outPosition);
    deviceGroup.add(cartridgeComponent);

    // Metal end caps
    const cartridgeCapGeometry = new THREE.CylinderGeometry(cartridgeRadius, cartridgeRadius, 0.06, 24);
    const topCap = new THREE.Mesh(cartridgeCapGeometry, darkDeviceMaterial);
    topCap.position.y = cartridgeHeight/2 + 0.03;
    topCap.castShadow = true;
    cartridgeComponent.add(topCap);

    const bottomCap = new THREE.Mesh(cartridgeCapGeometry, darkDeviceMaterial);
    bottomCap.position.y = -cartridgeHeight/2 - 0.03;
    bottomCap.castShadow = true;
    cartridgeComponent.add(bottomCap);

    // Visible contents
    const contentsGeometry = new THREE.CylinderGeometry(cartridgeRadius * 0.7, cartridgeRadius * 0.7, cartridgeHeight * 0.6, 16);
    const contents = new THREE.Mesh(contentsGeometry, contentsMaterial);
    contents.position.y = -cartridgeHeight * 0.1;
    cartridgeComponent.add(contents);

    // Particles for detail
    for (let i = 0; i < 8; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.01, 8, 8);
        const particle = new THREE.Mesh(particleGeometry, contentsMaterial);
        const angle = (i / 8) * Math.PI * 2;
        const radius = cartridgeRadius * 0.5;
        particle.position.x = Math.cos(angle) * radius;
        particle.position.z = Math.sin(angle) * radius;
        particle.position.y = -cartridgeHeight * 0.2 + (Math.random() - 0.5) * cartridgeHeight * 0.3;
        cartridgeComponent.add(particle);
    }
}

function onMouseMove(event) {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    animationTime += 0.01;

    if (stlObject) {
        // Rotate entire device group
        stlObject.rotation.x += 0.002;
        stlObject.rotation.y += 0.005;
        stlObject.rotation.z += 0.001;

        // Realistic assembly animation
        if (outerCylinder && innerCylinder && cartridgeComponent) {
            const cycle = Math.sin(animationTime * 0.15) * 0.5 + 0.5;

            // Outer cylinder stays put
            outerCylinder.position.copy(outerCylinder.userData.originalPosition);

            // Cartridge slides in/out through window (Z axis)
            const cartOut = cartridgeComponent.userData.outPosition;
            const cartIn = cartridgeComponent.userData.originalPosition;
            cartridgeComponent.position.x = cartIn.x;
            cartridgeComponent.position.y = cartIn.y;
            cartridgeComponent.position.z = cartOut.z + (cartIn.z - cartOut.z) * cycle;

            // Inner cylinder slides up/down
            const innerUp = innerCylinder.userData.upPosition;
            const innerDown = innerCylinder.userData.downPosition;
            innerCylinder.position.x = innerDown.x;
            innerCylinder.position.y = innerUp.y + (innerDown.y - innerUp.y) * cycle;
            innerCylinder.position.z = innerDown.z;
        }
    }

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// Smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Navigation background on scroll
window.addEventListener('scroll', () => {
    const nav = document.querySelector('.nav');
    if (window.scrollY > 100) {
        nav.style.background = 'rgba(0, 0, 0, 0.9)';
        nav.style.backdropFilter = 'blur(10px)';
    } else {
        nav.style.background = 'transparent';
        nav.style.backdropFilter = 'none';
    }
});

// Initialize when page loads
window.addEventListener('load', () => {
    console.log('Page loaded, initializing 3D scene...');
    init();
    animate();
});

// Backup initialization
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (!scene) {
            console.log('Backup initialization triggered...');
            init();
            animate();
        }
    }, 2000);
});
