// Teachable Machine model loading and image classification

// Wait for libraries to load
function waitForLibraries() {
    return new Promise((resolve) => {
        const checkLibraries = () => {
            if (typeof tf !== 'undefined' && typeof tmImage !== 'undefined') {
                console.log('Libraries loaded:', { tf: typeof tf, tmImage: typeof tmImage });
                resolve();
            } else {
                console.log('Waiting for libraries...', { tf: typeof tf, tmImage: typeof tmImage });
                setTimeout(checkLibraries, 500);
            }
        };
        checkLibraries();
    });
}

// Load Teachable Machine Model
async function loadTeachableMachineModel() {
    try {
        console.log('Loading Teachable Machine models...');

        // Wait for libraries to be available
        await waitForLibraries();

        const itemModelURL = 'https://teachablemachine.withgoogle.com/models/jyXDTYz6M/model.json';
        const itemMetadataURL = 'https://teachablemachine.withgoogle.com/models/jyXDTYz6M/metadata.json';

        const styleModelURL = 'https://teachablemachine.withgoogle.com/models/18jaLQpyB/model.json';
        const styleMetadataURL = 'https://teachablemachine.withgoogle.com/models/18jaLQpyB/metadata.json';

        // Double-check libraries are available
        if (typeof tmImage === 'undefined') {
            throw new Error('Teachable Machine Image library not available after waiting');
        }

        if (typeof tf === 'undefined') {
            throw new Error('TensorFlow.js library not available after waiting');
        }

        console.log('Loading item classification model from:', itemModelURL);
        model = await tmImage.load(itemModelURL, itemMetadataURL);
        console.log('Item model loaded successfully');
        console.log('Item model class names:', model.getClassLabels());

        console.log('Loading style classification model from:', styleModelURL);
        styleModel = await tmImage.load(styleModelURL, styleMetadataURL);
        console.log('Style model loaded successfully');
        console.log('Style model class names:', styleModel.getClassLabels());

        // Add visual confirmation
        showNotification('AI models loaded successfully! Ready to classify clothing.', 'success');

        // Update status indicator
        updateModelStatus('loaded');
    } catch (error) {
        console.error('Failed to load Teachable Machine models:', error);
        showNotification('Failed to load AI models. Classification will use fallback method.', 'warning');
        model = null;
        styleModel = null;

        // Update status indicator
        updateModelStatus('failed');
    }
}

// Classify image using Teachable Machine models
async function classifyImage(imageData) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = async () => {
            let canvas = null;
            try {
                if (model) {
                    // Get canvas from pool for efficient reuse
                    canvas = getCanvas();
                    const ctx = canvas.getContext('2d');

                    // Draw and resize the image to 224x224
                    ctx.drawImage(img, 0, 0, 224, 224);

                    // Get predictions from the item classification model
                    const itemPredictions = await model.predict(canvas);

                    // Sort predictions by probability and get top results
                    const sortedItemPredictions = itemPredictions.sort((a, b) => b.probability - a.probability);
                    const topItemPrediction = sortedItemPredictions[0];

                    // Clean up the category name (remove any extra spaces, make lowercase)
                    const category = topItemPrediction.className.toLowerCase().trim();
                    const confidence = topItemPrediction.probability;

                    // Get style from second model if available, otherwise use fallback
                    let style;
                    if (styleModel) {
                        const stylePredictions = await styleModel.predict(canvas);
                        const sortedStylePredictions = stylePredictions.sort((a, b) => b.probability - a.probability);
                        const topStylePrediction = sortedStylePredictions[0];
                        style = topStylePrediction.className.toLowerCase().trim();
                    } else {
                        // Fallback to determineStyle function if style model not loaded
                        style = determineStyle(category);
                    }

                    // Only proceed with classification if confidence is reasonable
                    if (confidence < 0.1) {
                        console.warn('Low confidence prediction, using fallback');
                        resolve({
                            category: 'clothing',
                            confidence: confidence,
                            color: await analyzeColor(img, 'clothing'),
                            style: 'casual',
                            timestamp: Date.now()
                        });
                        return;
                    }

                    // Determine color based on image analysis
                    const color = await analyzeColor(img, category);

                    const finalResult = {
                        category: category,
                        confidence: confidence,
                        color: color,
                        style: style,
                        timestamp: Date.now()
                    };

                    // Release canvas back to pool
                    if (canvas) releaseCanvas(canvas);

                    resolve(finalResult);
                } else {
                    console.warn('Models not loaded, using fallback classification');

                    // Enhanced fallback classification
                    resolve({
                        category: 'clothing',
                        confidence: 0.7,
                        color: await analyzeColor(img, 'clothing'),
                        style: 'casual',
                        timestamp: Date.now()
                    });
                }
            } catch (error) {
                console.error('Classification error:', error);

                // Release canvas even on error
                if (canvas) releaseCanvas(canvas);

                resolve({
                    category: 'clothing',
                    confidence: 0.5,
                    color: 'unknown',
                    style: 'casual',
                    timestamp: Date.now()
                });
            }
        };
        img.crossOrigin = 'anonymous'; // Handle CORS issues
        img.src = imageData;
    });
}

// Advanced color analysis using canvas pixel data
async function analyzeColor(img, category) {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Sample pixels from the center area (where clothing usually is)
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const sampleSize = Math.min(canvas.width, canvas.height) / 4;

        let r = 0, g = 0, b = 0, count = 0;

        // Sample pixels in a grid pattern
        for (let x = centerX - sampleSize/2; x < centerX + sampleSize/2; x += 10) {
            for (let y = centerY - sampleSize/2; y < centerY + sampleSize/2; y += 10) {
                if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
                    const pixel = ctx.getImageData(x, y, 1, 1).data;
                    r += pixel[0];
                    g += pixel[1];
                    b += pixel[2];
                    count++;
                }
            }
        }

        if (count === 0) return 'unknown';

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        // Convert RGB to color name
        return rgbToColorName(r, g, b);
    } catch (error) {
        console.error('Color analysis error:', error);
        return 'blue'; // Default fallback
    }
}

// Convert RGB values to human-readable color names
function rgbToColorName(r, g, b) {
    // Calculate color distances and determine closest color
    const colors = {
        'black': [0, 0, 0],
        'white': [255, 255, 255],
        'red': [255, 0, 0],
        'blue': [0, 0, 255],
        'green': [0, 128, 0],
        'yellow': [255, 255, 0],
        'purple': [128, 0, 128],
        'pink': [255, 192, 203],
        'orange': [255, 165, 0],
        'brown': [139, 69, 19],
        'gray': [128, 128, 128],
        'navy': [0, 0, 128],
        'beige': [245, 245, 220],
        'maroon': [128, 0, 0]
    };

    let closestColor = 'black';
    let minDistance = Infinity;

    for (const [colorName, [cr, cg, cb]] of Object.entries(colors)) {
        const distance = Math.sqrt(
            Math.pow(r - cr, 2) +
            Math.pow(g - cg, 2) +
            Math.pow(b - cb, 2)
        );

        if (distance < minDistance) {
            minDistance = distance;
            closestColor = colorName;
        }
    }

    return closestColor;
}

// Determine style based on category - Fallback function (style is now determined by second model)
function determineStyle(category) {
    const categoryLower = category.toLowerCase();

    // Direct mapping for fallback when style model is not available
    const modelStyleMap = {
        // Formal items
        'long dress': 'formal',
        'short dress': 'formal',
        'coat': 'formal',

        // Casual items
        'long sleeve shirt': 'casual',
        'sweater': 'casual',
        'short sleeve shirt': 'casual',
        'tank': 'casual',
        'shorts': 'casual',
        'pants': 'casual',
        'long skirt': 'casual',
        'short skirt': 'casual',

        // Athletic
        'shoes': 'athletic',

        // Trendy/Accessories
        'bag': 'trendy',

        // Minimalist
        'glasses': 'minimalist'
    };

    // Check direct mapping first
    if (modelStyleMap[categoryLower]) {
        return modelStyleMap[categoryLower];
    }

    // Fallback style detection based on keywords
    const styleKeywords = {
        'formal': ['dress', 'coat', 'suit'],
        'casual': ['shirt', 'sleeve', 'sweater', 'tank', 'shorts', 'pants', 'skirt'],
        'athletic': ['athletic', 'sport', 'shoes', 'sneaker'],
        'trendy': ['bag', 'accessory', 'designer'],
        'minimalist': ['glasses', 'plain', 'simple', 'basic'],
        'vintage': ['vintage', 'retro', 'classic']
    };

    // Check keywords
    for (const [style, keywords] of Object.entries(styleKeywords)) {
        if (keywords.some(keyword => categoryLower.includes(keyword))) {
            return style;
        }
    }

    // Smart defaults based on clothing type
    if (categoryLower.includes('dress')) {
        return 'formal';
    } else if (categoryLower.includes('sleeve') || categoryLower.includes('sweater')) {
        return 'casual';
    } else if (categoryLower.includes('tank') || categoryLower.includes('shorts')) {
        return 'casual';
    } else {
        return 'casual'; // Default fallback
    }
}
