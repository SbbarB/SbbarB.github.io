import SwiftUI

@main
struct KartARApp: App {
    @StateObject private var orientationManager = OrientationManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(orientationManager)
                .onAppear {
                    orientationManager.lockOrientation(.portrait)
                }
        }
    }
}

class OrientationManager: ObservableObject {
    @Published var orientation: UIInterfaceOrientationMask = .portrait

    func lockOrientation(_ orientation: UIInterfaceOrientationMask) {
        self.orientation = orientation

        // Force immediate rotation without animation delay
        DispatchQueue.main.async {
            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
                windowScene.requestGeometryUpdate(.iOS(interfaceOrientations: orientation))

                // Find root view controller and request orientation update
                if let windowController = windowScene.windows.first?.rootViewController {
                    windowController.setNeedsUpdateOfSupportedInterfaceOrientations()
                }
            }

            // Force device orientation update
            let targetOrientation: UIInterfaceOrientation = orientation == .landscape ? .landscapeRight : .portrait
            UIDevice.current.setValue(targetOrientation.rawValue, forKey: "orientation")
        }
    }
}
