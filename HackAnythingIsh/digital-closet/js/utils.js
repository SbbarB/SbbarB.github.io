// ========== UTILITY FUNCTIONS ==========

// ===== CANVAS POOLING =====
// Get reusable canvas from pool for image processing
function getCanvas() {
    if (canvasPool.length > 0) {
        return canvasPool.pop();
    }
    const canvas = document.createElement('canvas');
    canvas.width = 224;
    canvas.height = 224;
    return canvas;
}

// Return canvas to pool after use
function releaseCanvas(canvas) {
    if (canvasPool.length < CANVAS_POOL_SIZE) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvasPool.push(canvas);
    }
}

// ===== TAB NAVIGATION =====
// Switch between main app sections
function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });

    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
        btn.classList.add('bg-white/10', 'text-white/80');
        btn.classList.remove('bg-white/20', 'text-white');
    });

    // Show selected tab
    document.getElementById(tabName + '-tab').classList.remove('hidden');

    // Add active class to selected tab button
    const activeTab = document.getElementById('tab-' + tabName);
    activeTab.classList.add('active');
    activeTab.classList.remove('bg-white/10', 'text-white/80');
    activeTab.classList.add('bg-white/20', 'text-white');

    // Render dynamic content when switching tabs
    if (tabName === 'outfit') {
        renderOutfitCategories();
    } else if (tabName === 'tryon') {
        displayCurrentOutfit();
    }
}

// ===== UI UPDATES =====
// Update closet item count in header
function updateItemCount() {
    document.getElementById('itemCount').textContent = clothingItems.length;
}

// ===== USER PREFERENCES =====
// Toggle color preference on/off
function toggleColorPreference(color) {
    const index = userPreferences.colors.indexOf(color);
    if (index > -1) {
        userPreferences.colors.splice(index, 1);
    } else {
        userPreferences.colors.push(color);
    }
    localStorage.setItem('preferred-colors', JSON.stringify(userPreferences.colors));
    updatePreferenceButtons();
}

// Toggle style preference on/off
function toggleStylePreference(style) {
    const index = userPreferences.styles.indexOf(style);
    if (index > -1) {
        userPreferences.styles.splice(index, 1);
    } else {
        userPreferences.styles.push(style);
    }
    localStorage.setItem('preferred-styles', JSON.stringify(userPreferences.styles));
    updatePreferenceButtons();
}

// Update visual state of preference buttons
function updatePreferenceButtons() {
    // Highlight selected color preferences
    document.querySelectorAll('.color-pref').forEach(button => {
        const color = button.textContent.toLowerCase();
        if (userPreferences.colors.includes(color)) {
            button.classList.add('border-yellow-400');
            button.classList.remove('border-transparent');
        } else {
            button.classList.remove('border-yellow-400');
            button.classList.add('border-transparent');
        }
    });

    // Highlight selected style preferences
    document.querySelectorAll('.style-pref').forEach(button => {
        const style = button.textContent.toLowerCase();
        if (userPreferences.styles.includes(style)) {
            button.classList.add('border-yellow-400', 'bg-white/30');
            button.classList.remove('border-transparent', 'bg-white/20');
        } else {
            button.classList.remove('border-yellow-400', 'bg-white/30');
            button.classList.add('border-transparent', 'bg-white/20');
        }
    });
}

// ===== NOTIFICATIONS =====
// Display toast notification with icon and color by type
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg text-white max-w-sm ${
        type === 'error' ? 'bg-red-500' :
        type === 'warning' ? 'bg-yellow-500' :
        type === 'success' ? 'bg-green-500' :
        'bg-blue-500'
    }`;
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            <span class="text-lg">${
                type === 'error' ? '❌' :
                type === 'warning' ? '⚠️' :
                type === 'success' ? '✅' :
                'ℹ️'
            }</span>
            <p class="text-sm">${message}</p>
        </div>
    `;
    document.body.appendChild(notification);

    // Auto-dismiss notification
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// ===== MODEL STATUS =====
// Update AI model status indicator in header
function updateModelStatus(status) {
    const statusElement = document.getElementById('modelStatus');
    if (!statusElement) return;

    switch (status) {
        case 'loading':
            statusElement.innerHTML = `
                <div class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                Loading Model...
            `;
            statusElement.className = 'text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-200 flex items-center gap-1';
            break;
        case 'loaded':
            statusElement.innerHTML = `
                <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                AI Ready
            `;
            statusElement.className = 'text-xs px-2 py-1 rounded bg-green-500/20 text-green-200 flex items-center gap-1';
            break;
        case 'failed':
            statusElement.innerHTML = `
                <div class="w-2 h-2 bg-red-400 rounded-full"></div>
                Model Failed
            `;
            statusElement.className = 'text-xs px-2 py-1 rounded bg-red-500/20 text-red-200 flex items-center gap-1';
            break;
    }
}

// ===== EVENT LISTENERS =====
// Initialize all event listeners for interactive elements
function setupEventListeners() {
    // Click upload area to trigger file input
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('click', () => {
            document.getElementById('fileInput')?.click();
        });
    }

    // Handle file selection for upload
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }

    // AR opacity control (if element exists)
    const opacitySlider = document.getElementById('opacitySlider');
    if (opacitySlider) {
        opacitySlider.addEventListener('input', (e) => {
            updateARSetting('opacity', e.target.value);
        });
    }

    // AR scale control (if element exists)
    const scaleSlider = document.getElementById('scaleSlider');
    if (scaleSlider) {
        scaleSlider.addEventListener('input', (e) => {
            updateARSetting('scale', e.target.value);
        });
    }
}

// ===== IMAGE COMPRESSION =====
// Resize and compress image for localStorage efficiency
function compressImage(file, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Maintain aspect ratio while resizing
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                // Draw to canvas and convert to JPEG
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Compress with specified quality
                const compressedDataURL = canvas.toDataURL('image/jpeg', quality);
                console.log(`Compressed image: ${(e.target.result.length / 1024).toFixed(1)}KB to ${(compressedDataURL.length / 1024).toFixed(1)}KB`);
                resolve(compressedDataURL);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Convert file to base64 data URL with compression
function fileToDataURL(file) {
    return compressImage(file, 800, 0.7);
}

// ===== DEMO DATA =====
// Populate closet with sample items for testing
function addDemoItems() {
    const demoItems = [
        {
            id: Date.now() + 1,
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMzNzNkYyIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+U2hvcnQgU2xlZXZlPC90ZXh0Pjwvc3ZnPg==',
            category: 'short sleeve shirt',
            color: 'blue',
            style: 'casual',
            confidence: 0.9,
            timestamp: Date.now()
        },
        {
            id: Date.now() + 2,
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzM3NDE1ZiIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+UGFudHM8L3RleHQ+PC9zdmc+',
            category: 'pants',
            color: 'blue',
            style: 'casual',
            confidence: 0.85,
            timestamp: Date.now()
        },
        {
            id: Date.now() + 3,
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzc5NzI3OSIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+U2hvZXM8L3RleHQ+PC9zdmc+',
            category: 'shoes',
            color: 'white',
            style: 'sporty',
            confidence: 0.8,
            timestamp: Date.now()
        },
        {
            id: Date.now() + 4,
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzJkNzI0YSIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Q29hdDwvdGV4dD48L3N2Zz4=',
            category: 'coat',
            color: 'green',
            style: 'formal',
            confidence: 0.88,
            timestamp: Date.now()
        },
        {
            id: Date.now() + 5,
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2RjMjYyNiIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TG9uZyBEcmVzczwvdGV4dD48L3N2Zz4=',
            category: 'long dress',
            color: 'red',
            style: 'formal',
            confidence: 0.92,
            timestamp: Date.now()
        },
        {
            id: Date.now() + 6,
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y5N2MxNiIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VGFuayBUb3A8L3RleHQ+PC9zdmc+',
            category: 'tank top',
            color: 'orange',
            style: 'casual',
            confidence: 0.87,
            timestamp: Date.now()
        },
        {
            id: Date.now() + 7,
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzkzMzM5MyIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+U2hvcnRzPC90ZXh0Pjwvc3ZnPg==',
            category: 'shorts',
            color: 'purple',
            style: 'casual',
            confidence: 0.89,
            timestamp: Date.now()
        }
    ];

    // Check if closet is truly empty before adding demos
    const stored = localStorage.getItem('clueless-closet-items');
    if (!stored || stored === '[]') {
        console.log('Adding demo items for testing...', demoItems);
        clothingItems = demoItems;
        localStorage.setItem('clueless-closet-items', JSON.stringify(clothingItems));
        updateItemCount();
        renderClothingGrid();
        console.log('Demo items added successfully');
    }
}
