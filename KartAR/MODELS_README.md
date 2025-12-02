# KartAR 3D Models

## Installed Models

The following 3D model files have been added to the project:

### GLB Models (Building/Scenery)
- **Building.glb** - Office/apartment building for track scenery
- **House.glb** - Residential house for Monaco street circuit
- **Building Red Corner.glb** - Corner building variant
- **Bridge.glb** - Bridge structure
- **Road Bits.glb** - Modular road pieces

### OBJ Models
- **roads.obj** + **roads.mtl** - Modular road kit with textures

## How to Add to Xcode Project

To include these models in your Xcode build:

1. Open **KartAR.xcodeproj** in Xcode
2. In the Project Navigator, right-click the KartAR folder
3. Select "Add Files to 'KartAR'..."
4. Select all **.glb**, **.obj**, and **.mtl** files
5. **IMPORTANT**: Check "Copy items if needed"
6. Click "Add"

## Model Usage in Code

The app automatically loads these models:

- **Buildings**: Placed around Monaco track at 40cm distance from edge
- **Barriers**: Red/white Monaco-style barriers along track
- **Checkpoints**: Checkered flag (start/finish) + orange gates
- **Cockpit**: F1 steering wheel overlay

## Fallback Behavior

If models aren't found, the app uses primitive shapes:
- Buildings → Not rendered (Monaco track only)
- Barriers → Red/white boxes
- Checkpoints → Colored pillars with checkered pattern
- Steering wheel → Black box ring

All models are scaled for RC car perspective (15-20cm height).
