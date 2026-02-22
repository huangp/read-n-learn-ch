import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

export interface FileProcessingResult {
  success: boolean;
  text?: string;
  title?: string;
  error?: string;
  source?: string;
}

// Helper: base64 decode to binary string (React Native compatible, no Buffer needed)
function base64ToBinaryString(base64: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  const cleaned = base64.replace(/[^A-Za-z0-9+/]/g, '');
  while (i < cleaned.length) {
    const a = chars.indexOf(cleaned[i++]);
    const b = chars.indexOf(cleaned[i++]);
    const c = chars.indexOf(cleaned[i++]);
    const d = chars.indexOf(cleaned[i++]);
    const triplet = (a << 18) | (b << 12) | (c << 6) | d;
    result += String.fromCharCode((triplet >> 16) & 0xff);
    if (c !== 64) result += String.fromCharCode((triplet >> 8) & 0xff);
    if (d !== 64) result += String.fromCharCode(triplet & 0xff);
  }
  return result;
}

export class FileProcessingService {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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

  static async pickImage(): Promise<FileProcessingResult> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        return { 
          success: false, 
          error: 'Permission to access media library is required' 
        };
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled) {
        return { success: false, error: 'User cancelled' };
      }

      const file = result.assets[0];
      const fileName = file.uri.split('/').pop() || 'image.jpg';

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

      return await this.processFile(file.uri, mimeType, fileName);
    } catch (error) {
      console.error('Error picking image:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to pick image' 
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

      // Clean up the text
      text = this.cleanText(text);

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
      const base64Content = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Decode base64 to binary string (React Native compatible)
      const decoded = base64ToBinaryString(base64Content);

      // Extract text from PDF content streams
      const textMatches = decoded.match(/BT\s*[\s\S]*?ET/g);
      
      if (textMatches) {
        const extractedTexts: string[] = [];
        
        for (const match of textMatches) {
          const textContent = match
            .replace(/BT\s*/g, '')
            .replace(/\s*ET/g, '')
            .replace(/\[\s*\(/g, '(')
            .replace(/\)\s*]/g, ')')
            .replace(/\([^)]*\)/g, (m) => m.slice(1, -1))
            .replace(/T[jJ]\s*/g, ' ')
            .replace(/\/[A-Za-z]+\s*\d+\s*Tf/g, '')
            .replace(/\d+\.?\d*\s*\d+\.?\d*\s*Td/g, '')
            .replace(/\d+\.?\d*\s*\d+\.?\d*\s*Tm/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (textContent) {
            extractedTexts.push(textContent);
          }
        }
        
        if (extractedTexts.length > 0) {
          return extractedTexts.join('\n');
        }
      }

      // Fallback: try to extract readable text
      const readableText = decoded
        .replace(/[^\x20-\x7E\u4e00-\u9fa5\n\r\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (readableText.length > 100) {
        return readableText;
      }

      throw new Error('Could not extract text from PDF. The PDF may be scanned or image-based.');
    } catch (error) {
      console.error('Error extracting PDF:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  private static async extractFromDOCX(uri: string): Promise<string> {
    // DOCX extraction is not yet supported without a compatible library
    // TODO: Integrate a React Native compatible DOCX parser
    throw new Error(
      'DOCX file extraction is not yet supported. ' +
      'Please convert the document to a TXT file and try again.'
    );
  }

  private static async extractFromImage(_uri: string): Promise<string> {
    // OCR is not currently available
    // TODO: Integrate a React Native compatible OCR library
    throw new Error(
      'Image text extraction (OCR) is not yet supported. ' +
      'Please use a text file, PDF, or DOCX instead, ' +
      'or manually type the text from the image.'
    );
  }

  private static cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[\t ]+/g, ' ')
      .trim();
  }

  static generateTitle(fileName: string, content: string): string {
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    
    if (nameWithoutExt && nameWithoutExt !== 'image' && !nameWithoutExt.match(/^IMG_\d+$/)) {
      return nameWithoutExt;
    }

    const firstLine = content.split('\n')[0].trim();
    if (firstLine && firstLine.length < 100) {
      return firstLine.substring(0, 50);
    }

    return 'Imported Article';
  }
}

export default FileProcessingService;