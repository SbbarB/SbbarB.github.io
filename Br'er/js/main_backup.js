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

    // Purple glow light - front
    const purpleFrontLight = new THREE.PointLight(0x8b5cf6, 1.2, 15);
    purpleFrontLight.position.set(0, 0, 4);
    scene.add(purpleFrontLight);

    // Purple glow light - back
    const purpleBackLight = new THREE.PointLight(0x8b5cf6, 0.8, 12);
    purpleBackLight.position.set(0, 0, -4);
    scene.add(purpleBackLight);

    // Purple rim lights - top and bottom
    const purpleTopLight = new THREE.PointLight(0x8b5cf6, 0.6, 10);
    purpleTopLight.position.set(0, 5, 0);
    scene.add(purpleTopLight);

    const purpleBottomLight = new THREE.PointLight(0x8b5cf6, 0.5, 8);
    purpleBottomLight.position.set(0, -3, 0);
    scene.add(purpleBottomLight);

    // Load STL file with multiple fallback approaches
    loadSTLModel();

    // Mouse movement handler
    document.addEventListener('mousemove', onMouseMove, false);

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
}

function loadSTLModel() {
    console.log('Attempting to load STL model...');

    // Check if STLLoader is available
    if (typeof THREE.STLLoader === 'undefined') {
        console.error('STLLoader not available, loading fallback script...');
        loadSTLLoaderScript();
        return;
    }

    const loader = new THREE.STLLoader();

    // Try multiple file paths
    const filePaths = [
        './renderBr_er.stl',
        'renderBr_er.stl',
        '/mnt/user-data/outputs/renderBr_er.stl'
    ];

    let attempts = 0;

    function tryLoadSTL(pathIndex = 0) {
        if (pathIndex >= filePaths.length) {
            console.error('All STL load attempts failed, creating fallback object');
            createFallbackObject();
            return;
        }

        const path = filePaths[pathIndex];
        console.log(`Attempting to load STL from: ${path}`);

        loader.load(
            path,
            function(geometry) {
                console.log('STL loaded successfully!');
                console.log('Geometry info:', geometry);
                createSTLMesh(geometry);
            },
            function(progress) {
                if (progress.total > 0) {
                    const percentage = (progress.loaded / progress.total * 100).toFixed(2);
                    console.log(`Loading progress: ${percentage}%`);
                }
            },
            function(error) {
                console.error(`Failed to load STL from ${path}:`, error);
                attempts++;
                setTimeout(() => tryLoadSTL(pathIndex + 1), 500);
            }
        );
    }

    tryLoadSTL();
}

function loadSTLLoaderScript() {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/three@0.128.0/examples/js/loaders/STLLoader.js';
    script.onload = () => {
        console.log('STLLoader script loaded successfully');
        loadSTLModel();
    };
    script.onerror = () => {
        console.error('Failed to load STLLoader script');
        createFallbackObject();
    };
    document.head.appendChild(script);
}

function createSTLMesh(geometry) {
    // Calculate geometry bounds
    geometry.computeBoundingBox();
    geometry.computeVertexNormals();

    const box = geometry.boundingBox;
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Center the geometry
    geometry.translate(-center.x, -center.y, -center.z);

    // Monotone gray material with subtle purple glow
    const material = new THREE.MeshPhongMaterial({
        color: 0x606060, // Dark gray monotone
        shininess: 60,
        specular: 0x404040,
        emissive: 0x8b5cf6,
        emissiveIntensity: 0.1,
        transparent: false,
        side: THREE.DoubleSide
    });

    stlObject = new THREE.Mesh(geometry, material);
    stlObject.castShadow = true;
    stlObject.receiveShadow = true;

    // Scale the object to be fully visible - much smaller
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1.2 / maxDim; // Reduced scale for full visibility
    stlObject.scale.setScalar(scale);

    // Position the object
    stlObject.position.set(0, 0, 0);

    scene.add(stlObject);
    console.log('STL mesh created with proper scale for full visibility');
}

function createFallbackObject() {
    console.log('Loading Br\'er device from STL files...');

    deviceGroup = new THREE.Group();

    // Try to load actual STL files first
    const stlLoader = new THREE.STLLoader();
    let outerLoaded = false;
    let innerLoaded = false;

    // Load outer cylinder STL
    stlLoader.load('Cylinder_Main_V2.stl',
        function(geometry) {
            console.log('Outer cylinder STL loaded successfully');
            outerLoaded = true;
            createOuterCylinderFromSTL(geometry);
        },
        undefined,
        function(error) {
            console.log('Could not load outer STL, creating geometric version');
            createOuterCylinderGeometric();
        }
    );

    // Load inner cylinder/cap STL
    stlLoader.load('Cylinder_Cap.stl',
        function(geometry) {
            console.log('Inner cylinder/cap STL loaded successfully');
            innerLoaded = true;
            createInnerCylinderFromSTL(geometry);
        },
        undefined,
        function(error) {
            console.log('Could not load cap STL, creating geometric version');
            createInnerCylinderGeometric();
        }
    );

    // Create cartridge (keep as-is - it's perfect!)
    createCartridge();
}

function createOuterCylinderFromSTL(geometry) {
    geometry.computeBoundingBox();
    geometry.computeVertexNormals();

    const box = geometry.boundingBox;
    const center = new THREE.Vector3();
    box.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);

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

    const mesh = new THREE.Mesh(geometry, deviceMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Scale to match expected size
    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = 2.0 / Math.max(size.x, size.y, size.z);
    mesh.scale.setScalar(scale);

    outerCylinder.add(mesh);
    outerCylinder.position.copy(outerCylinder.userData.originalPosition);
    deviceGroup.add(outerCylinder);
}

function createInnerCylinderFromSTL(geometry) {
    geometry.computeBoundingBox();
    geometry.computeVertexNormals();

    const box = geometry.boundingBox;
    const center = new THREE.Vector3();
    box.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);

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

    const mesh = new THREE.Mesh(geometry, deviceMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Scale to match expected size
    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = 2.0 / Math.max(size.x, size.y, size.z);
    mesh.scale.setScalar(scale);

    innerCylinder.add(mesh);
    innerCylinder.position.copy(innerCylinder.userData.upPosition);
    deviceGroup.add(innerCylinder);
}

function createOuterCylinderGeometric() {
    console.log('Creating geometric outer cylinder as fallback...');

    deviceGroup = new THREE.Group();

    // Blue-gray material for device pieces
    const deviceMaterial = new THREE.MeshPhongMaterial({
        color: 0x606060,
        shininess: 70,
        specular: 0x808080,
        emissive: 0x8b5cf6,
        emissiveIntensity: 0.2
    });

    const darkDeviceMaterial = new THREE.MeshPhongMaterial({
        color: 0x404040,
        shininess: 60,
        specular: 0x606060,
        emissive: 0x8b5cf6,
        emissiveIntensity: 0.15
    });

    // Clear/translucent material for cartridge - more visible and interesting!
    const cartridgeMaterial = new THREE.MeshPhongMaterial({
        color: 0xaaaaaa,
        shininess: 100,
        specular: 0xffffff,
        transparent: true,
        opacity: 0.6,
        emissive: 0x8b5cf6,
        emissiveIntensity: 0.3 // Brighter purple glow
    });

    // === PIECE 1: OUTER CYLINDER (hollow main body with window) ===
    const outerRadius = 0.18;
    const outerHeight = 2.0;
    const wallThickness = 0.025;
    const innerRadius = outerRadius - wallThickness;

    outerCylinder = new THREE.Group();
    outerCylinder.userData = {
        originalPosition: new THREE.Vector3(0, 0, 0) // Outer cylinder NEVER moves
    };
    outerCylinder.position.copy(outerCylinder.userData.originalPosition);
    deviceGroup.add(outerCylinder);

    // Create cylinder with ACTUAL rectangular window cutout
    // We'll create the cylinder in segments, skipping the window area
    const segments = 32;
    const windowWidth = 0.4;
    const windowHeight = 1.0;

    // Calculate window angle range (front of cylinder)
    const windowAngleStart = -0.3; // radians
    const windowAngleEnd = 0.3; // radians

    // Create custom cylinder geometry with window cutout
    const outerWallGeometry = new THREE.CylinderGeometry(outerRadius, outerRadius, outerHeight, segments, 1, true);
    const positions = outerWallGeometry.attributes.position;
    const vertices = [];

    // Mark vertices in window area for removal
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);

        // Calculate angle around cylinder
        const angle = Math.atan2(x, z);

        // Check if vertex is in window area (front of cylinder, middle height)
        const inWindowAngle = angle > windowAngleStart && angle < windowAngleEnd;
        const inWindowHeight = y > -windowHeight/2 && y < windowHeight/2;

        if (inWindowAngle && inWindowHeight) {
            // Skip this vertex (create window opening)
            continue;
        }
        vertices.push(x, y, z);
    }

    // Use standard cylinder for now (proper CSG would be complex)
    // Instead, make the window area with a frame
    const outerWall = new THREE.Mesh(outerWallGeometry, deviceMaterial);
    outerWall.castShadow = true;
    outerWall.receiveShadow = true;
    outerCylinder.add(outerWall);

    // Inner cylinder wall to show thickness
    const innerWallGeometry = new THREE.CylinderGeometry(innerRadius, innerRadius, outerHeight, 32, 1, true);
    const innerWallMaterial = deviceMaterial.clone();
    innerWallMaterial.side = THREE.BackSide;
    const innerWall = new THREE.Mesh(innerWallGeometry, innerWallMaterial);
    outerCylinder.add(innerWall);

    // Top end cap - RING shape
    const topRingGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 32);
    const topRing = new THREE.Mesh(topRingGeometry, deviceMaterial);
    topRing.rotation.x = -Math.PI / 2;
    topRing.position.y = outerHeight / 2;
    topRing.castShadow = true;
    outerCylinder.add(topRing);

    // Bottom end cap - RING shape
    const bottomRingGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 32);
    const bottomRing = new THREE.Mesh(bottomRingGeometry, deviceMaterial);
    bottomRing.rotation.x = Math.PI / 2;
    bottomRing.position.y = -outerHeight / 2;
    bottomRing.castShadow = true;
    outerCylinder.add(bottomRing);

    // WINDOW FRAME - create visible frame around opening (not a black rectangle!)
    const frameDepth = 0.02;
    const frameThickness = 0.03;

    // Top frame bar
    const topFrameGeo = new THREE.BoxGeometry(windowWidth, frameThickness, frameDepth);
    const topFrame = new THREE.Mesh(topFrameGeo, deviceMaterial);
    topFrame.position.set(0, windowHeight/2, outerRadius);
    topFrame.castShadow = true;
    outerCylinder.add(topFrame);

    // Bottom frame bar
    const bottomFrame = new THREE.Mesh(topFrameGeo, deviceMaterial);
    bottomFrame.position.set(0, -windowHeight/2, outerRadius);
    bottomFrame.castShadow = true;
    outerCylinder.add(bottomFrame);

    // Left frame bar
    const sideFrameGeo = new THREE.BoxGeometry(frameThickness, windowHeight, frameDepth);
    const leftFrame = new THREE.Mesh(sideFrameGeo, deviceMaterial);
    leftFrame.position.set(-windowWidth/2, 0, outerRadius);
    leftFrame.castShadow = true;
    outerCylinder.add(leftFrame);

    // Right frame bar
    const rightFrame = new THREE.Mesh(sideFrameGeo, deviceMaterial);
    rightFrame.position.set(windowWidth/2, 0, outerRadius);
    rightFrame.castShadow = true;
    outerCylinder.add(rightFrame);

    // === PIECE 2: INNER CYLINDER (solid cylinder with mouthpiece top and needle bottom) ===
    const innerTubeRadius = 0.13;
    const innerTubeHeight = 1.85;

    innerCylinder = new THREE.Group();
    innerCylinder.userData = {
        originalPosition: new THREE.Vector3(0, 0, 0), // Centered when assembled
        upPosition: new THREE.Vector3(0, 0.3, 0), // Raised position (cartridge not inserted)
        downPosition: new THREE.Vector3(0, 0, 0) // Down position (needle pierces cartridge)
    };
    innerCylinder.position.copy(innerCylinder.userData.upPosition); // Start in UP position
    deviceGroup.add(innerCylinder);

    // Main inner cylinder body
    const innerCylinderGeometry = new THREE.CylinderGeometry(innerTubeRadius, innerTubeRadius, innerTubeHeight, 32);
    const innerCylinderMesh = new THREE.Mesh(innerCylinderGeometry, deviceMaterial);
    innerCylinderMesh.castShadow = true;
    innerCylinderMesh.receiveShadow = true;
    innerCylinder.add(innerCylinderMesh);

    // Tapered mouthpiece top
    const innerMouthpieceGeometry = new THREE.CylinderGeometry(0.08, innerTubeRadius, 0.18, 24);
    const innerMouthpiece = new THREE.Mesh(innerMouthpieceGeometry, deviceMaterial);
    innerMouthpiece.position.y = innerTubeHeight/2 + 0.09;
    innerMouthpiece.castShadow = true;
    innerCylinder.add(innerMouthpiece);

    // Mouthpiece opening (hole at top)
    const mouthpieceHoleGeometry = new THREE.CylinderGeometry(0.045, 0.045, 0.12, 16);
    const mouthpieceHoleMaterial = new THREE.MeshPhongMaterial({
        color: 0x000000,
        opacity: 1.0,
        side: THREE.DoubleSide
    });
    const mouthpieceHole = new THREE.Mesh(mouthpieceHoleGeometry, mouthpieceHoleMaterial);
    mouthpieceHole.position.y = innerTubeHeight/2 + 0.24;
    innerCylinder.add(mouthpieceHole);

    // Small button on top of inner tube
    const buttonStemGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.1, 16);
    const buttonStem = new THREE.Mesh(buttonStemGeometry, darkDeviceMaterial);
    buttonStem.position.y = innerTubeHeight/2 + 0.23;
    buttonStem.castShadow = true;
    innerCylinder.add(buttonStem);

    const buttonTopGeometry = new THREE.SphereGeometry(0.055, 16, 16);
    const buttonTop = new THREE.Mesh(buttonTopGeometry, darkDeviceMaterial);
    buttonTop.position.y = innerTubeHeight/2 + 0.3;
    buttonTop.scale.y = 0.6;
    buttonTop.castShadow = true;
    innerCylinder.add(buttonTop);

    // Side button on inner tube
    const sideButtonGeometry = new THREE.CylinderGeometry(0.045, 0.045, 0.025, 16);
    const sideButton = new THREE.Mesh(sideButtonGeometry, darkDeviceMaterial);
    sideButton.rotation.x = Math.PI / 2;
    sideButton.position.set(0, -0.3, innerTubeRadius + 0.01);
    sideButton.castShadow = true;
    innerCylinder.add(sideButton);

    // BOTTOM CAP with internal needle (sharp point that breaks the cartridge seal)
    const innerBottomCapHeight = 0.2;
    const innerBottomCapGeometry = new THREE.CylinderGeometry(innerTubeRadius, innerTubeRadius, innerBottomCapHeight, 32);
    const innerBottomCap = new THREE.Mesh(innerBottomCapGeometry, deviceMaterial);
    innerBottomCap.castShadow = true;
    innerBottomCap.position.y = -innerTubeHeight/2 - innerBottomCapHeight/2;
    innerCylinder.add(innerBottomCap);

    // Needle housing/cover (protects needle, user can't see inside)
    const needleHousingRadius = 0.05;
    const needleHousingHeight = 0.4;
    const needleHousingGeometry = new THREE.CylinderGeometry(needleHousingRadius, needleHousingRadius, needleHousingHeight, 16);
    const needleHousing = new THREE.Mesh(needleHousingGeometry, darkDeviceMaterial);
    needleHousing.castShadow = true;
    needleHousing.position.y = -innerTubeHeight/2 - innerBottomCapHeight/2 - needleHousingHeight/2;
    innerCylinder.add(needleHousing);

    // Sharp needle tip POINTING UP inside housing (breaks cartridge seal from below)
    const needleRadius = 0.02;
    const needleHeight = 0.35;
    const needleGeometry = new THREE.CylinderGeometry(needleRadius * 0.2, needleRadius, needleHeight, 12);
    const needleMesh = new THREE.Mesh(needleGeometry, darkDeviceMaterial);
    needleMesh.castShadow = true;
    needleMesh.position.y = -innerTubeHeight/2 - innerBottomCapHeight/2 - needleHousingHeight + needleHeight/2 + 0.05;
    innerCylinder.add(needleMesh);

    // === PIECE 3: CARTRIDGE (clear/translucent - completely separate) ===
    const cartridgeRadius = 0.1;
    const cartridgeHeight = 0.75;

    const cartridgeGeometry = new THREE.CylinderGeometry(cartridgeRadius, cartridgeRadius, cartridgeHeight, 24);
    cartridgeComponent = new THREE.Mesh(cartridgeGeometry, cartridgeMaterial);
    cartridgeComponent.castShadow = true;
    cartridgeComponent.receiveShadow = true;
    cartridgeComponent.userData = {
        originalPosition: new THREE.Vector3(0, 0, 0), // Inside device when assembled
        outPosition: new THREE.Vector3(0, 0, 0.8) // Outside through window (FORWARD through Z axis)
    };
    cartridgeComponent.position.copy(cartridgeComponent.userData.outPosition); // Start OUTSIDE
    deviceGroup.add(cartridgeComponent);

    // Cartridge metal end caps
    const cartridgeCapGeometry = new THREE.CylinderGeometry(cartridgeRadius, cartridgeRadius, 0.06, 24);
    const topCap = new THREE.Mesh(cartridgeCapGeometry, darkDeviceMaterial);
    topCap.position.y = cartridgeHeight/2 + 0.03;
    topCap.castShadow = true;
    cartridgeComponent.add(topCap);

    const bottomCap = new THREE.Mesh(cartridgeCapGeometry, darkDeviceMaterial);
    bottomCap.position.y = -cartridgeHeight/2 - 0.03;
    bottomCap.castShadow = true;
    cartridgeComponent.add(bottomCap);

    // Add visible "contents" inside cartridge for visual interest
    const contentsMaterial = new THREE.MeshPhongMaterial({
        color: 0x6a4c93, // Purple-ish color for "liquid/herbs"
        shininess: 50,
        emissive: 0x8b5cf6,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.7
    });

    // Inner cylinder representing liquid/herbs
    const contentsGeometry = new THREE.CylinderGeometry(cartridgeRadius * 0.7, cartridgeRadius * 0.7, cartridgeHeight * 0.6, 16);
    const contents = new THREE.Mesh(contentsGeometry, contentsMaterial);
    contents.position.y = -cartridgeHeight * 0.1;
    cartridgeComponent.add(contents);

    // Add small particles/dots for visual detail
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

    // Scale for better visibility
    deviceGroup.scale.setScalar(1.8);

    stlObject = deviceGroup;
    scene.add(stlObject);
    console.log('Br\'er device created: 3 pieces with realistic assembly animation');
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
        // Rotate entire device group to show all angles
        stlObject.rotation.x += 0.002;
        stlObject.rotation.y += 0.005;
        stlObject.rotation.z += 0.001;

        // Realistic assembly animation showing how the device is loaded
        if (outerCylinder && innerCylinder && cartridgeComponent) {
            // Animation cycle: 0-1 (slower for better viewing)
            const cycle = Math.sin(animationTime * 0.15) * 0.5 + 0.5;

            // OUTER CYLINDER - stays at origin, never moves
            outerCylinder.position.copy(outerCylinder.userData.originalPosition);

            // CARTRIDGE - slides IN/OUT through window (Z axis movement - FORWARD/BACK)
            const cartOut = cartridgeComponent.userData.outPosition;
            const cartIn = cartridgeComponent.userData.originalPosition;
            cartridgeComponent.position.x = cartIn.x;
            cartridgeComponent.position.y = cartIn.y;
            cartridgeComponent.position.z = cartOut.z + (cartIn.z - cartOut.z) * cycle;

            // INNER CYLINDER - slides UP/DOWN (Y axis movement)
            // When cartridge is OUT (cycle=0), inner is UP
            // When cartridge is IN (cycle=1), inner slides DOWN to pierce cartridge
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

// Smooth scrolling for navigation links
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
