# KartAR (A work in progress...)

> An immersive AR racing experience for iOS that transforms your real-world space into a virtual race track.

![iOS](https://img.shields.io/badge/iOS-18.0+-blue.svg)
![Swift](https://img.shields.io/badge/Swift-5.0-orange.svg)
![ARKit](https://img.shields.io/badge/ARKit-Required-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## Overview

KartAR is an augmented reality racing application that leverages Apple's ARKit and RealityKit frameworks to create an interactive racing experience in your physical environment. Place virtual race tracks on real surfaces, track lap times, navigate checkpoints, and experience racing from multiple perspectives including a dynamic landscape cockpit view.

## Features

### 🏁 Race Modes
- **Grand Prix**: Compete in multi-lap races with full timing and lap tracking
- **Time Trial**: Focus on achieving the best lap time without competition
- **Practice**: Free-form practice mode to learn the track layout

### 🛣️ Multiple Track Layouts
- **Monaco GP**: A detailed replica inspired by the iconic Monaco circuit
  - USDZ model: `Monaco_GP_racetrack.usdz` (932 KB)
  - 1 checkpoint (start/finish line)

- **Low Poly Circuit**: A stylized, geometric racing circuit
  - USDZ model: `Blender_Low_Poly_Race_track_model_2_CarGame.usdz` (155 KB)
  - 6 checkpoints (1 start/finish + 5 intermediate)

- **Mania Mode**: Procedurally generated track using AR room scanning
  - No pre-built model - generates from real-world geometry
  - 8 checkpoints dynamically placed around your space

### 📱 Orientation Modes
- **Portrait Mode**: Full race information HUD with detailed stats
  - Current lap and total laps
  - Real-time timer display
  - Checkpoint progress indicator
  - Best lap time tracking
  - Race mode indicator

- **Landscape Mode** (Racing only): Immersive cockpit-style view
  - Compact HUD design for minimal obstruction
  - Top-left: Lap counter and current time
  - Top-right: Best lap time and track info
  - Center: Checkpoint/lap completion messages
  - Bottom-right: Quick access race controls
  - Automatically activates when race starts
  - Returns to portrait when race ends

### ⏱️ Advanced Timing System
- Real-time lap timing with millisecond precision
- Best lap tracking and comparison
- Per-lap time storage and history
- New best lap notifications
- Checkpoint validation and timing

### 🎮 Interactive AR Features
- AR room scanning for spatial awareness
- Dynamic track placement on detected surfaces
- Virtual checkpoint gates with collision detection
- Camera position tracking for progress monitoring
- Procedural track generation in Mania mode

### 🏎️ Visual Elements
- 3D USDZ track models with high-quality geometry
- Checkpoint gates with colored materials:
  - Green: Start/finish line
  - Orange: Intermediate checkpoints
- Track visualization with road segments
- Environment decorations (buildings, bridges, etc.)
- Procedural fallback cockpit with carbon fiber steering wheel

## Technical Architecture

### Core Components

#### 1. **KartARApp.swift**
Main app entry point with orientation management system.

**Key Features:**
- `OrientationManager`: Handles dynamic orientation locking
- Supports portrait and landscape modes
- Forces immediate rotation without animation delay
- Manages app-wide orientation state

```swift
class OrientationManager: ObservableObject {
    @Published var orientation: UIInterfaceOrientationMask = .portrait

    func lockOrientation(_ orientation: UIInterfaceOrientationMask)
}
```

#### 2. **ContentView.swift**
SwiftUI interface layer with adaptive layouts.

**Key Features:**
- Home screen with race mode selection
- Track type selection interface
- Adaptive UI that responds to orientation changes
- Landscape-optimized racing HUD
- Portrait-optimized detailed stats display
- AR view container integration

**UI States:**
- Home: Initial landing screen
- Race Type Selection: Choose Grand Prix, Time Trial, or Practice
- Scanning Room: AR mesh scanning visualization
- Track Placement: Position track in physical space
- Racing: Active race with live HUD
- Race Complete: Final results and statistics

#### 3. **RacingViewModel.swift**
Core game logic and AR management (1,416 lines).

**Key Responsibilities:**
- Game state machine management
- AR session configuration and handling
- Track model loading and placement
- Checkpoint detection and validation
- Lap timing and race progression
- Camera position tracking
- Mesh anchor processing for room scanning

**Major Systems:**

##### Game State Machine
```swift
enum GameState {
    case home
    case raceTypeSelection
    case scanningRoom
    case scanningCar
    case trackPlacement
    case racing
    case raceComplete
}
```

##### Track Loading System
- Async USDZ model loading with `Entity(contentsOf:)`
- Bundle resource management
- Model scaling and positioning
- Anchor-based placement on AR surfaces

##### Checkpoint System
- Checkpoint gate generation with configurable positions
- Collision detection using distance calculations
- Sequential checkpoint validation
- Lap completion detection
- Visual feedback for checkpoint passage

##### Timing System
- High-precision timer with 16ms update intervals
- Lap time calculation and comparison
- Best lap tracking across sessions
- Formatted time display (MM:SS.mmm)

##### Camera Tracking
- Real-time camera position monitoring
- 3D distance calculations for checkpoint detection
- Position history for movement analysis
- Integration with ARSession updates

### Data Models

#### Race Types
```swift
enum RaceType {
    case grandPrix    // Multi-lap competitive racing
    case timeTrial    // Best lap time focus
    case practice     // Free practice mode
}
```

#### Track Types
```swift
enum TrackType {
    case monaco       // Monaco GP circuit
    case lowPoly      // Low Poly Circuit
    case mania        // Procedurally generated

    var usdzFileName: String?
    var numberOfCheckpoints: Int
}
```

#### Checkpoint Gates
- Position: 3D coordinates in AR space
- Type: Start/finish or intermediate
- Visual representation: Colored boxes with materials
- Detection radius: Configurable threshold

### ARKit Integration

**Configuration:**
- World tracking with plane detection
- Horizontal and vertical plane detection
- Scene reconstruction mesh data
- Camera position and orientation tracking

**AR Session Delegate:**
- Mesh anchor updates for room scanning
- Anchor management for track placement
- Frame updates for camera tracking
- Session error handling

### File Structure

```
KartAR/
├── KartAR.xcodeproj/          # Xcode project configuration
├── KartARApp.swift             # App entry point (41 lines)
├── ContentView.swift           # UI layer (567 lines)
├── RacingViewModel.swift       # Core game logic (1,416 lines)
├── Info.plist                  # App configuration
├── Assets.xcassets/            # App icons and color assets
│
├── Track Models (USDZ):
│   ├── Monaco_GP_racetrack.usdz                          # 932 KB
│   └── Blender_Low_Poly_Race_track_model_2_CarGame.usdz  # 155 KB
│
└── Documentation:
    ├── README.md               # This file
    ├── 3D_MODELS_GUIDE.md      # 3D model integration guide
    ├── MODELS_README.md        # Model format information
    └── SETUP_COMPLETE.md       # Initial setup documentation
```

## Requirements

### Hardware
- iOS device with A12 Bionic chip or later (iPhone XS/XR and newer)
- LiDAR sensor recommended for enhanced AR experience (iPhone 12 Pro and newer)
- Minimum 2GB RAM

### Software
- iOS 18.0 or later
- Xcode 15.0 or later (for development)
- Swift 5.0 or later

### Capabilities
- ARKit support (required)
- Metal graphics API (required)
- Camera access (required)
- Local network access (for future features)

## Installation

### For Users (App Installation)
1. Clone this repository
2. Open `KartAR.xcodeproj` in Xcode
3. Connect your iOS device
4. Select your development team in project settings
5. Build and run on your device (⌘R)

### For Developers (Project Setup)
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/KartAR.git
   cd KartAR
   ```

2. Open the project:
   ```bash
   open KartAR.xcodeproj
   ```

3. Configure signing:
   - Select the KartAR target
   - Go to "Signing & Capabilities"
   - Select your development team
   - Ensure bundle identifier is unique

4. Build and run:
   - Select your iOS device as the build target
   - Press ⌘R or click the Run button

**Note:** ARKit requires a physical iOS device. The app cannot run in the iOS Simulator.

## Usage Guide

### Starting a Race

1. **Launch App**: Open KartAR and grant camera permissions
2. **Select Race Mode**: Choose from Grand Prix, Time Trial, or Practice
3. **Choose Track**: Select Monaco GP, Low Poly Circuit, or Mania mode
4. **Scan Room** (Mania mode only): Move your device to scan the environment
5. **Place Track**: Tap to position the track on a detected surface
6. **Start Racing**: Tap "Start Race" to begin

### During the Race

**Portrait Mode:**
- View detailed race statistics in the top HUD
- Monitor lap progress and checkpoint count
- Track current time and best lap
- Access reset and stop controls at bottom

**Landscape Mode (Auto-activates):**
- Experience cockpit-style immersive view
- Compact HUD shows essential race info
- Navigate through checkpoints
- Focus on the racing experience

**Controls:**
- 🔄 Reset: Restart current race from checkpoint 1
- ⏹️ Stop: End race and view final results

### Completing a Race

- In **Grand Prix** and **Time Trial**: Complete the specified number of laps
- In **Practice**: Race continuously until manually stopped
- View lap times and best lap on completion screen
- Return home or start a new race

## Performance Optimization

### Memory Management
- Entities are properly removed from parent on cleanup
- AR anchors are managed and released appropriately
- Timers are invalidated when not in use
- Models are loaded asynchronously to prevent blocking

### Rendering Optimization
- Efficient checkpoint collision detection
- Minimal UI updates during racing
- Optimized 3D model poly counts (Low Poly: 155KB)
- Material sharing for checkpoint gates

### AR Session Management
- Proper session pause/resume handling
- Mesh anchor filtering and processing
- Efficient plane detection updates
- Camera position caching

## Known Limitations

1. **Cockpit Model**: The F1 cockpit feature currently uses a procedural fallback steering wheel instead of the full 3D model
2. **Mania Mode Track Generation**: Procedural track generation depends on room scanning quality
3. **Lighting**: AR objects may not perfectly match real-world lighting in all conditions
4. **Surface Detection**: Track placement requires well-lit environments and clear surfaces
5. **Device Performance**: Older devices may experience reduced frame rates during complex scenes

## Future Enhancements

### Planned Features
- [ ] Multiplayer racing support
- [ ] Custom track editor
- [ ] Ghost car for time trial mode
- [ ] Leaderboard integration
- [ ] Replay system
- [ ] Additional track layouts
- [ ] Customizable vehicles
- [ ] Weather effects
- [ ] Dynamic time of day

### Technical Improvements
- [ ] F1 cockpit 3D model integration
- [ ] Meta Quest 3 camera streaming
- [ ] Enhanced physics simulation
- [ ] Improved procedural track generation
- [ ] Cloud save for race statistics
- [ ] SharePlay support for multiplayer

## Development

### Building from Source

1. Ensure you have the latest Xcode installed
2. Open `KartAR.xcodeproj`
3. Select your development team
4. Build for your iOS device

### Adding New Tracks

1. Create or obtain a USDZ 3D model of your track
2. Add the `.usdz` file to the project in Xcode
3. Ensure it's added to "Copy Bundle Resources" in Build Phases
4. Add a new case to `TrackType` enum in [RacingViewModel.swift](RacingViewModel.swift)
5. Specify the USDZ filename in `usdzFileName` property
6. Define checkpoint count in `numberOfCheckpoints` property
7. Update checkpoint positions in the checkpoint generation logic

### Code Style
- SwiftUI for all UI components
- MVVM architecture pattern
- Async/await for asynchronous operations
- Published properties for reactive state management
- Descriptive variable and function names
- Inline documentation for complex logic

## Troubleshooting

### AR Session Issues
**Problem:** "ARKit not available" error
**Solution:** Ensure you're running on a physical iOS device with ARKit support

**Problem:** Track won't place
**Solution:** Ensure good lighting and move device to scan surfaces

**Problem:** Poor tracking quality
**Solution:** Move slowly, avoid reflective surfaces, ensure adequate lighting

### Performance Issues
**Problem:** Low frame rate during racing
**Solution:** Close background apps, ensure iOS is up to date, reduce visual complexity

**Problem:** App crashes on older devices
**Solution:** Ensure device meets minimum requirements (A12 Bionic chip or later)

### Timing Issues
**Problem:** Checkpoints not registering
**Solution:** Ensure you're passing through checkpoint gates, not around them

**Problem:** Timer not starting
**Solution:** Ensure you've crossed the green start/finish checkpoint

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Contribution Areas
- Bug fixes and performance improvements
- New track layouts and 3D models
- UI/UX enhancements
- Documentation improvements
- Test coverage expansion

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- **Apple ARKit & RealityKit**: For providing the AR foundation
- **3D Models**:
  - Monaco GP track model
  - Blender Low Poly race track
  - Environment decoration models (buildings, bridges, etc.)
- **Swift Community**: For excellent frameworks and resources

## Contact

For questions, suggestions, or issues:
- Open an issue on GitHub
- Contact: [Your Email]
- Twitter: [@YourHandle]

## Version History

### v1.0.0 (Current)
- Initial release
- Multiple race modes (Grand Prix, Time Trial, Practice)
- Three track types (Monaco GP, Low Poly Circuit, Mania)
- Dynamic orientation system (Portrait/Landscape)
- Advanced timing system with lap tracking
- AR room scanning and track placement
- Checkpoint detection and validation
- Procedural fallback cockpit visualization

---

**Built with ❤️ using ARKit and RealityKit**
