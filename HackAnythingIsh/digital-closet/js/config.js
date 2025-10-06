// Global variables
let clothingItems = JSON.parse(localStorage.getItem('clueless-closet-items') || '[]');
let currentWeather = null;
let selectedOutfit = {};
let model = null;
let styleModel = null;
let processedImages = [];
let currentCamera = null;
let userPreferences = {
    colors: JSON.parse(localStorage.getItem('preferred-colors') || '[]'),
    styles: JSON.parse(localStorage.getItem('preferred-styles') || '[]')
};

// Canvas pool for efficient image processing
const canvasPool = [];
const CANVAS_POOL_SIZE = 5;

// AR global variables
let arActive = false;
let arPoseDetector = null;
let arAnimationFrame = null;
let arClothingOpacity = 1.0;
let arClothingScale = 1.0;
let arDebugMode = false;
let currentEditingItemId = null;

// AR Transform settings
const arTransforms = {
    opacity: 1.0,
    scale: 1.0,
    offsetY: 0,
    widthMult: 1.6
};

// Category definitions matching Teachable Machine model
const CATEGORIES = {
    'tops': ['long sleeve shirt', 'short sleeve shirt', 'tank', 'sweater'],
    'bottoms': ['pants', 'shorts', 'long skirt', 'short skirt'],
    'dresses': ['long dress', 'short dress'],
    'outerwear': ['coat'],
    'shoes': ['shoes'],
    'accessories': ['bag', 'glasses']
};
