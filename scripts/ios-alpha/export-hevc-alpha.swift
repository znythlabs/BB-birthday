import AVFoundation
import Foundation

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data((message + "\n").utf8))
    exit(1)
}

guard CommandLine.arguments.count == 3 else {
    fail("Usage: swift export-hevc-alpha.swift INPUT.mov OUTPUT.mov")
}

let input = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2])
let asset = AVURLAsset(url: input)
let preset = AVAssetExportPresetHEVCHighestQualityWithAlpha
let compatible = AVAssetExportSession.exportPresets(compatibleWith: asset)

guard compatible.contains(preset) else {
    fail("This Mac cannot export the input as HEVC with alpha.")
}

guard let exporter = AVAssetExportSession(asset: asset, presetName: preset) else {
    fail("Unable to create AVAssetExportSession.")
}
try? FileManager.default.removeItem(at: output)
exporter.outputURL = output
exporter.outputFileType = .mov
exporter.shouldOptimizeForNetworkUse = true

let semaphore = DispatchSemaphore(value: 0)
exporter.exportAsynchronously {
    semaphore.signal()
}
semaphore.wait()

switch exporter.status {
case .completed:
    print("Created \(output.path)")
case .failed:
    fail(exporter.error?.localizedDescription ?? "HEVC-alpha export failed.")
case .cancelled:
    fail("HEVC-alpha export was cancelled.")
default:
    fail("HEVC-alpha export ended in unexpected state: \(exporter.status.rawValue)")
}
