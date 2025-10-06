// File Upload and Processing - Optimized for batch processing

async function handleFileUpload(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    console.log(`Processing ${files.length} images...`);

    processedImages = [];
    const resultsContainer = document.getElementById('processingResults');

    // Show progress indicator
    resultsContainer.innerHTML = `
        <div class="text-center text-white">
            <div class="animate-spin text-2xl mb-2">⚡</div>
            <p class="font-semibold">Processing ${files.length} images...</p>
            <div class="mt-4 bg-white/20 rounded-full h-2">
                <div id="uploadProgress" class="bg-green-500 h-2 rounded-full transition-all" style="width: 0%"></div>
            </div>
            <p class="text-sm mt-2"><span id="progressText">0 / ${files.length}</span> completed</p>
        </div>
    `;

    // Process images in batches of 3 for better performance
    const BATCH_SIZE = 3;
    let completed = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);

        // Process batch in parallel
        const batchPromises = batch.map(async (file, batchIndex) => {
            try {
                const imageData = await fileToDataURL(file);
                const classification = await classifyImage(imageData);

                const processedItem = {
                    id: Date.now() + i + batchIndex,
                    image: imageData,
                    filename: file.name,
                    ...classification
                };

                processedImages.push(processedItem);
                completed++;

                // Update progress
                const progress = (completed / files.length) * 100;
                const progressBar = document.getElementById('uploadProgress');
                const progressText = document.getElementById('progressText');
                if (progressBar) progressBar.style.width = `${progress}%`;
                if (progressText) progressText.textContent = `${completed} / ${files.length}`;

                console.log(`Processed ${file.name} (${completed}/${files.length})`);
            } catch (error) {
                console.error('Failed to process image:', file.name, error);
                failed++;
                completed++;

                // Update progress even for failures
                const progress = (completed / files.length) * 100;
                const progressBar = document.getElementById('uploadProgress');
                const progressText = document.getElementById('progressText');
                if (progressBar) progressBar.style.width = `${progress}%`;
                if (progressText) progressText.textContent = `${completed} / ${files.length}`;
            }
        });

        // Wait for batch to complete before starting next batch
        await Promise.all(batchPromises);
    }

    // Show final results
    console.log(`Processing complete: ${processedImages.length} successful, ${failed} failed`);
    updateProcessingResults();
    document.getElementById('addItemsBtn').classList.remove('hidden');

    if (failed > 0) {
        resultsContainer.innerHTML = `
            <div class="text-center text-yellow-400 mb-4 p-3 bg-yellow-500/20 rounded-lg">
                ⚠️ ${failed} image(s) failed to process
            </div>
        ` + resultsContainer.innerHTML;
    }
}

function updateProcessingResults() {
    const container = document.getElementById('processingResults');
    container.innerHTML = processedImages.map(item => `
        <div class="bg-white/20 rounded-lg p-3 mb-3 flex items-center space-x-3">
            <img src="${item.image}" alt="${item.category}" class="w-12 h-12 object-cover rounded">
            <div class="flex-1">
                <p class="text-white font-medium capitalize">${item.category}</p>
                <p class="text-white/70 text-sm">${Math.round(item.confidence * 100)}% • ${item.color} • ${item.style}</p>
            </div>
            <div class="text-green-400">✅</div>
        </div>
    `).join('');
}

async function addProcessedItems() {
    const addBtn = document.getElementById('addItemsBtn');
    const resultsContainer = document.getElementById('processingResults');

    // Show immediate feedback
    addBtn.disabled = true;
    addBtn.innerHTML = '⏳ Adding to closet...';

    // Give UI time to update before blocking operation
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
        console.log(`Adding ${processedImages.length} items to closet...`);

        // If user is adding their first real items, clear demo items
        const hasDemoItems = clothingItems.some(item =>
            item.image && item.image.startsWith('data:image/svg+xml;base64')
        );

        if (hasDemoItems) {
            console.log('Removing demo items as user is adding real clothing');
            clothingItems = clothingItems.filter(item =>
                !(item.image && item.image.startsWith('data:image/svg+xml;base64'))
            );
        }

        // Add items
        clothingItems = [...clothingItems, ...processedImages];

        // Save to localStorage
        try {
            const dataSize = JSON.stringify(clothingItems).length;
            console.log(`Saving ${clothingItems.length} items (${(dataSize / 1024).toFixed(1)}KB) to localStorage`);
            localStorage.setItem('clueless-closet-items', JSON.stringify(clothingItems));
            console.log('Items saved to localStorage');
        } catch (error) {
            console.error('localStorage error:', error);

            // Provide helpful error message
            const itemCount = clothingItems.length;
            if (error.name === 'QuotaExceededError' || error.code === 22) {
                alert(`Storage limit reached!\n\nYou have ${itemCount} items which exceeds browser storage capacity.\n\nSuggestions:\n• Remove older items you don't need\n• The items ARE added to your closet, but won't save after refresh\n• Consider downloading/backing up your closet`);
            } else {
                alert('Warning: Could not save to browser storage. Your items may not persist after refresh.');
            }
        }

        // Clear processed images
        processedImages = [];

        // Update UI
        resultsContainer.innerHTML = `
            <div class="text-center text-white py-8">
                <div class="text-4xl mb-2">✅</div>
                <p class="font-semibold">Items added to closet!</p>
                <p class="text-sm text-white/70 mt-2">Check the "My Closet" tab to see your items</p>
            </div>
        `;

        addBtn.classList.add('hidden');
        addBtn.disabled = false;
        addBtn.innerHTML = 'Add Items to Closet';
        document.getElementById('fileInput').value = '';

        // Update count immediately
        updateItemCount();

        // Render grid after a small delay to avoid blocking
        await new Promise(resolve => setTimeout(resolve, 100));
        renderClothingGrid();

        console.log('Successfully added items to closet');

    } catch (error) {
        console.error('Error adding items:', error);
        alert('Error adding items to closet. Please try again.');
        addBtn.disabled = false;
        addBtn.innerHTML = 'Add Items to Closet';
    }
}
