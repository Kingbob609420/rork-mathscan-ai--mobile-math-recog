import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Camera, CheckCircle, Sparkles, ArrowRight } from "lucide-react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function OnboardingScreen() {
  const [currentPage, setCurrentPage] = useState(0);

  const pages = [
    {
      icon: <Camera size={64} color="#fff" />,
      title: "Scan Math Problems",
      description: "Simply point your camera at any math problem and let our AI do the work",
      gradient: ["#6366F1", "#8B5CF6"] as const,
    },
    {
      icon: <CheckCircle size={64} color="#fff" />,
      title: "Instant Feedback",
      description: "Get immediate results showing which answers are correct or incorrect",
      gradient: ["#10B981", "#059669"] as const,
    },
    {
      icon: <Sparkles size={64} color="#fff" />,
      title: "Learn & Improve",
      description: "Detailed explanations help you understand mistakes and improve your skills",
      gradient: ["#F59E0B", "#DC2626"] as const,
    },
  ];

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = async () => {
    await AsyncStorage.setItem("hasSeenOnboarding", "true");
    router.replace("/(tabs)");
  };

  const handleSkip = () => {
    handleGetStarted();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={pages[currentPage].gradient}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            {pages[currentPage].icon}
          </View>
          <Text style={styles.title}>{pages[currentPage].title}</Text>
          <Text style={styles.description}>
            {pages[currentPage].description}
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.pagination}>
            {pages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentPage && styles.activeDot,
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>
              {currentPage === pages.length - 1 ? "Get Started" : "Next"}
            </Text>
            <ArrowRight size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  skipButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  skipText: {
    color: "#fff",
    fontSize: 16,
    opacity: 0.8,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
    lineHeight: 26,
    opacity: 0.9,
  },
  footer: {
    paddingHorizontal: 40,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 30,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  activeDot: {
    width: 24,
    backgroundColor: "#fff",
  },
  nextButton: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});