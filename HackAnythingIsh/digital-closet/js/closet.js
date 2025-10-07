// ========== CLOSET MANAGEMENT ==========

// ===== RENDER GRID =====
// Display all clothing items in responsive grid
function renderClothingGrid() {
    const grid = document.getElementById('clothingGrid');

    if (clothingItems.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-16">
                <div class="text-6xl mb-4">👗</div>
                <h3 class="text-2xl font-semibold text-white mb-2">Your closet is empty</h3>
                <p class="text-white/70">Start by adding some clothing items!</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = clothingItems.map(item => `
        <div class="clothing-item glass rounded-2xl p-4 group">
            <div class="relative mb-3">
                <img src="${item.image}" alt="${item.category}" class="w-full h-32 object-cover rounded-lg">
                <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onclick="editItem(${item.id})" class="bg-blue-500/80 hover:bg-blue-600 text-white p-1 rounded-full">
                        ✏️
                    </button>
                    <button onclick="removeItem(${item.id})" class="bg-red-500/80 hover:bg-red-600 text-white p-1 rounded-full">
                        ❌
                    </button>
                </div>
                <div class="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
                    ${Math.round(item.confidence * 100)}%
                </div>
            </div>
            <h4 class="text-white font-medium capitalize text-sm">${item.category}</h4>
            <p class="text-white/70 text-xs capitalize">${item.color} • ${item.style}</p>
            ${item.description ? `<p class="text-white/60 text-xs mt-1 italic">${item.description}</p>` : ''}
        </div>
    `).join('');
}

// ===== CATEGORY FILTERING =====
// Filter items by clothing category
function filterCategory(category) {
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-white/20', 'text-white');
        btn.classList.add('bg-white/10', 'text-white/80');
    });
    event.target.classList.add('active', 'bg-white/20', 'text-white');
    event.target.classList.remove('bg-white/10', 'text-white/80');

    // Apply category filter
    const filteredItems = category === 'all' ? clothingItems :
        clothingItems.filter(item => item.category.toLowerCase().includes(category.toLowerCase()));

    const grid = document.getElementById('clothingGrid');
    if (filteredItems.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-16">
                <div class="text-4xl mb-4">🔍</div>
                <h3 class="text-xl font-semibold text-white mb-2">No items found</h3>
                <p class="text-white/70">Try a different category</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filteredItems.map(item => `
        <div class="clothing-item glass rounded-2xl p-4 group">
            <div class="relative mb-3">
                <img src="${item.image}" alt="${item.category}" class="w-full h-32 object-cover rounded-lg">
                <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onclick="editItem(${item.id})" class="bg-blue-500/80 hover:bg-blue-600 text-white p-1 rounded-full">
                        ✏️
                    </button>
                    <button onclick="removeItem(${item.id})" class="bg-red-500/80 hover:bg-red-600 text-white p-1 rounded-full">
                        ❌
                    </button>
                </div>
                <div class="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
                    ${Math.round(item.confidence * 100)}%
                </div>
            </div>
            <h4 class="text-white font-medium capitalize text-sm">${item.category}</h4>
            <p class="text-white/70 text-xs capitalize">${item.color} • ${item.style}</p>
            ${item.description ? `<p class="text-white/60 text-xs mt-1 italic">${item.description}</p>` : ''}
        </div>
    `).join('');
}

// ===== REMOVE ITEM =====
// Delete item from closet
async function removeItem(id) {
    // Prevent UI blocking
    await new Promise(resolve => setTimeout(resolve, 10));

    clothingItems = clothingItems.filter(item => item.id !== id);
    localStorage.setItem('clueless-closet-items', JSON.stringify(clothingItems));
    updateItemCount();

    // Defer re-render
    await new Promise(resolve => setTimeout(resolve, 50));
    renderClothingGrid();
}

// ===== EDIT ITEM =====
// Open modal to edit item properties
function editItem(id) {
    const item = clothingItems.find(item => item.id === id);
    if (!item) return;

    currentEditingItemId = id;

    // Pre-fill form with current values
    document.getElementById('editCategory').value = item.category;
    document.getElementById('editColor').value = item.color;
    document.getElementById('editStyle').value = item.style;
    document.getElementById('editDescription').value = item.description || '';

    // Show modal
    document.getElementById('editModal').classList.remove('hidden');
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
    currentEditingItemId = null;
}

// Save edited item to localStorage
async function saveEditedItem(event) {
    if (!currentEditingItemId) return;

    const itemIndex = clothingItems.findIndex(item => item.id === currentEditingItemId);
    if (itemIndex === -1) return;

    // Show loading state on button
    const saveBtn = event ? event.target : null;
    let originalText = '';
    if (saveBtn) {
        originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '⏳ Saving...';
    }

    // Allow UI update
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
        // Apply form values to item
        clothingItems[itemIndex].category = document.getElementById('editCategory').value;
        clothingItems[itemIndex].color = document.getElementById('editColor').value.toLowerCase();
        clothingItems[itemIndex].style = document.getElementById('editStyle').value;
        clothingItems[itemIndex].description = document.getElementById('editDescription').value;

        // Persist changes
        localStorage.setItem('clueless-closet-items', JSON.stringify(clothingItems));

        // Close modal immediately
        closeEditModal();

        // Defer re-render
        await new Promise(resolve => setTimeout(resolve, 100));

        // Update UI
        renderClothingGrid();

        console.log('Item updated successfully');
    } catch (error) {
        console.error('Error saving item:', error);
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
        alert('Error saving changes. Please try again.');
    }
}

// ===== CLEAR ALL =====
// Remove all items from closet
function clearAllItems() {
    if (confirm('Are you sure you want to clear all items from your closet?')) {
        clothingItems = [];
        localStorage.setItem('clueless-closet-items', JSON.stringify(clothingItems));
        updateItemCount();
        renderClothingGrid();
    }
}
