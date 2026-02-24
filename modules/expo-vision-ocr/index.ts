import { requireNativeModule } from 'expo-modules-core';

export interface TextBlock {
  text: string;
  confidence: number;
}

export interface OcrResult {
  text: string;
  blocks: TextBlock[];
}

const ExpoVisionOcr = requireNativeModule('ExpoVisionOcr');

export async function recognizeText(imageUri: string): Promise<OcrResult> {
  return await ExpoVisionOcr.recognizeText(imageUri);
}

export default { recognizeText };

