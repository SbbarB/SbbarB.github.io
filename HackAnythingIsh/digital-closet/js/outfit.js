// ========== OUTFIT GENERATION ==========

// ===== RENDER OUTFIT UI =====
// Display outfit categories with selected items
function renderOutfitCategories() {
    const container = document.getElementById('outfitCategories');
    container.innerHTML = Object.entries(CATEGORIES).map(([categoryName, keywords]) => {
        const categoryItems = clothingItems.filter(item =>
            keywords.some(keyword => item.category.toLowerCase().includes(keyword))
        );

        if (categoryItems.length === 0) return '';

        return `
            <div class="glass rounded-2xl p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-semibold text-white capitalize">${categoryName}</h3>
                    <div class="flex space-x-2">
                        <button onclick="rotateCategory('${categoryName}', -1)" class="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg">←</button>
                        <button onclick="rotateCategory('${categoryName}', 1)" class="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg">→</button>
                    </div>
                </div>
                <div id="category-${categoryName}" class="outfit-wheel text-center">
                    ${selectedOutfit[categoryName] ? `
                        <div class="bg-white/20 rounded-lg p-4 inline-block">
                            <img src="${selectedOutfit[categoryName].image}" alt="${selectedOutfit[categoryName].category}" class="w-24 h-24 object-cover rounded-lg mx-auto mb-2">
                            <p class="text-white font-medium capitalize">${selectedOutfit[categoryName].category}</p>
                            <p class="text-white/70 text-sm">${selectedOutfit[categoryName].color} • ${selectedOutfit[categoryName].style}</p>
                        </div>
                    ` : `
                        <div class="border-2 border-dashed border-white/30 rounded-lg p-8 text-center">
                            <div class="text-4xl mb-2">👗</div>
                            <p class="text-white/60">No ${categoryName} selected</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function generateSmartOutfit() {
    if (clothingItems.length === 0) {
        alert('Add some clothing items first!');
        return;
    }

    console.log('Generating smart outfit with items:', clothingItems);
    console.log('User preferences:', userPreferences);

    // Validate required clothing items exist
    const hasTop = clothingItems.some(item => {
        const itemCategory = item.category.toLowerCase();
        return CATEGORIES['tops'].some(keyword =>
            itemCategory.includes(keyword) || itemCategory === keyword || keyword.includes(itemCategory)
        );
    });

    const hasBottom = clothingItems.some(item => {
        const itemCategory = item.category.toLowerCase();
        return CATEGORIES['bottoms'].some(keyword =>
            itemCategory.includes(keyword) || itemCategory === keyword || keyword.includes(itemCategory)
        );
    });

    const hasDress = clothingItems.some(item => {
        const itemCategory = item.category.toLowerCase();
        return CATEGORIES['dresses'].some(keyword =>
            itemCategory.includes(keyword) || itemCategory === keyword || keyword.includes(itemCategory)
        );
    });

    if (!(hasTop && hasBottom) && !hasDress) {
        alert('You need at least a top and bottom OR a dress to create an outfit!');
        return;
    }

    selectedOutfit = {};
    let outfitGenerated = false;

    Object.entries(CATEGORIES).forEach(([categoryName, keywords]) => {
        const categoryItems = clothingItems.filter(item => {
            const itemCategory = item.category.toLowerCase();
            return keywords.some(keyword =>
                itemCategory.includes(keyword) ||
                itemCategory === keyword ||
                keyword.includes(itemCategory)
            );
        });

        console.log(`${categoryName} items:`, categoryItems);

        if (categoryItems.length > 0) {
            // Score each item based on multiple factors
            let scoredItems = categoryItems.map(item => {
                let score = (item.confidence || 0.8) * 100;

                // Prioritize user's preferred colors
                if (userPreferences.colors.length > 0) {
                    if (userPreferences.colors.includes(item.color)) {
                        score += 50; // Major bonus for preferred colors
                    }
                }

                // Prioritize user's preferred styles
                if (userPreferences.styles.length > 0) {
                    if (userPreferences.styles.includes(item.style)) {
                        score += 40; // Major bonus for preferred styles
                    }
                }

                // Adjust score based on temperature
                if (currentWeather) {
                    const temp = currentWeather.temperature;

                    if (temp < 15) {
                        // Boost warm clothing in cold weather
                        if (categoryName === 'outerwear') score += 35;
                        if (categoryName === 'bottoms' && (item.category.includes('pants') || item.category.includes('jeans'))) score += 25;
                        if (['black', 'gray', 'navy', 'brown'].includes(item.color)) score += 15;
                        // Penalize summer items
                        if (item.category.includes('shorts') || item.category.includes('tank')) score -= 30;
                    } else if (temp > 25) {
                        // Boost light clothing in hot weather
                        if (categoryName === 'tops' && (item.category.includes('tank') || item.category.includes('t-shirt'))) score += 30;
                        if (categoryName === 'bottoms' && (item.category.includes('shorts') || item.category.includes('skirt'))) score += 25;
                        if (['white', 'yellow', 'pink', 'beige'].includes(item.color)) score += 15;
                        // Penalize heavy items
                        if (item.category.includes('jacket') || item.category.includes('sweater')) score -= 25;
                    } else {
                        // Mild weather is flexible
                        score += 5;
                    }

                    // Adjust for rainy conditions
                    if (currentWeather.condition === 'rainy') {
                        if (categoryName === 'outerwear') score += 30;
                        if (categoryName === 'shoes' && item.category.includes('boots')) score += 20;
                    }
                }

                // Bonus for matching styles across outfit
                const existingStyles = Object.values(selectedOutfit).map(i => i.style);
                if (existingStyles.length > 0 && existingStyles.includes(item.style)) {
                    score += 20;
                }

                // Bonus for color harmony
                const existingColors = Object.values(selectedOutfit).map(i => i.color);
                if (existingColors.length > 0) {
                    if (existingColors.includes(item.color)) score += 15;
                    if (['black', 'white', 'gray'].includes(item.color)) score += 10; // Neutrals match everything
                }

                return { ...item, score };
            });

            scoredItems.sort((a, b) => b.score - a.score);
            selectedOutfit[categoryName] = scoredItems[0];
            outfitGenerated = true;
        }
    });

    console.log('Generated outfit:', selectedOutfit);

    // Check outfit completeness
    const hasSelectedTop = selectedOutfit['tops'];
    const hasSelectedBottom = selectedOutfit['bottoms'];
    const hasSelectedDress = selectedOutfit['dresses'];

    if (!(hasSelectedTop && hasSelectedBottom) && !hasSelectedDress) {
        alert('Could not create a complete outfit. Make sure you have both tops and bottoms OR dresses!');
        return;
    }

    if (outfitGenerated) {
        renderOutfitCategories();
        updateCompatibilityScore();
        showSelectedOutfitPreview();
    } else {
        alert('No compatible clothing items found. Try adding more diverse clothing types!');
    }
}

// ===== RANDOM OUTFIT =====
// Generate outfit with random selection
function generateRandomOutfit() {
    if (clothingItems.length === 0) {
        alert('Add some clothing items first!');
        return;
    }

    console.log('Generating random outfit with items:', clothingItems);

    selectedOutfit = {};
    let outfitGenerated = false;

    Object.entries(CATEGORIES).forEach(([categoryName, keywords]) => {
        const categoryItems = clothingItems.filter(item => {
            const itemCategory = item.category.toLowerCase();
            return keywords.some(keyword =>
                itemCategory.includes(keyword) ||
                itemCategory === keyword ||
                keyword.includes(itemCategory)
            );
        });

        if (categoryItems.length > 0) {
            selectedOutfit[categoryName] = categoryItems[Math.floor(Math.random() * categoryItems.length)];
            outfitGenerated = true;
        }
    });

    console.log('Generated random outfit:', selectedOutfit);

    if (outfitGenerated) {
        renderOutfitCategories();
        updateCompatibilityScore();
        showSelectedOutfitPreview();
    } else {
        alert('No clothing items found to create an outfit!');
    }
}

// ===== ROTATE ITEMS =====
// Cycle through items in a category
function rotateCategory(categoryName, direction) {
    const keywords = CATEGORIES[categoryName];
    if (!keywords) return;

    const categoryItems = clothingItems.filter(item => {
        const itemCategory = item.category.toLowerCase();
        return keywords.some(keyword =>
            itemCategory.includes(keyword) ||
            itemCategory === keyword ||
            keyword.includes(itemCategory)
        );
    });

    if (categoryItems.length <= 1) return;

    const currentItem = selectedOutfit[categoryName];
    const currentIndex = currentItem ? categoryItems.findIndex(item => item.id === currentItem.id) : -1;

    let newIndex;
    if (direction === 1) {
        newIndex = currentIndex >= categoryItems.length - 1 ? 0 : currentIndex + 1;
    } else {
        newIndex = currentIndex <= 0 ? categoryItems.length - 1 : currentIndex - 1;
    }

    selectedOutfit[categoryName] = categoryItems[newIndex];

    // Visual feedback during rotation
    const categoryElement = document.getElementById(`category-${categoryName}`);
    if (categoryElement) {
        categoryElement.classList.add('spinning');
        setTimeout(() => {
            categoryElement.classList.remove('spinning');
            renderOutfitCategories();
            updateCompatibilityScore();
            showSelectedOutfitPreview();
        }, 500);
    }
}

// ===== CLEAR OUTFIT =====
// Reset selected outfit
function clearOutfit() {
    selectedOutfit = {};
    renderOutfitCategories();
    document.getElementById('compatibilityScore').classList.add('hidden');
    document.getElementById('selectedOutfitPreview').classList.add('hidden');
}

// ===== COMPATIBILITY SCORE =====
// Calculate outfit quality based on color, style, and weather
function updateCompatibilityScore() {
    const outfitItems = Object.values(selectedOutfit);
    if (outfitItems.length < 2) {
        document.getElementById('compatibilityScore').classList.add('hidden');
        return;
    }

    let score = 0;

    // Score color coordination
    const colors = outfitItems.map(item => item.color);
    const uniqueColors = [...new Set(colors)];
    if (uniqueColors.length <= 3) score += 30;
    if (colors.includes('white') || colors.includes('black')) score += 20;

    // Score style matching
    const styles = outfitItems.map(item => item.style);
    const uniqueStyles = [...new Set(styles)];
    if (uniqueStyles.length <= 2) score += 25;

    // Score weather suitability
    if (currentWeather) {
        if (currentWeather.temperature < 15 && outfitItems.some(item =>
            item.category.includes('jacket') || item.category.includes('pants')
        )) score += 20;

        if (currentWeather.temperature > 25 && outfitItems.some(item =>
            item.category.includes('shorts') || item.category.includes('tank')
        )) score += 20;
    }

    // Factor in AI classification confidence
    const avgConfidence = outfitItems.reduce((sum, item) => sum + item.confidence, 0) / outfitItems.length;
    score += avgConfidence * 15;

    score = Math.min(100, Math.max(0, score));

    document.getElementById('scoreBar').style.width = `${score}%`;
    document.getElementById('scoreText').textContent = `${Math.round(score)}%`;
    document.getElementById('compatibilityScore').classList.remove('hidden');
}

// ===== OUTFIT PREVIEW =====
// Show selected outfit in preview panel
function showSelectedOutfitPreview() {
    const outfitItems = Object.values(selectedOutfit);
    if (outfitItems.length === 0) {
        document.getElementById('selectedOutfitPreview').classList.add('hidden');
        return;
    }

    const previewGrid = document.getElementById('outfitPreviewGrid');
    previewGrid.innerHTML = outfitItems.map(item => `
        <div class="text-center">
            <img src="${item.image}" alt="${item.category}" class="w-20 h-20 object-cover rounded-lg mx-auto mb-2">
            <p class="text-white text-sm capitalize">${item.category}</p>
        </div>
    `).join('');

    document.getElementById('selectedOutfitPreview').classList.remove('hidden');
}

// ===== TRY-ON DISPLAY =====
// Show outfit in virtual try-on tab
function displayCurrentOutfit() {
    const outfitItems = Object.values(selectedOutfit);
    const container = document.getElementById('currentOutfitDisplay');

    if (outfitItems.length === 0) {
        container.innerHTML = `
            <p class="text-white/60">No outfit selected</p>
            <p class="text-sm mt-2">Go to "Pick Outfit" first</p>
        `;
        return;
    }

    container.innerHTML = `
        <div class="grid grid-cols-2 gap-2">
            ${outfitItems.map(item => `
                <div class="text-center">
                    <img src="${item.image}" alt="${item.category}" class="w-12 h-12 object-cover rounded mx-auto mb-1">
                    <p class="text-white text-xs capitalize">${item.category}</p>
                </div>
            `).join('')}
        </div>
    `;
}
