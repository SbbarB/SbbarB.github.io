# Br'er Landing Page

A modern, interactive landing page for Br'er - A Vice Without Venom

## Project Structure

```
Br'er/
├── index.html              # Main HTML file (use this instead of landingpage.html)
├── css/
│   └── styles.css         # All CSS styles
├── js/
│   └── main.js            # Three.js 3D rendering and interactions
├── assets/                # Image and 3D model assets
│   └── (place images and STL files here)
└── README.md              # This file
```

## Files Overview

### index.html
- Clean, semantic HTML structure
- Sections: Hero, Product, Features, Market, Contact
- Links to external libraries (Three.js, Google Fonts)
- Links to local CSS and JS files

### css/styles.css
- Complete styling for all sections
- Responsive design with media queries
- Animations and transitions
- Mobile-friendly breakpoints

### js/main.js
- Three.js initialization and 3D rendering
- STL model loader with fallback
- Mouse interaction
- Smooth scrolling navigation
- Scroll-based navigation styling

## Features

- **3D Interactive Hero**: Animated 3D model of the Br'er device
- **Responsive Design**: Optimized for desktop and mobile
- **Smooth Animations**: Fade-in effects and smooth transitions
- **Product Showcase**: Image gallery with product renders
- **Market Visualization**: Interactive concentric circles showing TAM/SAM/SOM

## Getting Started

1. Open `index.html` in a web browser
2. All dependencies are loaded via CDN
3. Images should be in the same directory or moved to `assets/`

## Assets to Organize

Move these files to the `assets/` folder and update paths in `index.html`:
- `Br_erRender1_4.jpg`
- `Br_erRender1_1.jpg`
- `Screenshot_2025-10-27_at_10_51_06_AM.png`
- `renderBr_er.stl` (if available)

## Browser Support

- Modern browsers with WebGL support
- Chrome, Firefox, Safari, Edge (latest versions)

## Next Steps for Improvement

1. Move image assets to `assets/` folder
2. Optimize images for web (compress, resize)
3. Add meta tags for SEO
4. Add Open Graph tags for social sharing
5. Consider adding analytics
6. Add contact form functionality
7. Implement mobile menu for navigation

## Legacy Files

- `landingpage.html` - Original single-file version (can be archived or removed)
