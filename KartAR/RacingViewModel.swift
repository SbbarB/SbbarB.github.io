import SwiftUI
import ARKit
import RealityKit
import Combine

enum GameState {
    case home
    case raceTypeSelection
    case scanningRoom
    case scanningCar
    case trackPlacement
    case racing
    case raceComplete
}

enum RaceType {
    case grandPrix
    case timeTrial
    case practice

    var displayName: String {
        switch self {
        case .grandPrix: return "Grand Prix"
        case .timeTrial: return "Time Trial"
        case .practice: return "Practice"
        }
    }
}

enum TrackType {
    case monaco
    case lowPoly
    case mania

    var displayName: String {
        switch self {
        case .monaco: return "Monaco GP"
        case .lowPoly: return "Low Poly Circuit"
        case .mania: return "Mania"
        }
    }

    var usdzFileName: String? {
        switch self {
        case .monaco: return "Monaco_GP_racetrack"
        case .lowPoly: return "Blender_Low_Poly_Race_track_model_2_CarGame"
        case .mania: return nil // No track model for Mania mode
        }
    }

    var numberOfCheckpoints: Int {
        switch self {
        case .monaco: return 1  // Just start/finish line
        case .lowPoly: return 6  // 1 green start/finish + 5 orange checkpoints
        case .mania: return 8
        }
    }
}

class RacingViewModel: NSObject, ObservableObject {
    // MARK: - Published Properties
    @Published var gameState: GameState = .home
    @Published var currentLap: Int = 0
    @Published var totalLaps: Int = 3
    @Published var currentTime: TimeInterval = 0
    @Published var bestLapTime: TimeInterval = .infinity
    @Published var lastLapTime: TimeInterval = 0
    @Published var lapTimes: [TimeInterval] = []
    @Published var currentCheckpoint: Int = 0
    @Published var showCheckpointMessage: Bool = false
    @Published var showLapCompleteMessage: Bool = false
    @Published var isNewBestLap: Bool = false
    @Published var meshAnchorCount: Int = 0
    @Published var selectedRaceType: RaceType = .grandPrix
    @Published var selectedTrackType: TrackType = .monaco
    @Published var showCockpitView: Bool = false

    // MARK: - AR Properties
    var arView: ARView?
    private var meshAnchors: [ARMeshAnchor] = []
    private var isScanning: Bool = false
    private var floorLevel: Float = 0.0
    private var isGeneratingTrack: Bool = false

    // MARK: - Room Space Properties
    private var roomBounds: (min: SIMD3<Float>, max: SIMD3<Float>)?

    // MARK: - Track Properties
    private var trackCheckpoints: [CheckpointGate] = []
    private var trackVisualization: [Entity] = []
    private var roadSegments: [Entity] = []
    private var cockpitEntity: ModelEntity?

    // MARK: - Timing Properties
    private var lapStartTime: Date?
    private var raceTimer: Timer?
    private var checkpointTimer: Timer?

    // MARK: - Camera Tracking
    private var lastCameraPosition: SIMD3<Float>?

    // MARK: - Computed Properties
    var formattedCurrentTime: String {
        Self.formatTime(currentTime)
    }

    var formattedBestLapTime: String {
        bestLapTime == .infinity ? "--:--:---" : Self.formatTime(bestLapTime)
    }

    var lastLapTimeFormatted: String {
        Self.formatTime(lastLapTime)
    }

    // MARK: - Setup
    func setupARSession() {
        guard let arView = arView else { return }

        let config = ARWorldTrackingConfiguration()

        // Don't enable scene reconstruction until user starts scanning
        config.planeDetection = [.horizontal, .vertical]

        arView.session.delegate = self
        arView.session.run(config)

        // Start tracking camera position
        startCameraTracking()
    }

    // MARK: - Scanning Control
    func startScanning() {
        guard let arView = arView else { return }

        print("🔄 Starting new scan - clearing old track...")

        // CRITICAL: Clear old track visualization before starting new scan
        clearTrackVisualization()
        trackCheckpoints.removeAll()
        roadSegments.removeAll()

        // Reset track generation flag
        isGeneratingTrack = false

        gameState = .scanningRoom
        isScanning = true
        meshAnchors.removeAll()
        meshAnchorCount = 0

        // Enable LiDAR scene reconstruction when user starts scanning
        let config = ARWorldTrackingConfiguration()
        if ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) {
            config.sceneReconstruction = .mesh
            config.environmentTexturing = .automatic
        }
        config.planeDetection = [.horizontal, .vertical]
        config.frameSemantics = .sceneDepth

        arView.session.run(config, options: [.resetTracking, .removeExistingAnchors])
        print("✅ Track cleared, scanning started")
    }

    // MARK: - Camera Tracking
    func startCameraTracking() {
        checkpointTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            self?.checkCameraPosition()
        }
    }

    func checkCameraPosition() {
        guard gameState == .racing,
              let arView = arView,
              let cameraTransform = arView.session.currentFrame?.camera.transform else {
            return
        }

        let cameraPosition = SIMD3<Float>(
            cameraTransform.columns.3.x,
            cameraTransform.columns.3.y,
            cameraTransform.columns.3.z
        )

        // Check if camera (RC car) has passed through any checkpoint
        checkCheckpointCollision(cameraPosition: cameraPosition)

        lastCameraPosition = cameraPosition
    }

    // MARK: - Scanning Phase
    func finishScanning() {
        isScanning = false

        // Safety check: Make sure we have mesh data
        if meshAnchors.isEmpty {
            print("WARNING: No mesh anchors found. Using default track generation.")
        }

        // Store room bounds for later use
        roomBounds = calculateRoomBounds()

        gameState = .trackPlacement
        generateTrack()
    }

    // MARK: - Track Generation (USDZ-based)
    func generateTrack() {
        guard let arView = arView else {
            print("ERROR: ARView is nil")
            return
        }

        // Prevent concurrent track generation
        guard !isGeneratingTrack else {
            print("⚠️ Track generation already in progress, skipping...")
            return
        }

        isGeneratingTrack = true
        print("🏁 Starting track generation for \(selectedTrackType.displayName)...")

        // Clear old track
        clearTrackVisualization()
        trackCheckpoints.removeAll()
        roadSegments.removeAll()

        // Calculate floor level
        _ = calculateRoomBounds()

        // If no mesh data, use camera position as floor reference
        if meshAnchors.isEmpty, let cameraTransform = arView.session.currentFrame?.camera.transform {
            let cameraY = cameraTransform.columns.3.y
            floorLevel = cameraY - 1.0 // Assume floor is 1 meter below camera
            print("⚠️ No mesh data - using camera Y=\(cameraY), floor at Y=\(floorLevel)")
        }

        print("📏 FLOOR LEVEL = \(floorLevel)m")

        // Load USDZ track model
        Task { @MainActor in
            do {
                let (trackPos, trackScale, trackBounds) = await self.loadTrackModel(arView: arView)
                self.createCheckpointsForTrack(trackPosition: trackPos, trackScale: trackScale, trackBounds: trackBounds, arView: arView)
                self.isGeneratingTrack = false
                print("✅ \(self.selectedTrackType.displayName) track generation complete!")
            } catch {
                print("❌ Track generation failed: \(error)")
                self.isGeneratingTrack = false
            }
        }
    }

    // MARK: - USDZ Track Model Loading
    @MainActor
    func loadTrackModel(arView: ARView) async -> (position: SIMD3<Float>, scale: Float, bounds: BoundingBox?) {
        // Mania mode doesn't load a track model, only checkpoints
        guard let usdzFileName = selectedTrackType.usdzFileName else {
            print("🏎️ Mania mode - no track model, checkpoints only")
            // Get room center for Mania mode
            let bounds = calculateRoomBounds()
            let centerX = (bounds.min.x + bounds.max.x) / 2
            let centerZ = (bounds.min.z + bounds.max.z) / 2
            let centerPos = SIMD3<Float>(centerX, floorLevel, centerZ)
            print("   Mania center: (\(String(format: "%.2f", centerX)), \(String(format: "%.2f", floorLevel)), \(String(format: "%.2f", centerZ)))")
            return (centerPos, 1.0, nil) // Scale doesn't matter for Mania, just return 1.0
        }

        print("🏎️ Loading \(usdzFileName).usdz...")

        // Create anchor at floor level
        let anchorTransform = Transform(
            scale: SIMD3<Float>(1, 1, 1),
            rotation: simd_quatf(angle: 0, axis: SIMD3<Float>(0, 1, 0)),
            translation: SIMD3<Float>(0, 0, 0)
        )
        let trackAnchor = AnchorEntity(world: anchorTransform.matrix)

        var trackPosition = SIMD3<Float>(0, floorLevel, 0)
        var trackScale: Float = 0.01
        var savedModelBounds: BoundingBox? = nil

        do {
            // CORRECT WAY: Load USDZ with Entity.load to preserve hierarchy
            guard let modelURL = Bundle.main.url(forResource: usdzFileName, withExtension: "usdz") else {
                print("❌ Could not find \(usdzFileName).usdz in bundle")
                print("   Searched for: \(usdzFileName).usdz")
                // List what we CAN find
                if let resourcePath = Bundle.main.resourcePath {
                    let contents = try? FileManager.default.contentsOfDirectory(atPath: resourcePath)
                    let usdzFiles = contents?.filter { $0.hasSuffix(".usdz") } ?? []
                    print("   Found USDZ files: \(usdzFiles)")
                }
                return (trackPosition, trackScale, nil)
            }

            print("✅ Found file at: \(modelURL.path)")

            let loadedEntity = try await Entity(contentsOf: modelURL)
            print("✅ Loaded \(usdzFileName).usdz successfully!")
            print("   Entity name: \(loadedEntity.name)")
            print("   Children count: \(loadedEntity.children.count)")
            print("   Has model component: \(loadedEntity.components.has(ModelComponent.self))")

            // Print ALL children and their details
            print("📦 Loaded entity structure:")
            printEntityHierarchy(loadedEntity, indent: "  ")

            func printEntityHierarchy(_ entity: Entity, indent: String) {
                let hasModel = entity.components.has(ModelComponent.self)
                let hasMaterial = entity.components[ModelComponent.self]?.materials.count ?? 0
                print("\(indent)Entity: \(entity.name), hasModel: \(hasModel), materials: \(hasMaterial)")
                for child in entity.children {
                    printEntityHierarchy(child, indent: indent + "  ")
                }
            }

            // STEP 1: Calculate model's bounding box in its local space (before any transforms)
            let modelBounds = loadedEntity.visualBounds(relativeTo: loadedEntity)
            savedModelBounds = modelBounds // Save for checkpoint placement
            print("📦 Model bounds in local space:")
            print("   Min: (\(String(format: "%.2f", modelBounds.min.x)), \(String(format: "%.2f", modelBounds.min.y)), \(String(format: "%.2f", modelBounds.min.z)))")
            print("   Max: (\(String(format: "%.2f", modelBounds.max.x)), \(String(format: "%.2f", modelBounds.max.y)), \(String(format: "%.2f", modelBounds.max.z)))")

            // Calculate geometric centroid of the model
            let modelCentroid = SIMD3<Float>(
                (modelBounds.min.x + modelBounds.max.x) / 2,
                (modelBounds.min.y + modelBounds.max.y) / 2,
                (modelBounds.min.z + modelBounds.max.z) / 2
            )
            let modelBottomY = modelBounds.min.y
            let modelWidth = modelBounds.max.x - modelBounds.min.x
            let modelDepth = modelBounds.max.z - modelBounds.min.z

            print("   Centroid: (\(String(format: "%.2f", modelCentroid.x)), \(String(format: "%.2f", modelCentroid.y)), \(String(format: "%.2f", modelCentroid.z)))")
            print("   Bottom Y: \(String(format: "%.2f", modelBottomY))")
            print("   Model dimensions: \(String(format: "%.2f", modelWidth)) x \(String(format: "%.2f", modelDepth))")

            // STEP 2: Get room bounds to find center
            let bounds = calculateRoomBounds()
            let centerX = (bounds.min.x + bounds.max.x) / 2
            let centerZ = (bounds.min.z + bounds.max.z) / 2
            let roomWidth = bounds.max.x - bounds.min.x
            let roomDepth = bounds.max.z - bounds.min.z

            print("📍 Room mapping:")
            print("   Room center: (\(String(format: "%.2f", centerX)), \(String(format: "%.2f", centerZ)))")
            print("   Room size: \(String(format: "%.2f", roomWidth))m x \(String(format: "%.2f", roomDepth))m")

            // STEP 3: Calculate scale to fit track bounding box into room
            let minRoomDimension = min(roomWidth, roomDepth)
            let maxModelDimension = max(modelWidth, modelDepth)
            let targetSize = minRoomDimension * 0.8 // Use 80% of room
            let dynamicScale = targetSize / maxModelDimension

            print("📏 Scaling calculation:")
            print("   Model max dimension: \(String(format: "%.2f", maxModelDimension))")
            print("   Target size (80%% room): \(String(format: "%.2f", targetSize))m")
            print("   Dynamic scale: \(String(format: "%.4f", dynamicScale))")

            // STEP 4: Determine rotation based on room shape
            let rotationAngle: Float = roomWidth < roomDepth ? Float.pi / 2 : 0
            print("🔄 Track rotation: \(rotationAngle) radians (\(Int(rotationAngle * 180 / Float.pi))°)")

            // STEP 5: Apply scale and rotation FIRST
            loadedEntity.scale = SIMD3<Float>(dynamicScale, dynamicScale, dynamicScale)
            loadedEntity.orientation = simd_quatf(angle: rotationAngle, axis: [0, 1, 0])

            // STEP 6: Calculate position offset to place centroid at room center and bottom at floor
            // After scaling, the centroid offset becomes: modelCentroid * dynamicScale
            // After rotation, we need to rotate the centroid offset
            let rotatedCentroid = simd_quatf(angle: rotationAngle, axis: [0, 1, 0]).act(modelCentroid * dynamicScale)
            let rotatedBottomY = modelBottomY * dynamicScale

            // Position the entity's origin so that:
            // - The geometric centroid ends up at (centerX, floorLevel, centerZ)
            // - The bottom of the model sits on the floor
            let entityPosition = SIMD3<Float>(
                centerX - rotatedCentroid.x,
                floorLevel - rotatedBottomY,
                centerZ - rotatedCentroid.z
            )

            loadedEntity.position = entityPosition
            trackPosition = SIMD3<Float>(centerX, floorLevel, centerZ) // Store the actual track center
            trackScale = dynamicScale

            print("🏎️ Final track positioning:")
            print("   Floor Level: \(String(format: "%.2f", floorLevel))")
            print("   Entity Origin: (\(String(format: "%.2f", entityPosition.x)), \(String(format: "%.2f", entityPosition.y)), \(String(format: "%.2f", entityPosition.z)))")
            print("   Track Centroid (world): (\(String(format: "%.2f", centerX)), \(String(format: "%.2f", floorLevel)), \(String(format: "%.2f", centerZ)))")
            print("   Centroid Offset: (\(String(format: "%.2f", rotatedCentroid.x)), \(String(format: "%.2f", rotatedCentroid.y)), \(String(format: "%.2f", rotatedCentroid.z)))")
            print("   Track Scale: \(String(format: "%.4f", trackScale))")

            // DON'T override materials - keep original textures
            // loadedEntity already has its materials from the USDZ

            // Add lighting to make textures visible
            let directionalLight = DirectionalLight()
            directionalLight.light.intensity = 2000
            directionalLight.light.color = .white
            directionalLight.orientation = simd_quatf(angle: -.pi / 3, axis: [1, 0, 0])
            trackAnchor.addChild(directionalLight)

            // Add ambient light
            let ambientLight = PointLight()
            ambientLight.light.intensity = 1000
            ambientLight.light.color = .white
            ambientLight.light.attenuationRadius = 10
            ambientLight.position = trackPosition + SIMD3<Float>(0, 2, 0)
            trackAnchor.addChild(ambientLight)

            // Enable collision shapes
            loadedEntity.generateCollisionShapes(recursive: true)
            print("   Generated collision shapes and lighting (keeping original materials)")

            trackAnchor.addChild(loadedEntity)
            trackVisualization.append(loadedEntity)

            print("✅ Track added to scene anchor!")
            print("   Anchor has \(trackAnchor.children.count) children")

        } catch {
            print("❌ Failed to load \(usdzFileName).usdz: \(error)")
            print("   Error details: \(error.localizedDescription)")
        }

        arView.scene.addAnchor(trackAnchor)
        return (trackPosition, trackScale, savedModelBounds)
    }

    // MARK: - Checkpoint Creation for Both Tracks
    func createCheckpointsForTrack(trackPosition: SIMD3<Float>, trackScale: Float, trackBounds: BoundingBox?, arView: ARView) {
        trackCheckpoints.removeAll()
        print("🚩 Creating checkpoints for \(selectedTrackType.displayName)...")

        // Create anchor for checkpoints
        let anchorTransform = Transform(
            scale: SIMD3<Float>(1, 1, 1),
            rotation: simd_quatf(angle: 0, axis: SIMD3<Float>(0, 1, 0)),
            translation: SIMD3<Float>(0, 0, 0)
        )
        let checkpointAnchor = AnchorEntity(world: anchorTransform.matrix)

        // Get checkpoint positions based on track type
        let checkpointPositions: [(Float, Float)]

        if selectedTrackType == .mania {
            // Mania mode: Create a smooth, curvy closed blob shape
            var blobPositions: [(Float, Float)] = []
            let numCheckpoints = selectedTrackType.numberOfCheckpoints

            // Create a smooth curvy path by sampling points around a deformed circle
            for i in 0..<numCheckpoints {
                let baseAngle = Float(i) * (2.0 * Float.pi) / Float(numCheckpoints)

                // Add smooth deformation using multiple sine waves for organic shape
                let deformation1 = 0.2 * sin(3.0 * baseAngle)
                let deformation2 = 0.15 * cos(5.0 * baseAngle)
                let radius = 0.7 + deformation1 + deformation2

                // Calculate position with smooth curves
                let x = radius * cos(baseAngle)
                let z = radius * sin(baseAngle)

                blobPositions.append((x, z))
            }

            checkpointPositions = blobPositions
            print("🎲 Mania mode: Generated \(checkpointPositions.count) checkpoints in curvy blob shape")

        } else if let bounds = trackBounds {
            // Use actual track geometry to place checkpoints
            // Calculate checkpoints based on the track's bounding box shape
            let width = (bounds.max.x - bounds.min.x) * trackScale
            let depth = (bounds.max.z - bounds.min.z) * trackScale

            print("📏 Track dimensions for checkpoints: \(String(format: "%.2f", width))m x \(String(format: "%.2f", depth))m")

            if selectedTrackType == .monaco {
                // Monaco GP - Just start/finish line, no checkpoints
                var positions: [(Float, Float)] = []

                // Single start/finish line - use center position on main straight
                positions.append((0.0, 0.5))

                checkpointPositions = positions
                print("🏎️ Monaco GP: Start/finish line only")

            } else {
                // Low Poly - 4 fixed checkpoints on the straights
                var positions: [(Float, Float)] = []

                let scaleX = (width / 2)
                let scaleZ = (depth / 2)

                // Low Poly: 6 checkpoints - SYSTEMATICALLY PLACED AROUND TRACK
                // Analyzed 32 sectors at 11.25° intervals, selected 6 evenly distributed
                // Each checkpoint spans perpendicular across track from white edge to white edge
                // Checkpoint 0 is near top (checkered flag area) = green start/finish
                let lowPolyPath: [(Float, Float)] = [
                    (-0.146, 0.913),   // Line 0: Start/Finish GREEN - top @ 118° (checkered flag area)
                    (-0.951, -0.130),  // Line 1: ORANGE - left @ -174°
                    (-0.195, -0.913),  // Line 2: ORANGE - bottom-left @ -118°
                    (0.427, -0.935),   // Line 3: ORANGE - bottom-right @ -62°
                    (0.659, 0.196),    // Line 4: ORANGE - right @ 6°
                    (0.326, 0.793),    // Line 5: ORANGE - top-right @ 62°
                ]

                for (normX, normZ) in lowPolyPath {
                    let x = normX * scaleX
                    let z = normZ * scaleZ
                    positions.append((x, z))
                }

                checkpointPositions = positions
                print("🏎️ Low Poly: Created \(positions.count) checkpoints on straights")
            }

            print("✅ Generated \(checkpointPositions.count) checkpoints following track geometry")
        } else if selectedTrackType == .mania {
            // Mania mode - create circular path with 8 checkpoints
            var positions: [(Float, Float)] = []

            let numCheckpoints = 8
            for i in 0..<numCheckpoints {
                let angle = Float(i) * (2 * .pi / Float(numCheckpoints)) - .pi / 2
                let radius: Float = 0.7  // Circular pattern
                let x = cos(angle) * radius
                let z = sin(angle) * radius
                positions.append((x, z))
            }

            checkpointPositions = positions
            print("🏎️ Mania: Created \(positions.count) checkpoints in circular pattern")
            print("✅ Generated \(checkpointPositions.count) checkpoints following track geometry")
        } else {
            // Fallback if no track type matches
            checkpointPositions = []
        }

        // Calculate track dimensions for checkpoint placement
        let trackWidth: Float
        let trackDepth: Float
        if let bounds = trackBounds {
            trackWidth = (bounds.max.x - bounds.min.x) * trackScale
            trackDepth = (bounds.max.z - bounds.min.z) * trackScale
        } else {
            // Fallback for Mania mode
            let bounds = calculateRoomBounds()
            trackWidth = bounds.max.x - bounds.min.x
            trackDepth = bounds.max.z - bounds.min.z
        }

        // Create checkpoints following the actual track geometry
        for (i, (localX, localZ)) in checkpointPositions.enumerated() {
            // Position checkpoints based on mode
            let worldX: Float
            let worldZ: Float

            if selectedTrackType == .mania {
                // Mania: Use actual room coordinates
                let maxDimension = max(trackWidth, trackDepth)
                worldX = trackPosition.x + (localX * maxDimension)
                worldZ = trackPosition.z + (localZ * maxDimension)
            } else {
                // Track modes: localX/localZ are already in meters relative to track center
                worldX = trackPosition.x + localX
                worldZ = trackPosition.z + localZ
            }

            let worldY = floorLevel // Place ON the floor, not above it

            print("   Checkpoint \(i): (\(String(format: "%.2f", worldX)), \(String(format: "%.2f", worldY)), \(String(format: "%.2f", worldZ)))")

            let checkpointPos = SIMD3<Float>(worldX, worldY, worldZ)

            // Calculate direction (tangent to track) using average of prev->current and current->next
            // This gives better perpendicular alignment at each checkpoint
            let prevIndex = (i - 1 + checkpointPositions.count) % checkpointPositions.count
            let nextIndex = (i + 1) % checkpointPositions.count

            let (prevLocalX, prevLocalZ) = checkpointPositions[prevIndex]
            let (nextLocalX, nextLocalZ) = checkpointPositions[nextIndex]

            let prevWorldX: Float
            let prevWorldZ: Float
            let nextWorldX: Float
            let nextWorldZ: Float

            if selectedTrackType == .mania {
                let maxDimension = max(trackWidth, trackDepth)
                prevWorldX = trackPosition.x + (prevLocalX * maxDimension)
                prevWorldZ = trackPosition.z + (prevLocalZ * maxDimension)
                nextWorldX = trackPosition.x + (nextLocalX * maxDimension)
                nextWorldZ = trackPosition.z + (nextLocalZ * maxDimension)
            } else {
                // localX/localZ are already in meters
                prevWorldX = trackPosition.x + prevLocalX
                prevWorldZ = trackPosition.z + prevLocalZ
                nextWorldX = trackPosition.x + nextLocalX
                nextWorldZ = trackPosition.z + nextLocalZ
            }

            let prevPos = SIMD3<Float>(prevWorldX, worldY, prevWorldZ)
            let nextPos = SIMD3<Float>(nextWorldX, worldY, nextWorldZ)

            // Average tangent direction from prev to next (through current point)
            let direction = normalize(nextPos - prevPos)

            // Create checkpoint gate
            let isStartFinish = (i == 0)
            // Gate width based on track type - should span edge to edge of road
            let gateWidth: Float
            if selectedTrackType == .monaco {
                // Monaco roads - gates should span the full road width
                gateWidth = min(trackWidth, trackDepth) * 0.15
            } else if selectedTrackType == .lowPoly {
                // Low Poly has wider roads
                gateWidth = min(trackWidth, trackDepth) * 0.18
            } else {
                // Mania mode - medium sized gates
                gateWidth = min(trackWidth, trackDepth) * 0.12
            }
            let posts = createCheckpointGate(at: checkpointPos, direction: direction, isStartFinish: isStartFinish, gateWidth: gateWidth)

            for post in posts {
                checkpointAnchor.addChild(post)
                trackVisualization.append(post)
            }

            // Store checkpoint data
            trackCheckpoints.append(CheckpointGate(id: i, position: checkpointPos, direction: direction))
        }

        arView.scene.addAnchor(checkpointAnchor)
        print("✅ Created \(trackCheckpoints.count) checkpoints for \(selectedTrackType.displayName)")
    }

    // Add visible materials to entity and all children
    func addVisibleMaterials(to entity: Entity) {
        // Add material to this entity if it has a model component
        if var modelComponent = entity.components[ModelComponent.self] {
            var material = SimpleMaterial()
            material.color = .init(tint: .white, texture: nil)
            material.metallic = .init(floatLiteral: 0.0)
            material.roughness = .init(floatLiteral: 0.8)

            modelComponent.materials = [material]
            entity.components[ModelComponent.self] = modelComponent
            print("   Added material to entity: \(entity.name)")
        }

        // Recursively add to all children
        for child in entity.children {
            addVisibleMaterials(to: child)
        }
    }

    func createCheckpointGate(at position: SIMD3<Float>, direction: SIMD3<Float>, isStartFinish: Bool, gateWidth: Float = 0.30) -> [ModelEntity] {
        var entities: [ModelEntity] = []

        // For Monaco start/finish, create a simple white line on the track surface
        if selectedTrackType == .monaco && isStartFinish {
            // Create a thin white line spanning edge to edge
            // The box 'width' extends along X-axis by default, so we rotate it to align perpendicular to track
            let lineThickness: Float = 0.02   // Thickness along track direction
            let lineHeight: Float = 0.003     // Height above track

            let lineMesh = MeshResource.generateBox(width: gateWidth, height: lineHeight, depth: lineThickness)
            let whiteMaterial = SimpleMaterial(color: .white, isMetallic: false)

            let startLine = ModelEntity(mesh: lineMesh, materials: [whiteMaterial])

            // Position slightly above track surface to be visible
            startLine.position = SIMD3<Float>(position.x, position.y + 0.01, position.z)

            // Rotate to be perpendicular to track direction
            // Calculate rotation from default orientation to align perpendicular to track
            let angle = atan2(direction.x, direction.z)  // Angle to align with track direction
            startLine.orientation = simd_quatf(angle: angle, axis: SIMD3<Float>(0, 1, 0))

            entities.append(startLine)

            print("   START LINE: width=\(String(format: "%.3f", gateWidth))m at angle \(String(format: "%.1f", angle * 180 / .pi))° (white line on track)")

            return entities
        }

        // For Low Poly checkpoints, create perpendicular line + poles at each end
        // Calculate perpendicular direction (right side of the track)
        // This ensures poles are exactly perpendicular to the track direction
        let right = normalize(SIMD3<Float>(-direction.z, 0, direction.x))

        // Position poles exactly at the track edges
        let leftPos = position - right * (gateWidth / 2)
        let rightPos = position + right * (gateWidth / 2)

        // For start/finish, add a white line across the track (covering checkered flag)
        if selectedTrackType == .lowPoly && isStartFinish {
            // Make the white line cover the full checkered flag area
            let lineWidth = gateWidth * 1.2  // Slightly wider to ensure full coverage
            let lineThickness: Float = 0.04   // Thicker to match checkered flag visibility
            let lineHeight: Float = 0.003     // Height above track

            let lineMesh = MeshResource.generateBox(width: lineWidth, height: lineHeight, depth: lineThickness)
            let whiteMaterial = SimpleMaterial(color: .white, isMetallic: false)

            let startLine = ModelEntity(mesh: lineMesh, materials: [whiteMaterial])

            // Position slightly above track surface to be visible on top of checkered flag
            startLine.position = SIMD3<Float>(position.x, position.y + 0.01, position.z)

            // Rotate to be perpendicular to track direction
            let angle = atan2(direction.x, direction.z)
            startLine.orientation = simd_quatf(angle: angle, axis: SIMD3<Float>(0, 1, 0))

            entities.append(startLine)

            print("   START LINE: white line covering checkered flag, width=\(String(format: "%.3f", lineWidth))m")
        }

        // Create poles at each end of the perpendicular line
        let postHeight: Float = max(0.08, gateWidth * 0.6) // Shorter, proportional to gate width
        let postRadius: Float = max(0.008, gateWidth * 0.06) // Very thin poles

        let postColor: UIColor = isStartFinish ? .green : .orange
        let material = SimpleMaterial(color: postColor, isMetallic: false)
        let postMesh = MeshResource.generateCylinder(height: postHeight, radius: postRadius)

        // Left post - positioned at track edge
        let leftPost = ModelEntity(mesh: postMesh, materials: [material])
        leftPost.position = SIMD3<Float>(leftPos.x, position.y + postHeight / 2, leftPos.z)
        entities.append(leftPost)

        // Right post - positioned at opposite track edge
        let rightPost = ModelEntity(mesh: postMesh, materials: [material])
        rightPost.position = SIMD3<Float>(rightPos.x, position.y + postHeight / 2, rightPos.z)
        entities.append(rightPost)

        print("   Gate \(isStartFinish ? "START (green)" : "CHECKPOINT (orange)"): width=\(String(format: "%.3f", gateWidth))m, posts at edges")

        return entities
    }


    func calculateRoomBounds() -> (min: SIMD3<Float>, max: SIMD3<Float>) {
        var minBounds = SIMD3<Float>(Float.infinity, Float.infinity, Float.infinity)
        var maxBounds = SIMD3<Float>(-Float.infinity, -Float.infinity, -Float.infinity)
        var floorYValues: [Float] = []

        print("🔍 Floor detection - selecting best 10 mesh anchors for maximum coverage...")

        // CRITICAL FIX: Use first 10 mesh anchors to prevent crashes (simple and safe)
        let maxAnchorsToProcess = 10
        let anchorsToProcess = Array(meshAnchors.prefix(maxAnchorsToProcess))

        print("📊 Processing \(anchorsToProcess.count) of \(meshAnchors.count) total mesh anchors")

        // ULTRA-FAST APPROACH: Sample very few vertices from limited anchors
        for (anchorIdx, meshAnchor) in anchorsToProcess.enumerated() {
            let geometry = meshAnchor.geometry
            let vertices = geometry.vertices
            let vertexCount = Int(vertices.count)

            guard vertexCount > 0 else {
                print("  Anchor \(anchorIdx): No vertices, skipping")
                continue
            }

            guard let vertexBuffer = vertices.buffer.contents() as UnsafeMutableRawPointer? else {
                print("  Anchor \(anchorIdx): Failed to get vertex buffer, skipping")
                continue
            }

            let vertexPointer = vertexBuffer.assumingMemoryBound(to: SIMD3<Float>.self)

            // EXTREME sampling - only check every 50th vertex, max 20 vertices per anchor
            let sampleRate = max(50, vertexCount / 20)
            let maxSamples = 20

            var samplesCollected = 0
            for i in stride(from: 0, to: vertexCount, by: sampleRate) {
                if samplesCollected >= maxSamples { break }

                guard i < vertexCount else { break }

                let localVertex = vertexPointer[i]
                let vertex = meshAnchor.transform * SIMD4<Float>(localVertex, 1)
                let worldVertex = SIMD3<Float>(vertex.x, vertex.y, vertex.z)

                minBounds = SIMD3<Float>(
                    min(minBounds.x, worldVertex.x),
                    min(minBounds.y, worldVertex.y),
                    min(minBounds.z, worldVertex.z)
                )
                maxBounds = SIMD3<Float>(
                    max(maxBounds.x, worldVertex.x),
                    max(maxBounds.y, worldVertex.y),
                    max(maxBounds.z, worldVertex.z)
                )

                // Collect Y values
                floorYValues.append(worldVertex.y)
                samplesCollected += 1
            }

            print("  Anchor \(anchorIdx): Sampled \(samplesCollected) of \(vertexCount) vertices")
        }

        // Quick floor detection: use MINIMUM Y value (actual lowest point)
        if !floorYValues.isEmpty {
            floorYValues.sort()
            // Use the absolute minimum Y value (lowest point scanned)
            floorLevel = floorYValues[0]
            print("✅ Floor detected at LOWEST POINT Y = \(floorLevel)m from \(floorYValues.count) sampled vertices")
            print("   (Y range: \(floorYValues[0]) to \(floorYValues[floorYValues.count-1]))")
        } else {
            print("⚠️ No Y values collected - floor will be set later")
        }

        // Default bounds if no scan data
        if minBounds.x == Float.infinity {
            print("⚠️ No mesh data - using default bounds centered at origin")
            minBounds = SIMD3<Float>(-1.0, -0.5, -1.0)
            maxBounds = SIMD3<Float>(1.0, 0.5, 1.0)
            // Floor level will be set in generateTrack using camera position
        }

        print("📏 Final bounds: min=(\(String(format: "%.2f", minBounds.x)), \(String(format: "%.2f", minBounds.y)), \(String(format: "%.2f", minBounds.z)))")
        print("📏             max=(\(String(format: "%.2f", maxBounds.x)), \(String(format: "%.2f", maxBounds.y)), \(String(format: "%.2f", maxBounds.z)))")
        print("📏             floor=\(String(format: "%.2f", floorLevel))m")
        return (minBounds, maxBounds)
    }

    func clearTrackVisualization() {
        print("🧹 Safely clearing track visualization...")

        // SAFE: Remove only entities we created, not all anchors
        for entity in trackVisualization {
            entity.removeFromParent()
        }
        trackVisualization.removeAll()

        for entity in roadSegments {
            entity.removeFromParent()
        }
        roadSegments.removeAll()

        // Remove cockpit if exists
        if let cockpit = cockpitEntity {
            cockpit.removeFromParent()
            cockpitEntity = nil
        }

        print("✅ Track cleared safely")
    }


    func createFallbackCockpit(container: ModelEntity) {
        print("Creating fallback procedural cockpit...")

        // Carbon fiber material
        var carbonMaterial = SimpleMaterial(color: UIColor(red: 0.1, green: 0.1, blue: 0.1, alpha: 1.0), isMetallic: true)
        carbonMaterial.metallic = 0.95
        carbonMaterial.roughness = 0.2

        // Steering wheel sized for horizontal view
        let wheelWidth: Float = 0.20
        let wheelHeight: Float = 0.10
        let rimThickness: Float = 0.015
        let rimDepth: Float = 0.02

        // Position lower on screen for horizontal orientation
        let wheelCenterY: Float = -0.12
        let wheelCenterZ: Float = -0.18

        // Top rim
        let topRim = MeshResource.generateBox(width: wheelWidth * 0.9, height: rimThickness, depth: rimDepth)
        let topEntity = ModelEntity(mesh: topRim, materials: [carbonMaterial])
        topEntity.position = SIMD3<Float>(0, wheelCenterY + wheelHeight/2, wheelCenterZ)

        // Bottom rim
        let bottomRim = MeshResource.generateBox(width: wheelWidth, height: rimThickness, depth: rimDepth)
        let bottomEntity = ModelEntity(mesh: bottomRim, materials: [carbonMaterial])
        bottomEntity.position = SIMD3<Float>(0, wheelCenterY - wheelHeight/2, wheelCenterZ)

        // Left side rim
        let leftRim = MeshResource.generateBox(width: rimThickness, height: wheelHeight * 0.8, depth: rimDepth)
        let leftEntity = ModelEntity(mesh: leftRim, materials: [carbonMaterial])
        leftEntity.position = SIMD3<Float>(-wheelWidth/2, wheelCenterY, wheelCenterZ)

        // Right side rim
        let rightEntity = ModelEntity(mesh: leftRim, materials: [carbonMaterial])
        rightEntity.position = SIMD3<Float>(wheelWidth/2, wheelCenterY, wheelCenterZ)

        // Red grips
        var redGripMaterial = SimpleMaterial(color: .red, isMetallic: true)
        redGripMaterial.metallic = 0.7
        redGripMaterial.roughness = 0.3

        let gripWidth: Float = 0.03
        let gripHeight: Float = 0.05
        let leftGrip = MeshResource.generateBox(width: gripWidth, height: gripHeight, depth: rimDepth * 1.5)
        let leftGripEntity = ModelEntity(mesh: leftGrip, materials: [redGripMaterial])
        leftGripEntity.position = SIMD3<Float>(-wheelWidth/2 + gripWidth/2, wheelCenterY, wheelCenterZ)

        let rightGripEntity = ModelEntity(mesh: leftGrip, materials: [redGripMaterial])
        rightGripEntity.position = SIMD3<Float>(wheelWidth/2 - gripWidth/2, wheelCenterY, wheelCenterZ)

        // Center hub
        let hubSize: Float = 0.04
        let hub = MeshResource.generateBox(width: hubSize, height: hubSize, depth: 0.01)
        let hubEntity = ModelEntity(mesh: hub, materials: [carbonMaterial])
        hubEntity.position = SIMD3<Float>(0, wheelCenterY, wheelCenterZ)

        // Dashboard/nose cone
        var bodyworkMaterial = SimpleMaterial(color: UIColor(red: 0.12, green: 0.12, blue: 0.12, alpha: 1.0), isMetallic: true)
        bodyworkMaterial.metallic = 0.85

        let noseCone = MeshResource.generateBox(width: 0.35, height: 0.04, depth: 0.12)
        let noseEntity = ModelEntity(mesh: noseCone, materials: [bodyworkMaterial])
        noseEntity.position = SIMD3<Float>(0, wheelCenterY - 0.08, wheelCenterZ - 0.08)

        container.addChild(topEntity)
        container.addChild(bottomEntity)
        container.addChild(leftEntity)
        container.addChild(rightEntity)
        container.addChild(leftGripEntity)
        container.addChild(rightGripEntity)
        container.addChild(hubEntity)
        container.addChild(noseEntity)
    }

    func attachCockpitToCamera() {
        guard let arView = arView, showCockpitView else {
            cockpitEntity?.removeFromParent()
            return
        }

        // Load F1 cockpit model asynchronously (same pattern as track loading)
        Task {
            await loadAndPlaceCockpit(arView: arView)
        }
    }

    func loadAndPlaceCockpit(arView: ARView) async {
        print("🏎️ Loading F1 cockpit model...")

        guard let modelURL = Bundle.main.url(forResource: "f1_2025_aston", withExtension: "usdz") else {
            print("⚠️ Could not find f1_2025_aston.usdz in bundle")
            if let resourcePath = Bundle.main.resourcePath {
                print("   Resource path: \(resourcePath)")
                let files = try? FileManager.default.contentsOfDirectory(atPath: resourcePath)
                print("   Available .usdz files: \(files?.filter { $0.hasSuffix(".usdz") } ?? [])")
            }
            // Create fallback procedural cockpit
            await MainActor.run {
                let fallbackContainer = ModelEntity()
                createFallbackCockpit(container: fallbackContainer)
                placeCockpitInScene(cockpit: fallbackContainer, arView: arView)
            }
            return
        }

        do {
            // Load the F1 model (same way as track models)
            let loadedCockpit = try await Entity(contentsOf: modelURL)

            await MainActor.run {
                print("✅ Loaded F1 Aston Martin AMR25 cockpit model")
                print("   Entity name: \(loadedCockpit.name)")
                print("   Children count: \(loadedCockpit.children.count)")
                placeCockpitInScene(cockpit: loadedCockpit, arView: arView)
            }

        } catch {
            print("❌ Failed to load f1_2025_aston.usdz: \(error)")
            print("   Error details: \(error.localizedDescription)")

            // Create fallback procedural cockpit
            await MainActor.run {
                let fallbackContainer = ModelEntity()
                createFallbackCockpit(container: fallbackContainer)
                placeCockpitInScene(cockpit: fallbackContainer, arView: arView)
            }
        }
    }

    func placeCockpitInScene(cockpit: Entity, arView: ARView) {
        // Find the track anchor (where the track model is placed)
        if let trackAnchor = arView.scene.anchors.first(where: { $0.name == "trackAnchor" }) {
            // Place cockpit flat on floor at track center
            cockpit.position = SIMD3<Float>(0, 0, 0)  // Floor level
            cockpit.scale = SIMD3<Float>(repeating: 0.5)  // Half size for visibility
            trackAnchor.addChild(cockpit)
            print("🏎️ F1 cockpit placed at track center (floor level)")
        } else {
            // Fallback: create anchor at floor level
            let floorAnchor = AnchorEntity(world: SIMD3<Float>(0, floorLevel, 0))
            floorAnchor.name = "cockpitFloorAnchor"
            cockpit.position = SIMD3<Float>(0, 0, 0)
            cockpit.scale = SIMD3<Float>(repeating: 0.5)
            floorAnchor.addChild(cockpit)
            arView.scene.addAnchor(floorAnchor)
            print("🏎️ F1 cockpit placed at floor level")
        }

        cockpitEntity = cockpit as? ModelEntity
    }

    func regenerateTrack() {
        print("Regenerating track...")
        clearTrackVisualization()
        trackCheckpoints.removeAll()
        generateTrack()
    }

    // MARK: - Racing Phase
    func startRacing() {
        gameState = .racing
        currentLap = 1
        currentCheckpoint = 0
        lapTimes.removeAll()
        bestLapTime = .infinity
        lastLapTime = 0

        // Enable cockpit view when racing
        showCockpitView = true
        attachCockpitToCamera()

        // Set total laps based on race type
        switch selectedRaceType {
        case .grandPrix:
            totalLaps = 3
        case .timeTrial:
            totalLaps = 1
        case .practice:
            totalLaps = 999 // Unlimited practice
        }

        // Start lap timer
        lapStartTime = Date()

        raceTimer = Timer.scheduledTimer(withTimeInterval: 0.01, repeats: true) { [weak self] _ in
            self?.updateCurrentTime()
        }
    }

    func updateCurrentTime() {
        guard let startTime = lapStartTime else { return }
        currentTime = Date().timeIntervalSince(startTime)
    }

    func checkCheckpointCollision(cameraPosition: SIMD3<Float>) {
        guard currentCheckpoint < trackCheckpoints.count else { return }

        let checkpoint = trackCheckpoints[currentCheckpoint]

        // Check if camera is within checkpoint gate bounds
        if isPositionInCheckpoint(position: cameraPosition, checkpoint: checkpoint) {
            print("🎯 CHECKPOINT \(currentCheckpoint) PASSED!")
            passCheckpoint()
        }
    }

    func isPositionInCheckpoint(position: SIMD3<Float>, checkpoint: CheckpointGate) -> Bool {
        let dist = distance(position, checkpoint.position)

        // RC car scale: checkpoint detection threshold (35cm for easier detection)
        let threshold: Float = 0.35

        // Debug: Print every 30 frames (approx every 0.5 seconds)
        if Int.random(in: 0..<30) == 0 {
            print("📍 Camera: (\(String(format: "%.2f", position.x)), \(String(format: "%.2f", position.y)), \(String(format: "%.2f", position.z))) | Checkpoint \(checkpoint.id): (\(String(format: "%.2f", checkpoint.position.x)), \(String(format: "%.2f", checkpoint.position.y)), \(String(format: "%.2f", checkpoint.position.z))) | Distance: \(String(format: "%.2f", dist))m")
        }

        return dist < threshold
    }

    func passCheckpoint() {
        currentCheckpoint += 1

        // Show checkpoint message
        showCheckpointMessage = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            self?.showCheckpointMessage = false
        }

        // Check if lap is complete
        if currentCheckpoint >= trackCheckpoints.count {
            completeLap()
        }
    }

    func completeLap() {
        guard let startTime = lapStartTime else { return }

        lastLapTime = Date().timeIntervalSince(startTime)
        lapTimes.append(lastLapTime)

        // Check for best lap
        isNewBestLap = lastLapTime < bestLapTime
        if isNewBestLap {
            bestLapTime = lastLapTime
        }

        // Show lap complete message
        showLapCompleteMessage = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
            self?.showLapCompleteMessage = false
            self?.isNewBestLap = false
        }

        // Check if race is complete
        if currentLap >= totalLaps {
            endRace()
            return
        }

        // Start next lap
        currentLap += 1
        currentCheckpoint = 0
        lapStartTime = Date()
    }

    func resetRace() {
        currentLap = 1
        currentCheckpoint = 0
        currentTime = 0
        lapTimes.removeAll()
        bestLapTime = .infinity
        lastLapTime = 0
        lapStartTime = Date()
    }

    func endRace() {
        gameState = .raceComplete
        raceTimer?.invalidate()
        raceTimer = nil
        lapStartTime = nil

        // Disable cockpit view
        showCockpitView = false
        cockpitEntity?.removeFromParent()
        cockpitEntity = nil
    }

    func startNewRace() {
        gameState = .raceTypeSelection
        currentLap = 0
        currentCheckpoint = 0
        currentTime = 0
        lapTimes.removeAll()
        bestLapTime = .infinity
        lastLapTime = 0
        showCockpitView = false

        // CRITICAL: Reset track generation flag for new race
        isGeneratingTrack = false
    }

    func selectRaceType(_ raceType: RaceType) {
        selectedRaceType = raceType
        startScanning()
    }

    func selectTrackType(_ trackType: TrackType) {
        selectedTrackType = trackType
    }

    // MARK: - Utilities
    static func formatTime(_ time: TimeInterval) -> String {
        let minutes = Int(time) / 60
        let seconds = Int(time) % 60
        let milliseconds = Int((time.truncatingRemainder(dividingBy: 1)) * 1000)
        return String(format: "%02d:%02d:%03d", minutes, seconds, milliseconds)
    }
}

// MARK: - ARSessionDelegate
extension RacingViewModel: ARSessionDelegate {
    func session(_ session: ARSession, didAdd anchors: [ARAnchor]) {
        guard (gameState == .scanningRoom || gameState == .scanningCar), isScanning else { return }

        for anchor in anchors {
            if let meshAnchor = anchor as? ARMeshAnchor {
                meshAnchors.append(meshAnchor)
                DispatchQueue.main.async {
                    self.meshAnchorCount = self.meshAnchors.count
                }
            }
        }
    }

    func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
        guard (gameState == .scanningRoom || gameState == .scanningCar), isScanning else { return }

        for anchor in anchors {
            if let meshAnchor = anchor as? ARMeshAnchor {
                // Update existing mesh anchor
                if let index = meshAnchors.firstIndex(where: { $0.identifier == meshAnchor.identifier }) {
                    meshAnchors[index] = meshAnchor
                }
            }
        }
    }
}

// MARK: - Supporting Models
struct CheckpointGate {
    let id: Int
    let position: SIMD3<Float>
    let direction: SIMD3<Float>
}
