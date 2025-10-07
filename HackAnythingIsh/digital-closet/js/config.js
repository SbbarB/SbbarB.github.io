// ========== GLOBAL STATE VARIABLES ==========

// Clothing items stored in localStorage
let clothingItems = JSON.parse(localStorage.getItem('clueless-closet-items') || '[]');

// Current weather data from API
let currentWeather = null;

// Selected outfit items by category
let selectedOutfit = {};

// Teachable Machine AI models
let model = null;          // Item classification model
let styleModel = null;     // Style classification model

// Temporary storage for images being processed
let processedImages = [];

// Camera stream reference
let currentCamera = null;

// User style preferences stored in localStorage
let userPreferences = {
    colors: JSON.parse(localStorage.getItem('preferred-colors') || '[]'),
    styles: JSON.parse(localStorage.getItem('preferred-styles') || '[]')
};

// ========== CANVAS POOLING ==========
// Reuse canvas elements for efficient image processing
const canvasPool = [];
const CANVAS_POOL_SIZE = 5;

// ========== AR/VIRTUAL TRY-ON VARIABLES ==========
let arActive = false;
let arPoseDetector = null;
let arAnimationFrame = null;
let arClothingOpacity = 1.0;
let arClothingScale = 1.0;
let arDebugMode = false;
let currentEditingItemId = null;

// AR transform settings for clothing overlay
const arTransforms = {
    opacity: 1.0,
    scale: 1.0,
    offsetY: 0,
    widthMult: 1.6
};

// ========== CATEGORY DEFINITIONS ==========
// Maps UI categories to AI model class labels
const CATEGORIES = {
    'tops': ['long sleeve shirt', 'short sleeve shirt', 'tank', 'sweater'],
    'bottoms': ['pants', 'shorts', 'long skirt', 'short skirt'],
    'dresses': ['long dress', 'short dress'],
    'outerwear': ['coat'],
    'shoes': ['shoes'],
    'accessories': ['bag', 'glasses']
};
