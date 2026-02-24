import Vision
import UIKit
import ExpoModulesCore

public class ExpoVisionOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoVisionOcr")

    AsyncFunction("recognizeText") { (imageUri: String, promise: Promise) in
      self.performOCR(imageUri: imageUri, promise: promise)
    }
  }

  private func performOCR(imageUri: String, promise: Promise) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        guard let image = self.loadImage(from: imageUri) else {
          promise.reject("ERR_LOAD_IMAGE", "Failed to load image from URI: \(imageUri)")
          return
        }

        guard let cgImage = image.cgImage else {
          promise.reject("ERR_LOAD_IMAGE", "Failed to get CGImage from loaded image")
          return
        }

        let requestHandler = VNImageRequestHandler(cgImage: cgImage, options: [:])

        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.recognitionLanguages = ["zh-Hans", "zh-Hant", "en"]
        request.usesLanguageCorrection = true

        try requestHandler.perform([request])

        guard let observations = request.results else {
          promise.resolve([String: Any]())
          return
        }

        var blocks: [[String: Any]] = []
        var fullText = ""

        for observation in observations {
          guard let topCandidate = observation.topCandidates(1).first else {
            continue
          }

          let block: [String: Any] = [
            "text": topCandidate.string,
            "confidence": topCandidate.confidence
          ]
          blocks.append(block)

          if !fullText.isEmpty {
            fullText += "\n"
          }
          fullText += topCandidate.string
        }

        let result: [String: Any] = [
          "text": fullText,
          "blocks": blocks
        ]

        promise.resolve(result)
      } catch {
        promise.reject("ERR_OCR", "OCR failed: \(error.localizedDescription)")
      }
    }
  }

  private func loadImage(from uri: String) -> UIImage? {
    // Handle file:// URIs
    var filePath = uri
    if filePath.hasPrefix("file://") {
      filePath = String(filePath.dropFirst(7))
    }

    // Try loading from file path
    if FileManager.default.fileExists(atPath: filePath) {
      return UIImage(contentsOfFile: filePath)
    }

    // Try loading from URL (for content:// or other URIs)
    if let url = URL(string: uri) {
      if let data = try? Data(contentsOf: url) {
        return UIImage(data: data)
      }
    }

    return nil
  }
}

