import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  Alert,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Camera, Image as ImageIcon, Scan } from "lucide-react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/providers/ThemeProvider";

export default function HomeScreen() {
  const { theme } = useTheme();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [uploading, setUploading] = useState(false);
  const scaleAnim = new Animated.Value(1);

  useEffect(() => {
    console.log("[HomeScreen] Component mounted");
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      console.log("[HomeScreen] Checking onboarding status...");
      const seen = await AsyncStorage.getItem("hasSeenOnboarding");
      console.log("[HomeScreen] Onboarding seen:", !!seen);
      setHasSeenOnboarding(!!seen);
      if (!seen) {
        console.log("[HomeScreen] Navigating to onboarding");
        router.push("/onboarding" as any);
      }
    } catch (error) {
      console.error("[HomeScreen] Error checking onboarding:", error);
      setHasSeenOnboarding(true);
    }
  };

  if (hasSeenOnboarding === null) {
    return null;
  }

  const handleScanPress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    if (Platform.OS === 'ios' && Platform.isPad) {
      Alert.alert(
        "Camera on iPad",
        "Some iPad models may have issues with the camera. Would you like to continue or use gallery instead?",
        [
          {
            text: "Use Gallery",
            onPress: handleUploadPress,
          },
          {
            text: "Try Camera",
            onPress: () => router.push("/camera" as any),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );
    } else {
      router.push("/camera" as any);
    }
  };

  const handleUploadPress = async () => {
    try {
      setUploading(true);
      
      const ImagePicker = await import('expo-image-picker');
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          "Permission Required",
          "Sorry, we need camera roll permissions to upload photos. Please enable this in your device settings.",
          [{ text: "OK" }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        console.log("Selected image:", result.assets[0].uri);
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

  const gradientColors: readonly [string, string, ...string[]] = theme.isDark 
    ? [theme.colors.background, theme.colors.surface] 
    : ["#6366F1", "#8B5CF6"];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={[styles.logoCircle, { 
              backgroundColor: theme.isDark ? "rgba(129, 140, 248, 0.15)" : "rgba(255, 255, 255, 0.15)",
              borderColor: theme.isDark ? "rgba(129, 140, 248, 0.3)" : "rgba(255, 255, 255, 0.3)"
            }]}>
              <Scan size={56} color={theme.isDark ? theme.colors.primary : "#fff"} strokeWidth={1.5} />
            </View>
            <Text style={[styles.appName, { color: theme.isDark ? '#FFFFFF' : '#000000' }]}>MathScan AI</Text>
            <Text style={[styles.tagline, { color: theme.isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }]}>Point. Shoot. Solve.</Text>
          </View>

          <View style={styles.buttonsContainer}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                style={styles.mainButton}
                onPress={handleScanPress}
                activeOpacity={0.9}
              >
                <View
                  style={[styles.mainButtonGradient, { 
                    backgroundColor: theme.isDark ? theme.colors.card : "#fff" 
                  }]}
                >
                  <Camera size={40} color={theme.colors.primary} strokeWidth={2} />
                  <Text style={[styles.mainButtonText, { color: theme.colors.primary }]}>Scan Problem</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
            
            <TouchableOpacity
              style={[styles.secondaryButton, {
                backgroundColor: theme.isDark ? "rgba(129, 140, 248, 0.15)" : "rgba(255, 255, 255, 0.15)",
                borderColor: theme.isDark ? "rgba(129, 140, 248, 0.3)" : "rgba(255, 255, 255, 0.3)"
              }]}
              onPress={handleUploadPress}
              activeOpacity={0.8}
              disabled={uploading}
            >
              <ImageIcon size={20} color={theme.isDark ? theme.colors.primary : "#fff"} strokeWidth={2} />
              <Text style={[styles.secondaryButtonText, { color: theme.isDark ? theme.colors.primary : "#fff" }]}>
                {uploading ? "Loading..." : "Upload from Gallery"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 80,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 2,
  },
  appName: {
    fontSize: 36,
    fontWeight: "700" as const,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 18,
    letterSpacing: 0.5,
  },
  buttonsContainer: {
    width: "100%",
    alignItems: "center",
    gap: 16,
  },
  mainButton: {
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  mainButtonGradient: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 40,
    borderRadius: 24,
    gap: 16,
  },
  mainButtonText: {
    fontSize: 24,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1.5,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
});