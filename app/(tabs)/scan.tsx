import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { Camera, Upload, FileText, FolderOpen, Plus } from "lucide-react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useTheme } from "@/providers/ThemeProvider";

export default function ScanScreen() {
  const { theme } = useTheme();
  const [uploading, setUploading] = useState(false);

  const handleCameraPress = () => {
    if (Platform.OS === "ios" && Platform.isPad) {
      Alert.alert(
        "Camera Access",
        "We use the camera only to scan a worksheet or handwritten problem so we can extract the equation and show the solution.",
        [
          {
            text: "Continue",
            onPress: () => router.push("/camera" as any),
          },
        ]
      );
      return;
    }

    router.push("/camera" as any);
  };

  const handleGalleryPress = async () => {
    try {
      setUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        router.push({
          pathname: "/preview" as any,
          params: { imageUri: result.assets[0].uri },
        });
      }
    } catch (error) {
      console.error("Error selecting image:", error);
      Alert.alert(
        "Upload Error",
        "Failed to select image. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setUploading(false);
    }
  };

  const handleMultipleImagesPress = async () => {
    try {
      setUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: 5,
      });

      if (!result.canceled && result.assets.length > 0) {
        // For now, just process the first image
        // In the future, we could batch process multiple images
        router.push({
          pathname: "/preview" as any,
          params: { imageUri: result.assets[0].uri },
        });
        
        if (result.assets.length > 1) {
          Alert.alert(
            "Multiple Images Selected",
            `You selected ${result.assets.length} images. We'll process the first one for now. Multiple image processing will be available soon!`,
            [{ text: "OK" }]
          );
        }
      }
    } catch (error) {
      console.error("Error selecting multiple images:", error);
      Alert.alert(
        "Upload Error",
        "Failed to select images. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentPress = async () => {
    try {
      setUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        router.push({
          pathname: "/preview" as any,
          params: { imageUri: result.assets[0].uri },
        });
      }
    } catch (error) {
      console.error("Error selecting document:", error);
      Alert.alert(
        "Upload Error",
        "Failed to select document. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Scan Math Problems</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Choose how you want to scan your math homework
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryOption}
        onPress={handleCameraPress}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={["#6366F1", "#8B5CF6"]}
          style={styles.primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Camera size={48} color="#fff" />
          <Text style={styles.primaryTitle}>Use Camera</Text>
          <Text style={styles.primaryDescription}>
            Take a photo of your math problems
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.uploadOptions}>
        <TouchableOpacity
          style={styles.uploadOption}
          onPress={handleGalleryPress}
          activeOpacity={0.9}
          disabled={uploading}
        >
          <BlurView intensity={15} tint={theme.isDark ? "dark" : "light"} style={[styles.uploadContent, { backgroundColor: theme.isDark ? "rgba(30, 41, 59, 0.5)" : "rgba(255, 255, 255, 0.3)", borderColor: theme.isDark ? "rgba(71, 85, 105, 0.5)" : "rgba(255, 255, 255, 0.5)" }]}>
            <View style={styles.uploadContentInner}>
              <Upload size={28} color={theme.colors.primary} />
              <Text style={[styles.uploadTitle, { color: theme.colors.text }]}>Gallery</Text>
              <Text style={[styles.uploadDescription, { color: theme.colors.textSecondary }]}>Single photo</Text>
            </View>
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.uploadOption}
          onPress={handleMultipleImagesPress}
          activeOpacity={0.9}
          disabled={uploading}
        >
          <BlurView intensity={15} tint={theme.isDark ? "dark" : "light"} style={[styles.uploadContent, { backgroundColor: theme.isDark ? "rgba(30, 41, 59, 0.5)" : "rgba(255, 255, 255, 0.3)", borderColor: theme.isDark ? "rgba(71, 85, 105, 0.5)" : "rgba(255, 255, 255, 0.5)" }]}>
            <View style={styles.uploadContentInner}>
              <Plus size={28} color={theme.colors.success} />
              <Text style={[styles.uploadTitle, { color: theme.colors.text }]}>Multiple</Text>
              <Text style={[styles.uploadDescription, { color: theme.colors.textSecondary }]}>Up to 5 photos</Text>
            </View>
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.uploadOption}
          onPress={handleDocumentPress}
          activeOpacity={0.9}
          disabled={uploading}
        >
          <BlurView intensity={15} tint={theme.isDark ? "dark" : "light"} style={[styles.uploadContent, { backgroundColor: theme.isDark ? "rgba(30, 41, 59, 0.5)" : "rgba(255, 255, 255, 0.3)", borderColor: theme.isDark ? "rgba(71, 85, 105, 0.5)" : "rgba(255, 255, 255, 0.5)" }]}>
            <View style={styles.uploadContentInner}>
              <FolderOpen size={28} color={theme.colors.warning} />
              <Text style={[styles.uploadTitle, { color: theme.colors.text }]}>Files</Text>
              <Text style={[styles.uploadDescription, { color: theme.colors.textSecondary }]}>Any image file</Text>
            </View>
          </BlurView>
        </TouchableOpacity>
      </View>

      {uploading && (
        <View style={[styles.uploadingIndicator, { backgroundColor: theme.colors.primaryLight }]}>
          <Text style={[styles.uploadingText, { color: theme.colors.primary }]}>Selecting image...</Text>
        </View>
      )}

      <View style={styles.tipsContainer}>
        <Text style={[styles.tipsTitle, { color: theme.colors.text }]}>Tips for Best Results</Text>
        <BlurView intensity={15} tint={theme.isDark ? "dark" : "light"} style={[styles.tipCard, { backgroundColor: theme.isDark ? "rgba(30, 41, 59, 0.4)" : "rgba(255, 255, 255, 0.25)", borderColor: theme.isDark ? "rgba(71, 85, 105, 0.4)" : "rgba(255, 255, 255, 0.4)" }]}>
          <View style={styles.tipCardInner}>
            <View style={[styles.tipNumber, { backgroundColor: theme.colors.primaryLight }]}>
              <Text style={[styles.tipNumberText, { color: theme.colors.primary }]}>1</Text>
            </View>
            <View style={styles.tipContent}>
              <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                Ensure good lighting and avoid shadows
              </Text>
            </View>
          </View>
        </BlurView>
        <BlurView intensity={15} tint={theme.isDark ? "dark" : "light"} style={[styles.tipCard, { backgroundColor: theme.isDark ? "rgba(30, 41, 59, 0.4)" : "rgba(255, 255, 255, 0.25)", borderColor: theme.isDark ? "rgba(71, 85, 105, 0.4)" : "rgba(255, 255, 255, 0.4)" }]}>
          <View style={styles.tipCardInner}>
            <View style={[styles.tipNumber, { backgroundColor: theme.colors.primaryLight }]}>
              <Text style={[styles.tipNumberText, { color: theme.colors.primary }]}>2</Text>
            </View>
            <View style={styles.tipContent}>
              <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                Keep the camera parallel to the paper
              </Text>
            </View>
          </View>
        </BlurView>
        <BlurView intensity={15} tint={theme.isDark ? "dark" : "light"} style={[styles.tipCard, { backgroundColor: theme.isDark ? "rgba(30, 41, 59, 0.4)" : "rgba(255, 255, 255, 0.25)", borderColor: theme.isDark ? "rgba(71, 85, 105, 0.4)" : "rgba(255, 255, 255, 0.4)" }]}>
          <View style={styles.tipCardInner}>
            <View style={[styles.tipNumber, { backgroundColor: theme.colors.primaryLight }]}>
              <Text style={[styles.tipNumberText, { color: theme.colors.primary }]}>3</Text>
            </View>
            <View style={styles.tipContent}>
              <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                Include all problems in the frame
              </Text>
            </View>
          </View>
        </BlurView>
        <BlurView intensity={15} tint={theme.isDark ? "dark" : "light"} style={[styles.tipCard, { backgroundColor: theme.isDark ? "rgba(30, 41, 59, 0.4)" : "rgba(255, 255, 255, 0.25)", borderColor: theme.isDark ? "rgba(71, 85, 105, 0.4)" : "rgba(255, 255, 255, 0.4)" }]}>
          <View style={styles.tipCardInner}>
            <View style={[styles.tipNumber, { backgroundColor: theme.colors.primaryLight }]}>
              <Text style={[styles.tipNumberText, { color: theme.colors.primary }]}>4</Text>
            </View>
            <View style={styles.tipContent}>
              <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                Write clearly for handwritten problems
              </Text>
            </View>
          </View>
        </BlurView>
      </View>

      <View style={styles.supportedContainer}>
        <Text style={[styles.supportedTitle, { color: theme.colors.text }]}>Supported Math Types</Text>
        <View style={styles.supportedGrid}>
          <BlurView intensity={15} tint={theme.isDark ? "dark" : "light"} style={[styles.supportedItem, { backgroundColor: theme.isDark ? "rgba(30, 41, 59, 0.4)" : "rgba(255, 255, 255, 0.25)", borderColor: theme.isDark ? "rgba(71, 85, 105, 0.4)" : "rgba(255, 255, 255, 0.4)" }]}>
            <View style={styles.supportedItemInner}>
              <FileText size={24} color={theme.colors.primary} />
              <Text style={[styles.supportedText, { color: theme.colors.textSecondary }]}>Arithmetic</Text>
            </View>
          </BlurView>
          <BlurView intensity={15} tint={theme.isDark ? "dark" : "light"} style={[styles.supportedItem, { backgroundColor: theme.isDark ? "rgba(30, 41, 59, 0.4)" : "rgba(255, 255, 255, 0.25)", borderColor: theme.isDark ? "rgba(71, 85, 105, 0.4)" : "rgba(255, 255, 255, 0.4)" }]}>
            <View style={styles.supportedItemInner}>
              <FileText size={24} color={theme.colors.primary} />
              <Text style={[styles.supportedText, { color: theme.colors.textSecondary }]}>Algebra</Text>
            </View>
          </BlurView>
          <BlurView intensity={15} tint={theme.isDark ? "dark" : "light"} style={[styles.supportedItem, { backgroundColor: theme.isDark ? "rgba(30, 41, 59, 0.4)" : "rgba(255, 255, 255, 0.25)", borderColor: theme.isDark ? "rgba(71, 85, 105, 0.4)" : "rgba(255, 255, 255, 0.4)" }]}>
            <View style={styles.supportedItemInner}>
              <FileText size={24} color={theme.colors.primary} />
              <Text style={[styles.supportedText, { color: theme.colors.textSecondary }]}>Geometry</Text>
            </View>
          </BlurView>
          <BlurView intensity={15} tint={theme.isDark ? "dark" : "light"} style={[styles.supportedItem, { backgroundColor: theme.isDark ? "rgba(30, 41, 59, 0.4)" : "rgba(255, 255, 255, 0.25)", borderColor: theme.isDark ? "rgba(71, 85, 105, 0.4)" : "rgba(255, 255, 255, 0.4)" }]}>
            <View style={styles.supportedItemInner}>
              <FileText size={24} color={theme.colors.primary} />
              <Text style={[styles.supportedText, { color: theme.colors.textSecondary }]}>Fractions</Text>
            </View>
          </BlurView>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E0E7FF",
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    lineHeight: 22,
  },
  primaryOption: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  primaryGradient: {
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
  },
  primaryTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 16,
    marginBottom: 8,
  },
  primaryDescription: {
    fontSize: 16,
    color: "#E0E7FF",
  },
  uploadOptions: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  uploadOption: {
    flex: 1,
  },
  uploadContent: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  uploadContentInner: {
    padding: 20,
    alignItems: "center",
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 8,
    marginBottom: 4,
  },
  uploadDescription: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  uploadingIndicator: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
    alignItems: "center",
  },
  uploadingText: {
    fontSize: 14,
    color: "#6366F1",
    fontWeight: "500",
  },
  tipsContainer: {
    padding: 20,
  },
  tipsTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  tipCard: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  tipCardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  tipNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  tipNumberText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#6366F1",
  },
  tipContent: {
    flex: 1,
  },
  tipText: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 20,
  },
  supportedContainer: {
    padding: 20,
    paddingTop: 0,
  },
  supportedTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  supportedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  supportedItem: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  supportedItemInner: {
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  supportedText: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "500",
  },
});