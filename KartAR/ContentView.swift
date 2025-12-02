import SwiftUI
import RealityKit
import ARKit

struct ContentView: View {
    @StateObject private var racingViewModel = RacingViewModel()
    @EnvironmentObject var orientationManager: OrientationManager

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                ARViewContainer(viewModel: racingViewModel)
                    .ignoresSafeArea()
                    .background(Color.black)

                // Home Screen
                if racingViewModel.gameState == .home {
                    VStack(spacing: 40) {
                        Spacer()

                        VStack(spacing: 16) {
                            Text("KartAR")
                                .font(.system(size: 56, weight: .black, design: .rounded))
                                .foregroundColor(.white)

                            Text("AR Racing Experience")
                                .font(.system(size: 24, weight: .semibold))
                                .foregroundColor(.white.opacity(0.8))
                        }

                        Spacer()

                        Button(action: {
                            racingViewModel.gameState = .raceTypeSelection
                        }) {
                            HStack(spacing: 12) {
                                Image(systemName: "flag.checkered")
                                    .font(.system(size: 24))
                                Text("Start Race")
                                    .font(.system(size: 22, weight: .bold))
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 48)
                            .padding(.vertical, 24)
                            .background(
                                LinearGradient(
                                    colors: [Color.red, Color.red.opacity(0.8)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .clipShape(Capsule())
                            .shadow(color: .red.opacity(0.5), radius: 20, x: 0, y: 8)
                        }
                        .padding(.bottom, max(geometry.safeAreaInsets.bottom, 20) + 60)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(
                        LinearGradient(
                            colors: [Color.black.opacity(0.7), Color.black.opacity(0.5)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                }

                // Race Type Selection Screen
                if racingViewModel.gameState == .raceTypeSelection {
                    VStack(spacing: 30) {
                        Spacer()

                        VStack(spacing: 16) {
                            Text("Select Race Mode")
                                .font(.system(size: 42, weight: .black, design: .rounded))
                                .foregroundColor(.white)

                            Text("Choose your racing experience")
                                .font(.system(size: 18, weight: .medium))
                                .foregroundColor(.white.opacity(0.8))
                        }

                        Spacer()

                        VStack(spacing: 20) {
                            // Grand Prix Button
                            RaceModeButton(
                                title: "Grand Prix",
                                description: "3 Laps • Full Race Experience",
                                icon: "trophy.fill",
                                color: .red,
                                action: {
                                    racingViewModel.selectRaceType(.grandPrix)
                                }
                            )

                            // Time Trial Button
                            RaceModeButton(
                                title: "Time Trial",
                                description: "1 Lap • Beat Your Best Time",
                                icon: "timer",
                                color: .orange,
                                action: {
                                    racingViewModel.selectRaceType(.timeTrial)
                                }
                            )

                            // Practice Button
                            RaceModeButton(
                                title: "Practice",
                                description: "Unlimited • Learn the Track",
                                icon: "figure.run",
                                color: .blue,
                                action: {
                                    racingViewModel.selectRaceType(.practice)
                                }
                            )
                        }
                        .padding(.horizontal, 30)

                        Spacer()

                        // Track Type Selection
                        VStack(spacing: 12) {
                            Text("Track Selection")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.white.opacity(0.8))

                            VStack(spacing: 12) {
                                HStack(spacing: 16) {
                                    TrackTypeButton(
                                        title: "Monaco GP",
                                        isSelected: racingViewModel.selectedTrackType == .monaco,
                                        action: {
                                            racingViewModel.selectTrackType(.monaco)
                                        }
                                    )

                                    TrackTypeButton(
                                        title: "Low Poly",
                                        isSelected: racingViewModel.selectedTrackType == .lowPoly,
                                        action: {
                                            racingViewModel.selectTrackType(.lowPoly)
                                        }
                                    )
                                }

                                TrackTypeButton(
                                    title: "Mania",
                                    isSelected: racingViewModel.selectedTrackType == .mania,
                                    action: {
                                        racingViewModel.selectTrackType(.mania)
                                    }
                                )
                            }
                        }
                        .padding(.bottom, max(geometry.safeAreaInsets.bottom, 20) + 40)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(
                        LinearGradient(
                            colors: [Color.black.opacity(0.85), Color.black.opacity(0.7)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                }

                // Scanning Phase UI
                if racingViewModel.gameState == .scanningRoom || racingViewModel.gameState == .scanningCar {
                    VStack {
                        Spacer()

                        VStack(spacing: 24) {
                            // Scanning instructions and status
                            VStack(spacing: 12) {
                                Text("Scan Your Floor")
                                    .font(.system(size: 24, weight: .bold))
                                    .foregroundColor(.white)

                                Text("Walk around slowly, pointing camera at floor")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.white.opacity(0.8))
                                    .multilineTextAlignment(.center)

                                Text("Mesh Anchors: \(racingViewModel.meshAnchorCount)")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(racingViewModel.meshAnchorCount >= 5 ? .green : .cyan)
                                    .padding(.top, 4)
                            }
                            .padding(.horizontal, 24)
                            .padding(.vertical, 20)
                            .background(.ultraThinMaterial)
                            .cornerRadius(16)

                            // Stop scanning button - ALWAYS enabled
                            Button(action: {
                                racingViewModel.finishScanning()
                            }) {
                                HStack(spacing: 12) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.system(size: 20))
                                    Text(racingViewModel.meshAnchorCount >= 5 ? "Done Scanning" : "Skip Scanning")
                                        .font(.system(size: 17, weight: .semibold))
                                }
                                .foregroundColor(.white)
                                .padding(.horizontal, 32)
                                .padding(.vertical, 16)
                                .background(
                                    LinearGradient(
                                        colors: racingViewModel.meshAnchorCount >= 5 ?
                                            [Color.green, Color.green.opacity(0.8)] :
                                            [Color.orange, Color.orange.opacity(0.8)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .clipShape(Capsule())
                                .shadow(color: (racingViewModel.meshAnchorCount >= 5 ? Color.green : Color.orange).opacity(0.4), radius: 12, x: 0, y: 4)
                            }
                        }
                        .padding(.bottom, max(geometry.safeAreaInsets.bottom, 20) + 32)
                    }
                }

            // Track Placement Phase UI
            if racingViewModel.gameState == .trackPlacement {
                VStack {
                    Spacer()

                    Text("Track Generated!")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding()
                        .background(Color.black.opacity(0.7))
                        .cornerRadius(15)

                    Text("Review the track layout")
                        .font(.headline)
                        .foregroundColor(.white)
                        .padding()
                        .background(Color.black.opacity(0.7))
                        .cornerRadius(10)

                    HStack(spacing: 20) {
                        Button(action: {
                            racingViewModel.regenerateTrack()
                        }) {
                            Text("Regenerate")
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .padding(.horizontal, 30)
                                .padding(.vertical, 15)
                                .background(Color.orange)
                                .cornerRadius(12)
                        }

                        Button(action: {
                            racingViewModel.startRacing()
                        }) {
                            Text("Start Racing!")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .padding(.horizontal, 40)
                                .padding(.vertical, 20)
                                .background(Color.blue)
                                .cornerRadius(15)
                        }
                    }
                    .padding(.bottom, 100)
                }
            }

            // Racing Phase UI - LANDSCAPE OPTIMIZED
            if racingViewModel.gameState == .racing {
                GeometryReader { raceGeometry in
                    let isLandscape = raceGeometry.size.width > raceGeometry.size.height

                    if isLandscape {
                        // LANDSCAPE LAYOUT - Compact HUD for cockpit view
                        ZStack {
                            // Top-left: Lap & Time info (compact)
                            VStack(alignment: .leading, spacing: 4) {
                                if racingViewModel.selectedRaceType == .practice {
                                    Text("PRACTICE")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(.cyan)
                                } else {
                                    Text("LAP \(racingViewModel.currentLap)/\(racingViewModel.totalLaps)")
                                        .font(.system(size: 16, weight: .bold))
                                        .foregroundColor(.white)
                                }

                                Text(racingViewModel.formattedCurrentTime)
                                    .font(.system(size: 20, weight: .bold))
                                    .foregroundColor(.white)

                                Text("CP: \(racingViewModel.currentCheckpoint)/\(racingViewModel.selectedTrackType.numberOfCheckpoints)")
                                    .font(.system(size: 10, weight: .medium))
                                    .foregroundColor(.cyan)
                            }
                            .padding(8)
                            .background(.ultraThinMaterial)
                            .cornerRadius(8)
                            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                            .padding(.leading, 12)
                            .padding(.top, 8)

                            // Top-right: Best lap & track info (compact)
                            VStack(alignment: .trailing, spacing: 4) {
                                Text(racingViewModel.selectedTrackType.displayName.uppercased())
                                    .font(.system(size: 9, weight: .bold))
                                    .foregroundColor(.cyan)

                                Text("BEST")
                                    .font(.system(size: 10, weight: .medium))
                                    .foregroundColor(.yellow)

                                Text(racingViewModel.formattedBestLapTime)
                                    .font(.system(size: 16, weight: .bold))
                                    .foregroundColor(.yellow)

                                if racingViewModel.selectedRaceType != .practice {
                                    Text(racingViewModel.selectedRaceType.displayName.uppercased())
                                        .font(.system(size: 9, weight: .bold))
                                        .foregroundColor(.orange)
                                }
                            }
                            .padding(8)
                            .background(.ultraThinMaterial)
                            .cornerRadius(8)
                            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                            .padding(.trailing, 12)
                            .padding(.top, 8)

                            // Center: Checkpoint/Lap messages
                            VStack {
                                if racingViewModel.showCheckpointMessage {
                                    Text("CHECKPOINT \(racingViewModel.currentCheckpoint + 1)")
                                        .font(.system(size: 28, weight: .black))
                                        .foregroundColor(.green)
                                        .padding(12)
                                        .background(Color.black.opacity(0.8))
                                        .cornerRadius(12)
                                        .transition(.scale)
                                }

                                if racingViewModel.showLapCompleteMessage {
                                    VStack(spacing: 6) {
                                        Text("LAP COMPLETE!")
                                            .font(.system(size: 28, weight: .black))
                                            .foregroundColor(.cyan)

                                        Text(racingViewModel.lastLapTimeFormatted)
                                            .font(.system(size: 20, weight: .bold))
                                            .foregroundColor(.white)

                                        if racingViewModel.isNewBestLap {
                                            Text("NEW BEST LAP!")
                                                .font(.system(size: 16, weight: .bold))
                                                .foregroundColor(.yellow)
                                        }
                                    }
                                    .padding(12)
                                    .background(Color.black.opacity(0.8))
                                    .cornerRadius(12)
                                    .transition(.scale)
                                }
                            }
                            .frame(maxWidth: .infinity, maxHeight: .infinity)

                            // Bottom-right: Controls (compact)
                            HStack(spacing: 16) {
                                Button(action: {
                                    racingViewModel.resetRace()
                                }) {
                                    Image(systemName: "arrow.counterclockwise.circle.fill")
                                        .font(.system(size: 32))
                                        .foregroundColor(.orange)
                                }

                                Button(action: {
                                    racingViewModel.endRace()
                                }) {
                                    Image(systemName: "stop.circle.fill")
                                        .font(.system(size: 32))
                                        .foregroundColor(.red)
                                }
                            }
                            .padding(8)
                            .background(.ultraThinMaterial)
                            .cornerRadius(8)
                            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                            .padding(.trailing, 12)
                            .padding(.bottom, 8)
                        }
                    } else {
                        // PORTRAIT LAYOUT - Original layout
                        VStack {
                            // Top Status Bar - Enhanced HUD
                            HStack {
                                VStack(alignment: .leading, spacing: 5) {
                                    if racingViewModel.selectedRaceType == .practice {
                                        Text("PRACTICE")
                                            .font(.caption)
                                            .fontWeight(.bold)
                                            .foregroundColor(.cyan)
                                    } else {
                                        Text("LAP: \(racingViewModel.currentLap)/\(racingViewModel.totalLaps)")
                                            .font(.title)
                                            .fontWeight(.bold)
                                    }

                                    Text("TIME: \(racingViewModel.formattedCurrentTime)")
                                        .font(.title2)
                                        .fontWeight(.semibold)

                                    Text("CHECKPOINT: \(racingViewModel.currentCheckpoint)/\(racingViewModel.selectedTrackType.numberOfCheckpoints)")
                                        .font(.caption)
                                        .fontWeight(.medium)
                                        .foregroundColor(.cyan)
                                }
                                .foregroundColor(.white)
                                .padding()
                                .background(.ultraThinMaterial)
                                .cornerRadius(15)

                                Spacer()

                                VStack(alignment: .trailing, spacing: 5) {
                                    Text(racingViewModel.selectedTrackType.displayName.uppercased())
                                        .font(.caption2)
                                        .fontWeight(.bold)
                                        .foregroundColor(.cyan)

                                    Text("BEST LAP")
                                        .font(.caption)
                                        .fontWeight(.medium)

                                    Text(racingViewModel.formattedBestLapTime)
                                        .font(.title2)
                                        .fontWeight(.bold)

                                    if racingViewModel.selectedRaceType != .practice {
                                        Text(racingViewModel.selectedRaceType.displayName.uppercased())
                                            .font(.caption2)
                                            .fontWeight(.bold)
                                            .foregroundColor(.orange)
                                    }
                                }
                                .foregroundColor(.yellow)
                                .padding()
                                .background(.ultraThinMaterial)
                                .cornerRadius(15)
                            }
                            .padding(.horizontal)
                            .padding(.top, 60)

                            Spacer()

                            // Checkpoint Progress Indicator
                            if racingViewModel.showCheckpointMessage {
                                Text("CHECKPOINT \(racingViewModel.currentCheckpoint + 1)")
                                    .font(.largeTitle)
                                    .fontWeight(.black)
                                    .foregroundColor(.green)
                                    .padding()
                                    .background(Color.black.opacity(0.8))
                                    .cornerRadius(20)
                                    .transition(.scale)
                            }

                            // Lap Completion Message
                            if racingViewModel.showLapCompleteMessage {
                                VStack(spacing: 10) {
                                    Text("LAP COMPLETE!")
                                        .font(.largeTitle)
                                        .fontWeight(.black)
                                        .foregroundColor(.cyan)

                                    Text(racingViewModel.lastLapTimeFormatted)
                                        .font(.title)
                                        .fontWeight(.bold)
                                        .foregroundColor(.white)

                                    if racingViewModel.isNewBestLap {
                                        Text("NEW BEST LAP!")
                                            .font(.title2)
                                            .fontWeight(.bold)
                                            .foregroundColor(.yellow)
                                    }
                                }
                                .padding()
                                .background(Color.black.opacity(0.8))
                                .cornerRadius(20)
                                .transition(.scale)
                            }

                            Spacer()

                            // Bottom Controls
                            HStack(spacing: 30) {
                                Button(action: {
                                    racingViewModel.resetRace()
                                }) {
                                    Image(systemName: "arrow.counterclockwise.circle.fill")
                                        .font(.system(size: 50))
                                        .foregroundColor(.orange)
                                }

                                Button(action: {
                                    racingViewModel.endRace()
                                }) {
                                    Image(systemName: "stop.circle.fill")
                                        .font(.system(size: 50))
                                        .foregroundColor(.red)
                                }
                            }
                            .padding(.bottom, 50)
                        }
                    }
                }
            }

            // Race Complete UI
            if racingViewModel.gameState == .raceComplete {
                VStack(spacing: 30) {
                    Text("RACE COMPLETE!")
                        .font(.system(size: 50))
                        .fontWeight(.black)
                        .foregroundColor(.yellow)

                    VStack(alignment: .leading, spacing: 15) {
                        Text("RACE STATS")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)

                        Divider()
                            .background(Color.white)

                        ForEach(Array(racingViewModel.lapTimes.enumerated()), id: \.offset) { index, time in
                            HStack {
                                Text("Lap \(index + 1):")
                                    .font(.title3)
                                    .foregroundColor(.white)
                                Spacer()
                                Text(RacingViewModel.formatTime(time))
                                    .font(.title3)
                                    .fontWeight(.semibold)
                                    .foregroundColor(time == racingViewModel.bestLapTime ? .yellow : .white)
                            }
                        }

                        Divider()
                            .background(Color.white)

                        HStack {
                            Text("Best Lap:")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.yellow)
                            Spacer()
                            Text(racingViewModel.formattedBestLapTime)
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.yellow)
                        }
                    }
                    .padding(30)
                    .background(Color.black.opacity(0.8))
                    .cornerRadius(20)

                    Button(action: {
                        racingViewModel.startNewRace()
                    }) {
                        Text("New Race")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 50)
                            .padding(.vertical, 20)
                            .background(Color.green)
                            .cornerRadius(15)
                    }
                }
                .padding()
            }
            }
            .frame(width: geometry.size.width, height: geometry.size.height)
            .background(Color.black)
            .ignoresSafeArea()
            .onChange(of: racingViewModel.gameState) { oldState, newState in
                if newState == .racing {
                    orientationManager.lockOrientation(.landscape)
                } else if oldState == .racing {
                    orientationManager.lockOrientation(.portrait)
                }
            }
        }
        .ignoresSafeArea()
        .background(Color.black)
    }
}

struct ARViewContainer: UIViewRepresentable {
    @ObservedObject var viewModel: RacingViewModel

    func makeUIView(context: Context) -> ARView {
        let view = ARView(frame: .zero)
        viewModel.arView = view
        viewModel.setupARSession()
        return view
    }

    func updateUIView(_ uiView: ARView, context: Context) {}
}

// MARK: - Race Mode Button Component
struct RaceModeButton: View {
    let title: String
    let description: String
    let icon: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 20) {
                Image(systemName: icon)
                    .font(.system(size: 32))
                    .foregroundColor(.white)
                    .frame(width: 50)

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.white)

                    Text(description)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white.opacity(0.8))
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(.white.opacity(0.7))
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 20)
            .background(
                LinearGradient(
                    colors: [color, color.opacity(0.8)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .cornerRadius(16)
            .shadow(color: color.opacity(0.4), radius: 12, x: 0, y: 6)
        }
    }
}

// MARK: - Track Type Button Component
struct TrackTypeButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(isSelected ? .white : .white.opacity(0.6))
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .background(
                    isSelected ?
                    LinearGradient(
                        colors: [Color.cyan, Color.cyan.opacity(0.8)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ) :
                    LinearGradient(
                        colors: [Color.white.opacity(0.2), Color.white.opacity(0.1)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .cornerRadius(10)
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(isSelected ? Color.cyan : Color.white.opacity(0.3), lineWidth: isSelected ? 2 : 1)
                )
        }
    }
}

#Preview {
    ContentView()
}
