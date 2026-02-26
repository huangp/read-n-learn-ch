import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import {
  Text,
  IconButton,
  FAB,
  Portal,
  Modal,
  Appbar,
  Button,
  ActivityIndicator,
  ProgressBar,
  Card,
  Surface,
  useTheme,
} from 'react-native-paper';
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
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const cameraRef = useRef<CameraView>(null);

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Camera'>>();
  const { onCapture } = route.params;
  const theme = useTheme();

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator animating={true} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <Surface style={styles.permissionContainer}>
        <Text variant="bodyLarge" style={styles.permissionText}>
          We need your permission to use the camera
        </Text>
        <Button 
          mode="contained" 
          onPress={requestPermission}
          style={styles.permissionButton}
        >
          Grant Permission
        </Button>
        <Button 
          mode="text" 
          onPress={() => navigation.goBack()}
        >
          Cancel
        </Button>
      </Surface>
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
      showSnackbar(`You can capture up to ${MAX_IMAGES} images.`);
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
        showSnackbar('Failed to capture image');
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
        showSnackbar('Could not extract text from any of the captured images.');
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
      showSnackbar('Failed to process images');
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
          <Card
            key={image.id}
            style={[
              styles.thumbnail,
              previewImage?.id === image.id && styles.thumbnailSelected,
            ]}
            onPress={() => setPreviewImage(image)}
          >
            <Card.Cover source={{ uri: image.uri }} style={styles.thumbnailImage} />
            <View style={styles.thumbnailOverlay}>
              <Text style={styles.thumbnailNumber}>{index + 1}</Text>
            </View>
          </Card>
        ))}
      </ScrollView>

      {capturedImages.length > 0 && (
        <Button
          mode="contained"
          onPress={processImages}
          disabled={isProcessing}
          icon="check"
          style={styles.doneButton}
        >
          Done ({capturedImages.length})
        </Button>
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
          <IconButton
            icon="close"
            iconColor="#fff"
            size={24}
            onPress={handleBack}
            style={styles.controlButton}
          />

          <View style={styles.topRightControls}>
            <IconButton
              icon={flash === 'off' ? 'flash-off' : flash === 'on' ? 'flash' : 'flash-auto'}
              iconColor="#fff"
              size={24}
              onPress={toggleFlash}
              style={styles.controlButton}
            />
            
            <IconButton
              icon="camera-flip"
              iconColor="#fff"
              size={24}
              onPress={toggleCameraFacing}
              style={styles.controlButton}
            />
          </View>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <View style={styles.captureButtonContainer}>
            <FAB
              icon="camera"
              size="large"
              onPress={takePicture}
              disabled={capturedImages.length >= MAX_IMAGES}
              style={[
                styles.captureButton,
                capturedImages.length >= MAX_IMAGES && { backgroundColor: theme.colors.surfaceDisabled }
              ]}
            />
          </View>

          <Surface style={styles.imageCountSurface}>
            <Text style={styles.imageCount}>
              {capturedImages.length} / {MAX_IMAGES}
            </Text>
          </Surface>
        </View>
      </CameraView>

      {/* Thumbnail Strip */}
      {renderThumbnailStrip()}

      {/* Preview Modal */}
      <Portal>
        <Modal
          visible={previewImage !== null}
          onDismiss={() => setPreviewImage(null)}
          contentContainerStyle={styles.previewModal}
        >
          <Appbar.Header style={styles.previewHeader}>
            <Appbar.BackAction onPress={() => setPreviewImage(null)} />
            <Appbar.Content title="Preview" />
            <Appbar.Action 
              icon="delete" 
              onPress={() => {
                if (previewImage) {
                  deleteImage(previewImage.id);
                  setPreviewImage(null);
                }
              }}
            />
          </Appbar.Header>

          {previewImage && (
            <Image
              source={{ uri: previewImage.uri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
        </Modal>
      </Portal>

      {/* Processing Overlay */}
      <Portal>
        <Modal visible={isProcessing} dismissable={false} contentContainerStyle={styles.processingModal}>
          <ActivityIndicator animating={true} size="large" />
          <Text variant="titleMedium" style={styles.processingText}>
            Processing image {processingProgress.current} of {processingProgress.total}...
          </Text>
          <ProgressBar
            progress={processingProgress.total > 0 ? processingProgress.current / processingProgress.total : 0}
            style={styles.progressBar}
          />
          <Text variant="bodyMedium" style={styles.processingSubtext}>
            Extracting text with OCR
          </Text>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    marginBottom: 10,
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  imageCountSurface: {
    marginTop: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  imageCount: {
    color: '#fff',
    fontSize: 14,
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
  },
  thumbnailSelected: {
    borderColor: '#007AFF',
    borderWidth: 2,
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
    marginLeft: 10,
  },
  previewModal: {
    flex: 1,
    backgroundColor: '#000',
    margin: 0,
  },
  previewHeader: {
    backgroundColor: 'transparent',
  },
  previewImage: {
    flex: 1,
    width: screenWidth,
    height: screenHeight - 150,
  },
  processingModal: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 32,
    margin: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    marginTop: 16,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    marginVertical: 16,
  },
  processingSubtext: {
    color: '#aaa',
  },
});