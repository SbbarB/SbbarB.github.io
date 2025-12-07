// Three.js setup for STL rendering
let scene, camera, renderer, stlObject;
let deviceGroup, outerCylinder, innerCylinder, cartridgeComponent;
let cartridgeMaterial; // Store cartridge material for animation
let mouseX = 0, mouseY = 0;
let animationTime = 0;
let deviceSize = null; // Track device dimensions
let animationProgress = 1; // Start at 1 (open state - cartridge OUT)
let locoScroll; // Locomotive Scroll instance
let lastScrollY = 0;
let scrollVelocity = 0;
let lastScrollTime = Date.now();

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
    mainLight.position.set(10, 15, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);

    // Fill light from opposite side
    const fillLight = new THREE.DirectionalLight(0xcccccc, 0.7);
    fillLight.position.set(-13, -10, 0);
    scene.add(fillLight);

    // White glow lights
    const whiteFrontLight = new THREE.PointLight(0xffffff, 0.6, 15);
    whiteFrontLight.position.set(-7, 0, 2);
    scene.add(whiteFrontLight);

    const whiteBackLight = new THREE.PointLight(0xffffff, 0.9, 12);
    whiteBackLight.position.set(-5, 10, 4);
    scene.add(whiteBackLight);

    const whiteTopLight = new THREE.PointLight(0xffffff, 1, 10);
    whiteTopLight.position.set(6, 2, 6);
    scene.add(whiteTopLight);

    const whiteBottomLight = new THREE.PointLight(0xffffff, 0.6, 8);
    whiteBottomLight.position.set(0, -3, 0);
    scene.add(whiteBottomLight);

    // Load device
    loadDevice();

    // Mouse movement handler
    document.addEventListener('mousemove', onMouseMove, false);

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
}

function loadDevice() {
    console.log('Loading Br\'er device from two separate STL files...');

    deviceGroup = new THREE.Group();
    const stlLoader = new THREE.STLLoader();

    // Load outer shell (stationary)
    stlLoader.load('outterFORclaude.stl',
        function(geometry) {
            console.log('Outer shell loaded');
            createOuterShell(geometry);
        },
        undefined,
        function(error) {
            console.error('Could not load outer shell:', error);
        }
    );

    // Load inner part + button (animates up/down)
    stlLoader.load('inner&buttonFORclaude.stl',
        function(geometry) {
            console.log('Inner part + button loaded');
            createInnerPart(geometry);
        },
        undefined,
        function(error) {
            console.error('Could not load inner part:', error);
        }
    );

    // Cartridge will be created AFTER device is loaded and sized
}

let outerLoaded = false;
let innerLoaded = false;
let cartridgeCreated = false;

function createOuterShell(geometry) {
    const deviceMaterial = new THREE.MeshPhongMaterial({
        color: 0x2a3540, // Darker blueish-grey metallic
        shininess: 100,
        specular: 0x4a5560,
        metalness: 0.6
    });

    geometry.computeBoundingBox();
    geometry.computeVertexNormals();

    const box = geometry.boundingBox;
    const center = new THREE.Vector3();
    box.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);

    const mesh = new THREE.Mesh(geometry, deviceMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const size = new THREE.Vector3();
    box.getSize(size);

    deviceSize = {
        height: size.y,
        depth: size.z,
        outerBox: box
    };

    outerCylinder = new THREE.Group();
    outerCylinder.add(mesh);
    outerCylinder.position.set(0, 0, 0);
    deviceGroup.add(outerCylinder);

    console.log('Outer shell - bounding box:', box);
    console.log('Outer shell - size:', size);

    outerLoaded = true;
    finalizeDevice();
}

function createInnerPart(geometry) {
    const deviceMaterial = new THREE.MeshPhongMaterial({
        color: 0x2a3540, // Darker blueish-grey metallic
        shininess: 100,
        specular: 0x4a5560,
        metalness: 0.6
    });

    geometry.computeBoundingBox();
    geometry.computeVertexNormals();

    const box = geometry.boundingBox;
    const center = new THREE.Vector3();
    box.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);

    const mesh = new THREE.Mesh(geometry, deviceMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const size = new THREE.Vector3();
    box.getSize(size);

    innerCylinder = new THREE.Group();
    innerCylinder.add(mesh);

    console.log('Inner part - bounding box:', box);
    console.log('Inner part - size:', size);
    console.log('Outer box for reference:', deviceSize.outerBox);

    // Calculate proper positioning:
    const innerHeight = size.z;

    // Move it POSITIVE on Z axis (other direction)
    const startOffset = innerHeight * 0.32; // Move positive

    // Travel distance - button moves within the slot only
    const travelDistance = innerHeight * 0.29; // Short travel to stay in slot

    innerCylinder.userData = {
        upPosition: new THREE.Vector3(0, 0, startOffset + travelDistance), // Button at top of slot
        downPosition: new THREE.Vector3(0, 0, startOffset) // Button at bottom of slot
    };
    // Force center alignment on X and Y
    innerCylinder.position.set(0, 0, startOffset); // Centered X=0, Y=0, Z=startOffset
    deviceGroup.add(innerCylinder);

    console.log('Inner position:', innerCylinder.position);
    console.log('Inner start offset:', startOffset);
    console.log('Travel distance:', travelDistance);
    console.log('Up position:', innerCylinder.userData.upPosition);
    console.log('Down position:', innerCylinder.userData.downPosition);

    innerLoaded = true;
    finalizeDevice();
}

function finalizeDevice() {
    console.log('Finalize check - outer:', outerLoaded, 'inner:', innerLoaded, 'cart:', cartridgeCreated);

    // Once device parts are loaded, create the cartridge
    if (outerLoaded && innerLoaded && !cartridgeCreated) {
        createCartridge();
        return;
    }

    if (!outerLoaded || !innerLoaded || !cartridgeCreated) return;
    if (!outerCylinder || !innerCylinder || !cartridgeComponent) return;

    // Scale device to smaller size so whole thing is visible
    deviceGroup.scale.setScalar(0.04);

    // Rotate entire device so Z-axis movement appears as Y-axis (vertical) to user
    deviceGroup.rotation.x = Math.PI / 2 + Math.PI; // 90 + 180 degrees in X
    deviceGroup.rotation.y = Math.PI + Math.PI; // 180 + 180 = 360 degrees in Y

    // Move down slightly so whole device is visible
    deviceGroup.position.y = -1;

    stlObject = deviceGroup;
    scene.add(stlObject);
    console.log('Device assembled and ready');
}

function createCartridge() {
    if (!deviceSize) {
        console.error('Cannot create cartridge - device size unknown');
        return;
    }

    // Materials - assign to global variable for animation access
    cartridgeMaterial = new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        shininess: 100,
        specular: 0xffffff,
        transparent: true,
        opacity: 0.6,
        emissive: 0xffffff,
        emissiveIntensity: 0.3
    });

    const darkDeviceMaterial = new THREE.MeshPhongMaterial({
        color: 0x6a7f8f,
        shininess: 80,
        specular: 0x8fa3b3,
        emissive: 0xffffff,
        emissiveIntensity: 0.15
    });

    // Cartridge dimensions - BIG shotgun shell
    const cartridgeRadius = deviceSize.height * 0.33; // Large visible
    const cartridgeHeight = deviceSize.height * 0.7; // Long shell

    // Main cartridge body
    const cartridgeGeometry = new THREE.CylinderGeometry(cartridgeRadius, cartridgeRadius, cartridgeHeight, 24);
    cartridgeComponent = new THREE.Mesh(cartridgeGeometry, cartridgeMaterial);
    cartridgeComponent.castShadow = true;
    cartridgeComponent.receiveShadow = true;

    // Rotate to lay horizontally for side loading
    cartridgeComponent.rotation.z = Math.PI / 2;
    cartridgeComponent.rotation.y = 0;

    // Bullet-style loading: ON SCREEN, comes WAY toward user
    const openingY = (-deviceSize.height) * 0.9; // NEGATIVE = BELOW CENTER = LOWER ON SCREEN
    const openingZ = (-deviceSize.depth) * 0.1; // At device front face

    cartridgeComponent.userData = {
        // IN: centered inside device, ROTATED 90°
        inPosition: new THREE.Vector3(0, openingY+20, openingZ),
        inRotation: Math.PI / 2, // 90 degree rotation
        // OUT: ON SCREEN, far to side and MUCH closer to user (huge Z to avoid phasing)
        outPosition: new THREE.Vector3(deviceSize.depth * 0.6, openingY, deviceSize.depth * 3.5),
        outRotation: 0 // Normal orientation
    };

    // Start visible at OUT position
    cartridgeComponent.position.copy(cartridgeComponent.userData.outPosition);
    cartridgeComponent.visible = true;
    cartridgeMaterial.opacity = 0.6;

    deviceGroup.add(cartridgeComponent);

    // Metal end caps
    const capHeight = cartridgeHeight * 0.08;
    const cartridgeCapGeometry = new THREE.CylinderGeometry(cartridgeRadius, cartridgeRadius, capHeight, 24);
    const topCap = new THREE.Mesh(cartridgeCapGeometry, darkDeviceMaterial);
    topCap.position.y = cartridgeHeight/2 + capHeight/2;
    topCap.castShadow = true;
    cartridgeComponent.add(topCap);

    const bottomCap = new THREE.Mesh(cartridgeCapGeometry, darkDeviceMaterial);
    bottomCap.position.y = -cartridgeHeight/2 - capHeight/2;
    bottomCap.castShadow = true;
    cartridgeComponent.add(bottomCap);

    // Cotton cylinder inside - fluffy white material
    const cottonMaterial = new THREE.MeshPhongMaterial({
        color: 0xf5f5f5, // Off-white cotton color
        shininess: 10,
        emissive: 0xffffff,
        emissiveIntensity: 0.2,
        transparent: false,
        opacity: 1.0
    });

    // Bigger cylinder of cotton filling
    const cottonGeometry = new THREE.CylinderGeometry(
        cartridgeRadius * 0.8, // Bigger radius
        cartridgeRadius * 0.8,
        cartridgeHeight * 0.8, // Longer height
        16
    );
    const cotton = new THREE.Mesh(cottonGeometry, cottonMaterial);
    cotton.position.y = 0; // Centered vertically
    cartridgeComponent.add(cotton);

    cartridgeCreated = true;
    console.log('Cartridge created - radius:', cartridgeRadius, 'height:', cartridgeHeight);
    finalizeDevice();
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

    if (stlObject) {
        // No rotation - keep it still facing user
         //stlObject.rotation.x += 0.001;
         //stlObject.rotation.y += 0.001;
         // stlObject.rotation.z += 0.01;

        if (innerCylinder && cartridgeComponent) {
            // Map animation progress to timeline:
            // progress 1 = cycle 0 (start: cartridge OUT, inner UP - OPEN state)
            // progress 0 = cycle 0.4 (cartridge hidden, inner DOWN - CLOSED state)
            // This maps the closing animation (progress 1→0) to timeline (cycle 0→0.4)
            const cycle = (1 - animationProgress) * 0.4;

            const innerUp = innerCylinder.userData.upPosition;
            const innerDown = innerCylinder.userData.downPosition;
            const cartOut = cartridgeComponent.userData.outPosition;
            const cartIn = cartridgeComponent.userData.inPosition;

            // Timing: 10% cart in, 10% pause top, 20% down (cart fades), 10% pause bottom, 15% up (cart appears), 10% cart out
            if (cycle < 0.1) {
                // Stage 1: Cartridge loads IN immediately (no waiting)
                const t = cycle / 0.1;
                const eased =  t * t * (3 - 2 * t);

                // Inner stays fully UP
                innerCylinder.position.copy(innerUp);

                // Cartridge loads IN quickly - huge Z movement toward user to avoid phasing
                cartridgeComponent.position.x = cartOut.x + (cartIn.x - cartOut.x) * eased;
                cartridgeComponent.position.y = cartOut.y;
                cartridgeComponent.position.z = cartOut.z + (cartIn.z - cartOut.z) * eased;

                // Rotate 90° as it loads
                cartridgeComponent.rotation.y = cartridgeComponent.userData.outRotation +
                    (cartridgeComponent.userData.inRotation - cartridgeComponent.userData.outRotation) * eased;

                cartridgeComponent.visible = true;
                cartridgeMaterial.opacity = 0.6;
            } else if (cycle < 0.2) {
                // Stage 2: PAUSE at top
                innerCylinder.position.copy(innerUp);
                cartridgeComponent.position.copy(cartIn);
                cartridgeComponent.rotation.y = cartridgeComponent.userData.inRotation;
                cartridgeComponent.visible = true;
                cartridgeMaterial.opacity = 0.6;
            } else if (cycle < 0.4) {
                // Stage 3: Inner DOWN (cartridge fades proportionally as inner moves down)
                const t = (cycle - 0.2) / 0.2;
                const eased = t * t * (3 - 2 * t); // Smooth easing

                innerCylinder.position.x = 0;
                innerCylinder.position.y = 0;
                innerCylinder.position.z = innerUp.z + (innerDown.z - innerUp.z) * eased;

                // Cartridge stays centered, ROTATED 90°
                cartridgeComponent.position.copy(cartIn);
                cartridgeComponent.rotation.y = cartridgeComponent.userData.inRotation;

                // Fade directly proportional to inner movement (no delays)
                cartridgeComponent.visible = true;
                cartridgeMaterial.opacity = 0.6 * (1 - t); // Fades from 0.6 to 0 exactly as inner moves down
            } else if (cycle < 0.75) {
                // Stage 5: PAUSE at bottom (10% like top pause)
                innerCylinder.position.copy(innerDown);
                cartridgeComponent.position.copy(cartIn);
                cartridgeComponent.rotation.y = cartridgeComponent.userData.inRotation;
                cartridgeComponent.visible = false;
                cartridgeMaterial.opacity = 0;
            } else if (cycle < 0.9) {
                // Stage 6: Inner UP (cartridge appears seamlessly as it's uncovered)
                const t = (cycle - 0.75) / 0.15;

                innerCylinder.position.x = 0;
                innerCylinder.position.y = 0;
                innerCylinder.position.z = innerDown.z + (innerUp.z - innerDown.z) * t;

                // Cartridge stays IN, appears as inner uncovers it
                cartridgeComponent.position.copy(cartIn);
                cartridgeComponent.rotation.y = cartridgeComponent.userData.inRotation;

                // Seamless fade in perfect sync with inner uncovering it
                if (t < 0.05) {
                    cartridgeComponent.visible = false;
                    cartridgeMaterial.opacity = 0;
                } else if (t < 0.95) {
                    cartridgeComponent.visible = true;
                    const fadeT = (t - 0.05) / 0.9;
                    cartridgeMaterial.opacity = 0.6 * fadeT; // Fade from 0 to 0.6 as inner goes up
                } else {
                    cartridgeComponent.visible = true;
                    cartridgeMaterial.opacity = 0.6;
                }
            } else {
                // Stage 7: Cartridge OUT alone (inner already fully up)
                const t = (cycle - 0.9) / 0.1;
                const eased = t * t * (3 - 2 * t);

                // Inner stays at UP position
                innerCylinder.position.copy(innerUp);

                // Cartridge ejects OUT with arc back to starting position (infinite loop)
                cartridgeComponent.position.x = cartIn.x + (cartOut.x - cartIn.x) * eased;
                cartridgeComponent.position.y = cartOut.y;
                cartridgeComponent.position.z = cartIn.z + (cartOut.z - cartIn.z) * eased;

                // Rotate back from 90° to 0°
                cartridgeComponent.rotation.y = cartridgeComponent.userData.inRotation +
                    (cartridgeComponent.userData.outRotation - cartridgeComponent.userData.inRotation) * eased;

                // Fully visible and opaque while ejecting
                cartridgeComponent.visible = true;
                cartridgeMaterial.opacity = 0.6;
            }
        }
    }

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// Initialize Locomotive Scroll
function initLocomotiveScroll() {
    locoScroll = new LocomotiveScroll({
        el: document.querySelector('[data-scroll-container]'),
        smooth: true,
        smoothMobile: false,
        lerp: 0.05, // Lower = smoother
        multiplier: 0.8, // Slower scroll speed
        smartphone: {
            smooth: false
        },
        tablet: {
            smooth: false
        }
    });

    // Update animation based on scroll progress
    locoScroll.on('scroll', (args) => {
        const scrollY = args.scroll.y;
        const currentTime = Date.now();
        const deltaTime = currentTime - lastScrollTime;

        // Calculate scroll velocity (pixels per millisecond)
        if (deltaTime > 0) {
            scrollVelocity = Math.abs(scrollY - lastScrollY) / deltaTime;
        }

        // Get the animation spacer element to calculate scroll range
        const spacer = document.querySelector('.animation-spacer');
        const spacerHeight = spacer ? spacer.offsetHeight : window.innerHeight * 1.5;

        // Check if we're in the animation zone
        const inAnimationZone = scrollY >= 0 && scrollY <= spacerHeight;

        // Dynamically adjust scroll speed based on velocity and position
        if (inAnimationZone) {
            // If scrolling fast (velocity > 2), drastically slow down
            // If scrolling moderate (velocity 1-2), slow down moderately
            // If scrolling slow (velocity < 1), keep normal speed
            if (scrollVelocity > 2) {
                locoScroll.options.lerp = 0.02; // Very slow and smooth
                locoScroll.options.multiplier = 0.3; // Much slower
            } else if (scrollVelocity > 1) {
                locoScroll.options.lerp = 0.03;
                locoScroll.options.multiplier = 0.5;
            } else {
                locoScroll.options.lerp = 0.05;
                locoScroll.options.multiplier = 0.6;
            }
        } else {
            // Outside animation zone - restore normal speed
            locoScroll.options.lerp = 0.05;
            locoScroll.options.multiplier = 0.8;
        }

        // Calculate animation progress based on scroll through the spacer
        // Progress goes from 1 (open) to 0 (closed) as user scrolls down
        // Animation plays during the entire spacer height
        const progress = Math.max(0, Math.min(1, 1 - (scrollY / spacerHeight)));

        animationProgress = progress;

        // Update tracking variables
        lastScrollY = scrollY;
        lastScrollTime = currentTime;

        // Navigation background - only trigger AFTER animation spacer is scrolled past
        const nav = document.querySelector('.nav');
        if (scrollY > spacerHeight + 100) {
            nav.style.background = 'rgba(0, 0, 0, 0.9)';
            nav.style.backdropFilter = 'blur(10px)';
        } else {
            nav.style.background = 'transparent';
            nav.style.backdropFilter = 'none';
        }
    });

    // Update on resize
    window.addEventListener('resize', () => {
        locoScroll.update();
    });
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target && locoScroll) {
            locoScroll.scrollTo(target);
        }
    });
});

// Initialize when page loads
window.addEventListener('load', () => {
    console.log('Page loaded, initializing 3D scene and Locomotive Scroll...');
    init();
    animate();

    // Initialize Locomotive Scroll after a short delay to ensure DOM is ready
    setTimeout(() => {
        initLocomotiveScroll();
    }, 100);
});

// Backup initialization
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (!scene) {
            console.log('Backup initialization triggered...');
            init();
            animate();
        }
        if (!locoScroll) {
            initLocomotiveScroll();
        }
    }, 2000);
});
