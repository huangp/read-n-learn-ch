import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { extractText } from 'expo-pdf-text-extract';
import mammoth from 'mammoth';
import { recognizeText } from '../../modules/expo-vision-ocr';
import { extractChineseContent } from '../utils/textProcessing';
import { FileProcessingResult, MultipleFileProcessingResult } from '../types';

export class FileProcessingService {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly MAX_IMAGES = 10;

  static async pickDocument(): Promise<FileProcessingResult> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/plain',
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return { success: false, error: 'User cancelled' };
      }

      const file = result.assets[0];
      return await this.processFile(file.uri, file.mimeType || '', file.name);
    } catch (error) {
      console.error('Error picking document:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to pick document' 
      };
    }
  }
  static async pickMultipleImages(
    onProgress?: (current: number, total: number) => void
  ): Promise<MultipleFileProcessingResult> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        return { 
          success: false, 
          error: 'Permission to access media library is required' 
        };
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: this.MAX_IMAGES,
      });

      if (result.canceled) {
        return { success: false, error: 'User cancelled' };
      }

      const images = result.assets;
      const results: FileProcessingResult[] = [];
      const failedImages: string[] = [];

      // Process images sequentially to maintain order
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const fileName = file.uri.split('/').pop() || `image_${i + 1}.jpg`;

        // Report progress
        if (onProgress) {
          onProgress(i + 1, images.length);
        }

        // Determine MIME type from file extension if file.type is incomplete
        let mimeType = file.type || 'image/jpeg';
        if (mimeType === 'image' || !mimeType.includes('/')) {
          const ext = fileName.split('.').pop()?.toLowerCase();
          if (ext === 'png') {
            mimeType = 'image/png';
          } else {
            mimeType = 'image/jpeg';
          }
        }

        const processResult = await this.processFile(file.uri, mimeType, fileName);
        
        if (processResult.success) {
          results.push(processResult);
        } else {
          failedImages.push(fileName);
        }
      }

      // If any images failed, return error with list of failed images
      if (failedImages.length > 0) {
        return {
          success: false,
          error: `Failed to process ${failedImages.length} image(s)`,
          failedImages,
        };
      }

      return {
        success: true,
        results,
      };
    } catch (error) {
      console.error('Error picking multiple images:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to pick images' 
      };
    }
  }

  static async processFile(
    uri: string, 
    mimeType: string, 
    fileName: string
  ): Promise<FileProcessingResult> {
    try {
      // Check file size
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        return { success: false, error: 'File does not exist' };
      }

      if (fileInfo.size && fileInfo.size > this.MAX_FILE_SIZE) {
        return { success: false, error: 'File is too large (max 10MB)' };
      }

      let text: string;

      switch (mimeType) {
        case 'text/plain':
          text = await this.extractFromText(uri);
          break;
        case 'application/pdf':
          text = await this.extractFromPDF(uri);
          break;
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          text = await this.extractFromDOCX(uri);
          break;
        case 'image/jpeg':
        case 'image/png':
        case 'image/jpg':
          text = await this.extractFromImage(uri);
          break;
        default: {
          // Try to detect by file extension
          const extension = fileName.split('.').pop()?.toLowerCase();
          if (extension === 'txt') {
            text = await this.extractFromText(uri);
          } else if (extension === 'pdf') {
            text = await this.extractFromPDF(uri);
          } else if (extension === 'docx') {
            text = await this.extractFromDOCX(uri);
          } else if (extension === 'jpg' || extension === 'jpeg' || extension === 'png') {
            text = await this.extractFromImage(uri);
          } else {
            return { 
              success: false, 
              error: `Unsupported file type: ${mimeType || extension}` 
            };
          }
        }
      }

      // Extract Chinese content while preserving structure and punctuation
      text = extractChineseContent(text);

      // Generate title from filename or first line
      const title = this.generateTitle(fileName, text);

      return {
        success: true,
        text,
        title,
        source: fileName,
      };
    } catch (error) {
      console.error('Error processing file:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process file' 
      };
    }
  }

  private static async extractFromText(uri: string): Promise<string> {
    try {
      return await FileSystem.readAsStringAsync(uri);
    } catch (error) {
      console.error('Error reading text file:', error);
      throw new Error('Failed to read text file');
    }
  }

  private static async extractFromPDF(uri: string): Promise<string> {
    try {
      // Use expo-pdf-text-extract for proper PDF text extraction
      const text = await extractText(uri);
      
      if (text && text.trim()) {
        return text;
      }

      throw new Error('No text found in PDF. The PDF may be scanned or image-based.');
    } catch (error) {
      console.error('Error extracting PDF:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  private static async extractFromDOCX(uri: string): Promise<string> {
    try {
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;

      // Extract text using mammoth
      const result = await mammoth.extractRawText({ arrayBuffer });

      if (!result.value || !result.value.trim()) {
        throw new Error('No text found in DOCX file.');
      }

      return result.value;
    } catch (error) {
      console.error('Error extracting DOCX:', error);
      throw new Error('Failed to extract text from DOCX file');
    }
  }

  private static async extractFromImage(uri: string): Promise<string> {
    try {
      const result = await recognizeText(uri);

      if (!result || !result.text || !result.text.trim()) {
        throw new Error(
          'No text could be recognized in this image. ' +
          'Try using a clearer image with better lighting.'
        );
      }

      // result.blocks contains individual text observations from Vision framework
      const text = result.blocks.map(block => block.text).join('\n');

      if (!text.trim()) {
        throw new Error(
          'No text could be recognized in this image. ' +
          'Try using a clearer image with better lighting.'
        );
      }

      return text;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('No text could be')) {
        throw error;
      }
      console.error('OCR error:', error);
      throw new Error(
        'Failed to extract text from image. ' +
        'Please ensure the image contains readable text.'
      );
    }
  }



  static generateTitle(fileName: string, content: string): string {
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    
    if (nameWithoutExt && nameWithoutExt !== 'image' && !nameWithoutExt.match(/^IMG_\d+$/)) {
      return nameWithoutExt;
    }

    // Try to get first 50 Chinese characters for title
    if (content && content.length > 0) {
      return content.substring(0, Math.min(50, content.length));
    }

    return 'Imported Article';
  }
}

export default FileProcessingService;