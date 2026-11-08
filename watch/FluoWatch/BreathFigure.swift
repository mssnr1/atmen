import SwiftUI
import UIKit

/// The pre-rendered breathing figure from the web app (one Resonance breath, 120 frames).
/// Frames 0..<55 are the inhale, 55..<65 the quiet rest, 65..<120 the exhale, so any rhythm
/// can play it by mapping its phase progress onto those ranges.
enum BreathFrames {
    static let count = 120
    static let inhale = 0..<55
    static let hold = 55..<65
    static let exhale = 65..<120

    static func index(phase: BreathPhase, progress: Double) -> Int {
        let range: Range<Int>
        switch phase {
        case .inhale: range = inhale
        case .hold: range = hold
        case .exhale: range = exhale
        }
        let i = range.lowerBound + Int((progress * Double(range.count)).rounded(.down))
        return min(range.upperBound - 1, max(range.lowerBound, i))
    }

    private static var cache: [Int: UIImage] = [:]

    /// Decodes on demand and keeps a handful, so memory stays small on the watch.
    static func image(_ i: Int) -> UIImage? {
        if let img = cache[i] { return img }
        guard let url = Bundle.main.url(forResource: String(format: "breath_%03d", i), withExtension: "jpg", subdirectory: "Frames"),
              let img = UIImage(contentsOfFile: url.path) else { return nil }
        if cache.count > 24 { cache.removeAll(keepingCapacity: true) }
        cache[i] = img
        return img
    }
}

struct BreathFigure: View {
    let frame: Int
    var dim: Double = 1

    var body: some View {
        GeometryReader { geo in
            if let img = BreathFrames.image(frame) {
                Image(uiImage: img)
                    .resizable()
                    .scaledToFill()
                    .frame(width: geo.size.width, height: geo.size.height, alignment: .top)
                    .clipped()
                    .opacity(dim)
            }
        }
        .ignoresSafeArea()
    }
}
