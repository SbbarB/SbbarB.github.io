// ===============================================
// AR TRY-ON MODULE
// MediaPipe-powered virtual clothing try-on
// ===============================================

// AR Variables
let arPoseLandmarker = null;
let arObjectDetector = null;
let arCameraStream = null;
let arProcessedClothing = null;
let arDetectionActive = false;
let arClothingVisible = true;
let arDebugMode = false;
let arFrameSkipCounter = 0;
let arFrameCount = 0;
let arLastTime = performance.now();
let arClothingTransform = { scale: 1, offsetY: 0, width: 1.6 };

// ===============================================
// INITIALIZATION
// ===============================================

/**
 * Initialize AR MediaPipe models for pose and object detection
 */
async function initializeARModels() {
    try {
        console.log('🧠 Loading AR MediaPipe models...');
        const { PoseLandmarker, FilesetResolver } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8');

        updateARStatus('arPoseStatus', 'loading', 'Loading MediaPipe...');
        const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
        );

        updateARStatus('arPoseStatus', 'loading', 'Loading pose landmarker...');
        arPoseLandmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
                delegate: 'GPU'
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        updateARStatus('arPoseStatus', 'ready', 'Pose Detection: Ready');

        console.log('✅ AR MediaPipe models loaded successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to load AR MediaPipe models:', error);
        updateARStatus('arPoseStatus', 'error', 'Pose Detection: Failed');
        return false;
    }
}

/**
 * Update AR status indicators
 */
function updateARStatus(elementId, status, message) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const dot = element.querySelector('.arStatusDot');
    const text = element.querySelector('span:last-child');

    if (dot) {
        dot.style.backgroundColor = status === 'loading' ? '#fbbf24' : status === 'ready' ? '#10b981' : '#ef4444';
        dot.style.animation = status === 'loading' ? 'pulse 1.5s infinite' : 'none';
    }
    if (text) text.textContent = message;
}

// ===============================================
// AR SESSION MANAGEMENT
// ===============================================

/**
 * Start AR Try-On session
 */
async function startARTryOn() {
    try {
        console.log('🚀 Starting AR Try-On...');

        // Check if outfit is selected
        if (Object.keys(selectedOutfit).length === 0) {
            alert('Please select some clothing items first from your closet or "Pick Outfit" tab!');
            return;
        }

        // Initialize models if needed
        if (!arPoseLandmarker) await initializeARModels();

        // Process outfit for AR
        await processOutfitForAR();

        // Start camera
        await startARCamera();

        // Show fullscreen AR view
        document.getElementById('arFullscreen').classList.remove('hidden');
        document.getElementById('arControlsPanel').style.display = 'block';

        // Update outfit display
        updateAROutfitDisplay();

        console.log('✅ AR Try-On started');
    } catch (error) {
        console.error('❌ AR Try-On failed to start:', error);
        alert('Failed to start AR Try-On: ' + error.message);
    }
}

/**
 * Exit AR mode
 */
function exitAR() {
    console.log('❌ Exiting AR mode...');
    arDetectionActive = false;

    // Stop camera stream
    if (arCameraStream) {
        arCameraStream.getTracks().forEach(track => track.stop());
        arCameraStream = null;
    }

    // Hide AR UI
    document.getElementById('arFullscreen').classList.add('hidden');
    document.getElementById('arControlsPanel').style.display = 'none';
    document.getElementById('arDebugInfo').style.display = 'none';

    // Clear canvas
    const canvas = document.getElementById('arOverlayCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    console.log('✅ AR mode exited');
}

// ===============================================
// OUTFIT PROCESSING
// ===============================================

/**
 * Process selected outfit for AR display
 */
async function processOutfitForAR() {
    const outfitItems = Object.values(selectedOutfit).filter(Boolean);
    if (outfitItems.length === 0) return;

    arProcessedClothing = [];

    for (const item of outfitItems) {
        // Remove background from clothing image
        const processedImageData = await removeClothingBackgroundAR(item.image);

        const processedItem = {
            image: processedImageData,
            originalImage: item.image,
            category: item.category,
            mesh: await generateClothingMeshForAR(processedImageData),
            id: item.id || Date.now()
        };

        arProcessedClothing.push(processedItem);
    }

    console.log('✅ Outfit processed for AR:', arProcessedClothing.length, 'items');
}

/**
 * Remove background from clothing images for better AR overlay
 */
async function removeClothingBackgroundAR(imageUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;

            ctx.drawImage(img, 0, 0);

            // Apply background removal
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const width = canvas.width;
            const height = canvas.height;

            // Sample edge pixels for background detection
            const edgePixels = [];
            for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 20))) {
                edgePixels.push({ x, y: 0 });
                edgePixels.push({ x, y: height - 1 });
            }
            for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 20))) {
                edgePixels.push({ x: 0, y });
                edgePixels.push({ x: width - 1, y });
            }

            // Get background color samples
            const backgroundColors = [];
            edgePixels.forEach(pixel => {
                const index = (pixel.y * width + pixel.x) * 4;
                backgroundColors.push({
                    r: data[index],
                    g: data[index + 1],
                    b: data[index + 2]
                });
            });

            // Remove background pixels
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];

                // Check if pixel matches background
                for (const bg of backgroundColors) {
                    const colorDiff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
                    const brightness = (r + g + b) / 3;
                    const bgBrightness = (bg.r + bg.g + bg.b) / 3;
                    const brightnessDiff = Math.abs(brightness - bgBrightness);

                    let threshold = 80;
                    if (brightness < 50 || brightness > 200) threshold = 120;

                    if (colorDiff < threshold && brightnessDiff < 40) {
                        data[i + 3] = 0; // Make transparent
                        break;
                    }
                }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.src = imageUrl;
    });
}

/**
 * Generate mesh data for clothing item
 */
async function generateClothingMeshForAR(imageUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const mesh = {
                vertices: [],
                faces: [],
                image: img,
                width: img.width,
                height: img.height
            };

            // Simple quad mesh
            const w = 1.0, h = (img.height / img.width);
            mesh.vertices = [-w/2, -h/2, 0, w/2, -h/2, 0, w/2, h/2, 0, -w/2, h/2, 0];
            mesh.faces = [0, 1, 2, 0, 2, 3];

            resolve(mesh);
        };
        img.src = imageUrl;
    });
}

// ===============================================
// CAMERA AND DETECTION
// ===============================================

/**
 * Start AR camera stream
 */
async function startARCamera() {
    try {
        console.log('📹 Starting AR camera...');

        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            },
            audio: false
        };

        arCameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        const video = document.getElementById('arCameraVideo');
        video.srcObject = arCameraStream;

        video.onloadedmetadata = () => {
            video.play();
            setupARCanvas();
            startARDetectionLoop();
        };

        console.log('✅ AR Camera started');
    } catch (error) {
        console.error('❌ AR Camera error:', error);
        throw error;
    }
}

/**
 * Setup AR overlay canvas
 */
function setupARCanvas() {
    const video = document.getElementById('arCameraVideo');
    const canvas = document.getElementById('arOverlayCanvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    console.log('📐 AR Canvas setup:', canvas.width, 'x', canvas.height);
}

/**
 * Start detection loop
 */
function startARDetectionLoop() {
    if (!arDetectionActive) {
        arDetectionActive = true;
        requestAnimationFrame(arDetectionFrame);
    }
}

/**
 * AR detection frame loop
 */
async function arDetectionFrame() {
    if (!arDetectionActive || !arCameraStream) return;

    const video = document.getElementById('arCameraVideo');
    const canvas = document.getElementById('arOverlayCanvas');
    const ctx = canvas.getContext('2d');

    // Frame skipping for performance
    arFrameSkipCounter++;
    if (arFrameSkipCounter % 3 !== 0) {
        requestAnimationFrame(arDetectionFrame);
        return;
    }

    try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (arPoseLandmarker && video.readyState >= 2) {
            const currentTime = performance.now();
            const results = arPoseLandmarker.detectForVideo(video, currentTime);

            if (results.landmarks && results.landmarks.length > 0) {
                const landmarks = results.landmarks[0];

                // Draw debug skeleton if enabled
                if (arDebugMode) {
                    drawARPoseSkeleton(ctx, landmarks, canvas.width, canvas.height);
                }

                // Draw clothing items
                if (arProcessedClothing && arProcessedClothing.length > 0 && arClothingVisible) {
                    await drawARClothingItems(ctx, landmarks, canvas.width, canvas.height);
                }

                // Update debug info
                if (document.getElementById('arPersonDetected')) {
                    document.getElementById('arPersonDetected').textContent = '✅';
                }
                if (document.getElementById('arBodyParts')) {
                    document.getElementById('arBodyParts').textContent = landmarks.length;
                }
            } else {
                if (document.getElementById('arPersonDetected')) {
                    document.getElementById('arPersonDetected').textContent = '❌';
                }
                if (document.getElementById('arBodyParts')) {
                    document.getElementById('arBodyParts').textContent = '0';
                }
            }
        }

        // Update clothing active status
        if (document.getElementById('arClothingActive')) {
            document.getElementById('arClothingActive').textContent =
                (arProcessedClothing && arProcessedClothing.length > 0 && arClothingVisible) ? '✅' : '❌';
        }

        arFrameCount++;
    } catch (error) {
        console.error('❌ AR Detection error:', error);
    }

    requestAnimationFrame(arDetectionFrame);
}

// ===============================================
// CLOTHING RENDERING
// ===============================================

/**
 * Draw all AR clothing items
 */
async function drawARClothingItems(ctx, landmarks, width, height) {
    if (!arProcessedClothing || !landmarks || arProcessedClothing.length === 0) {
        return;
    }

    // Draw each clothing item in its appropriate location
    for (const clothingItem of arProcessedClothing) {
        await drawSingleARClothingItem(ctx, clothingItem, landmarks, width, height);
    }
}

/**
 * Draw a single AR clothing item mapped to body
 */
async function drawSingleARClothingItem(ctx, clothingItem, landmarks, width, height) {
    const categoryLower = clothingItem.category.toLowerCase();

    // Get key body landmarks
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];

    if (!leftShoulder || !rightShoulder) return;

    // User adjustments
    const userScale = arClothingTransform.scale;
    const userOffsetY = arClothingTransform.offsetY;
    const userWidthMult = arClothingTransform.width;

    ctx.save();
    ctx.globalAlpha = 0.85;

    // Draw based on category
    if (['shirt', 'top', 'blouse', 'jacket', 'coat', 'sweater', 'hoodie'].includes(categoryLower)) {
        // TOPS
        if (!leftHip || !rightHip) return;

        const centerX = (leftShoulder.x + rightShoulder.x) / 2 * width;
        const topY = Math.min(leftShoulder.y, rightShoulder.y) * height - 30;
        const imgWidth = Math.abs(rightShoulder.x - leftShoulder.x) * width * 1.4 * userWidthMult;
        const hipY = (leftHip.y + rightHip.y) / 2 * height;
        const imgHeight = (hipY - topY + 20) * userScale;

        ctx.drawImage(
            clothingItem.mesh.image,
            centerX - imgWidth / 2,
            topY + userOffsetY,
            imgWidth,
            imgHeight
        );
    }
    else if (['pants', 'jeans', 'trousers', 'shorts', 'leggings'].includes(categoryLower)) {
        // BOTTOMS
        if (!leftHip || !rightHip || !leftAnkle || !rightAnkle) return;

        const centerX = (leftHip.x + rightHip.x) / 2 * width;
        const topY = (leftHip.y + rightHip.y) / 2 * height - 40;
        const imgWidth = Math.abs(rightHip.x - leftHip.x) * width * 1.3 * userWidthMult;
        const ankleY = (leftAnkle.y + rightAnkle.y) / 2 * height;
        const imgHeight = (ankleY - topY) * userScale;

        ctx.drawImage(
            clothingItem.mesh.image,
            centerX - imgWidth / 2,
            topY + userOffsetY,
            imgWidth,
            imgHeight
        );
    }
    else if (['dress', 'skirt', 'jumpsuit', 'romper'].includes(categoryLower)) {
        // DRESSES
        if (!leftHip || !rightHip || !leftKnee || !rightKnee) return;

        const centerX = (leftShoulder.x + rightShoulder.x) / 2 * width;
        const topY = Math.min(leftShoulder.y, rightShoulder.y) * height - 30;
        const imgWidth = Math.abs(rightShoulder.x - leftShoulder.x) * width * 1.5 * userWidthMult;
        const kneeY = (leftKnee.y + rightKnee.y) / 2 * height;
        const imgHeight = (kneeY - topY) * userScale;

        ctx.drawImage(
            clothingItem.mesh.image,
            centerX - imgWidth / 2,
            topY + userOffsetY,
            imgWidth,
            imgHeight
        );
    }
    else {
        // DEFAULT: draw at shoulder
        const centerX = (leftShoulder.x + rightShoulder.x) / 2 * width;
        const topY = leftShoulder.y * height;
        const imgWidth = Math.abs(rightShoulder.x - leftShoulder.x) * width * 1.5 * userWidthMult;
        const imgHeight = imgWidth * (clothingItem.mesh.image.height / clothingItem.mesh.image.width) * userScale;

        ctx.drawImage(
            clothingItem.mesh.image,
            centerX - imgWidth / 2,
            topY + userOffsetY,
            imgWidth,
            imgHeight
        );
    }

    ctx.restore();
}

// ===============================================
// DEBUG AND VISUALIZATION
// ===============================================

/**
 * Draw pose skeleton for debugging
 */
function drawARPoseSkeleton(ctx, landmarks, width, height) {
    ctx.fillStyle = '#00ff00';
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;

    // Define key points with colors and labels
    const keyPoints = [
        { indices: [11, 12], color: '#ff0000', label: 'Shoulders' },
        { indices: [13, 14], color: '#ff8800', label: 'Elbows' },
        { indices: [15, 16], color: '#ffff00', label: 'Wrists' },
        { indices: [23, 24], color: '#00ff00', label: 'Hips' },
        { indices: [25, 26], color: '#0088ff', label: 'Knees' },
        { indices: [27, 28], color: '#8800ff', label: 'Ankles' },
        { indices: [0], color: '#ff00ff', label: 'Nose' }
    ];

    // Draw points with different colors
    keyPoints.forEach(({ indices, color, label }) => {
        ctx.fillStyle = color;
        indices.forEach(index => {
            if (landmarks[index]) {
                const x = landmarks[index].x * width;
                const y = landmarks[index].y * height;
                ctx.beginPath();
                ctx.arc(x, y, 6, 0, 2 * Math.PI);
                ctx.fill();

                // Add labels
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px Arial';
                ctx.fillText(`${label}${indices.length > 1 ? (index === indices[0] ? '-L' : '-R') : ''}`, x + 10, y - 10);
                ctx.fillStyle = color;
            }
        });
    });

    // Draw connections
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    const connections = [
        [11, 12], // shoulders
        [11, 13], [13, 15], // left arm
        [12, 14], [14, 16], // right arm
        [11, 23], [12, 24], // shoulder to hip
        [23, 24], // hips
        [23, 25], [25, 27], // left leg
        [24, 26], [26, 28]  // right leg
    ];

    connections.forEach(([from, to]) => {
        if (landmarks[from] && landmarks[to]) {
            ctx.beginPath();
            ctx.moveTo(landmarks[from].x * width, landmarks[from].y * height);
            ctx.lineTo(landmarks[to].x * width, landmarks[to].y * height);
            ctx.stroke();
        }
    });
}

// ===============================================
// UI CONTROLS
// ===============================================

/**
 * Update AR outfit display
 */
function updateAROutfitDisplay() {
    const container = document.getElementById('arCurrentOutfitDisplay');
    const outfitItems = Object.values(selectedOutfit).filter(Boolean);

    if (outfitItems.length === 0) {
        container.innerHTML = '<p class="text-sm text-white/60">No outfit selected</p>';
        return;
    }

    container.innerHTML = `
        <div class="text-sm text-white font-medium mb-2">AR Outfit (${outfitItems.length} items):</div>
        ${outfitItems.map(item => `<div class="text-xs text-white/80 mb-1">• ${item.category}</div>`).join('')}
    `;
}

/**
 * Update AR clothing transform settings
 */
function updateARClothingTransform() {
    const scale = parseFloat(document.getElementById('arScaleSlider').value);
    const offsetY = parseInt(document.getElementById('arOffsetSlider').value);
    const width = parseFloat(document.getElementById('arWidthSlider').value);

    arClothingTransform = { scale, offsetY, width };

    document.getElementById('arScaleValue').textContent = scale.toFixed(1);
    document.getElementById('arOffsetValue').textContent = offsetY;
    document.getElementById('arWidthValue').textContent = width.toFixed(1);
}

/**
 * Toggle clothing visibility
 */
function toggleARClothing() {
    arClothingVisible = !arClothingVisible;
    document.getElementById('arToggleBtn').style.backgroundColor = arClothingVisible ? '#7c3aed' : '#6b7280';
}

/**
 * Reset AR transform to defaults
 */
function resetARTransform() {
    arClothingTransform = { scale: 1, offsetY: 0, width: 1.6 };
    document.getElementById('arScaleSlider').value = 1;
    document.getElementById('arOffsetSlider').value = 0;
    document.getElementById('arWidthSlider').value = 1.6;
    updateARClothingTransform();
}

/**
 * Toggle debug mode
 */
function toggleARDebugMode() {
    arDebugMode = !arDebugMode;
    document.getElementById('arDebugInfo').style.display = arDebugMode ? 'block' : 'none';
    document.getElementById('arDebugBtn').style.backgroundColor = arDebugMode ? '#dc2626' : '#4b5563';
}

// ===============================================
// FPS COUNTER
// ===============================================

// Update FPS counter every second
setInterval(() => {
    const currentTime = performance.now();
    const fps = Math.round(arFrameCount * 1000 / (currentTime - arLastTime));
    const fpsCounter = document.getElementById('arFpsCounter');
    if (fpsCounter) fpsCounter.textContent = fps;
    arFrameCount = 0;
    arLastTime = currentTime;
}, 1000);
