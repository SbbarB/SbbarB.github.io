# 🎨 Digital Closet - Clueless Style AI

An AI-powered virtual closet application inspired by the movie "Clueless" that helps you organize your wardrobe and generate outfit combinations.

## ✨ Features

- **AI-Powered Classification**: Automatically categorizes clothing items using Teachable Machine models
- **Smart Outfit Generation**: AI suggests outfit combinations based on weather and your style preferences
- **AR Virtual Try-On**: Real-time pose detection with MediaPipe to visualize outfits on your body
- **Weather Integration**: Real-time weather data influences outfit recommendations
- **Batch Upload**: Process multiple clothing images at once with progress tracking
- **Item Management**: Edit, organize, and remove items from your digital closet
- **Style Preferences**: Set your favorite colors and styles for personalized recommendations
- **Image Compression**: Automatically compresses images to fit browser storage limits
- **Responsive Design**: Beautiful glassmorphism UI with smooth animations

## 🚀 Getting Started

### Requirements
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for CDN resources and weather API)
- Camera access (optional, for uploading photos)

### Running Locally

**Option 1: Python HTTP Server (All platforms)**

1. Navigate to the digital-closet directory:
   ```bash
   cd HackAnythingIsh/digital-closet
   ```

2. Start a local web server (will auto-select an available port):
   ```bash
   # Try port 8000
   python3 -m http.server 8000

   # If port 8000 is in use, try another port (e.g., 8001, 8080, 3000)
   python3 -m http.server 8080
   ```

3. Open your browser and navigate to the URL shown in the terminal output (e.g., `http://localhost:8000/`)

4. Click "Allow" when prompted for location access (for weather features)

5. To stop the server: Press `Ctrl+C` in the terminal window

**Option 2: Simply open the HTML file**

You can also just open `index.html` directly in your browser:
- **Mac/Linux**: `open index.html`
- **Windows**: Double-click `index.html` or `start index.html` from command prompt
- **Any OS**: Drag `index.html` into your browser

Note: Some features (like AI models) may work better with a local server due to CORS restrictions.

## 📁 Project Structure

```
digital-closet/
├── index.html          # Main application entry point
├── README.md           # This file
├── css/
│   └── styles.css      # All application styles
├── js/
│   ├── config.js       # Global configuration and state
│   ├── utils.js        # Utility functions
│   ├── models.js       # AI/ML model integration
│   ├── weather.js      # Weather API integration
│   ├── upload.js       # File upload and processing
│   ├── closet.js       # Closet management
│   ├── outfit.js       # Outfit generation logic
│   └── ar-tryon.js     # AR virtual try-on with MediaPipe
└── assets/             # Static assets (empty for now)
```

## 🧠 Technology Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Glassmorphism effects and animations
- **TailwindCSS** - Utility-first CSS framework
- **Vanilla JavaScript** - No frameworks, pure JS

### AI/ML
- **TensorFlow.js** - Machine learning in the browser
- **Teachable Machine** - Custom image classification models
  - Item Model: Classifies clothing types (shirts, pants, dresses, etc.)
  - Style Model: Determines style categories (casual, formal, athletic, etc.)
- **MediaPipe** - Real-time pose detection for AR try-on
  - Pose Landmarker: 33-point body pose estimation
  - GPU-accelerated inference for smooth AR experience

### APIs
- **Open-Meteo API** - Free weather data without API keys
- **BigDataCloud API** - Reverse geocoding for location names
- **Browser APIs**:
  - Geolocation API - Location access
  - FileReader API - Image processing
  - Canvas API - Image manipulation
  - LocalStorage API - Data persistence

## 🎯 How It Works

### 1. Adding Items
1. Click "📸 Add Items" tab
2. Upload one or multiple clothing images
3. AI automatically classifies each item (type, color, style)
4. Review classifications and click "Add Items to Closet"

### 2. Managing Your Closet
- View all items in "👗 My Closet" tab
- Filter by category (Tops, Bottoms, Dresses, etc.)
- Edit items to adjust classification or add descriptions
- Remove items you no longer need

### 3. Generating Outfits
1. Click "✨ Pick Outfit" tab
2. Set your style preferences (optional)
3. Get weather data for smart recommendations
4. Click "🎯 Generate Smart Outfit" or "🎲 Random Outfit"
5. View outfit suggestions with compatibility scores

### 4. Virtual Try-On (AR Feature)
1. Go to "🎭 Try On" tab
2. Ensure you have an outfit selected from "Pick Outfit"
3. Click "🚀 Start AR Try-On"
4. Allow camera access when prompted
5. Stand in front of camera - AI will detect your pose
6. Use AR controls to adjust:
   - **Scale**: Resize clothing items
   - **Offset Y**: Move items up/down
   - **Width**: Adjust clothing width
   - **Toggle**: Show/hide clothing overlay
   - **Debug**: View pose detection skeleton
7. Click "❌ Exit AR Mode" when done

**AR Features:**
- Real-time pose detection using MediaPipe
- Body-mapped clothing placement
- Automatic background removal for clothing
- Adjustable fit and positioning
- Debug mode to visualize pose tracking
- FPS counter and status indicators

## 💾 Storage

The app uses **browser localStorage** to persist your closet data:
- **Capacity**: ~5-10MB depending on browser
- **Compression**: Images automatically compressed to 800px width at 70% quality
- **Typical Storage**: 50-100+ clothing items

If you hit the storage limit, the app will:
- Show a helpful warning
- Still add items to your current session
- Suggest removing older items

## 🌡️ Weather Integration

The weather feature requires **location permission**:
- Detects your location via browser Geolocation API
- Fetches current weather conditions
- Uses temperature to influence outfit suggestions:
  - Cold: Suggests layers, coats, long sleeves
  - Warm: Suggests lighter clothing, shorts
  - Rainy: Considers weather-appropriate items

### US-Specific Features
- Automatically uses **Fahrenheit** for US locations
- Uses **Celsius** for all other locations

## 🎨 Customization

### Adding Your Own Models
To use custom Teachable Machine models:

1. Train your models at [teachablemachine.withgoogle.com](https://teachablemachine.withgoogle.com/)
2. Export and get your model URLs
3. Update in `js/models.js`:
   ```javascript
   const itemModelURL = 'YOUR_ITEM_MODEL_URL';
   const styleModelURL = 'YOUR_STYLE_MODEL_URL';
   ```

### Modifying Styles
- Edit `css/styles.css` for visual customization
- Modify gradient background, glass effects, animations
- Adjust TailwindCSS classes in HTML

### Extending Functionality
Each module is independent and easy to modify:
- `upload.js` - Change batch size, add file validation
- `outfit.js` - Modify outfit generation algorithm
- `weather.js` - Add more weather providers
- `closet.js` - Enhance item display

## 🐛 Troubleshooting

### Models Not Loading
- Check browser console for errors
- Verify internet connection (CDN dependencies)
- Try refreshing the page
- Check that TensorFlow.js and Teachable Machine libraries loaded

### Storage Quota Exceeded
- Remove old items from your closet
- Lower image quality in `utils.js` (adjust compression settings)
- Use "Clear All" to start fresh

### Weather Not Working
- Enable location permissions in browser settings
- Check that geolocation is allowed for `localhost`
- Safari: Check Settings → Privacy → Location Services

### Upload Errors
- Ensure images are valid (JPG, PNG, WEBP)
- Check file sizes (very large files may cause issues)
- Try uploading fewer images at once
- Check browser console for specific errors

### AR Try-On Not Working
- **Camera Access**: Allow camera permissions when prompted
- **HTTPS Required**: AR features work on localhost or HTTPS sites only
- **Browser Compatibility**: Use Chrome, Edge, or Safari (latest versions)
- **Select Outfit First**: Must have items selected before starting AR
- **Lighting**: Ensure good lighting for better pose detection
- **Clear View**: Stand 3-6 feet from camera, full body visible
- **Performance**: Close other tabs/apps if experiencing lag
- **MediaPipe Loading**: Wait for "Pose Detection: Ready" status

## 📝 Development Notes

### Module Loading Order
Critical for functionality - do not change:
1. `config.js` - Global state
2. `utils.js` - Shared utilities
3. `models.js` - AI functions
4. `weather.js` - Weather API
5. `upload.js` - File processing
6. `closet.js` - Item management
7. `outfit.js` - Outfit generation
8. `ar-tryon.js` - AR virtual try-on (depends on outfit state)

### Performance Optimizations
- **Canvas pooling** for efficient image processing
- **Batch processing** with concurrency limits
- **Async operations** with strategic delays
- **Image compression** to reduce storage
- **Progress indicators** for user feedback

## 🔒 Privacy & Security

- **All data stays local** - Nothing sent to external servers except:
  - Weather API requests (only coordinates, no personal data)
  - AI model files (downloaded from Teachable Machine CDN)
- **No tracking or analytics**
- **No user accounts required**
- **Data persists only in your browser's localStorage**

## 🎬 Credits

Inspired by the iconic outfit selection computer from the 1995 film "Clueless" directed by Amy Heckerling.

## 📄 License

This is a personal project created for educational and entertainment purposes.

## 🚧 Future Enhancements

- [ ] Export/Import closet data
- [ ] Share outfits with friends
- [ ] Calendar view for outfit planning
- [ ] Laundry tracking
- [ ] Outfit history and favorites
- [x] **AR virtual try-on with pose detection** ✅
- [ ] Enhanced AR features (better background removal, fabric simulation)
- [ ] Social features (outfit voting, comments)
- [ ] Integration with shopping sites
- [ ] Body measurements and sizing recommendations

## 💡 Tips

- Start with 10-15 items to test the functionality
- Use clear, well-lit photos for best AI classification
- Set your style preferences for better outfit suggestions
- Enable weather for smart seasonal recommendations
- Edit items after upload to fine-tune classifications
- Try random outfits when you're feeling adventurous!

---

**Enjoy organizing your digital closet! ✨👗**
