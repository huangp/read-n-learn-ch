require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name         = "ExpoVisionOcr"
  s.version      = package["version"]
  s.summary      = "Expo module for Apple Vision framework OCR"
  s.homepage     = "https://github.com/expo/expo"
  s.license      = "MIT"
  s.author       = "App Developer"
  s.platforms    = { :ios => "16.0" }
  s.source       = { :git => "https://github.com/expo/expo.git", :tag => "#{s.version}" }
  s.source_files = "**/*.{h,m,mm,swift}"
  s.requires_arc = true

  s.dependency "ExpoModulesCore"
end



