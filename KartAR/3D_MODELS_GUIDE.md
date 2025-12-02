# KartAR 3D Models Guide

This app now supports loading realistic 3D models to enhance the AR racing experience. The code will automatically use realistic models if they're available, otherwise it falls back to primitive shapes.

## ✅ Models Already Installed

The following models have been added to your project:
- **Building.glb** - Office/apartment buildings
- **House.glb** - Residential houses
- **Building Red Corner.glb** - Corner buildings
- **Bridge.glb** - Bridge structures
- **Road Bits.glb** - Modular road pieces
- **roads.obj + roads.mtl** - Road textures

**Next Step**: Add these files to Xcode (instructions below)

## Optional: Additional Racing Models

For more realistic racing visuals, you can download and add these USDZ models to your Xcode project:

### 1. Racing Barrier (`racing_barrier.usdz`)
**What it is**: Monaco-style racing barriers (red & white striped)
**Where to find**:
- Sketchfab: Search "racing barrier" or "f1 barrier", filter by "Downloadable" and format "USDZ"
- Free3D: https://free3d.com/3d-models/barrier (download and convert to USDZ)
- Poly Pizza: Search "racing barrier"

**Recommended**: Download a barrier model, then use Reality Converter (free Mac app) to convert to USDZ if needed.

### 2. Checkpoint Gate (`checkpoint_gate.usdz`)
**What it is**: Racing checkpoint gate with pillars and top bar
**Where to find**:
- Search "checkpoint gate", "racing gate", or "finish line gate"
- Alternative: Create your own in Blender and export as USDZ

### 3. F1 Steering Wheel (`f1_steering_wheel.usdz`)
**What it is**: Formula 1 racing steering wheel for cockpit view
**Where to find**:
- **Best option**: Sketchfab - "F1 Steering Wheel W11" by pawel7557
  https://sketchfab.com/3d-models/f1-steering-wheel-w11-97e6f81365714a78a784c4bc92903b7b
- CGTrader: Search "F1 steering wheel" (some free options available)
- GrabCAD: https://grabcad.com/library/f1-steering-wheel-13

### 4. F1 Dashboard (Optional) (`f1_dashboard.usdz`)
**What it is**: Dashboard/nose cone visible below steering wheel
**Where to find**:
- Search "F1 dashboard", "F1 cockpit", or "racing dashboard"
- Can extract from full F1 car models

## How to Add Models to Xcode

### For Models Already Downloaded (GLB/OBJ files)

1. Open **KartAR.xcodeproj** in Xcode
2. In the Project Navigator (left sidebar), right-click the **KartAR** folder
3. Select **"Add Files to 'KartAR'..."**
4. Navigate to the KartAR folder and select:
   - Building.glb
   - House.glb
   - Building Red Corner.glb
   - Bridge.glb
   - Road Bits.glb
   - roads.obj
   - roads.mtl
5. **IMPORTANT**: Check **"Copy items if needed"**
6. Click **"Add"**
7. Build and run!

### For Additional USDZ Models (Optional)

1. Download the `.usdz` files (or `.glb`/`.gltf` and convert with Reality Converter)
2. Open your KartAR project in Xcode
3. Drag the `.usdz` files into the project navigator
4. **Important**: When prompted, make sure "Copy items if needed" is checked
5. The files should appear in your project alongside `ContentView.swift`

## Converting Other Formats to USDZ

If you find models in other formats (OBJ, FBX, glTF, etc.):

1. Download **Reality Converter** (free Mac app from Apple)
2. Open your model file in Reality Converter
3. Adjust scale/orientation if needed
4. Export as `.usdz`
5. Add to Xcode project

## Model Names Must Match

The code looks for these exact file names:
- `racing_barrier.usdz`
- `checkpoint_gate.usdz`
- `f1_steering_wheel.usdz`
- `f1_dashboard.usdz`

If your downloaded files have different names, rename them to match!

## Fallback Behavior

If models aren't found, the app automatically uses primitive shapes:
- Barriers → Red/white boxes
- Gates → Yellow pillars with crossbar
- Steering wheel → Black box segments forming a ring
- Dashboard → Dark gray box

The app will work either way, but realistic models make it much more immersive!

## Recommended Free Resources

1. **Sketchfab** - Best for F1/racing models, many downloadable in USDZ
2. **Poly Pizza** - Good for low-poly racing elements
3. **Free3D** - Lots of free models, may need format conversion
4. **CGTrader** - Mix of free and paid, high quality
5. **GrabCAD** - Great for technical models like steering wheels

## Tips

- Look for "low poly" models for better AR performance
- Models with textures look better but use more resources
- Test on device - simulator doesn't show full AR quality
- RC car scale means models should be sized for ground-level view
