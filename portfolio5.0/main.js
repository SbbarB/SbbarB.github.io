import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ========================================
// MAIN RECORD PLAYER SCENE
// ========================================

const scene = new THREE.Scene();
const initialBackgroundColor = new THREE.Color(0xf5f7f8); // Light gray
const portfolioBackgroundColor = new THREE.Color(0x000000); // Black for spotlighting
// scene.background = initialBackgroundColor.clone(); // Removed to show body background

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 50000);
camera.position.set(0, 90, 380,);

// Expose THREE.js camera and scene to global scope for wave visualization
window.threeCamera = camera;
window.threeScene = scene;
window.THREE = THREE; // Also expose THREE for vector creation

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.insertBefore(renderer.domElement, document.body.firstChild);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = false;
controls.target.set(0, 40, 0);
controls.minDistance = 10; // Allow very close zoom
controls.maxDistance = 2000; // Allow very far zoom

// Lighting - Brighter for better visibility
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
mainLight.position.set(300, 400, 200);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
mainLight.shadow.camera.left = -300;
mainLight.shadow.camera.right = 300;
mainLight.shadow.camera.top = 300;
mainLight.shadow.camera.bottom = -300;
scene.add(mainLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
fillLight.position.set(-200, 200, -200);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
rimLight.position.set(0, 150, -300);
scene.add(rimLight);

// No spotlights needed - just sequential color reveals
// CACHE BUST v2.0 - Updated component colors to match vinyl records

// Ground removed - no shadow plane needed

// Component tracking with logical grouping
const components = [];
let isExploded = false;
let animationProgress = 0;
let revealMode = false; // Track if using reveal mode (true) or simple explosion (false)
let currentRevealLayer = -1; // Track which layer is currently being revealed
let lastLayerRevealTime = 0; // Track when last layer was revealed
const layerRevealDelay = 300; // 0.3 seconds between all layers (in milliseconds)
let bioStateBeforeExplode = null; // Track bio state before entering explode mode
const revealedLayers = new Set(); // Track which layers have been permanently revealed
const layerLabels = {}; // Store label DOM elements by layer

// Component categorization by name patterns and positions
// Each layer represents a project category with gradient color
const componentCategories = {
    // Layer 0: Case walls and structure (will be made transparent)
    'Cube_TapeRecorder_0': { order: 0, name: 'Case Walls', category: null },
    'Cube006_TapeRecorder_0': { order: 0, name: 'Case Back Wall', category: null },

    // Layer -3: Wearables (Floor - at bottom acrylic case center Y)
    // Will be auto-detected

    // Layer -2: PCBs - Renders (lavender purple)
    // Dynamically added

    // Layer -1: Wires - Renders (lavender purple)
    // Dynamically added

    // Layer 1: Writing (blue)
    'Cylinder007_TapeRecorder_0': { order: 1, name: 'Speaker Grille 1', category: 'Writing' },
    'Cylinder008_TapeRecorder_0': { order: 1, name: 'Right Speaker', category: 'Writing' },
    'Cylinder004_TapeRecorder_0': { order: 1, name: 'Left Speaker', category: 'Writing' },
    'Cube007_TapeRecorder_0': { order: 1, name: 'Hinge Mechanism', category: 'Writing' },
    'Cylinder003_TapeRecorder_0': { order: 1, name: 'Tonearm Pivot', category: 'Writing' },

    // Layer 2-3: Art (purple)
    'Cylinder001_TapeRecorder_0': { order: 2, name: 'Platter Base', category: 'Art' },
    'Cylinder_TapeRecorder_0': { order: 3, name: 'Turntable Platter', category: 'Art' },
    'Cube003_TapeRecorder_0': { order: 2, name: 'Control Mount', category: 'Art' },
    'Cylinder010_TapeRecorder_0': { order: 3, name: 'Speaker Grille 2', category: 'Art' },

    // Layer 4: Creative Technology (purple)
    'Cylinder005_TapeRecorder_0': { order: 4, name: 'Spindle', category: 'Creative Technology' },

    // Layer 5-6: Development (deep dark red)
    'Cube004_TapeRecorder_0': { order: 5, name: 'Control Panel', category: 'Development' },
    'Cube001_TapeRecorder_0': { order: 5, name: 'Control Buttons', category: 'Development' },
    'Cylinder002_TapeRecorder_0': { order: 6, name: 'Tonearm', category: 'Development' },

    // Layer 7: Computational Fabrication - Red Lid (top)
    'Cube005_Glass_0': { order: 7, name: 'Glass Lid', category: 'Computational Fabrication' }
};

// Color gradient mapping: red → red-magenta → lavender → purple → purple-blue → royal blue → blue → light blue → turquoise
// Vibrant gradient from top (layer 7) to bottom (layer -3) - dramatic purple to blue transition
const layerColors = {
    '7': 0xff0000,   // Computational Fabrication - Bright Red (matches vinyl #ff0000)
    '6': 0x660033,   // Development - Deep Dark Bloody Red (matches vinyl #660033)
    '5': 0x660033,   // Development - Deep Dark Bloody Red (matches vinyl #660033)
    '4': 0xcc66ff,   // Creative Technology - Bright Vibrant Lavender Purple (matches vinyl #cc66ff)
    '3': 0x5840ff,   // Art - Purple-Blue (matches vinyl range)
    '2': 0x5840ff,   // Art - Purple-Blue (matches vinyl range)
    '1': 0x003d99,   // Writing - Bright Blue (matches vinyl #0099ff)
    '0.5': 0x0099ff, // Startups - Bright Navy Blue
    '0': 0x87ceeb,   // Case walls - Sky Blue (transparent)
    '-1': 0x64b8e0,  // Renders - Light Blue (matches vinyl #64b8e0)
    '-2': 0x64b8e0,  // Renders - Light Blue (matches vinyl #64b8e0)
    '-3': 0x40e0d0   // Wearables - Turquoise (matches vinyl #40e0d0)
};

// Project categories by layer
const layerCategories = {
    '-3': 'Wearables',  // Floor
    '-2': 'Renders',    // PCBs only
    '0.5': 'Startups',  // Startups wires (between Writing and Renders)
    '1': 'Writing',
    '2': 'Art',
    '3': 'Art',
    '4': 'Creative Technology',
    '5': 'Development',
    '6': 'Development',
    '7': 'Computational Fabrication' // Red Lid
};

// Placeholder project data for each category
const projectsByCategory = {
    'Computational Fabrication': [
        {
            title: '2D Dot Plotter Puzzles',
            description: 'Computational design project exploring 2D dot plotting and puzzle generation using algorithmic methods.',
            pdf: 'computationalFAB/8e61bb6d-a317-4e5c-9176-32c367e9acf6_2D_Dot_Plotter_Puzzles_.pdf',
            vinylColor: '#ff0000',
            vinylGradient: 'radial-gradient(circle, #ff3333 30%, #ff0000 40%, #cc0000 100%)',
            vinylCenter: '#ff6666',
            features: [
                'Algorithmic dot pattern generation',
                '2D plotting techniques',
                'Puzzle design methodology',
                'Computational geometry exploration'
            ]
        },
        {
            title: 'L-Systems & Generative Design',
            description: 'Exploration of L-Systems (Lindenmayer Systems) for generative design patterns using Grasshopper. This project demonstrates recursive growth patterns and their applications in computational fabrication.',
            pdf: 'computationalFAB/L1 — L-Systems_.pdf',
            vinylColor: '#ee1111',
            vinylGradient: 'radial-gradient(circle, #ff4444 30%, #ee1111 40%, #dd0000 100%)',
            vinylCenter: '#ff5555',
            features: [
                'Grasshopper parametric modeling',
                'L-System recursive algorithms',
                'Generative pattern exploration',
                'Organic growth simulation'
            ]
        },
        {
            title: 'L3 — 3D Printing Projects',
            description: 'Advanced 3D printing projects exploring G-code generation and multi-layer fabrication techniques. Includes single-layer and five-layer printing experiments.',
            pdf: 'computationalFAB/L3 — Part One.pdf',
            vinylColor: '#dd2222',
            vinylGradient: 'radial-gradient(circle, #ee3333 30%, #dd2222 40%, #cc1111 100%)',
            vinylCenter: '#ff4444',
            features: [
                'Custom G-code generation',
                'Single-layer printing exploration',
                'Five-layer fabrication techniques',
                'Grasshopper-based toolpath design',
                'Material deposition control'
            ]
        },
        {
            title: 'Parametric Slicer',
            description: 'Development of a custom parametric slicer using Grasshopper for 3D printing. This project explores algorithmic approaches to generating optimized slicing strategies.',
            pdf: 'computationalFAB/L2 — Parametric Slicer.pdf',
            vinylColor: '#cc3333',
            vinylGradient: 'radial-gradient(circle, #dd4444 30%, #cc3333 40%, #bb2222 100%)',
            vinylCenter: '#ee5555',
            features: [
                'Custom slicing algorithms',
                'Grasshopper integration',
                'Parametric control over layer generation',
                'Toolpath optimization',
                'Adaptive printing strategies'
            ]
        },
        {
            title: 'Lasered — Laser Cutting Project',
            description: 'Computational design project utilizing laser cutting fabrication techniques. Explores precision cutting and material manipulation through digital fabrication.',
            pdf: 'computationalFAB/M2 - _Lasered_.pdf',
            vinylColor: '#bb4444',
            vinylGradient: 'radial-gradient(circle, #cc5555 30%, #bb4444 40%, #aa3333 100%)',
            vinylCenter: '#dd6666',
            features: [
                'Laser cutting design',
                'Digital fabrication techniques',
                'Material exploration',
                'Precision assembly methods'
            ]
        },
        {
            title: 'Parametric Furniture',
            description: 'Parametric furniture design using Grasshopper. This project explores computational methods for creating customizable, fabrication-ready furniture designs.',
            pdf: 'computationalFAB/M3 — Parametric Furniture.pdf',
            vinylColor: '#aa5555',
            vinylGradient: 'radial-gradient(circle, #bb6666 30%, #aa5555 40%, #994444 100%)',
            vinylCenter: '#cc7777',
            features: [
                'Grasshopper parametric modeling',
                'Customizable furniture design',
                'Fabrication-ready outputs',
                'Material optimization',
                'Flat-pack assembly design'
            ]
        }
    ],
    'Creative Technology': [
        {
            title: 'Hacking the Apocalypse',
            description: 'Interactive web-based experience exploring survival and hacking in a post-apocalyptic scenario. Combines creative technology with narrative design.',
            team: 'Austin Emfield, Brett Rabbiner, Ryan Venturi',
            pdf: 'Creative Technology/Hacking the Apocalypse.pdf',
            vinylColor: '#cc66ff',
            vinylGradient: 'radial-gradient(circle, #dd88ff 30%, #cc66ff 40%, #bb55ee 100%)',
            vinylCenter: '#ee99ff',
            features: [
                'Interactive web experience',
                'Narrative-driven design',
                'Creative technology integration',
                'Post-apocalyptic theme'
            ]
        },
        {
            title: 'IDC2 Smart Mailbox',
            description: 'IoT-enabled smart mailbox system with real-time notifications and package tracking capabilities. Demonstrates integration of hardware and software for practical applications.',
            team: 'Brett Rabbiner',
            pdf: 'Creative Technology/Copy of IDC2 Documentation.pdf',
            video: 'Creative Technology/idc2_v1 (720p).mp4',
            secondVideo: 'Creative Technology/trimmed.mov',
            vinylColor: '#bb55dd',
            vinylGradient: 'radial-gradient(circle, #cc77ee 30%, #bb55dd 40%, #aa44cc 100%)',
            vinylCenter: '#dd88ff',
            features: [
                'IoT sensor integration',
                'Real-time notifications',
                'Package tracking system',
                'Hardware-software integration',
                'Arduino-based control system'
            ]
        },
        {
            title: 'Water Wheel (Hacking the Apocalypse)',
            description: 'Water wheel power generation system designed for post-apocalyptic scenarios. Features custom alternator and 3D-printed components for modular power generation.',
            team: 'Austin Emfield, Brett Rabbiner, Ryan Venturi',
            pdf: 'Creative Technology/Hacking the Apocalypse (1).pdf',
            vinylColor: '#dd77ff',
            vinylGradient: 'radial-gradient(circle, #ee99ff 30%, #dd77ff 40%, #cc66ee 100%)',
            vinylCenter: '#dd99ff',
            features: [
                '3D printed alternator',
                'Custom copper coil windings',
                'Modular piping integration',
                'Gravity battery compatible',
                'Non-potable water operation',
                'Schottky diode rectifier'
            ]
        }
    ],
    'Development': [
        {
            title: 'Capstone Render',
            description: 'An axial-lithography based volumetric additive manufacturing (VAM) 3D printer representing the next major advancement in additive manufacturing technology. This system uses computed tomography principles to cure photopolymer resin in true 3D space, enabling rapid production of complex geometries without traditional layer-by-layer constraints.',
            team: 'Brett Rabbiner',
            video: 'Development/Capstone Render.mov',
            code: 'Development/VAMmotorMount.3dm',
            code2: 'Development/portfolio3.0.html',
            images: [
                'Development/VAM.jpg',
                'Development/VAM2.jpg',
                'Development/VAM3.jpg'
            ],
            vinylColor: '#770044',
            vinylGradient: 'radial-gradient(circle, #991166 30%, #770044 40%, #550033 100%)',
            vinylCenter: '#bb5588',
            features: [
                'Volumetric additive manufacturing',
                'Axial-lithography technology',
                'True 3D printing without layers',
                'Advanced photopolymer curing',
                'Complex geometry capability',
                'Next-generation manufacturing'
            ]
        },
        {
            title: 'kARt',
            description: '[Description to be added]',
            team: 'Brett Rabbiner',
            pdf: 'Development/kARt.pdf',
            video: 'Development/kARt demo video.MOV',
            vinylColor: '#660033',
            vinylGradient: 'radial-gradient(circle, #882255 30%, #660033 40%, #440022 100%)',
            vinylCenter: '#aa4466'
        },
        {
            title: 'Clueless Closet',
            description: 'An AI-powered virtual wardrobe assistant that helps users organize, style, and plan outfits using computer vision and machine learning. The app provides personalized fashion recommendations and outfit suggestions based on weather, occasion, and personal style preferences.',
            team: 'Brett Rabbiner',
            pdf: 'Development/Clueless Closet.pdf',
            vinylColor: '#550028',
            vinylGradient: 'radial-gradient(circle, #771144 30%, #550028 40%, #330011 100%)',
            vinylCenter: '#993355',
            features: [
                'AI-powered outfit recommendations',
                'Virtual wardrobe organization',
                'Weather-based styling',
                'Machine learning categorization',
                'Personalized fashion insights'
            ]
        },
        {
            title: 'Brute Force Password Hack',
            description: 'An interactive web-based demonstration of brute force password cracking techniques. Educational tool showing password security vulnerabilities and the importance of strong password practices.',
            team: 'Brett Rabbiner',
            video: 'Development/bruteForcePassHack.html/pashacktrimmed.mov',
            vinylColor: '#440022',
            vinylGradient: 'radial-gradient(circle, #661144 30%, #440022 40%, #220011 100%)',
            vinylCenter: '#883366',
            features: [
                'Interactive password cracking simulation',
                'Real-time brute force demonstration',
                'Security education tool',
                'Visual feedback system'
            ]
        },
        {
            title: 'Ferrofluid to Orbital Cloud',
            description: 'An interactive Three.js visualization that morphs between ferrofluid simulations and electron orbital clouds. Features smooth transitions between quantum mechanical states (1s, 2px, 2py, 2pz, 3d orbitals) with continuous rotation and particle dynamics.',
            team: 'Brett Rabbiner',
            webpage: '../portfolio/ferroTOcloud.html',
            vinylColor: '#330011',
            vinylGradient: 'radial-gradient(circle, #551133 30%, #330011 40%, #110000 100%)',
            vinylCenter: '#772244',
            features: [
                'Ferrofluid to orbital morphing',
                'Quantum state visualization',
                'Electron orbital shapes (s, p, d)',
                'Smooth particle transitions',
                'Three.js WebGL rendering'
            ]
        },
        {
            title: 'Portfolio v1.0 - Ferrofluid Balloon',
            description: 'My first interactive portfolio website featuring a dynamic ferrofluid simulation combined with balloon physics. An experimental exploration of web-based physics engines and particle systems.',
            team: 'Brett Rabbiner',
            webpage: '../portfolio/THISferro-balloon-combined.html',
            vinylColor: '#220011',
            vinylGradient: 'radial-gradient(circle, #440022 30%, #220011 40%, #000000 100%)',
            vinylCenter: '#661133',
            features: [
                'Interactive ferrofluid simulation',
                'Real-time particle physics',
                'Balloon animation system',
                'Experimental UI design'
            ]
        },
        {
            title: 'Portfolio v4.0 - 3D Cabin',
            description: 'Fourth iteration featuring a 3D cabin model with interactive elements. Explores Three.js capabilities and 3D web rendering techniques.',
            team: 'Brett Rabbiner',
            webpage: '../portfolio4.0/index.html',
            vinylColor: '#110000',
            vinylGradient: 'radial-gradient(circle, #220011 30%, #110000 40%, #000000 100%)',
            vinylCenter: '#441122',
            features: [
                '3D cabin model',
                'Three.js integration',
                'Interactive 3D navigation',
                'Custom WebGL effects'
            ]
        },
        {
            title: 'Bohr Atom Animation',
            description: 'An interactive visualization of the Bohr atomic model with animated electron orbits. Features dynamic particle systems and orbital mechanics to demonstrate quantum physics concepts.',
            team: 'Brett Rabbiner',
            webpage: '../portfolio/bohrAnimation.html',
            vinylColor: '#0a0000',
            vinylGradient: 'radial-gradient(circle, #110000 30%, #0a0000 40%, #000000 100%)',
            vinylCenter: '#220000',
            features: [
                'Animated electron orbits',
                'Quantum physics visualization',
                'Interactive particle system',
                'Educational science tool'
            ]
        },
        {
            title: 'Black Hole Simulation',
            description: 'A mesmerizing black hole simulation with gravitational lensing effects and particle dynamics. Explores astrophysics concepts through interactive web visualization.',
            team: 'Brett Rabbiner',
            webpage: '../portfolio/blackhole.html',
            vinylColor: '#050000',
            vinylGradient: 'radial-gradient(circle, #0a0000 30%, #050000 40%, #000000 100%)',
            vinylCenter: '#110000',
            features: [
                'Gravitational lensing effects',
                'Real-time particle dynamics',
                'Astrophysics simulation',
                'WebGL rendering'
            ]
        },
        {
            title: 'Example Basic Portfolios',
            description: 'A collection of early portfolio website experiments exploring different layouts, animations, and interactive elements. These examples showcase various approaches to web design and front-end development techniques.',
            team: 'Brett Rabbiner',
            webpages: [
                { title: 'Portfolio Design 1', url: '../portfolio/website.html' },
                { title: 'Portfolio Design 2', url: '../portfolio/SecondWebsite.html' },
                { title: 'Portfolio Design 3', url: '../portfolio/maybe3.html' }
            ],
            vinylColor: '#020000',
            vinylGradient: 'radial-gradient(circle, #050000 30%, #020000 40%, #000000 100%)',
            vinylCenter: '#0a0000',
            features: [
                'Multiple design approaches',
                'Layout experimentation',
                'Interactive animations',
                'Front-end techniques'
            ]
        },
        {
            title: 'Portfolio v2.0 - Physics Simulation',
            description: 'Second iteration of my portfolio with enhanced physics simulations and periodic table visualization. Features improved performance and interactive elements.',
            team: 'Brett Rabbiner',
            webpage: '../portfolio2.0/index-enhanced.html',
            vinylColor: '#000000',
            vinylGradient: 'radial-gradient(circle, #000000 30%, #000000 40%, #000000 100%)',
            vinylCenter: '#000000',
            features: [
                'Advanced physics engine',
                'Interactive periodic table',
                'Enhanced performance',
                'Responsive design'
            ]
        }
    ],
    'Startups': [
    ],
    'Art': [
        {
            title: 'Artistic Mosaic Generator',
            description: 'A Python-based algorithmic art tool that transforms images into stunning mosaics using computational techniques. Creates unique artistic interpretations through pixel manipulation and color theory.',
            team: 'Brett Rabbiner',
            code: 'Art/artistic_mosaic_generator.py',
            images: [
                'Art/mosaic_basic_vibrant.png',
                'Art/mosaic_circular_rainbow.png',
                'Art/mosaic_hexagonal_pastel.png',
                'Art/mosaic_pixelated.png',
                'Art/mosaic_gradient_mono.png'
            ],
            vinylColor: '#8866ff',
            vinylGradient: 'radial-gradient(circle, #a088ff 30%, #8866ff 40%, #7055dd 100%)',
            vinylCenter: '#b099ff',
            features: [
                'Algorithmic image processing',
                'Custom mosaic patterns',
                'Color palette manipulation',
                'Python-based art generation'
            ]
        },
        { title: 'Cardboard Flyer', description: '[Description to be added]', team: 'Brett Rabbiner', image: 'Art/IMG_8248.jpeg', vinylColor: '#6951ff', vinylGradient: 'radial-gradient(circle, #8169ff 30%, #6951ff 40%, #563fdd 100%)', vinylCenter: '#9179ff' },
        { title: 'Water Coloring Carrots', description: '[Description to be added]', team: 'Brett Rabbiner', image: 'Art/IMG_9165.jpeg', vinylColor: '#8a77ff', vinylGradient: 'radial-gradient(circle, #a28eff 30%, #8a77ff 40%, #7766dd 100%)', vinylCenter: '#b39fff' },
        { title: 'Beach Games', description: '[Description to be added]', team: 'Brett Rabbiner', image: 'Art/IMG_6496.jpeg', vinylColor: '#4829ff', vinylGradient: 'radial-gradient(circle, #603dff 30%, #4829ff 40%, #3818cc 100%)', vinylCenter: '#7855ff' },
        { title: 'Timcaso', description: '[Description to be added]', team: 'Brett Rabbiner', image: 'Art/IMG_7949.jpeg', vinylColor: '#6248ff', vinylGradient: 'radial-gradient(circle, #7a5fff 30%, #6248ff 40%, #4f36cc 100%)', vinylCenter: '#8a70ff' },
        { title: 'Cork Kart', description: '[Description to be added]', team: 'Brett Rabbiner', image: 'Art/IMG_5115.jpeg', vinylColor: '#3d1fff', vinylGradient: 'radial-gradient(circle, #5533ff 30%, #3d1fff 40%, #2a0dcc 100%)', vinylCenter: '#6644ff' },
        { title: 'Clay Depposition', description: '[Description to be added]', team: 'Brett Rabbiner', image: 'Art/IMG_5148.jpeg', vinylColor: '#5533ff', vinylGradient: 'radial-gradient(circle, #6d4aff 30%, #5533ff 40%, #4422dd 100%)', vinylCenter: '#7755ff' },
        { title: 'Some Light ReCycling', description: '[Description to be added]', team: 'Brett Rabbiner', image: 'Art/IMG_5154.jpeg', vinylColor: '#7055ff', vinylGradient: 'radial-gradient(circle, #8866ff 30%, #7055ff 40%, #5d44dd 100%)', vinylCenter: '#9977ff' },
        { title: 'Tour de Aldente', description: '[Description to be added]', team: 'Brett Rabbiner', image: 'Art/IMG_7958.jpeg', vinylColor: '#331aff', vinylGradient: 'radial-gradient(circle, #4b33ff 30%, #331aff 40%, #2208cc 100%)', vinylCenter: '#5c44ff' },
        { title: 'Chaquetita', description: '[Description to be added]', team: 'Brett Rabbiner', image: 'Art/IMG_7962.jpeg', vinylColor: '#7d66ff', vinylGradient: 'radial-gradient(circle, #9580ff 30%, #7d66ff 40%, #6a55dd 100%)', vinylCenter: '#a688ff' },
        { title: 'Unplug', description: '[Description to be added]', team: 'Brett Rabbiner', image: 'Art/IMG_8178.jpeg', vinylColor: '#442bff', vinylGradient: 'radial-gradient(circle, #5c40ff 30%, #442bff 40%, #331acc 100%)', vinylCenter: '#7459ff' },
        { title: 'Skatching Zzzs', description: '[Description to be added]', team: 'Brett Rabbiner', image: 'Art/IMG_9156.jpeg', vinylColor: '#5840ff', vinylGradient: 'radial-gradient(circle, #7058ff 30%, #5840ff 40%, #452edd 100%)', vinylCenter: '#8068ff' },
    ],
    'Writing': [
        {
            title: 'NeuroDesign Final Report',
            description: 'A comprehensive research paper exploring the intersection of neuroscience and design principles, examining how neurological insights can inform and enhance design processes and outcomes.',
            team: 'Brett Rabbiner, Nick McConnell — May 1, 2025',
            vinylColor: '#003d99',
            vinylGradient: 'radial-gradient(circle, #0052cc 30%, #003d99 40%, #002d77 100%)',
            vinylCenter: '#0066ff',
            pdf: 'Writing/NeuroDesign Final Report (1).pdf',
            features: [
                'Co-authored by Brett Rabbiner and Nick McConnell',
                'Neuroscience and design integration',
                'Research-based analysis',
                'Design methodology exploration',
                'Cognitive design principles'
            ]
        },
        {
            title: 'Balancing Around the Bends',
            description: 'A creative writing piece exploring balance and movement through narrative.',
            vinylColor: '#0047b3',
            vinylGradient: 'radial-gradient(circle, #0059e6 30%, #0047b3 40%, #003580 100%)',
            vinylCenter: '#0070ff',
            pdf: 'Writing/Balancing Around the Bends.pdf',
            features: [
                'Creative narrative',
                'Metaphorical exploration',
                'Dynamic storytelling',
                'Visual writing'
            ]
        },
        {
            title: 'Who Is Your Perspective Pointed At?',
            description: 'An exploration of perspective, perception, and point of view in creative writing.',
            vinylColor: '#005299',
            vinylGradient: 'radial-gradient(circle, #0066cc 30%, #005299 40%, #004080 100%)',
            vinylCenter: '#0077dd',
            pdf: 'Writing/Who Is Your Perspective Pointed At_.pdf',
            features: [
                'Perspective analysis',
                'Point of view exploration',
                'Narrative techniques',
                'Reader engagement'
            ]
        }
    ],
    'Renders': [
        {
            title: 'Br\'er Ads',
            description: '[Description to be added]',
            team: 'Brett Rabbiner',
            images: ['Renders/Br\'er Ads/BCO.0bd817bf-3ecd-44a4-902a-9708d6bf7d38.png', 'Renders/Br\'er Ads/BCO.2904836c-5bd0-4553-8a04-b12813008045.png', 'Renders/Br\'er Ads/BCO.7ae0185a-bca7-4d25-ae8b-75367da34025.png', 'Renders/Br\'er Ads/BCO.846f0950-681c-4963-b029-6c16de0124b7.png', 'Renders/Br\'er Ads/BCO.9c78b9f6-d7f7-4681-a9c4-4dd71ac3ee07.png'],
            vinylColor: '#3a94c8',
            vinylGradient: 'radial-gradient(circle, #51a4d2 30%, #3a94c8 40%, #2680b5 100%)',
            vinylCenter: '#68b4dc'
        },
        {
            title: 'Br\'er Logos',
            description: '[Description to be added]',
            team: 'Brett Rabbiner',
            images: ['Renders/Br\'er Logos/BCO.a12a8ffd-da29-43fe-9f0a-fdba97a8a79e.png', 'Renders/Br\'er Logos/BCO.aa6d3d8c-b63d-492c-84d5-c549347dcb67.png'],
            vinylColor: '#4ea8d8',
            vinylGradient: 'radial-gradient(circle, #65b8e2 30%, #4ea8d8 40%, #3a94c5 100%)',
            vinylCenter: '#7cc8ea'
        },
        {
            title: 'Br\'er Prototypes',
            description: '[Description to be added]',
            team: 'Brett Rabbiner',
            images: ['Renders/Br\'er Prototypes/BCO.6904e923-e251-4e4a-a0dc-ca70eea43c40.png', 'Renders/Br\'er Prototypes/BCO.e0bfe833-cb86-427f-9ee3-066730b5766f.png', 'Renders/Br\'er Prototypes/Br\'erRender1.1.jpg', 'Renders/Br\'er Prototypes/Br\'erRender1.2.jpg', 'Renders/Br\'er Prototypes/Br\'erRender1.5.jpg', 'Renders/Br\'er Prototypes/PNG image.png', 'Renders/Br\'er Prototypes/uuid=14DDE15E-C58C-499E-AF97-04AF3BE080DF&code=001&library=1&type=1&mode=2&loc=true&cap=true.jpeg', 'Renders/Br\'er Prototypes/uuid=5135A710-5048-445C-B19A-86410C2929FA&code=001&library=1&type=1&mode=2&loc=true&cap=true.jpeg', 'Renders/Br\'er Prototypes/uuid=7E3C624A-E416-4BE2-AF4D-117EBD1D129D&code=001&library=1&type=1&mode=2&loc=true&cap=true.jpeg', 'Renders/Br\'er Prototypes/uuid=9C3D1068-59CB-40D6-9B70-E48F276A7EEB&code=001&library=1&type=1&mode=2&loc=true&cap=true.jpeg'],
            vinylColor: '#64b8e0',
            vinylGradient: 'radial-gradient(circle, #7bc8ea 30%, #64b8e0 40%, #50a4cd 100%)',
            vinylCenter: '#92d8f2'
        },
        {
            title: 'Moment (Captr) Ads',
            description: '[Description to be added]',
            team: 'Brett Rabbiner',
            images: ['Renders/Moment (Captr) Ads/BCO.16aed04d-ec22-4d00-a223-0cc2d313e337.png', 'Renders/Moment (Captr) Ads/BCO.f2d90772-cc6a-42ce-b571-56cd744462ef.png', 'Renders/Moment (Captr) Ads/C4B99527-CF00-421B-93E7-C30CA340A506.png', 'Renders/Moment (Captr) Ads/download.jpg'],
            vinylColor: '#78c5e8',
            vinylGradient: 'radial-gradient(circle, #8fd5f2 30%, #78c5e8 40%, #64b0d5 100%)',
            vinylCenter: '#a0e0f5'
        },
        {
            title: 'Moment Captr Device',
            description: '[Description to be added]',
            team: 'Brett Rabbiner',
            images: ['Renders/Moment Captr Device/2B081639-C6F9-46E9-AC0C-7C1A63818226.png', 'Renders/Moment Captr Device/BCO.4b86a8b4-b868-4812-9795-a4af945feef7.png', 'Renders/Moment Captr Device/BCO.7882c717-2bfe-4c75-9acb-e74f865c0de7.png', 'Renders/Moment Captr Device/BCO.d74aadfc-362a-435f-9659-3fb58f964644.png'],
            vinylColor: '#92d8f5',
            vinylGradient: 'radial-gradient(circle, #a9e5ff 30%, #92d8f5 40%, #7ec8e0 100%)',
            vinylCenter: '#b8eaff'
        }
    ],
    'Startups': [
        {
            title: 'Br\'er',
            description: 'A revolutionary startup focused on innovative solutions. Explore our investor deck and pitch slides to learn more about our vision and business strategy.',
            team: 'Brett Rabbiner (CEO/CTO), Reagan Stiteler (CFO), Nitin Addanki (CSO/COO), Kiara Blacher (CMO)',
            video: 'Startups/Br\'er Pitch.mov',
            pdf: 'Startups/BR\'ER INVESTOR DECK.pdf',
            pdf2: 'Startups/BR\'ER FINAL INVESTOR PITCH SLIDES.pdf',
            vinylColor: '#0077cc',
            vinylGradient: 'radial-gradient(circle, #1188dd 30%, #0077cc 40%, #0066bb 100%)',
            vinylCenter: '#2299ee',
            features: [
                'Pitch Video',
                'Investor Deck PDF',
                'Final Pitch Slides PDF',
                'Business strategy documentation',
                'Vision and roadmap'
            ]
        },
        {
            title: 'PillPal',
            description: 'An innovative medication management solution designed to improve healthcare outcomes and patient adherence.',
            team: 'Brett Rabbiner',
            video: 'Startups/pillpal_final_video_v1 (720p).mp4',
            vinylColor: '#0099ff',
            vinylGradient: 'radial-gradient(circle, #22aaff 30%, #0099ff 40%, #0077dd 100%)',
            vinylCenter: '#44bbff',
            features: [
                'Smart medication tracking',
                'User-friendly interface',
                'Healthcare integration',
                'Adherence monitoring'
            ]
        }
    ],
    'Wearables': [
        {
            title: 'Soft Button: Firefly Glove',
            description: 'We chose black, wool gloves because they were easy to sew by hand, and because our idea was centered around the hand. The flexible nature of the material, coupled with our attempt to avoid rigid components in constantly flexed areas, allowed us to integrate our circuitry by simply sewing everything in its proper place on the glove.',
            video: 'wearables/soft-button.mov',
            pdf: 'wearables/soft-button.pdf',
            vinylColor: '#40e0d0',
            vinylGradient: 'radial-gradient(circle, #5fead5 30%, #40e0d0 40%, #30c8b8 100%)',
            vinylCenter: '#70f0e0',
            features: [
                '1 Wool Glove',
                'Wire',
                '1 220 Ω Resistor',
                '2 Zinc Alloy Buttons',
                '1 LED',
                'Black Cotton Thread',
                '1 Needle'
            ]
        },
        {
            title: 'Wearable Focus Clapper',
            description: 'Most movies today still use clappers. But on indie production sets, its use can be a hassle, since there aren\'t dedicated focus pullers and production assistants. This device allows the focus puller to have the clapper on their person at all times, along with the focus wheel, seamlessly integrating the two jobs into one handy device that you can\'t misplace. This could help increase production efficiency, and standard use of the clapper on indie production sets.',
            pdf: 'wearables/focus-clapper.pdf',
            vinylColor: '#48d8cc',
            vinylGradient: 'radial-gradient(circle, #60e5d8 30%, #48d8cc 40%, #38c0b4 100%)',
            vinylCenter: '#70f0e0',
            features: [
                'Laser-cut acrylic clapper with pre-cut holes for cleaner design',
                'Butt hinge made from laser-cut pieces for the "clap"',
                'Foam piece the length of a forearm for comfort',
                '3D printed handle and battery holder',
                'Built-in stand for phone',
                'Dual potentiometers for focus and iris control (scrolls 1-99)',
                '7-segment LED display for scene/take numbers',
                'Rechargeable power bank (5 volts with 2.4 amps)',
                'Arduino microcontroller with filtered potentiometer data'
            ]
        },
        {
            title: 'Thermohelm',
            description: 'Our idea started with creating some sort of monitor that senses temperature to know if someone is overheating or reaching the threshold of a heat stroke. The most practical use case we came up with was for construction workers and manual labourers. We decided to use a construction helmet to create a built-in temperature detecting system that can alert construction workers through an LED and a Buzzer as two sensory indicators.',
            video: 'wearables/thermohelm.mov',
            pdf: 'wearables/thermohelm.pdf',
            vinylColor: '#38d0c4',
            vinylGradient: 'radial-gradient(circle, #55ddd0 30%, #38d0c4 40%, #28b8ac 100%)',
            vinylCenter: '#68e8dc',
            features: [
                '2 10K Thermistors to detect around 2 specific areas of the head (vertex and back)',
                'Arduino Nano 33 IOT microcontroller',
                'Steinhart-Hart Equation for empirical relationship between temperature and resistance',
                '105°F+ threshold alert system (105-115°F overheating, 115-125°F extreme danger)',
                'LED and Buzzer as sensory indicators',
                '9-Volt battery (heat resistant, durable for construction environments)',
                '3D printed enclosures for power supply and circuit board',
                'Construction helmet integration (adjustable size 53-64 cm or 6 ⅝ - 8 head size)',
                'Power consumption: 131 mA/hrs @ 5V'
            ]
        },
        {
            title: 'Posture Detector',
            description: 'Our Posture Detector analyzes accelerometer data from our tinyCore MCU in order to detect changes in lower-neck/upper-spinal position. In order to detect bad posture, the user sets the state of the device in accordance with their respective "good posture" after clipping the device to their back-side, shirt collar. Thereafter, utilizing a Kalman Filter to optimize our data, the MCU can detect a deviation from the set state, initializing a buzzer to inform the user they are slouching, gently encouraging them to fix it.',
            pdf: 'wearables/posture-detector.pdf',
            vinylColor: '#50e8d8',
            vinylGradient: 'radial-gradient(circle, #68f0e0 30%, #50e8d8 40%, #40d0c0 100%)',
            vinylCenter: '#80f5e8',
            features: [
                'tinyCore MCU with integrated accelerometer',
                'Kalman Filter (parameters: 0, 1.5, 0.08) optimizes sensor data for accuracy',
                'PLA 3D-printed housing with clip for shirt collar attachment',
                'Buzzer alert system',
                'Button (long press for on/off, quick press to set "good posture" state)',
                'Internal battery pack',
                'User clips device to shirt collar (back-side)',
                'Detects bad posture by comparing current position to user-set good posture state',
                'Device housed in simple PLA case with built-in space for components'
            ]
        },
        {
            title: 'Turbo Skates',
            description: 'Transportation by and large is a space of innovation, constantly changing to become faster, cheaper, and more efficient. These were the main goals of the Turbo Skates, with the addition, or rather, the added emphasis of safety and stowability. The goal was to take a mundane, one to seven mile commute and turn it into an enjoyable, speedy adventure.',
            pdf: 'wearables/electric-skates-report.pdf',
            vinylColor: '#30c8bc',
            vinylGradient: 'radial-gradient(circle, #48d8cc 30%, #30c8bc 40%, #20b0a4 100%)',
            vinylCenter: '#60e0d4',
            features: [
                '24V 100W DC Motor',
                'Arduino Uno x 2',
                'Belt Drive and Gears',
                'Samsung 18650 Batteries x 6',
                'nRF24 Radio x 2',
                'L298N Motor Controller',
                'Derby Skates (motorized)',
                'Total Cost: $253.44',
                'Goal: Make transportation more fun and fast without compromising safety'
            ]
        }
    ]
};

// Track project vinyl state
let projectVinyl = null;
let vinylRotation = 0;
let isLoadingProject = false;
let loadingProgress = 0;
let loadingStartTime = 0;
let currentProjectUrl = null; // Store the URL to navigate to
let currentProject = null; // Store current project data
let vinylDescentProgress = 0; // Track vinyl descending onto platter
let lidClosingProgress = 0; // Track lid closing
let vinylTargetY = 52; // Target Y position for vinyl (will be calculated based on platter)
let vinylTargetX = 0; // Target X position
let vinylTargetZ = 0; // Target Z position
const vinylDescentDuration = 1500; // 1.5 seconds for vinyl to descend
const lidCloseDuration = 1000; // 1 second for lid to close
const vinylSpinDuration = 2000; // 2 seconds to spin before loading

// Helper function to create a 3D vinyl record
function createVinylRecord(color = 0x1a1a1a, centerColor = 0xcd7f32) {
    const vinylGroup = new THREE.Group();

    // Main vinyl disc (black record)
    const discGeometry = new THREE.CylinderGeometry(25, 25, 1, 64);
    const discMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7,
        metalness: 0.1
    });
    const disc = new THREE.Mesh(discGeometry, discMaterial);
    disc.castShadow = true;
    disc.receiveShadow = true;
    vinylGroup.add(disc);

    // Center label (custom color)
    const labelGeometry = new THREE.CylinderGeometry(8, 8, 1.2, 32);
    const labelMaterial = new THREE.MeshStandardMaterial({
        color: centerColor,
        roughness: 0.3,
        metalness: 0.6
    });
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.y = 0.6;
    vinylGroup.add(label);

    // Center hole
    const holeGeometry = new THREE.CylinderGeometry(2, 2, 2, 16);
    const holeMaterial = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        roughness: 0.9,
        metalness: 0.1
    });
    const hole = new THREE.Mesh(holeGeometry, holeMaterial);
    vinylGroup.add(hole);

    // Add grooves for realism (rings on the disc)
    for (let i = 0; i < 12; i++) {
        const radius = 10 + i * 1.2;
        const grooveGeometry = new THREE.TorusGeometry(radius, 0.05, 8, 64);
        const grooveMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a0a0a,
            roughness: 0.9,
            metalness: 0.05
        });
        const groove = new THREE.Mesh(grooveGeometry, grooveMaterial);
        groove.rotation.x = Math.PI / 2;
        groove.position.y = 0.5;
        vinylGroup.add(groove);
    }

    return vinylGroup;
}

// Helper function to create detailed PCB with realistic components
function createDetailedPCB(width, depth, componentsConfig) {
    const pcbGroup = new THREE.Group();

    // Realistic purple PCB base with fiberglass texture
    const pcbBase = new THREE.Mesh(
        new THREE.BoxGeometry(width, 2, depth),
        new THREE.MeshStandardMaterial({
            color: 0x6b2d8a, // Darker, more realistic PCB purple
            roughness: 0.8,
            metalness: 0.1,
            envMapIntensity: 0.3
        })
    );
    pcbBase.castShadow = true;
    pcbBase.receiveShadow = true;
    pcbGroup.add(pcbBase);

    // Helper function to create a trace between two points
    function createTrace(x1, z1, x2, z2) {
        const length = Math.sqrt((x2-x1)**2 + (z2-z1)**2);
        const angle = Math.atan2(z2-z1, x2-x1);
        const trace = new THREE.Mesh(
            new THREE.BoxGeometry(length, 0.15, 0.4),
            new THREE.MeshStandardMaterial({
                color: 0xcd7f32, // Realistic copper color
                roughness: 0.2,
                metalness: 0.95,
                emissive: 0x442200,
                emissiveIntensity: 0.1
            })
        );
        trace.position.set((x1+x2)/2, 1.1, (z1+z2)/2);
        trace.rotation.y = angle;
        pcbGroup.add(trace);
    }

    // Helper function to add solder pad at component location
    function addPad(x, z) {
        const pad = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.5, 0.2, 8),
            new THREE.MeshStandardMaterial({
                color: 0xe8e8e8, // Bright solder tin color
                roughness: 0.15,
                metalness: 0.98,
                emissive: 0x444444,
                emissiveIntensity: 0.05
            })
        );
        pad.position.set(x, 1.1, z);
        pcbGroup.add(pad);
    }

    // Add components on top of PCB
    componentsConfig.forEach(config => {
        let component;

        if (config.type === 'cylinder') {
            // Cylindrical components (capacitors, potentiometers)
            component = new THREE.Mesh(
                new THREE.CylinderGeometry(config.r || config.w/2, config.r || config.w/2, config.h, 16),
                new THREE.MeshStandardMaterial({
                    color: config.color,
                    roughness: config.roughness || 0.5,
                    metalness: config.metalness || 0.2,
                    envMapIntensity: 0.4
                })
            );
            component.position.set(config.x, 1 + config.h / 2, config.z);
        } else if (config.type === 'heatsink') {
            // Heatsink with fins - highly metallic aluminum
            const heatsinkGroup = new THREE.Group();
            const base = new THREE.Mesh(
                new THREE.BoxGeometry(config.w, config.h * 0.3, config.d),
                new THREE.MeshStandardMaterial({
                    color: config.color,
                    roughness: 0.15,
                    metalness: 0.95,
                    envMapIntensity: 0.8
                })
            );
            heatsinkGroup.add(base);

            // Add fins
            for (let i = 0; i < 8; i++) {
                const fin = new THREE.Mesh(
                    new THREE.BoxGeometry(config.w, config.h * 0.7, 0.3),
                    new THREE.MeshStandardMaterial({
                        color: config.color,
                        roughness: 0.15,
                        metalness: 0.95,
                        envMapIntensity: 0.8
                    })
                );
                fin.position.set(0, config.h * 0.35, (i - 3.5) * (config.d / 8));
                heatsinkGroup.add(fin);
            }

            component = heatsinkGroup;
            component.position.set(config.x, 1, config.z);
        } else if (config.type === 'ic') {
            // IC chip with pins - matte plastic body
            const icGroup = new THREE.Group();
            const body = new THREE.Mesh(
                new THREE.BoxGeometry(config.w, config.h, config.d),
                new THREE.MeshStandardMaterial({
                    color: config.color,
                    roughness: 0.85,
                    metalness: 0.05,
                    envMapIntensity: 0.1
                })
            );
            icGroup.add(body);

            // Add pins - shiny metal
            for (let i = 0; i < 8; i++) {
                const pin = new THREE.Mesh(
                    new THREE.BoxGeometry(0.3, 0.5, 0.2),
                    new THREE.MeshStandardMaterial({
                        color: 0xd0d0d0,
                        roughness: 0.1,
                        metalness: 0.98,
                        envMapIntensity: 0.7
                    })
                );
                pin.position.set((i - 3.5) * (config.w / 8), -config.h/2 - 0.25, config.d/2 + 0.1);
                icGroup.add(pin);
            }

            component = icGroup;
            component.position.set(config.x, 1 + config.h / 2, config.z);
        } else if (config.type === 'resistor') {
            // Resistor (small cylinder) - ceramic/carbon film
            component = new THREE.Mesh(
                new THREE.CylinderGeometry(config.r || 0.4, config.r || 0.4, config.h, 8),
                new THREE.MeshStandardMaterial({
                    color: config.color,
                    roughness: 0.75,
                    metalness: 0.05,
                    envMapIntensity: 0.2
                })
            );
            component.position.set(config.x, 1 + config.h / 2, config.z);
            component.rotation.z = Math.PI / 2;
        } else if (config.type === 'led') {
            // LED (rounded top) - translucent with glow
            const ledGeo = new THREE.CylinderGeometry(0, config.r || 0.5, config.h, 8);
            component = new THREE.Mesh(
                ledGeo,
                new THREE.MeshStandardMaterial({
                    color: config.color,
                    roughness: 0.2,
                    metalness: 0.0,
                    transparent: true,
                    opacity: 0.8,
                    emissive: config.color,
                    emissiveIntensity: 0.7
                })
            );
            component.position.set(config.x, 1 + config.h / 2, config.z);
        } else {
            // Default box component (connectors, etc.)
            component = new THREE.Mesh(
                new THREE.BoxGeometry(config.w, config.h, config.d),
                new THREE.MeshStandardMaterial({
                    color: config.color,
                    roughness: config.roughness || 0.6,
                    metalness: config.metalness || 0.3,
                    envMapIntensity: 0.3
                })
            );
            component.position.set(config.x, 1 + config.h / 2, config.z);
        }

        component.castShadow = true;
        pcbGroup.add(component);

        // Add solder pads at component locations
        if (config.type === 'ic') {
            // IC has pins on both sides
            for (let i = 0; i < 4; i++) {
                addPad(config.x + (i - 1.5) * 2, config.z + config.d/2 + 1);
                addPad(config.x + (i - 1.5) * 2, config.z - config.d/2 - 1);
            }
        } else if (config.type === 'resistor' || config.type === 'led') {
            // Two-terminal components
            addPad(config.x - config.h/2 - 1, config.z);
            addPad(config.x + config.h/2 + 1, config.z);
        } else if (config.type === 'cylinder') {
            // Capacitors have two pads
            addPad(config.x - 1, config.z);
            addPad(config.x + 1, config.z);
        } else {
            // Default: single pad at component location
            addPad(config.x, config.z);
        }
    });

    // Create realistic circuit traces connecting components
    // Power rails (horizontal lines running along edges)
    createTrace(-width/2 + 5, -depth/2 + 3, width/2 - 5, -depth/2 + 3); // Ground rail
    createTrace(-width/2 + 5, depth/2 - 3, width/2 - 5, depth/2 - 3); // VCC rail

    // Build a map of components by type for intelligent routing
    const ics = componentsConfig.filter(c => c.type === 'ic');
    const capacitors = componentsConfig.filter(c => c.type === 'cylinder');
    const resistors = componentsConfig.filter(c => c.type === 'resistor');
    const heatsinks = componentsConfig.filter(c => c.type === 'heatsink');
    const connectors = componentsConfig.filter(c => c.type === 'box' && (c.color === 0xe8e8e8 || c.color === 0xffffff || c.color === 0x0033aa));

    // Connect power supply: connectors → capacitors → ICs
    connectors.forEach((connector, i) => {
        // Connect connector to nearest capacitor
        if (i < capacitors.length) {
            const cap = capacitors[i];
            createTrace(connector.x, connector.z, cap.x, cap.z);

            // Connect capacitor to ground rail
            createTrace(cap.x, cap.z, cap.x, -depth/2 + 3);
        }
    });

    // Connect ICs to nearby capacitors (decoupling)
    ics.forEach(ic => {
        // Find closest capacitor for decoupling
        let closest = null;
        let minDist = Infinity;
        capacitors.forEach(cap => {
            const dist = Math.sqrt((ic.x - cap.x)**2 + (ic.z - cap.z)**2);
            if (dist < minDist) {
                minDist = dist;
                closest = cap;
            }
        });

        if (closest && minDist < 35) {
            // Route via intermediate point for L-shaped trace
            const midX = ic.x;
            const midZ = closest.z;
            createTrace(ic.x, ic.z, midX, midZ);
            createTrace(midX, midZ, closest.x, closest.z);
        }

        // Connect IC to power rail
        createTrace(ic.x, ic.z, ic.x, depth/2 - 3);

        // Connect IC to ground via nearby resistor if available
        const nearbyResistor = resistors.find(r =>
            Math.abs(r.x - ic.x) < 15 && Math.abs(r.z - ic.z) < 15
        );
        if (nearbyResistor) {
            createTrace(ic.x, ic.z - ic.d/2, nearbyResistor.x, nearbyResistor.z);
            createTrace(nearbyResistor.x, nearbyResistor.z, nearbyResistor.x, -depth/2 + 3);
        }
    });

    // Connect heatsinks to power output
    heatsinks.forEach((hs, i) => {
        // Connect to power rail
        createTrace(hs.x, hs.z, hs.x + 5, hs.z + 5);
        createTrace(hs.x + 5, hs.z + 5, hs.x + 5, depth/2 - 3);

        // Connect heatsinks to each other (series connection)
        if (i < heatsinks.length - 1) {
            const next = heatsinks[i + 1];
            createTrace(hs.x, hs.z, next.x, next.z);
        }
    });

    // Connect signal path: input connectors → ICs → output connectors
    if (ics.length >= 2 && connectors.length >= 2) {
        // Input connector → IC1
        createTrace(connectors[0].x, connectors[0].z, ics[0].x, ics[0].z);

        // IC1 → IC2 (signal path)
        if (ics.length > 1) {
            const midX = (ics[0].x + ics[1].x) / 2;
            createTrace(ics[0].x, ics[0].z, midX, ics[0].z);
            createTrace(midX, ics[0].z, midX, ics[1].z);
            createTrace(midX, ics[1].z, ics[1].x, ics[1].z);
        }

        // IC → output connector
        const lastIC = ics[ics.length - 1];
        const outputConnector = connectors[connectors.length - 1];
        createTrace(lastIC.x, lastIC.z, outputConnector.x, outputConnector.z);
    }

    // Connect remaining resistors to nearby components
    resistors.forEach(res => {
        // Connect resistor to nearest ground
        createTrace(res.x, res.z, res.x, -depth/2 + 3);
    });

    return pcbGroup;
}

// Helper function to create curved wire with realistic physics
function createWire(start, end, color, radius = 0.8) {
    // Minimum Y constraint - wires must stay above PCB surface
    const minWireY = 7; // pcbSurfaceY value

    // Calculate control points for realistic wire sagging
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    // Add gravity sag - wires droop in the middle
    const horizontalDist = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.z - start.z, 2)
    );
    const sagAmount = Math.min(horizontalDist * 0.15, 15); // Sag proportional to length
    // CONSTRAIN: Don't let sag go below PCB surface
    midPoint.y = Math.max(minWireY, midPoint.y - sagAmount);

    // Add slight horizontal offset for natural routing
    const perpendicular = new THREE.Vector3(
        -(end.z - start.z),
        0,
        (end.x - start.x)
    ).normalize();

    // Offset slightly to avoid clipping through model
    const offset1 = perpendicular.clone().multiplyScalar(8);
    const offset2 = perpendicular.clone().multiplyScalar(-8);

    // Create intermediate control points with Y constraint
    const controlPoint1 = start.clone().add(offset1).lerp(midPoint, 0.3);
    controlPoint1.y = Math.max(minWireY, controlPoint1.y);

    const controlPoint2 = end.clone().add(offset2).lerp(midPoint, 0.3);
    controlPoint2.y = Math.max(minWireY, controlPoint2.y);

    // Create curve with multiple control points
    const curve = new THREE.CatmullRomCurve3([
        start.clone(),
        controlPoint1,
        midPoint.clone(),
        controlPoint2,
        end.clone()
    ]);

    // Create tube geometry along curve
    const tubeGeometry = new THREE.TubeGeometry(curve, 32, radius, 8, false);
    const wireMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.6,
        metalness: 0.2
    });

    const wire = new THREE.Mesh(tubeGeometry, wireMaterial);
    wire.castShadow = true;
    wire.receiveShadow = true;

    return wire;
}

// Load GLB model
const loader = new GLTFLoader();
loader.load('record_player_for_vinyls.glb', (gltf) => {
    const model = gltf.scene;

    // Calculate bounding box for centering
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Center the model
    model.position.sub(center);
    model.position.y += size.y / 2;

    // First pass: find the floor (lowest wooden piece with TapeRecorder material)
    let floorMesh = null;
    let lowestY = Infinity;

    model.traverse((child) => {
        if (child.isMesh && child.name.includes('TapeRecorder')) {
            const worldPos = new THREE.Vector3();
            child.getWorldPosition(worldPos);

            // Find lowest positioned mesh that's likely the floor
            if (worldPos.y < lowestY && !child.name.includes('Glass')) {
                lowestY = worldPos.y;
                floorMesh = child;
            }
        }
    });

    // Add floor to categories if found
    if (floorMesh) {
        componentCategories[floorMesh.name] = { order: -3, name: 'Wooden Floor Panel', category: 'Wearables' };
        console.log('Floor identified:', floorMesh.name, 'at Y:', lowestY);
    }

    // Traverse and categorize components
    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            // Make acrylic/glass materials transparent
            if (child.material && child.material.name === 'Glass') {
                child.material = child.material.clone();
                child.material.color.setHex(0xffffff);
                child.material.opacity = 0.3; // Transparent
                child.material.transparent = true;
                child.material.roughness = 0.05;
                child.material.metalness = 0.0;
                // Ensure emissive properties exist for glass lid color reveals
                if (!child.material.emissive) {
                    child.material.emissive = new THREE.Color(0x000000);
                }
                if (child.material.emissiveIntensity === undefined) {
                    child.material.emissiveIntensity = 0;
                }
            }

            // Make case body and floor transparent acrylic (not wood texture)
            if (child.name === 'Cube_TapeRecorder_0' || child.name === 'Cube006_TapeRecorder_0' ||
                (floorMesh && child.name === floorMesh.name)) {
                child.material = child.material.clone();
                child.material.color.setHex(0xffffff);
                child.material.opacity = 0.5; // Slightly more transparent
                child.material.transparent = true;
                child.material.roughness = 0.05;
                child.material.metalness = 0.0;
                child.material.side = THREE.DoubleSide; // Render both sides to fix glitching
            }

            // Get category info
            const category = componentCategories[child.name] || { order: 0, name: child.name, category: null };

            // Clone material for all non-case components to allow individual color control
            // This is critical for reveal mode color changes to work properly
            if (child.material && category.order !== 0 && child.material.name !== 'Glass') {
                child.material = child.material.clone();
                // Ensure emissive properties exist for glow effects
                if (!child.material.emissive) {
                    child.material.emissive = new THREE.Color(0x000000);
                }
                if (child.material.emissiveIntensity === undefined) {
                    child.material.emissiveIntensity = 0;
                }
            }

            // Store original world position and rotation
            const worldPos = new THREE.Vector3();
            const worldQuat = new THREE.Quaternion();
            const worldScale = new THREE.Vector3();

            child.getWorldPosition(worldPos);
            child.getWorldQuaternion(worldQuat);
            child.getWorldScale(worldScale);

            // Store original material color
            let originalColor = null;
            if (child.material && child.material.color) {
                originalColor = child.material.color.getHex();
            }

            // Store component
            const portfolioColorHex = layerColors[category.order.toString()] || null;
            components.push({
                mesh: child,
                parent: child.parent,
                order: category.order,
                name: category.name,
                category: category.category,
                baseWorldPos: worldPos.clone(),
                baseWorldQuat: worldQuat.clone(),
                baseWorldScale: worldScale.clone(),
                baseLocalPos: child.position.clone(),
                baseLocalQuat: child.quaternion.clone(),
                baseLocalScale: child.scale.clone(),
                originalColor: originalColor,
                portfolioColor: portfolioColorHex
            });

            console.log(`${category.name} (${child.name}): Layer ${category.order}, Category: ${category.category || 'none'}, portfolioColor: 0x${portfolioColorHex?.toString(16) || 'null'}`);
        }
    });

    scene.add(model);

    // Create Unitra Control Block PCB (larger, more components)
    const unitraPCB = createDetailedPCB(90, 70, [
        // Large heatsinks with fins (transistors)
        { type: 'heatsink', x: -25, z: 20, w: 12, h: 10, d: 10, color: 0x1a1a1a },
        { type: 'heatsink', x: -10, z: 20, w: 12, h: 10, d: 10, color: 0x1a1a1a },
        { type: 'heatsink', x: 5, z: 20, w: 10, h: 8, d: 8, color: 0x333333 },

        // Large electrolytic capacitors (black cylinders)
        { type: 'cylinder', x: 0, z: -15, r: 4, h: 14, color: 0x1a1a1a },
        { type: 'cylinder', x: 12, z: -15, r: 4, h: 14, color: 0x1a1a1a },
        { type: 'cylinder', x: -12, z: -15, r: 3.5, h: 12, color: 0x333333 },
        { type: 'cylinder', x: -30, z: 0, r: 4, h: 12, color: 0x1a1a1a },
        { type: 'cylinder', x: 25, z: -10, r: 3, h: 10, color: 0x333333 },

        // Blue potentiometer
        { type: 'cylinder', x: 20, z: 5, r: 3, h: 5, color: 0x0066cc },

        // White/Grey capacitors
        { type: 'cylinder', x: -18, z: 5, r: 2.5, h: 8, color: 0xcccccc },
        { type: 'cylinder', x: 32, z: 15, r: 2, h: 7, color: 0xe0e0e0 },

        // AC Connector (white/silver)
        { type: 'box', x: -35, z: -25, w: 10, h: 4, d: 15, color: 0xe8e8e8, metalness: 0.9 },

        // Black connector blocks
        { type: 'box', x: 35, z: 0, w: 5, h: 4, d: 20, color: 0x1a1a1a },
        { type: 'box', x: 35, z: -22, w: 5, h: 4, d: 12, color: 0x1a1a1a },

        // IC chips with pins
        { type: 'ic', x: -5, z: 8, w: 8, h: 2.5, d: 6, color: 0x1a1a1a },
        { type: 'ic', x: 8, z: -3, w: 6, h: 2, d: 5, color: 0x1a1a1a },
        { type: 'ic', x: 15, z: 12, w: 6, h: 2, d: 6, color: 0x2a2a2a },

        // Small resistors scattered
        { type: 'resistor', x: -8, z: -5, h: 4, r: 0.5, color: 0xcc6600 },
        { type: 'resistor', x: 3, z: 0, h: 4, r: 0.5, color: 0xcc6600 },
        { type: 'resistor', x: -15, z: -10, h: 4, r: 0.5, color: 0xd4af37 },
        { type: 'resistor', x: 18, z: -8, h: 4, r: 0.5, color: 0xcc6600 },

        // Small SMD components
        { type: 'box', x: -22, z: -8, w: 2, h: 1, d: 1.5, color: 0x1a1a1a },
        { type: 'box', x: -18, z: -12, w: 2, h: 1, d: 1.5, color: 0x1a1a1a },
        { type: 'box', x: 5, z: -8, w: 2, h: 1, d: 1.5, color: 0x2a2a2a }
    ]);
    const unitraWorldPos = new THREE.Vector3(-50, 5, 0); // Inside the case, far left side
    unitraPCB.position.copy(unitraWorldPos);
    scene.add(unitraPCB);
    components.push({
        mesh: unitraPCB,
        parent: null,
        order: -2, // PCB layer
        name: 'Unitra Control Block PCB',
        category: 'Renders',
        baseWorldPos: unitraWorldPos.clone(),
        baseWorldQuat: new THREE.Quaternion(),
        baseWorldScale: new THREE.Vector3(1, 1, 1),
        baseLocalPos: unitraWorldPos.clone(),
        baseLocalQuat: new THREE.Quaternion(),
        baseLocalScale: new THREE.Vector3(1, 1, 1),
        originalColor: 0x6b2d8a,
        portfolioColor: layerColors['-2']
    });

    // Create Pentode Phono Stage PCB (smaller, cleaner design)
    const phonoPCB = createDetailedPCB(75, 55, [
        // Blue screw terminal blocks (3 positions)
        { type: 'box', x: -28, z: 20, w: 8, h: 6, d: 7, color: 0x0033aa },
        { type: 'box', x: 28, z: 20, w: 8, h: 6, d: 7, color: 0x0033aa },
        { type: 'box', x: 28, z: -20, w: 8, h: 6, d: 7, color: 0x0033aa },

        // White terminal connectors
        { type: 'box', x: -28, z: 0, w: 10, h: 4, d: 12, color: 0xffffff },
        { type: 'box', x: -28, z: -20, w: 10, h: 4, d: 8, color: 0xf0f0f0 },

        // IC chips (dual op-amp)
        { type: 'ic', x: 0, z: 2, w: 8, h: 2.5, d: 7, color: 0x1a1a1a },
        { type: 'ic', x: -8, z: -10, w: 6, h: 2, d: 6, color: 0x2a2a2a },

        // Electrolytic capacitors (black cylinders)
        { type: 'cylinder', x: -12, z: 5, r: 2, h: 9, color: 0x1a1a1a },
        { type: 'cylinder', x: 10, z: 5, r: 2, h: 9, color: 0x1a1a1a },
        { type: 'cylinder', x: -5, z: -18, r: 1.5, h: 7, color: 0x333333 },
        { type: 'cylinder', x: 5, z: -18, r: 1.5, h: 7, color: 0x333333 },

        // Film capacitors (orange/yellow boxes)
        { type: 'box', x: 15, z: 0, w: 4, h: 3, d: 2, color: 0xff9900 },
        { type: 'box', x: 18, z: 8, w: 4, h: 3, d: 2, color: 0xffaa00 },

        // Resistors (color-coded)
        { type: 'resistor', x: -3, z: 12, h: 4, r: 0.5, color: 0xcc6600 },
        { type: 'resistor', x: 3, z: 12, h: 4, r: 0.5, color: 0xcc6600 },
        { type: 'resistor', x: 0, z: -8, h: 3.5, r: 0.4, color: 0xd4af37 },
        { type: 'resistor', x: 12, z: -12, h: 3.5, r: 0.4, color: 0xcc6600 },
        { type: 'resistor', x: -12, z: -15, h: 3, r: 0.4, color: 0x8b4513 },

        // Green LED indicator
        { type: 'led', x: 20, z: -8, r: 1, h: 4, color: 0x00ff00 },

        // Small SMD components
        { type: 'box', x: -15, z: 8, w: 1.5, h: 0.8, d: 1, color: 0x1a1a1a },
        { type: 'box', x: 8, z: -5, w: 1.5, h: 0.8, d: 1, color: 0x2a2a2a },
        { type: 'box', x: 15, z: 10, w: 1.5, h: 0.8, d: 1, color: 0x1a1a1a }
    ]);
    const phonoWorldPos = new THREE.Vector3(50, 5, 0); // Inside the case, far right side
    phonoPCB.position.copy(phonoWorldPos);
    scene.add(phonoPCB);
    components.push({
        mesh: phonoPCB,
        parent: null,
        order: -2, // PCB layer
        name: 'Pentode Phono Stage PCB',
        category: 'Renders',
        baseWorldPos: phonoWorldPos.clone(),
        baseWorldQuat: new THREE.Quaternion(),
        baseWorldScale: new THREE.Vector3(1, 1, 1),
        baseLocalPos: phonoWorldPos.clone(),
        baseLocalQuat: new THREE.Quaternion(),
        baseLocalScale: new THREE.Vector3(1, 1, 1),
        originalColor: 0x6b2d8a,
        portfolioColor: layerColors['-2']
    });

    // Find actual component positions for wire routing
    const leftSpeaker = components.find(c => c.name === 'Left Speaker');
    const rightSpeaker = components.find(c => c.name === 'Right Speaker');
    const speakerGrille1 = components.find(c => c.name === 'Speaker Grille 1');
    const speakerGrille2 = components.find(c => c.name === 'Speaker Grille 2');
    const tonearm = components.find(c => c.name === 'Tonearm');
    const tonearmPivot = components.find(c => c.name === 'Tonearm Pivot');
    const platterBase = components.find(c => c.name === 'Platter Base');
    const turntablePlatter = components.find(c => c.name === 'Turntable Platter');
    const controlPanel = components.find(c => c.name === 'Control Panel');
    const controlButtons = components.find(c => c.name === 'Control Buttons');
    const spindle = components.find(c => c.name === 'Case Back Wall');

    // Create wires connecting PCBs to actual turntable components (3D circuit board)
    const wireConfigs = [];

    // Define wire Y constraints based on actual geometry
    // PCB boards are at Y=5, with components up to Y~16
    // Floor/plate is around Y=0-2
    // Wires must: start from PCB top (Y=7), route ABOVE tallest PCB components, touch component bottoms
    const pcbSurfaceY = 7; // Just above PCB base at Y=5+2
    const wireRouteY = 18; // Above all PCB components (tallest is ~16)

    // Speakers: Amplifier output (Unitra PCB) → Speaker terminals (2 wires each)
    if (leftSpeaker && rightSpeaker) {
        const leftSpeakerBox = new THREE.Box3().setFromObject(leftSpeaker.mesh);
        const rightSpeakerBox = new THREE.Box3().setFromObject(rightSpeaker.mesh);

        wireConfigs.push(
            // Left speaker - wire 1 (red positive)
            {
                start: new THREE.Vector3(-80, pcbSurfaceY, 17),
                end: new THREE.Vector3(
                    leftSpeaker.baseWorldPos.x - 3,
                    Math.max(wireRouteY, leftSpeakerBox.min.y - 0.5),
                    leftSpeaker.baseWorldPos.z
                ),
                color: 0xff0000,
                order: -0.7
            },
            // Left speaker - wire 2 (black negative)
            {
                start: new THREE.Vector3(-80, pcbSurfaceY, 20),
                end: new THREE.Vector3(
                    leftSpeaker.baseWorldPos.x + 3,
                    Math.max(wireRouteY, leftSpeakerBox.min.y - 0.5),
                    leftSpeaker.baseWorldPos.z
                ),
                color: 0x1a1a1a,
                order: -0.7
            },
            // Right speaker - wire 1 (red positive)
            {
                start: new THREE.Vector3(-87, pcbSurfaceY, -20),
                end: new THREE.Vector3(
                    rightSpeaker.baseWorldPos.x - 3,
                    Math.max(wireRouteY, rightSpeakerBox.min.y - 0.5),
                    rightSpeaker.baseWorldPos.z
                ),
                color: 0xff0000,
                order: -0.7
            },
            // Right speaker - wire 2 (black negative)
            {
                start: new THREE.Vector3(-80, pcbSurfaceY, -20),
                end: new THREE.Vector3(
                    rightSpeaker.baseWorldPos.x + 3,
                    Math.max(wireRouteY, rightSpeakerBox.min.y - 0.5),
                    rightSpeaker.baseWorldPos.z
                ),
                color: 0x1a1a1a,
                order: -0.7
            }
        );
    }


    // Platter motor: Power from Unitra PCB → Motor in platter base (2 wires)
    if (platterBase) {
        const platterBaseBox = new THREE.Box3().setFromObject(platterBase.mesh);

        wireConfigs.push(
            // Motor wire 1 (blue AC power)
            {
                start: new THREE.Vector3(-50, pcbSurfaceY, -15),
                end: new THREE.Vector3(
                    platterBase.baseWorldPos.x - 8,
                    Math.max(wireRouteY, platterBaseBox.min.y - 0.5),
                    platterBase.baseWorldPos.z
                ),
                color: 0x0066cc,
                order: -0.4
            },
            // Motor wire 2 (brown AC power)
            {
                start: new THREE.Vector3(-65, pcbSurfaceY, 25),
                end: new THREE.Vector3(
                    platterBase.baseWorldPos.x + 8,
                    Math.max(wireRouteY, platterBaseBox.min.y - 0.5),
                    platterBase.baseWorldPos.z
                ),
                color: 0x8b4513,
                order: -0.4
            }
        );
    }

    // Tonearm Pivot wires: Phono PCB → Tonearm Pivot (pivot base that allows needle arm to swing)
    if (tonearmPivot) {
        const pivotBox = new THREE.Box3().setFromObject(tonearmPivot.mesh);

        wireConfigs.push(
            // Wire 1 (yellow - audio channel to tonearm pivot)
            {
                start: new THREE.Vector3(22, pcbSurfaceY, 20),
                end: new THREE.Vector3(
                    tonearmPivot.baseWorldPos.x - 2,
                    Math.max(wireRouteY, pivotBox.min.y - 0.5),
                    tonearmPivot.baseWorldPos.z
                ),
                color: 0xffff00,
                order: -0.6
            },
            // Wire 2 (green - audio channel to tonearm pivot)
            {
                start: new THREE.Vector3(19, pcbSurfaceY, 20),
                end: new THREE.Vector3(
                    tonearmPivot.baseWorldPos.x + 2,
                    Math.max(wireRouteY, pivotBox.min.y - 0.5),
                    tonearmPivot.baseWorldPos.z
                ),
                color: 0x00ff00,
                order: -0.6
            }
        );
    }

    // Turntable Platter wires: Unitra PCB → Turntable Platter (knob with silver ring where it meets plate)
    if (turntablePlatter) {
        const platterBox = new THREE.Box3().setFromObject(turntablePlatter.mesh);

        wireConfigs.push(
            // Wire 1 (magenta/pink - control signal to turntable platter)
            {
                start: new THREE.Vector3(-15, pcbSurfaceY, -7),
                end: new THREE.Vector3(
                    spindle.baseWorldPos.x,
                    Math.max(wireRouteY, platterBox.min.y - 0.5),
                    spindle.baseWorldPos.z + 50
                ),
                color: 0xff00ff,
                order: -0.4
            },
            // Wire 2 (cyan/turquoise - control signal to turntable platter)
            {
                start: new THREE.Vector3(-15, pcbSurfaceY, -5),
                end: new THREE.Vector3(
                    spindle.baseWorldPos.x + 2,
                    Math.max(wireRouteY, platterBox.min.y - 0.5),
                    spindle.baseWorldPos.z + 52
                ),
                color: 0x00ffff,
                order: -0.4
            },

            {
                start: new THREE.Vector3(37, pcbSurfaceY + 2, 5),
                end: new THREE.Vector3(
                    spindle.baseWorldPos.x - 2,
                    Math.max(wireRouteY, platterBox.min.y - 0.5) - 7,
                    spindle.baseWorldPos.z + 85
                ),
                color: 0xff6699,
                order: -0.6
            },

            {
                start: new THREE.Vector3(37, pcbSurfaceY, 5),
                end: new THREE.Vector3(
                    spindle.baseWorldPos.x,
                    Math.max(wireRouteY, platterBox.min.y - 0.5) - 7,
                    spindle.baseWorldPos.z + 82
                ),
                color: 0x999999,
                order: -0.6
            }
        );
    }

    wireConfigs.forEach((config, index) => {
        const wire = createWire(config.start, config.end, config.color);
        scene.add(wire);

        // These wires are the Startups category
        components.push({
            mesh: wire,
            parent: null,
            order: -1, // Wires layer (original position)
            name: `Wire ${index + 1}`,
            category: 'Startups',
            baseWorldPos: wire.position.clone(),
            baseWorldQuat: wire.quaternion.clone(),
            baseWorldScale: new THREE.Vector3(1, 1, 1),
            baseLocalPos: wire.position.clone(),
            baseLocalQuat: wire.quaternion.clone(),
            baseLocalScale: new THREE.Vector3(1, 1, 1),
            originalColor: config.color,
            portfolioColor: layerColors['0.5'] // Bright navy blue
        });
    });

    // Create labels for each layer with a category
    createLayerLabels();

    // Hide loading, show controls
    document.getElementById('loading').style.display = 'none';
    document.getElementById('controls').style.display = 'flex';

    // Show bio card on initial load (record player starts assembled)
    showBioCard();

    console.log(`Loaded ${components.length} components`);
},
(progress) => {
    const percent = progress.total > 0
        ? (progress.loaded / progress.total * 100).toFixed(0)
        : '...';
    document.getElementById('loading').textContent = `Loading model... ${percent}%`;
},
(error) => {
    console.error('Error loading model:', error);
    document.getElementById('loading').textContent = 'Error loading model';
});

// Raycaster for 3D object interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Create labels for each layer
function createLayerLabels() {
    const labelsContainer = document.getElementById('labels-container');
    const createdCategories = new Set();

    // Create labels for each unique category (only one label per category)
    Object.entries(layerCategories).forEach(([layerOrder, category]) => {
        if (category && !createdCategories.has(category)) {
            createdCategories.add(category);

            const labelDiv = document.createElement('div');
            labelDiv.className = 'category-label';
            labelDiv.textContent = category;
            labelDiv.dataset.layer = layerOrder;
            labelDiv.dataset.category = category;

            // Add click handler to label - only works when exploded
            labelDiv.addEventListener('click', () => {
                if (isExploded) {
                    showVinylOverlay(category);
                }
            });

            labelsContainer.appendChild(labelDiv);

            const lineDiv = document.createElement('div');
            lineDiv.className = 'label-line';
            lineDiv.dataset.layer = layerOrder;
            labelsContainer.appendChild(lineDiv);

            layerLabels[layerOrder] = {
                label: labelDiv,
                line: lineDiv
            };
        }
    });
}

// Handle clicks on 3D components
function onComponentClick(event) {
    // Only allow clicks when exploded AND in reveal mode (not in Explode Anatomy mode)
    if (!isExploded || !revealMode) return;

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster
    raycaster.setFromCamera(mouse, camera);

    // Get all meshes from components (exclude wires and transparent case)
    const clickableObjects = components
        .filter(c => c.category !== null) // Only components with categories
        .map(c => c.mesh);

    // Check for intersections
    const intersects = raycaster.intersectObjects(clickableObjects, true);

    if (intersects.length > 0) {
        // Find the component that was clicked
        const clickedMesh = intersects[0].object;
        const clickedComponent = components.find(c =>
            c.mesh === clickedMesh ||
            (c.mesh.children && c.mesh.children.includes(clickedMesh))
        );

        if (clickedComponent && clickedComponent.category) {
            showVinylOverlay(clickedComponent.category);
        }
    }
}

// Load a project by collapsing model, placing vinyl, spinning, and showing details
function loadProject(project, category) {
    console.log('=== LOADING PROJECT ===');
    console.log('Project:', project);
    console.log('Category:', category);

    // Close the vinyl overlay
    document.getElementById('vinyl-overlay').style.display = 'none';

    // Store project data for display after loading
    currentProject = project;

    // Start loading sequence
    isLoadingProject = true;
    loadingStartTime = Date.now();
    loadingProgress = 0;

    console.log('Loading started at:', loadingStartTime);

    // First, collapse the model (but keep it visible during vinyl descent)
    isExploded = false;
    revealMode = false;

    // Deactivate both buttons
    document.getElementById('projectButton').classList.remove('active');
    document.getElementById('explodeButton').classList.remove('active');

    // Find the turntable platter to match vinyl size and position
    const turntablePlatter = components.find(c => c.name === 'Turntable Platter');

    if (turntablePlatter) {
        // Get the bounding box of the turntable platter to match its size
        const platterBox = new THREE.Box3().setFromObject(turntablePlatter.mesh);
        const platterSize = new THREE.Vector3();
        platterBox.getSize(platterSize);

        // Calculate vinyl radius to match the platter (use diameter/2)
        const platterRadius = Math.max(platterSize.x, platterSize.z) / 2;

        // Create the 3D vinyl record matching the platter size
        // Use project's vinyl color if available, otherwise default black
        const vinylColor = project.vinylColor ? parseInt(project.vinylColor.replace('#', '0x')) : 0x1a1a1a;
        const vinylCenterColor = project.vinylCenter ? parseInt(project.vinylCenter.replace('#', '0x')) : 0xcd7f32;
        projectVinyl = createVinylRecord(vinylColor, vinylCenterColor);

        // Scale the vinyl to match platter size (created at radius 25)
        const vinylScale = platterRadius / 25;
        projectVinyl.scale.set(vinylScale, vinylScale, vinylScale);

        // Calculate the target position (just above the platter top surface)
        const platterCenter = new THREE.Vector3();
        platterBox.getCenter(platterCenter);
        vinylTargetX = platterCenter.x;
        vinylTargetY = platterBox.max.y + 1; // 1 unit above platter surface
        vinylTargetZ = platterCenter.z;

        console.log('Platter center:', platterCenter);
        console.log('Platter box max Y:', platterBox.max.y);
        console.log('Vinyl target position:', { x: vinylTargetX, y: vinylTargetY, z: vinylTargetZ });

        // Position vinyl HIGH ABOVE the turntable - it will descend
        projectVinyl.position.set(vinylTargetX, 200, vinylTargetZ); // Start high above
        console.log('Vinyl initial position:', projectVinyl.position);

        // Initial rotation
        vinylRotation = 0;

        // Set render order to ensure vinyl appears under glass lid
        projectVinyl.traverse((child) => {
            if (child.isMesh) {
                child.renderOrder = -1; // Lower render order = renders first (behind)
            }
        });

        // Add to scene
        scene.add(projectVinyl);
        console.log('Vinyl added to scene, isLoadingProject:', isLoadingProject);
    }

    // Animate camera to focus on the turntable
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();

    // Camera position to view the turntable and descending vinyl
    const endPos = new THREE.Vector3(0, 235, 325);
    const endTarget = new THREE.Vector3(0, 10, 20);

    let cameraProgress = 0;
    const cameraDuration = 1000;
    const cameraStartTime = Date.now();

    function animateCameraToVinyl() {
        const elapsed = Date.now() - cameraStartTime;
        cameraProgress = Math.min(elapsed / cameraDuration, 1);

        const eased = cameraProgress < 0.5
            ? 2 * cameraProgress * cameraProgress
            : 1 - Math.pow(-2 * cameraProgress + 2, 2) / 2;

        camera.position.lerpVectors(startPos, endPos, eased);
        controls.target.lerpVectors(startTarget, endTarget, eased);
        controls.update();

        if (cameraProgress < 1) {
            requestAnimationFrame(animateCameraToVinyl);
        }
    }

    animateCameraToVinyl();
}

// Show vinyl overlay with projects for a category
function showVinylOverlay(category) {
    const overlay = document.getElementById('vinyl-overlay');
    const categoryTitle = document.getElementById('vinyl-category');
    const vinylGrid = document.getElementById('vinyl-grid');

    // Set category title
    categoryTitle.textContent = category;

    // Clear existing vinyls
    vinylGrid.innerHTML = '';

    // Get projects for this category
    const projects = projectsByCategory[category] || [];

    // Create vinyl items
    projects.forEach((project, index) => {
        const vinylItem = document.createElement('div');
        vinylItem.className = 'vinyl-item';
        vinylItem.onclick = () => {
            // Add selected class for animation
            vinylItem.classList.add('selected');

            // Remove animation class after it completes
            setTimeout(() => {
                vinylItem.classList.remove('selected');
            }, 600);

            loadProject(project, category);
        };

        const vinylDisc = document.createElement('div');
        vinylDisc.className = 'vinyl-disc';

        // Apply custom vinyl gradient if available
        if (project.vinylGradient) {
            vinylDisc.style.background = project.vinylGradient;
        }

        // Apply custom center color if available
        if (project.vinylCenter) {
            vinylDisc.style.setProperty('--vinyl-center-color', project.vinylCenter);
        }

        const vinylLabel = document.createElement('div');
        vinylLabel.className = 'vinyl-label';
        vinylLabel.textContent = project.title;

        vinylItem.appendChild(vinylDisc);
        vinylItem.appendChild(vinylLabel);
        vinylGrid.appendChild(vinylItem);
    });

    // Show overlay
    overlay.style.display = 'flex';
}

// Close vinyl overlay
document.getElementById('close-vinyl').addEventListener('click', () => {
    document.getElementById('vinyl-overlay').style.display = 'none';
});

// Close overlay when clicking outside the container
document.getElementById('vinyl-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'vinyl-overlay') {
        document.getElementById('vinyl-overlay').style.display = 'none';
    }
});

// Show project detail overlay
function showProjectDetail(project) {
    const overlay = document.getElementById('project-detail-overlay');
    const content = document.getElementById('project-content');

    // Build project content HTML
    let html = `
        <h1>${project.title}</h1>
        ${project.team ? `<div class="team">Team: ${project.team}</div>` : ''}
        <div class="description">${project.description}</div>
    `;

    // Add image gallery if available (multiple images)
    if (project.images && project.images.length > 0) {
        html += `
            <div style="margin-bottom: 30px; overflow-x: auto; white-space: nowrap; padding: 10px 0;">
                ${project.images.map(img => `<img src="${img}" alt="${project.title}" style="display: inline-block; max-height: 600px; height: auto; margin-right: 20px; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.15);" />`).join('')}
            </div>
        `;
    }
    // Add single image if available
    else if (project.image) {
        html += `
            <div style="margin-bottom: 30px; text-align: center;">
                <img src="${project.image}" alt="${project.title}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.15);" />
            </div>
        `;
    }

    // Add video if available
    if (project.video) {
        html += `
            <video controls autoplay muted loop style="margin-bottom: 30px;">
                <source src="${project.video}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        `;
    }

    // Add PDF if available
    if (project.pdf) {
        const isDocx = project.pdf.toLowerCase().endsWith('.docx');
        const isDoc = project.pdf.toLowerCase().endsWith('.doc');

        if (isDocx || isDoc) {
            // For Word documents, show download option (browsers can't embed DOCX)
            html += `
                <div style="margin-bottom: 30px; text-align: center; padding: 40px; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
                    <h2 style="margin-bottom: 20px;">📄 Project Documentation</h2>
                    <p style="margin-bottom: 20px; color: rgba(255, 255, 255, 0.7);">
                        Full project documentation is available for download
                    </p>
                    <a href="${project.pdf}" download style="
                        display: inline-block;
                        padding: 15px 40px;
                        background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05));
                        border: 2px solid rgba(255, 255, 255, 0.3);
                        border-radius: 8px;
                        color: #fff;
                        text-decoration: none;
                        font-weight: 600;
                        font-size: 16px;
                        transition: all 0.3s ease;
                        cursor: pointer;
                    " onmouseover="this.style.background='linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.15))'; this.style.borderColor='rgba(255, 255, 255, 0.5)'; this.style.transform='translateY(-2px)';"
                       onmouseout="this.style.background='linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05))'; this.style.borderColor='rgba(255, 255, 255, 0.3)'; this.style.transform='translateY(0)';">
                        Download Documentation
                    </a>
                </div>
            `;
        } else {
            // For PDFs, use iframe (with or without download link depending on pdf2)
            const showDownload = !project.pdf2; // Don't show download if there's a second PDF
            html += `
                <div style="margin-bottom: 30px;">
                    <h2 style="margin-bottom: 15px;">Investor Deck</h2>
                    <iframe src="${project.pdf}" width="100%" height="800px" style="border: none; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.15); background: white;"></iframe>
                    ${showDownload ? `
                        <div style="margin-top: 15px; text-align: center;">
                            <a href="${project.pdf}" download style="
                                display: inline-block;
                                padding: 12px 30px;
                                background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05));
                                border: 2px solid rgba(255, 255, 255, 0.3);
                                border-radius: 8px;
                                color: #fff;
                                text-decoration: none;
                                font-weight: 600;
                                font-size: 14px;
                                transition: all 0.3s ease;
                            ">
                                📥 Download PDF
                            </a>
                        </div>
                    ` : ''}
                </div>
            `;
        }
    }

    // Add second PDF if available (pdf2)
    if (project.pdf2) {
        html += `
            <div style="margin-bottom: 30px;">
                <h2 style="margin-bottom: 15px;">Pitch Deck</h2>
                <iframe src="${project.pdf2}" width="100%" height="800px" style="border: none; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.15); background: white;"></iframe>
            </div>
        `;
    }

    // Add webpage if available
    if (project.webpage) {
        const webpageTitle = project.pdf2 ? 'Video Preview' : 'Interactive Demo';
        // Use responsive embed for video preview, standard iframe for interactive demos
        if (project.pdf2) {
            html += `
                <div style="margin-bottom: 30px;">
                    <h2 style="margin-bottom: 15px;">${webpageTitle}</h2>
                    <div style="max-width: 640px; margin: 0 auto;">
                        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
                            <iframe src="${project.webpage}" width="640" height="360" frameborder="0" scrolling="no" allowfullscreen title="Br'er.MP4" style="border:none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; height: 100%; max-width: 100%;"></iframe>
                        </div>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div style="margin-bottom: 30px;">
                    <h2 style="margin-bottom: 15px;">${webpageTitle}</h2>
                    <iframe src="${project.webpage}" style="width: 100%; height: 800px; border: none; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.15);" allowfullscreen></iframe>
                </div>
            `;
        }
    }

    // Add multiple webpages if available
    if (project.webpages && project.webpages.length > 0) {
        project.webpages.forEach((webpage, index) => {
            html += `
                <div style="margin-bottom: 30px;">
                    <h2 style="margin-bottom: 15px;">${webpage.title}</h2>
                    <iframe src="${webpage.url}" style="width: 100%; height: 800px; border: none; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.15);" allowfullscreen></iframe>
                </div>
            `;
        });
    }

    // Add code if available
    if (project.code) {
        html += `
            <div style="margin-bottom: 30px;">
                <h2 style="margin-bottom: 15px; color: #333;">Downloads</h2>
                <a href="${project.code}" download style="
                    display: inline-block;
                    padding: 15px 40px;
                    background: linear-gradient(135deg, rgba(135, 179, 232, 0.2), rgba(93, 74, 127, 0.2));
                    border: 2px solid rgba(135, 179, 232, 0.5);
                    border-radius: 8px;
                    color: #333;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 16px;
                    transition: all 0.3s ease;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    margin-right: 15px;
                " onmouseover="this.style.background='linear-gradient(135deg, rgba(135, 179, 232, 0.4), rgba(93, 74, 127, 0.4))'; this.style.borderColor='rgba(135, 179, 232, 0.8)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 15px rgba(135, 179, 232, 0.3)';"
                   onmouseout="this.style.background='linear-gradient(135deg, rgba(135, 179, 232, 0.2), rgba(93, 74, 127, 0.2))'; this.style.borderColor='rgba(135, 179, 232, 0.5)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0, 0, 0, 0.1)';">
                    📥 Download CAD File
                </a>
                ${project.code2 ? `
                    <a href="${project.code2}" download style="
                        display: inline-block;
                        padding: 15px 40px;
                        background: linear-gradient(135deg, rgba(135, 179, 232, 0.2), rgba(93, 74, 127, 0.2));
                        border: 2px solid rgba(135, 179, 232, 0.5);
                        border-radius: 8px;
                        color: #333;
                        text-decoration: none;
                        font-weight: 600;
                        font-size: 16px;
                        transition: all 0.3s ease;
                        cursor: pointer;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    " onmouseover="this.style.background='linear-gradient(135deg, rgba(135, 179, 232, 0.4), rgba(93, 74, 127, 0.4))'; this.style.borderColor='rgba(135, 179, 232, 0.8)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 15px rgba(135, 179, 232, 0.3)';"
                       onmouseout="this.style.background='linear-gradient(135deg, rgba(135, 179, 232, 0.2), rgba(93, 74, 127, 0.2))'; this.style.borderColor='rgba(135, 179, 232, 0.5)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0, 0, 0, 0.1)';">
                        📥 Download Web-Animation File
                    </a>
                ` : ''}
            </div>
        `;
    }

    // Add second video if available (displayed after documentation)
    if (project.secondVideo) {
        html += `
            <div style="margin-bottom: 30px;">
                <h2 style="margin-bottom: 15px;">Additional Video</h2>
                <video controls muted loop style="width: 100%; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.15);">
                    <source src="${project.secondVideo}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            </div>
        `;
    }

    // Add features if available
    if (project.features && project.features.length > 0) {
        html += `
            <div class="features">
                <h2>Materials & Components</h2>
                <ul>
                    ${project.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    content.innerHTML = html;
    overlay.style.display = 'flex';
}

// Close project detail overlay
document.getElementById('close-project').addEventListener('click', () => {
    document.getElementById('project-detail-overlay').style.display = 'none';
});

// Info button - show info overlay
document.getElementById('infoButton').addEventListener('click', () => {
    document.getElementById('info-overlay').style.display = 'flex';
});

// Close info overlay
document.getElementById('close-info').addEventListener('click', () => {
    document.getElementById('info-overlay').style.display = 'none';
});

// Close project overlay when clicking outside the container
document.getElementById('project-detail-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'project-detail-overlay') {
        document.getElementById('project-detail-overlay').style.display = 'none';
    }
});

// Handle hover on 3D components to change cursor
function onComponentHover(event) {
    if (!isExploded) {
        renderer.domElement.classList.remove('clickable');
        return;
    }

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const clickableObjects = components
        .filter(c => c.category !== null)
        .map(c => c.mesh);

    const intersects = raycaster.intersectObjects(clickableObjects, true);

    if (intersects.length > 0) {
        renderer.domElement.classList.add('clickable');
    } else {
        renderer.domElement.classList.remove('clickable');
    }
}

// Add click listener to canvas
renderer.domElement.addEventListener('click', onComponentClick, false);
renderer.domElement.addEventListener('mousemove', onComponentHover, false);

// Update label positions based on 3D positions (only in reveal mode)
function updateLabels() {
    if (!isExploded || !revealMode || animationProgress < 0.8) {
        // Hide all labels when not in reveal mode or not exploded
        Object.values(layerLabels).forEach(({ label, line }) => {
            label.classList.remove('visible');
            line.classList.remove('visible');
        });
        return;
    }

    // Once exploded, show all labels permanently (spotlights still sequence through)
    Object.entries(layerLabels).forEach(([layerOrder, { label, line }]) => {
        const layer = parseInt(layerOrder);
        const category = layerCategories[layerOrder];

        // Always show label once explosion is complete
        label.classList.add('visible');
        line.classList.add('visible');

        // Find all layers with this category to calculate center position
        const categoryLayers = Object.entries(layerCategories)
            .filter(([_, cat]) => cat === category)
            .map(([order, _]) => parseInt(order));

        // Calculate average Y position for all layers in this category
        const explosionDistance = 50;
        let totalY = 0;
        let validComponents = 0;

        categoryLayers.forEach(layerNum => {
            const layerComponent = components.find(c => c.order === layerNum && c.category !== null);
            if (layerComponent) {
                const verticalOffset = layerNum * explosionDistance * animationProgress;
                const componentY = layerComponent.baseWorldPos.y + verticalOffset;
                totalY += componentY;
                validComponents++;
            } else {
                // Fallback to calculated position
                totalY += layerNum * explosionDistance * animationProgress;
                validComponents++;
            }
        });

        const averageY = totalY / validComponents;
        const layerWorldPos = new THREE.Vector3(0, averageY, 0);

        // Project to screen space
        const screenPos = layerWorldPos.clone().project(camera);
        const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

        // Position label to the right of the layer
        const labelX = x + 250;
        let labelY = y;

        // Add extra offset for Wearables to prevent overlap with Startups
        if (category === 'Wearables') {
            labelY += 30;
        }

        label.style.left = labelX + 'px';
        label.style.top = labelY + 'px';
        label.style.transform = 'translateY(-50%)'; // Center vertically

        // Draw line from layer center to label
        const lineLength = labelX - x - 20;
        line.style.left = (x + 20) + 'px';
        line.style.top = labelY + 'px'; // Use labelY to match the label position
        line.style.width = lineLength + 'px';
    });
}

// Button interaction - The Collection (with reveal)
document.getElementById('projectButton').addEventListener('click', () => {
    // If other button is active, don't allow collection mode
    const explodeBtn = document.getElementById('explodeButton');
    if (explodeBtn.classList.contains('active')) {
        return;
    }

    isExploded = !isExploded;
    revealMode = isExploded; // Enable reveal mode when exploding
    const button = document.getElementById('projectButton');

    if (isExploded) {
        // Save current bio state before entering collection
        bioStateBeforeExplode = getCurrentBioState();
        button.classList.add('active');
        animateCameraToFront();
        hideBioCard();
        // Hide simple bio and noise button during collection
        const simpleBio = document.getElementById('simple-bio');
        const noiseBtn = document.getElementById('noise-button');
        if (simpleBio) simpleBio.style.display = 'none';
        if (noiseBtn) noiseBtn.style.display = 'none';
        // Let the sequential reveal logic handle layer reveals
    } else {
        button.classList.remove('active');
        animateCameraToClose();
        // Restore bio to state before entering collection
        restoreBioState(bioStateBeforeExplode);
    }
});

// Button interaction - Explode Anatomy (raw explosion, no reveal features)
document.getElementById('explodeButton').addEventListener('click', () => {
    // If other button is active, deactivate it first
    const projectBtn = document.getElementById('projectButton');
    if (projectBtn.classList.contains('active')) {
        projectBtn.classList.remove('active');
    }

    isExploded = !isExploded;
    revealMode = false; // Disable reveal mode completely
    const button = document.getElementById('explodeButton');

    if (isExploded) {
        // Save current bio state before entering explode anatomy
        bioStateBeforeExplode = getCurrentBioState();
        button.classList.add('active');
        animateCameraToFront();
        // Force mute state in explode anatomy mode
        hideBioCard();
    } else {
        button.classList.remove('active');
        animateCameraToClose();
        // Restore bio to state before entering explode anatomy
        restoreBioState(bioStateBeforeExplode);
    }
});

function animateCameraToFront() {
    // Animate camera to front view with full exploded anatomy in view
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();

    // Calculate dynamic camera position to fit entire exploded view in window
    // Bottom: Floor at 10 - (3 layers * 50) = -140
    // Top: Lid at ~40 + (7 layers * 50) = ~390
    // Total height: ~530 units
    // Center at: (-140 + 390) / 2 = ~125
    const endPos = new THREE.Vector3(0, 125, 800); // Zoomed out more
    const endTarget = new THREE.Vector3(0, 125, 300);

    let progress = 0;
    const duration = 1500; // 1.5 seconds
    const startTime = Date.now();

    function animateCamera() {
        const elapsed = Date.now() - startTime;
        progress = Math.min(elapsed / duration, 1);

        // Smooth easing
        const eased = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        camera.position.lerpVectors(startPos, endPos, eased);
        controls.target.lerpVectors(startTarget, endTarget, eased);
        controls.update();

        if (progress < 1) {
            requestAnimationFrame(animateCamera);
        }
    }

    animateCamera();
}

function animateCameraToClose() {
    // Animate camera to closer view of reassembled model
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();

    // Zoom in to show full model with buffer space around it
    const endPos = new THREE.Vector3(0, 70, 280); // Closer but with buffer
    const endTarget = new THREE.Vector3(0, 40, 0); // Look at center of model

    let progress = 0;
    const duration = 1500; // 1.5 seconds
    const startTime = Date.now();

    function animateCamera() {
        const elapsed = Date.now() - startTime;
        progress = Math.min(elapsed / duration, 1);

        // Smooth easing
        const eased = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        camera.position.lerpVectors(startPos, endPos, eased);
        controls.target.lerpVectors(startTarget, endTarget, eased);
        controls.update();

        if (progress < 1) {
            requestAnimationFrame(animateCamera);
        }
    }

    animateCamera();
}

// Create smooth spiral text with curved letters
function createSpiralText() {
    const bioText = document.querySelector('#bio-card .bio-text');
    if (!bioText) return;

    const text = "I am an ambitious, organized Creative Technology Design Engineer with a passion for innovation and creativity. I believe to think critically is to solve critical problems, recognizing patterns and drawing connections to achieve optimal results. I am a positive, open-minded, and results-driven individual who understands the importance of effective communication, collaboration, and flexibility within a successful, professional environment. Entrepreneurially-minded, I find common goals provide necessary direction and unitary cohesion, while creativity and constant iteration—the appropriate response to failure—are intrinsic components of success.";

    bioText.innerHTML = '';

    const centerX = 375;
    const centerY = 375;
    const startRadius = 335; // Start further out to prevent edge overlap
    const endRadius = 105; // Increased to prevent overlap near image
    const words = text.split(' ');

    let currentAngle = 0;
    let currentRadius = startRadius;

    // Constant line height spacing for consistent spiral
    const lineHeight = 28; // Consistent spacing between spiral loops for larger font

    words.forEach((word, index) => {
        // Adjusted for 26px font size
        const avgCharWidth = 13.5;
        const spaceWidth = avgCharWidth * 1.5; // Space between words

        // Add each letter individually to curve along the spiral
        const letters = (word + ' ').split('');

        letters.forEach((letter, letterIndex) => {
            const circumference = 2 * Math.PI * currentRadius;
            const charWidth = letter === ' ' ? spaceWidth : avgCharWidth;
            const angleStep = (charWidth / circumference) * Math.PI * 2;

            // Position letter at current angle/radius
            const angle = currentAngle + angleStep / 2;
            const x = centerX + currentRadius * Math.cos(angle - Math.PI / 2);
            const y = centerY + currentRadius * Math.sin(angle - Math.PI / 2);

            const span = document.createElement('span');
            span.className = 'spiral-word';
            span.textContent = letter;
            span.style.left = x + 'px';
            span.style.top = y + 'px';
            span.style.transform = `translate(-50%, -50%) rotate(${angle * 180 / Math.PI}deg)`;

            // Make the first word "I" red
            if (index === 0) {
                span.style.color = 'violet';
            }

            bioText.appendChild(span);

            // Move along spiral
            currentAngle += angleStep;

            // Decrease radius based on how much angle we've covered
            // This creates consistent line spacing regardless of radius
            const radiusDecrement = (angleStep / (Math.PI * 2)) * lineHeight;
            currentRadius -= radiusDecrement;

            if (currentRadius < endRadius) currentRadius = endRadius;
        });
    });
}

// Bio card functionality
function showBioCard() {
    const bioCard = document.getElementById('bio-card');
    const simpleBio = document.getElementById('simple-bio');
    const noiseBtn = document.getElementById('noise-button');

    // Hide simple bio and noise button
    if (simpleBio) simpleBio.style.display = 'none';
    if (noiseBtn) noiseBtn.style.display = 'none';

    // Show all name boxes
    const nameBox = document.querySelector('.name-box');
    const bgNameBoxes = document.querySelectorAll('.bg-name-box');

    nameBox.style.display = 'flex';
    bgNameBoxes.forEach((box) => {
        box.style.display = 'flex';
    });

    // Show bio card
    bioCard.classList.add('visible');
    createSpiralText();
    // HIDE ferro animation when bio is shown
    if (window.hideFerroAnimation) window.hideFerroAnimation();
}

function hideBioCard() {
    const bioCard = document.getElementById('bio-card');
    const simpleBio = document.getElementById('simple-bio');
    const noiseBtn = document.getElementById('noise-button');

    // Hide bio card
    bioCard.classList.remove('visible');

    // Hide all name boxes
    const nameBox = document.querySelector('.name-box');
    const bgNameBoxes = document.querySelectorAll('.bg-name-box');

    nameBox.style.display = 'none';
    bgNameBoxes.forEach((box) => {
        box.style.display = 'none';
    });

    // Show simple bio text and noise button when bio card is hidden (unless in collection mode)
    if (simpleBio && !revealMode) {
        const bioParagraph = simpleBio.querySelector('.bio-paragraph');
        if (bioParagraph) {
            bioParagraph.textContent = "I am an ambitious, organized Creative Technology Design Engineer with a passion for innovation and creativity. I believe to think critically is to solve critical problems, recognizing patterns and drawing connections to achieve optimal results. I am a positive, open-minded, and results-driven individual who understands the importance of effective communication, collaboration, and flexibility within a successful, professional environment. Entrepreneurially-minded, I find common goals provide necessary direction and unitary cohesion, while creativity and constant iteration—the appropriate response to failure—are intrinsic components of success.";
        }
        simpleBio.style.display = 'block';
    }
    if (noiseBtn && !revealMode) {
        noiseBtn.style.display = 'block';
    }

    // SHOW ferro animation when bio is hidden
    if (window.showFerroAnimation) window.showFerroAnimation();
    if (window.respawnFerroBalls) window.respawnFerroBalls();
}

// Helper to check current bio state
function getCurrentBioState() {
    const bioCard = document.getElementById('bio-card');
    return bioCard.classList.contains('visible') ? 'noise' : 'mute';
}

// Helper to restore bio state
function restoreBioState(state) {
    if (state === 'noise') {
        showBioCard();
    } else {
        hideBioCard();
    }
}

// Close button for bio card
document.getElementById('bio-close').addEventListener('click', (e) => {
    e.stopPropagation();
    hideBioCard();
});

// Noise button to show bio card
document.getElementById('noise-button').addEventListener('click', (e) => {
    e.stopPropagation();
    // Don't allow bio to open during collection/reveal mode
    if (revealMode) return;
    showBioCard();
});

function updateAnimation() {
    // Handle vinyl loading sequence with multiple phases
    if (isLoadingProject && projectVinyl) {
        const elapsed = Date.now() - loadingStartTime;
        const totalElapsed = elapsed;

        // Constant vinyl rotation throughout all phases
        vinylRotation += 0.05; // Constant spin speed (about 3 radians/second at 60fps)
        projectVinyl.rotation.y = vinylRotation;

        // Log every 30 frames to verify spinning
        if (Math.floor(elapsed / 16) % 30 === 0) {
            console.log('Vinyl spinning - rotation:', vinylRotation.toFixed(2));
        }

        // Phase 1: Vinyl descends (0-1500ms) while model collapses
        if (elapsed < vinylDescentDuration) {
            vinylDescentProgress = elapsed / vinylDescentDuration;
            const eased = vinylDescentProgress < 0.5
                ? 2 * vinylDescentProgress * vinylDescentProgress
                : 1 - Math.pow(-2 * vinylDescentProgress + 2, 2) / 2;

            // Get the current platter position (it's moving as model collapses)
            const turntablePlatter = components.find(c => c.name === 'Turntable Platter');
            if (turntablePlatter) {
                const platterBox = new THREE.Box3().setFromObject(turntablePlatter.mesh);
                const platterCenter = new THREE.Vector3();
                platterBox.getCenter(platterCenter);

                // Descend from Y=200 to platter surface
                const startY = 200;
                const targetY = platterBox.max.y + 1;
                const currentY = startY + (targetY - startY) * eased;

                projectVinyl.position.set(
                    platterCenter.x,
                    currentY,
                    platterCenter.z
                );

                console.log(`Phase 1 - Descending: Y=${currentY.toFixed(2)}, platter top=${platterBox.max.y.toFixed(2)}, progress=${(vinylDescentProgress * 100).toFixed(1)}%`);
            }

            // Keep lid OPEN (at exploded position) during descent
            const glassLid = components.find(c => c.name === 'Glass Lid');
            if (glassLid) {
                // Reset lid to original color (clear glass)
                if (glassLid.mesh.material && glassLid.originalColor !== null) {
                    const originalColor = new THREE.Color(glassLid.originalColor);
                    glassLid.mesh.material.color.copy(originalColor);

                    // Reset emissive
                    if (glassLid.mesh.material.emissive) {
                        glassLid.mesh.material.emissive.setHex(0x000000);
                        glassLid.mesh.material.emissiveIntensity = 0;
                    }
                }

                // Keep lid at its exploded position
                const explosionDistance = 50;
                const verticalOffset = glassLid.order * explosionDistance; // Full exploded position
                const targetWorldPos = glassLid.baseWorldPos.clone();
                targetWorldPos.y += verticalOffset;

                if (glassLid.parent) {
                    const parentWorldMatrix = new THREE.Matrix4();
                    glassLid.parent.updateMatrixWorld();
                    parentWorldMatrix.copy(glassLid.parent.matrixWorld);

                    const parentWorldMatrixInverse = new THREE.Matrix4();
                    parentWorldMatrixInverse.copy(parentWorldMatrix).invert();

                    const localPos = targetWorldPos.clone().applyMatrix4(parentWorldMatrixInverse);
                    glassLid.mesh.position.copy(localPos);
                } else {
                    glassLid.mesh.position.copy(targetWorldPos);
                }
            }
        }
        // Phase 2: Lid closes (1500-2500ms)
        else if (elapsed < vinylDescentDuration + lidCloseDuration) {
            const lidElapsed = elapsed - vinylDescentDuration;
            lidClosingProgress = lidElapsed / lidCloseDuration;

            // Track the platter position (model is now collapsed)
            const turntablePlatter = components.find(c => c.name === 'Turntable Platter');
            if (turntablePlatter) {
                const platterBox = new THREE.Box3().setFromObject(turntablePlatter.mesh);
                const platterCenter = new THREE.Vector3();
                platterBox.getCenter(platterCenter);

                // Vinyl rests on platter
                projectVinyl.position.set(
                    platterCenter.x,
                    platterBox.max.y + 1,
                    platterCenter.z
                );
            }

            // Find and animate the glass lid
            const glassLid = components.find(c => c.name === 'Glass Lid');
            if (glassLid) {
                // Reset lid to original color (clear glass)
                if (glassLid.mesh.material && glassLid.originalColor !== null) {
                    const originalColor = new THREE.Color(glassLid.originalColor);
                    glassLid.mesh.material.color.copy(originalColor);

                    // Reset emissive
                    if (glassLid.mesh.material.emissive) {
                        glassLid.mesh.material.emissive.setHex(0x000000);
                        glassLid.mesh.material.emissiveIntensity = 0;
                    }
                }

                // Lid should close (move down from exploded position to base position)
                const lidEased = lidClosingProgress < 0.5
                    ? 2 * lidClosingProgress * lidClosingProgress
                    : 1 - Math.pow(-2 * lidClosingProgress + 2, 2) / 2;

                // Smoothly animate lid from exploded position to closed position
                const explosionDistance = 50;
                const startOffset = glassLid.order * explosionDistance; // Full exploded position
                const endOffset = 0; // Closed position
                const currentOffset = startOffset + (endOffset - startOffset) * lidEased;

                const targetWorldPos = glassLid.baseWorldPos.clone();
                targetWorldPos.y += currentOffset;

                if (glassLid.parent) {
                    const parentWorldMatrix = new THREE.Matrix4();
                    glassLid.parent.updateMatrixWorld();
                    parentWorldMatrix.copy(glassLid.parent.matrixWorld);

                    const parentWorldMatrixInverse = new THREE.Matrix4();
                    parentWorldMatrixInverse.copy(parentWorldMatrix).invert();

                    const localPos = targetWorldPos.clone().applyMatrix4(parentWorldMatrixInverse);
                    glassLid.mesh.position.copy(localPos);
                } else {
                    glassLid.mesh.position.copy(targetWorldPos);
                }
            }
        }
        // Phase 3: Vinyl spins and loads (2500-4500ms)
        else if (elapsed < vinylDescentDuration + lidCloseDuration + vinylSpinDuration) {
            const spinElapsed = elapsed - vinylDescentDuration - lidCloseDuration;
            loadingProgress = spinElapsed / vinylSpinDuration;

            // Track the platter position (model is collapsed)
            const turntablePlatter = components.find(c => c.name === 'Turntable Platter');
            if (turntablePlatter) {
                const platterBox = new THREE.Box3().setFromObject(turntablePlatter.mesh);
                const platterCenter = new THREE.Vector3();
                platterBox.getCenter(platterCenter);

                // Vinyl rests on platter
                projectVinyl.position.set(
                    platterCenter.x,
                    platterBox.max.y + 1,
                    platterCenter.z
                );

                console.log(`Phase 3 - Spinning: rotation=${vinylRotation.toFixed(2)}, progress=${(loadingProgress * 100).toFixed(1)}%`);
            }

            // Keep lid closed during spinning
            const glassLid = components.find(c => c.name === 'Glass Lid');
            if (glassLid) {
                // Reset lid to original color (clear glass)
                if (glassLid.mesh.material && glassLid.originalColor !== null) {
                    const originalColor = new THREE.Color(glassLid.originalColor);
                    glassLid.mesh.material.color.copy(originalColor);

                    // Reset emissive
                    if (glassLid.mesh.material.emissive) {
                        glassLid.mesh.material.emissive.setHex(0x000000);
                        glassLid.mesh.material.emissiveIntensity = 0;
                    }
                }

                const targetWorldPos = glassLid.baseWorldPos.clone();
                if (glassLid.parent) {
                    const parentWorldMatrix = new THREE.Matrix4();
                    glassLid.parent.updateMatrixWorld();
                    parentWorldMatrix.copy(glassLid.parent.matrixWorld);

                    const parentWorldMatrixInverse = new THREE.Matrix4();
                    parentWorldMatrixInverse.copy(parentWorldMatrix).invert();

                    const localPos = targetWorldPos.clone().applyMatrix4(parentWorldMatrixInverse);
                    glassLid.mesh.position.copy(localPos);
                } else {
                    glassLid.mesh.position.copy(targetWorldPos);
                }
            }
        }
        // Phase 4: Complete - show project details
        else {
            isLoadingProject = false;

            // Show project detail overlay after a brief moment
            setTimeout(() => {
                if (currentProject) {
                    showProjectDetail(currentProject);

                    // Remove the vinyl
                    if (projectVinyl) {
                        scene.remove(projectVinyl);
                        projectVinyl = null;
                    }

                    currentProject = null;
                }
            }, 300);
        }
    }

    // Smooth animation towards target state (model collapse/explode)
    const target = isExploded ? 1 : 0;
    const speed = 0.05;
    animationProgress += (target - animationProgress) * speed;

    // Background color transition - black only when exploded AND in reveal mode (collection)
    if (isExploded && revealMode && animationProgress > 0.3) {
        document.body.style.background = 'black';
    } else {
        document.body.style.background = '#ffffff';
    }

    // Update sequential layer reveal (top to bottom, one layer at a time)
    // Only run reveal sequence when in reveal mode
    if (isExploded && revealMode && animationProgress > 0.95) {
        const currentTime = Date.now();

        // Initialize the reveal timer when explosion completes
        if (currentRevealLayer === -1 && revealedLayers.size === 0 && lastLayerRevealTime === 0) {
            lastLayerRevealTime = currentTime;
        }

        // Only advance to next layer if enough time has passed
        if (currentRevealLayer === -1 && revealedLayers.size === 0) {
            // First reveal - wait 0.2s before showing layer 7
            if (currentTime - lastLayerRevealTime >= 200) {
                currentRevealLayer = 7;
                revealedLayers.add(7); // Mark as permanently revealed
                lastLayerRevealTime = currentTime;
            }
        } else if (currentRevealLayer > -3 || (currentRevealLayer === -1 && revealedLayers.size > 0)) {
            // Continue revealing layers with 0.3s delay between each
            if (currentTime - lastLayerRevealTime >= layerRevealDelay) {
                // Determine next layer
                if (currentRevealLayer > 1) {
                    currentRevealLayer -= 1;
                } else if (currentRevealLayer === 1) {
                    currentRevealLayer = -1; // Skip layer 0 (case walls), go to -1
                } else {
                    currentRevealLayer -= 1; // Continue from -1 to -2 to -3
                }

                revealedLayers.add(currentRevealLayer); // Mark as permanently revealed
                lastLayerRevealTime = currentTime;
            }
        }

        // Keep normal lighting - no dramatic dimming
        ambientLight.intensity += (1.0 - ambientLight.intensity) * 0.05;
        mainLight.intensity += (1.2 - mainLight.intensity) * 0.05;
        fillLight.intensity += (0.8 - fillLight.intensity) * 0.05;
        rimLight.intensity += (0.6 - rimLight.intensity) * 0.05;
    } else {
        // Reset reveal sequence when collapsed or not in reveal mode
        currentRevealLayer = -1;
        lastLayerRevealTime = 0;
        revealedLayers.clear(); // Clear all revealed layers

        // Return to normal lighting
        ambientLight.intensity += (1.0 - ambientLight.intensity) * 0.05;
        mainLight.intensity += (1.2 - mainLight.intensity) * 0.05;
        fillLight.intensity += (0.8 - fillLight.intensity) * 0.05;
        rimLight.intensity += (0.6 - rimLight.intensity) * 0.05;
    }

    // Update component positions and colors
    components.forEach(comp => {
        // Skip the glass lid during project loading - it's controlled by the loading sequence
        if (isLoadingProject && comp.name === 'Glass Lid') {
            return; // Don't update lid position, let loading sequence handle it
        }

        // Calculate purely vertical offset - like a technical exploded diagram
        const explosionDistance = 50; // Distance per layer
        const verticalOffset = comp.order * explosionDistance * animationProgress;

        // Calculate target world position (only Y changes)
        const targetWorldPos = comp.baseWorldPos.clone();
        targetWorldPos.y += verticalOffset;

        // Convert world position back to local position
        if (comp.parent) {
            const parentWorldMatrix = new THREE.Matrix4();
            comp.parent.updateMatrixWorld();
            parentWorldMatrix.copy(comp.parent.matrixWorld);

            const parentWorldMatrixInverse = new THREE.Matrix4();
            parentWorldMatrixInverse.copy(parentWorldMatrix).invert();

            const localPos = targetWorldPos.clone().applyMatrix4(parentWorldMatrixInverse);
            comp.mesh.position.copy(localPos);
        } else {
            comp.mesh.position.copy(targetWorldPos);
        }

        // Maintain original rotation and scale
        comp.mesh.quaternion.copy(comp.baseLocalQuat);
        comp.mesh.scale.copy(comp.baseLocalScale);

        // Update material colors (only change colors in reveal mode)
        if (comp.mesh.material && comp.portfolioColor !== null && comp.originalColor !== null) {
            const originalColor = new THREE.Color(comp.originalColor);
            const portfolioColor = new THREE.Color(comp.portfolioColor);
            const darkColor = new THREE.Color(0x0a0a0a);

            if (isExploded && revealMode) {
                // Reveal mode: calculate reveal progress for this specific layer
                let targetRevealProgress = 0;
                if (revealedLayers.has(comp.order)) {
                    targetRevealProgress = 1.0; // Permanently revealed - full brightness
                } else {
                    targetRevealProgress = 0.05; // Not yet revealed - stay dark
                }

                // Store current reveal progress for smooth transition
                if (!comp.mesh.userData.revealProgress) {
                    comp.mesh.userData.revealProgress = targetRevealProgress;
                }

                // Quick lerp to target reveal progress (creates faster fade-in effect)
                comp.mesh.userData.revealProgress += (targetRevealProgress - comp.mesh.userData.revealProgress) * 0.35;
                const layerRevealProgress = comp.mesh.userData.revealProgress;

                // Blend from dark to portfolio color based on reveal progress
                comp.mesh.material.color.copy(darkColor).lerp(portfolioColor, layerRevealProgress);

                // Add strong glow effect for revealed components
                if (comp.mesh.material.emissive) {
                    if (layerRevealProgress > 0.1) {
                        const glowIntensity = 0.5 + Math.sin(Date.now() * 0.002) * 0.1;
                        comp.mesh.material.emissive.copy(portfolioColor).multiplyScalar(0.6 * layerRevealProgress);
                        comp.mesh.material.emissiveIntensity = glowIntensity * layerRevealProgress;
                    } else {
                        comp.mesh.material.emissive.setHex(0x000000);
                        comp.mesh.material.emissiveIntensity = 0;
                    }
                }
            } else {
                // Simple explosion or collapsed: use original colors
                comp.mesh.material.color.copy(originalColor);

                // Reset reveal progress
                if (comp.mesh.userData.revealProgress) {
                    comp.mesh.userData.revealProgress = 0;
                }

                // Reset emissive
                if (comp.mesh.material.emissive) {
                    comp.mesh.material.emissive.setHex(0x000000);
                    comp.mesh.material.emissiveIntensity = 0;
                }
            }
        }

        // Handle PCB groups with children (only change colors in reveal mode)
        if (comp.mesh.children && comp.mesh.children.length > 0 && comp.portfolioColor !== null) {
            const portfolioColor = new THREE.Color(comp.portfolioColor);
            const darkColor = new THREE.Color(0x0a0a0a);

            if (isExploded && revealMode) {
                // Reveal mode: calculate reveal progress
                let targetRevealProgress = 0;
                if (revealedLayers.has(comp.order)) {
                    targetRevealProgress = 1.0;
                } else {
                    targetRevealProgress = 0.05;
                }

                if (!comp.mesh.userData.childRevealProgress) {
                    comp.mesh.userData.childRevealProgress = targetRevealProgress;
                }

                comp.mesh.userData.childRevealProgress += (targetRevealProgress - comp.mesh.userData.childRevealProgress) * 0.35;
                const layerRevealProgress = comp.mesh.userData.childRevealProgress;

                comp.mesh.traverse((child) => {
                    if (child.isMesh && child.material) {
                        if (!child.material.userData.originalColor) {
                            child.material.userData.originalColor = child.material.color.getHex();
                        }

                        // Blend from dark to portfolio color
                        child.material.color.copy(darkColor).lerp(portfolioColor, layerRevealProgress * 0.5);

                        // Add glow effect
                        if (child.material.emissive && layerRevealProgress > 0.1) {
                            const glowIntensity = 0.4 + Math.sin(Date.now() * 0.002) * 0.08;
                            child.material.emissive.copy(portfolioColor).multiplyScalar(0.5 * layerRevealProgress);
                            child.material.emissiveIntensity = glowIntensity * layerRevealProgress;
                        } else if (child.material.emissive) {
                            child.material.emissive.setHex(0x000000);
                            child.material.emissiveIntensity = 0;
                        }
                    }
                });
            } else {
                // Simple explosion or collapsed: use original colors
                comp.mesh.traverse((child) => {
                    if (child.isMesh && child.material) {
                        if (child.material.userData.originalColor) {
                            child.material.color.setHex(child.material.userData.originalColor);
                        }
                        if (child.material.emissive) {
                            child.material.emissive.setHex(0x000000);
                            child.material.emissiveIntensity = 0;
                        }
                    }
                });

                // Reset reveal progress
                if (comp.mesh.userData.childRevealProgress) {
                    comp.mesh.userData.childRevealProgress = 0;
                }
            }
        }
    });
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ViewCube functionality
const viewcube = document.getElementById('viewcube');
const cubeFaces = document.querySelectorAll('.cube-face');

// Camera view positions for each face
// Collapsed state positions (close view)
const cameraViewsCollapsed = {
    front: { position: new THREE.Vector3(0, 90, 380), rotation: { x: 0, y: 0 } },
    back: { position: new THREE.Vector3(0, 90, -380), rotation: { x: 0, y: Math.PI } },
    right: { position: new THREE.Vector3(380, 90, 0), rotation: { x: 0, y: Math.PI / 2 } },
    left: { position: new THREE.Vector3(-380, 90, 0), rotation: { x: 0, y: -Math.PI / 2 } },
    top: { position: new THREE.Vector3(0, 350, 0), rotation: { x: -Math.PI / 2, y: 0 } },
    bottom: { position: new THREE.Vector3(0, -350, 0), rotation: { x: Math.PI / 2, y: 0 } }
};

// Exploded state positions (farther out to show entire anatomy)
const cameraViewsExploded = {
    front: { position: new THREE.Vector3(0, 400, 1200), rotation: { x: 0, y: 0 } },
    back: { position: new THREE.Vector3(0, 400, -1200), rotation: { x: 0, y: Math.PI } },
    right: { position: new THREE.Vector3(1200, 400, 0), rotation: { x: 0, y: Math.PI / 2 } },
    left: { position: new THREE.Vector3(-1200, 400, 0), rotation: { x: 0, y: -Math.PI / 2 } },
    top: { position: new THREE.Vector3(0, 1400, 0), rotation: { x: -Math.PI / 2, y: 0 } },
    bottom: { position: new THREE.Vector3(0, -600, 0), rotation: { x: Math.PI / 2, y: 0 } }
};

// Add click handlers to viewcube faces
let isAnimatingCamera = false;
cubeFaces.forEach(face => {
    face.addEventListener('click', () => {
        const view = face.dataset.view;
        // Use exploded camera positions if model is exploded, otherwise use collapsed positions
        const cameraViews = isExploded ? cameraViewsExploded : cameraViewsCollapsed;
        const targetView = cameraViews[view];

        if (targetView && !isAnimatingCamera) {
            isAnimatingCamera = true;

            // Disable controls during animation
            controls.enabled = false;

            // Animate camera to target position with smooth easing
            const startPosition = camera.position.clone();
            const targetPosition = targetView.position.clone();
            const startTarget = controls.target.clone();
            const targetLookAt = new THREE.Vector3(0, 0, 0);

            // Store the initial camera up vector
            const startUp = camera.up.clone();
            // For top and bottom views, maintain proper up vector
            let targetUp = new THREE.Vector3(0, 1, 0);
            if (view === 'top') {
                targetUp = new THREE.Vector3(0, 0, -1); // Up points backwards when looking down
            } else if (view === 'bottom') {
                targetUp = new THREE.Vector3(0, 0, 1); // Up points forwards when looking up
            }

            const duration = 1500; // Increased from 800ms to 1500ms for smoother transition
            const startTime = Date.now();

            function animateCamera() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // Smoother easing function (ease-in-out)
                const eased = progress < 0.5
                    ? 4 * progress * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 3) / 2;

                // Smoothly interpolate position
                camera.position.lerpVectors(startPosition, targetPosition, eased);

                // Smoothly interpolate up vector
                camera.up.lerpVectors(startUp, targetUp, eased).normalize();

                // Smoothly interpolate look-at target
                const currentTarget = new THREE.Vector3();
                currentTarget.lerpVectors(startTarget, targetLookAt, eased);
                controls.target.copy(currentTarget);
                camera.lookAt(currentTarget);

                if (progress < 1) {
                    requestAnimationFrame(animateCamera);
                } else {
                    // Animation complete - ensure final state is correct
                    camera.position.copy(targetPosition);
                    camera.up.copy(targetUp);
                    controls.target.copy(targetLookAt);
                    camera.lookAt(targetLookAt);

                    // Re-enable controls
                    controls.enabled = true;
                    controls.update();
                    isAnimatingCamera = false;
                }
            }

            animateCamera();
        }
    });
});

// Update viewcube rotation to match camera
function updateViewCube() {
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    // Calculate rotation based on camera position
    const phi = Math.atan2(camera.position.x, camera.position.z);
    const theta = Math.asin(camera.position.y / camera.position.length());

    viewcube.style.transform = `rotateX(${-theta}rad) rotateY(${-phi}rad)`;
}

// Make viewcube draggable to rotate the model
let isDraggingCube = false;
let dragStartTime = 0;
let dragMoved = false;
let previousMousePosition = { x: 0, y: 0 };

viewcube.addEventListener('mousedown', (e) => {
    if (!isAnimatingCamera) {
        isDraggingCube = true;
        dragStartTime = Date.now();
        dragMoved = false;
        previousMousePosition = { x: e.clientX, y: e.clientY };
        e.preventDefault();
        e.stopPropagation();
    }
});

document.addEventListener('mousemove', (e) => {
    if (isDraggingCube && !isAnimatingCamera) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        // Check if mouse has moved enough to consider it a drag
        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
            dragMoved = true;
        }

        if (dragMoved) {
            // Disable controls while dragging
            controls.enabled = false;

            // Calculate rotation speed
            const rotationSpeed = 0.005;

            // Get current camera position
            const radius = camera.position.length();
            const currentPhi = Math.atan2(camera.position.x, camera.position.z);
            const currentTheta = Math.acos(camera.position.y / radius);

            // Apply rotation deltas
            const newPhi = currentPhi + deltaX * rotationSpeed;
            const newTheta = Math.max(0.1, Math.min(Math.PI - 0.1, currentTheta + deltaY * rotationSpeed));

            // Convert back to Cartesian coordinates
            camera.position.x = radius * Math.sin(newTheta) * Math.sin(newPhi);
            camera.position.y = radius * Math.cos(newTheta);
            camera.position.z = radius * Math.sin(newTheta) * Math.cos(newPhi);

            // Update camera to look at center
            camera.lookAt(0, 0, 0);
            controls.target.set(0, 0, 0);

            previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    }
});

document.addEventListener('mouseup', (e) => {
    if (isDraggingCube) {
        // Re-enable controls
        controls.enabled = true;
        controls.update();

        // If it was a click (not a drag), let the face click handler work
        if (!dragMoved && e.target && e.target.classList.contains('cube-face')) {
            // Click will be handled by the face click listener
        }

        isDraggingCube = false;
        dragMoved = false;
    }
});

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    updateAnimation();
    updateLabels();
    updateViewCube();
    renderer.render(scene, camera);
}

animate();
