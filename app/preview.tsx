import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Check, X, RotateCw, Loader, Download } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMathScan } from "@/providers/MathScanProvider";
import { useTheme } from "@/providers/ThemeProvider";
import * as MediaLibrary from "expo-media-library";

const { width, height } = Dimensions.get("window");

export default function PreviewScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{ imageUri: string }>();
  const { processScan } = useMathScan();
  const [processing, setProcessing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [screenReady, setScreenReady] = useState(false);

  console.log('[Preview] Full params:', JSON.stringify(params));
  console.log('[Preview] params.imageUri:', params.imageUri);
  console.log('[Preview] Type of params.imageUri:', typeof params.imageUri);
  
  const rawImageUri = params?.imageUri || params?.['imageUri'] || '';
  console.log('[Preview] Raw imageUri:', rawImageUri);
  
  let imageUri: string | null = null;
  try {
    imageUri = rawImageUri ? decodeURIComponent(rawImageUri) : null;
    console.log('[Preview] Decoded imageUri:', imageUri);
  } catch (decodeError) {
    console.error('[Preview] Error decoding URI:', decodeError);
    imageUri = rawImageUri || null;
    console.log('[Preview] Using raw URI as fallback:', imageUri);
  }

  useEffect(() => {
    console.log('[Preview] Screen mounted');
    console.log('[Preview] Final imageUri for rendering:', imageUri);
    
    const timer = setTimeout(() => {
      setScreenReady(true);
      console.log('[Preview] Screen ready state set to true');
    }, 100);
    
    if (!imageUri) {
      console.error('[Preview] No image URI available!');
      setTimeout(() => {
        Alert.alert(
          "No Image",
          "No image was provided. Please try taking a photo again.",
          [
            { text: "Go Back", onPress: () => router.back() },
            { text: "Return Home", onPress: () => router.replace("/(tabs)") }
          ]
        );
      }, 500);
    }
    
    return () => clearTimeout(timer);
  }, [imageUri]);

  useEffect(() => {
    if (imageUri && !imageLoaded && !imageError) {
      const imageLoadTimeout = setTimeout(() => {
        if (!imageLoaded && !imageError) {
          console.warn('[Preview] Image taking too long to load');
          setImageError(true);
          Alert.alert(
            "Image Load Timeout",
            "The image is taking too long to load. Would you like to try again?",
            [
              { text: "Retry", onPress: () => {
                setImageError(false);
                setImageLoaded(false);
              }},
              { text: "Go Back", onPress: () => router.back() }
            ]
          );
        }
      }, 10000);
      
      return () => clearTimeout(imageLoadTimeout);
    }
  }, [imageUri, imageLoaded, imageError]);

  const handleConfirm = async () => {
    if (!imageUri) {
      Alert.alert(
        "Invalid Image",
        "No image available to process. Please try again.",
        [{ text: "OK", onPress: () => router.back() }]
      );
      return;
    }

    setProcessing(true);
    try {
      console.log('[Preview] Starting scan processing...');
      const scanId = await processScan(imageUri);
      console.log('[Preview] Scan complete, navigating to results:', scanId);
      
      setTimeout(() => {
        router.replace(`/results/${scanId}` as any);
      }, 100);
    } catch (error) {
      console.error("[Preview] Error processing scan:", error);
      
      let errorMessage = "Failed to process the image. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('internet')) {
          errorMessage = "No internet connection. Please check your network and try again.";
        } else if (error.message.includes('timeout')) {
          errorMessage = "The request took too long. Please try again with better lighting.";
        } else if (error.message.includes('Invalid image')) {
          errorMessage = "The image appears to be invalid or corrupted. Please take a new photo.";
        } else if (error.message.includes('conversion')) {
          errorMessage = "Failed to process the image file. Please try taking a new photo.";
        }
      }
      
      Alert.alert(
        "Processing Error",
        errorMessage,
        [
          { 
            text: "Retry", 
            onPress: () => {
              setProcessing(false);
              setTimeout(() => handleConfirm(), 500);
            }
          },
          { 
            text: "Cancel", 
            style: "cancel",
            onPress: () => setProcessing(false)
          }
        ]
      );
    }
  };

  const handleRetake = () => {
    router.back();
  };

  const handleCancel = () => {
    router.replace("/(tabs)");
  };

  const handleDownload = async () => {
    if (!imageUri) {
      Alert.alert(
        "No Image",
        "No image available to download.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      setDownloading(true);
      
      // For web, we'll use a different approach
      if (Platform.OS === 'web') {
        // Create a download link for web
        if (typeof document !== 'undefined') {
          const link = document.createElement('a');
          link.href = imageUri;
          link.download = `math-scan-${Date.now()}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          Alert.alert(
            "Download Started",
            "The image download has started.",
            [{ text: "OK" }]
          );
        } else {
          Alert.alert(
            "Download Not Available",
            "Download is not available in this environment.",
            [{ text: "OK" }]
          );
        }
      } else {
        // For mobile platforms - request media library permissions first
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            "Permission Required",
            "We need permission to save photos to your gallery.",
            [{ text: "OK" }]
          );
          return;
        }

        // Dynamic import for mobile only
        const { File, Paths } = await import('expo-file-system');
        
        const filename = `math-scan-${Date.now()}.jpg`;
        const sourceFile = new File(imageUri);
        const destinationFile = new File(Paths.cache, filename);
        
        // Copy the image to cache
        sourceFile.copy(destinationFile);
        
        // Save to media library
        const asset = await MediaLibrary.createAssetAsync(destinationFile.uri);
        await MediaLibrary.createAlbumAsync('MathScan AI', asset, false);
        
        Alert.alert(
          "Image Saved",
          "The image has been saved to your photo gallery.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("[Preview] Error downloading image:", error);
      
      let errorMessage = "Failed to save the image. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          errorMessage = "Permission denied. Please enable photo library access in settings.";
        } else if (error.message.includes('space')) {
          errorMessage = "Not enough storage space. Please free up some space and try again.";
        }
      }
      
      Alert.alert(
        "Download Error",
        errorMessage,
        [
          { text: "Retry", onPress: () => setTimeout(() => handleDownload(), 500) },
          { text: "Cancel", style: "cancel" }
        ]
      );
    } finally {
      setDownloading(false);
    }
  };

  if (!screenReady) {
    return (
      <View style={[styles.processingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.processingText, { color: theme.colors.textSecondary, marginTop: 20 }]}>Loading preview...</Text>
      </View>
    );
  }

  if (processing) {
    return (
      <View style={[styles.processingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.processingTitle, { color: theme.colors.text }]}>Processing Image</Text>
        <Text style={[styles.processingText, { color: theme.colors.textSecondary }]}>
          Our AI is analyzing the math problems...
        </Text>
        <View style={styles.processingSteps}>
          <View style={styles.step}>
            <Loader size={16} color={theme.colors.primary} />
            <Text style={[styles.stepText, { color: theme.colors.text }]}>Detecting problems</Text>
          </View>
          <View style={styles.step}>
            <Loader size={16} color={theme.colors.primary} />
            <Text style={[styles.stepText, { color: theme.colors.text }]}>Recognizing equations</Text>
          </View>
          <View style={styles.step}>
            <Loader size={16} color={theme.colors.primary} />
            <Text style={[styles.stepText, { color: theme.colors.text }]}>Evaluating solutions</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <X size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preview</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.imageContainer}>
        {imageUri ? (
          <View style={styles.imageWrapper}>
            {!imageLoaded && !imageError && (
              <View style={styles.imageLoadingOverlay}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.imageLoadingText, { color: theme.colors.text }]}>
                  Loading image...
                </Text>
              </View>
            )}
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="contain"
              onLoadStart={() => {
                console.log('[Preview] Image load started');
                setImageLoaded(false);
                setImageError(false);
              }}
              onLoad={(e) => {
                console.log('[Preview] Image loaded successfully');
                console.log('[Preview] Image dimensions:', e.nativeEvent.source);
                setImageLoaded(true);
                setImageError(false);
              }}
              onError={(e) => {
                console.error('[Preview] Image load error:', e.nativeEvent.error);
                console.error('[Preview] Failed URI:', imageUri);
                setImageError(true);
                setImageLoaded(false);
                
                Alert.alert(
                  "Image Load Error",
                  "Failed to load the image. The file may be corrupted or the path is invalid.",
                  [
                    { text: "Retry", onPress: () => {
                      setImageError(false);
                      setImageLoaded(false);
                    }},
                    { text: "Go Back", onPress: () => router.back() },
                    { text: "Try Anyway", onPress: () => setImageError(false) }
                  ]
                );
              }}
            />
          </View>
        ) : (
          <View style={styles.noImageContainer}>
            <Text style={styles.noImageText}>No image to display</Text>
            <TouchableOpacity
              style={{ marginTop: 20, padding: 10, backgroundColor: '#333', borderRadius: 8 }}
              onPress={() => router.back()}
            >
              <Text style={{ color: '#fff' }}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.bottomControls}>
        <Text style={styles.instructionText}>
          Make sure all math problems are clearly visible
        </Text>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={handleRetake}
          >
            <RotateCw size={24} color="#6B7280" />
            <Text style={styles.retakeButtonText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.downloadButton, downloading && styles.downloadButtonDisabled]}
            onPress={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size={20} color={theme.colors.primary} />
            ) : (
              <Download size={20} color={theme.colors.primary} />
            )}
            <Text style={[styles.downloadButtonText, { color: theme.colors.primary }]}>
              {downloading ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleConfirm}
          >
            <Check size={24} color="#fff" />
            <Text style={styles.confirmButtonText}>Use Photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cancelButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  imageWrapper: {
    width: width - 40,
    height: height * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width - 40,
    height: height * 0.6,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10,
  },
  imageLoadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  bottomControls: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: Platform.OS === "ios" ? 20 : 30,
  },
  instructionText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    opacity: 0.8,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  retakeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  retakeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  downloadButtonDisabled: {
    opacity: 0.6,
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  processingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  processingTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 8,
  },
  processingText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
  },
  processingSteps: {
    gap: 16,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepText: {
    fontSize: 14,
  },
  noImageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noImageText: {
    color: "#fff",
    fontSize: 16,
  },
});