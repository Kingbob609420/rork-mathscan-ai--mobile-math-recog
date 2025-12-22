import React, { useState } from "react";
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
import { File, Paths } from "expo-file-system";

const { width, height } = Dimensions.get("window");

export default function PreviewScreen() {
  const { theme } = useTheme();
  const { imageUri } = useLocalSearchParams<{ imageUri: string }>();
  const { processScan } = useMathScan();
  const [processing, setProcessing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleConfirm = async () => {
    if (!imageUri) return;

    setProcessing(true);
    try {
      const scanId = await processScan(imageUri);
      router.replace(`/results/${scanId}`);
    } catch (error) {
      console.error("Error processing scan:", error);
      Alert.alert(
        "Processing Error",
        "Failed to process the image. Please try again.",
        [{ text: "OK" }]
      );
      setProcessing(false);
    }
  };

  const handleRetake = () => {
    router.back();
  };

  const handleCancel = () => {
    router.replace("/(tabs)");
  };

  const handleDownload = async () => {
    if (!imageUri) return;

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

        const filename = `math-scan-${Date.now()}.jpg`;
        const destinationFile = new File(Paths.cache, filename);
        
        // Copy the image to a permanent location
        const sourceFile = new File(imageUri);
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
      console.error("Error downloading image:", error);
      Alert.alert(
        "Download Error",
        "Failed to save the image. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setDownloading(false);
    }
  };

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
        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="contain"
          />
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
  image: {
    width: width - 40,
    height: height * 0.6,
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
});