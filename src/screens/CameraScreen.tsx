import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions, FlashMode } from 'expo-camera';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { FileProcessingService } from '../services/fileProcessing';
import * as FileSystem from 'expo-file-system/legacy';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const MAX_IMAGES = 50;

interface CapturedImage {
  uri: string;
  id: string;
}

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('auto');
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [previewImage, setPreviewImage] = useState<CapturedImage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const cameraRef = useRef<CameraView>(null);

  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Camera'>>();
  const { onCapture } = route.params;

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>We need your permission to use the camera</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash(current => {
      if (current === 'off') return 'on';
      if (current === 'on') return 'auto';
      return 'off';
    });
  };

  const getFlashIcon = () => {
    if (flash === 'off') return '⚫';
    if (flash === 'on') return '⚡';
    return 'A';
  };

  const takePicture = async () => {
    if (capturedImages.length >= MAX_IMAGES) {
      Alert.alert('Limit Reached', `You can capture up to ${MAX_IMAGES} images.`);
      return;
    }

    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
          base64: false,
          exif: false,
        });

        if (photo) {
          const newImage: CapturedImage = {
            uri: photo.uri,
            id: Date.now().toString(),
          };
          setCapturedImages(prev => [...prev, newImage]);
        }
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to capture image');
      }
    }
  };

  const deleteImage = (id: string) => {
    setCapturedImages(prev => prev.filter(img => img.id !== id));
    if (previewImage?.id === id) {
      setPreviewImage(null);
    }
  };

  const processImages = async () => {
    if (capturedImages.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: capturedImages.length });

    try {
      const allTexts: string[] = [];

      for (let i = 0; i < capturedImages.length; i++) {
        setProcessingProgress({ current: i + 1, total: capturedImages.length });
        
        const image = capturedImages[i];
        try {
          const result = await FileProcessingService.processFile(
            image.uri,
            'image/jpeg',
            `camera_capture_${i + 1}.jpg`
          );

          if (result.success && result.text) {
            allTexts.push(result.text);
          }
        } catch (error) {
          console.error(`Error processing image ${i + 1}:`, error);
        }
      }

      if (allTexts.length === 0) {
        Alert.alert('No Text Found', 'Could not extract text from any of the captured images.');
        setIsProcessing(false);
        return;
      }

      // Combine all extracted text
      const combinedText = allTexts.join('\n\n---\n\n');
      
      // Generate title from first image's text
      const firstText = allTexts[0];
      const title = FileProcessingService.generateTitle('camera_scan', firstText);
      
      // Call the callback with extracted text
      onCapture(combinedText, title, `Camera Scan (${capturedImages.length} images)`);
      
      // Clean up captured images from temp storage
      await cleanupImages();
      
      // Navigate back
      navigation.goBack();
    } catch (error) {
      console.error('Error processing images:', error);
      Alert.alert('Error', 'Failed to process images');
    } finally {
      setIsProcessing(false);
    }
  };

  const cleanupImages = async () => {
    for (const image of capturedImages) {
      try {
        await FileSystem.deleteAsync(image.uri);
      } catch (error) {
        console.error('Error deleting temp image:', error);
      }
    }
  };

  const handleBack = async () => {
    // Clean up captured images
    await cleanupImages();
    navigation.goBack();
  };

  const renderThumbnailStrip = () => (
    <View style={styles.thumbnailContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.thumbnailScroll}
      >
        {capturedImages.map((image, index) => (
          <TouchableOpacity
            key={image.id}
            style={[
              styles.thumbnail,
              previewImage?.id === image.id && styles.thumbnailSelected,
            ]}
            onPress={() => setPreviewImage(image)}
          >
            <Image source={{ uri: image.uri }} style={styles.thumbnailImage} />
            <View style={styles.thumbnailOverlay}>
              <Text style={styles.thumbnailNumber}>{index + 1}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {capturedImages.length > 0 && (
        <TouchableOpacity
          style={styles.doneButton}
          onPress={processImages}
          disabled={isProcessing}
        >
          <Text style={styles.doneButtonText}>
            Done ({capturedImages.length})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flash}
      >
        {/* Top Controls */}
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.controlButton} onPress={handleBack}>
            <Text style={styles.controlButtonText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.topRightControls}>
            <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
              <Text style={styles.controlButtonText}>{getFlashIcon()}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing}>
              <Text style={styles.controlButtonText}>↻</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <View style={styles.captureButtonContainer}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePicture}
              disabled={capturedImages.length >= MAX_IMAGES}
            >
              <View style={[
                styles.captureButtonInner,
                capturedImages.length >= MAX_IMAGES && styles.captureButtonDisabled,
              ]} />
            </TouchableOpacity>
          </View>

          <Text style={styles.imageCount}>
            {capturedImages.length} / {MAX_IMAGES}
          </Text>
        </View>
      </CameraView>

      {/* Thumbnail Strip */}
      {renderThumbnailStrip()}

      {/* Preview Modal */}
      <Modal
        visible={previewImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <View style={styles.previewModal}>
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={() => setPreviewImage(null)}>
              <Text style={styles.previewButtonText}>✕</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => {
                if (previewImage) {
                  deleteImage(previewImage.id);
                  setPreviewImage(null);
                }
              }}
            >
              <Text style={[styles.previewButtonText, styles.deleteButton]}>🗑</Text>
            </TouchableOpacity>
          </View>

          {previewImage && (
            <Image
              source={{ uri: previewImage.uri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Processing Overlay */}
      <Modal visible={isProcessing} transparent={true} animationType="fade">
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.processingText}>
            Processing image {processingProgress.current} of {processingProgress.total}...
          </Text>
          <Text style={styles.processingSubtext}>Extracting text with OCR</Text>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  topRightControls: {
    flexDirection: 'row',
    gap: 15,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButtonContainer: {
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  captureButtonDisabled: {
    backgroundColor: '#999',
  },
  imageCount: {
    color: '#fff',
    fontSize: 14,
    marginTop: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  thumbnailContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  thumbnailScroll: {
    paddingRight: 10,
  },
  thumbnail: {
    width: 60,
    height: 60,
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailSelected: {
    borderColor: '#007AFF',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailNumber: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  doneButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 10,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  previewModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 24,
    padding: 10,
  },
  deleteButton: {
    color: '#ff3b30',
  },
  previewImage: {
    flex: 1,
    width: screenWidth,
    height: screenHeight - 150,
  },
  processingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 20,
    fontWeight: '600',
  },
  processingSubtext: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 30,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});