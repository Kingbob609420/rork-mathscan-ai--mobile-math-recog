import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from "react-native";
import {
  Bell,
  Moon,
  Globe,
  Shield,
  Mail,
  Star,
  Trash2,
  ChevronRight,
  Zap,
} from "lucide-react-native";
import { useMathScan } from "@/providers/MathScanProvider";
import { useTheme } from "@/providers/ThemeProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trpc } from "@/lib/trpc";

export default function SettingsScreen() {
  const { clearAllScans } = useMathScan();
  const { theme, themeMode, setThemeMode } = useTheme();
  const [notifications, setNotifications] = React.useState(true);
  const [autoSave, setAutoSave] = React.useState(true);
  
  const hiMutation = trpc.example.hi.useMutation();

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will delete all your scan history. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await clearAllScans();
            Alert.alert("Success", "All data has been cleared");
          },
        },
      ]
    );
  };

  const handleResetOnboarding = async () => {
    await AsyncStorage.removeItem("hasSeenOnboarding");
    Alert.alert("Success", "Onboarding has been reset");
  };

  const handleContactUs = async () => {
    const email = "mathscannerfeedback@gmail.com";
    const subject = "MathScan Feedback";
    const body = "Hi MathScan team,\n\n";
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert("Error", "Unable to open email client. Please email us at " + email);
      }
    } catch {
      Alert.alert("Error", "Unable to open email client. Please email us at " + email);
    }
  };

  const handleTestBackend = async () => {
    try {
      const result = await hiMutation.mutateAsync({ name: "MathScan User" });
      Alert.alert(
        "Backend Test Success!", 
        `Response: ${result.hello}\nDate: ${new Date(result.date).toLocaleString()}`
      );
    } catch (error) {
      Alert.alert("Backend Test Failed", `Error: ${error}`);
    }
  };

  const handlePrivacyPolicy = async () => {
    const url = "https://docs.google.com/document/d/1mKU0H13ppZYE3IHboOmul82GwPMLSEsz4Fq-qKIZA8w/edit?usp=sharing";
    
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Unable to open privacy policy");
      }
    } catch {
      Alert.alert("Error", "Unable to open privacy policy");
    }
  };

  const getThemeModeDescription = () => {
    switch (themeMode) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      case "system":
        return "System default";
    }
  };

  const handleThemePress = () => {
    Alert.alert(
      "Appearance",
      "Choose your preferred theme",
      [
        {
          text: "Light",
          onPress: () => setThemeMode("light"),
        },
        {
          text: "Dark",
          onPress: () => setThemeMode("dark"),
        },
        {
          text: "System Default",
          onPress: () => setThemeMode("system"),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const settingsSections = [
    {
      title: "Preferences",
      items: [
        {
          icon: <Moon size={20} color={theme.colors.icon} />,
          title: "Appearance",
          description: getThemeModeDescription(),
          onPress: handleThemePress,
          action: <ChevronRight size={20} color={theme.colors.textSecondary} />,
        },
        {
          icon: <Bell size={20} color={theme.colors.icon} />,
          title: "Notifications",
          description: "Get reminders to practice",
          action: (
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#fff"
            />
          ),
        },
        {
          icon: <Zap size={20} color={theme.colors.icon} />,
          title: "Auto-Save Scans",
          description: "Automatically save scan history",
          action: (
            <Switch
              value={autoSave}
              onValueChange={setAutoSave}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#fff"
            />
          ),
        },
        {
          icon: <Globe size={20} color={theme.colors.icon} />,
          title: "Language",
          description: "English",
          action: <ChevronRight size={20} color={theme.colors.textSecondary} />,
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          icon: <Mail size={20} color={theme.colors.icon} />,
          title: "Contact Us",
          description: "Send us feedback",
          onPress: handleContactUs,
          action: <ChevronRight size={20} color={theme.colors.textSecondary} />,
        },
        {
          icon: <Star size={20} color={theme.colors.icon} />,
          title: "Rate App",
          description: "Help us improve",
          action: <ChevronRight size={20} color={theme.colors.textSecondary} />,
        },
      ],
    },
    {
      title: "Privacy & Data",
      items: [
        {
          icon: <Shield size={20} color={theme.colors.icon} />,
          title: "Privacy Policy",
          description: "Learn how we protect your data",
          onPress: handlePrivacyPolicy,
          action: <ChevronRight size={20} color={theme.colors.textSecondary} />,
        },
        {
          icon: <Zap size={20} color={theme.colors.success} />,
          title: "Test Backend",
          description: "Test tRPC connection",
          onPress: handleTestBackend,
          action: <ChevronRight size={20} color={theme.colors.textSecondary} />,
        },
        {
          icon: <Trash2 size={20} color={theme.colors.error} />,
          title: "Clear All Data",
          description: "Delete all scan history",
          onPress: handleClearData,
          action: <ChevronRight size={20} color={theme.colors.textSecondary} />,
        },
      ],
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Settings</Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
          Customize your MathScan experience
        </Text>
      </View>

      {settingsSections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{section.title}</Text>
          <View style={[styles.sectionContent, { backgroundColor: theme.colors.card }]}>
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={itemIndex}
                style={[
                  styles.settingItem,
                  { borderBottomColor: theme.colors.borderLight },
                  itemIndex === section.items.length - 1 && styles.lastItem,
                ]}
                onPress={item.onPress}
                disabled={!item.onPress}
                activeOpacity={item.onPress ? 0.7 : 1}
              >
                <View style={[styles.settingIcon, { backgroundColor: theme.colors.iconBackground }]}>{item.icon}</View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>{item.title}</Text>
                  <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                    {item.description}
                  </Text>
                </View>
                {item.action}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={[styles.debugButton, { backgroundColor: theme.colors.iconBackground }]}
        onPress={handleResetOnboarding}
      >
        <Text style={[styles.debugButtonText, { color: theme.colors.textSecondary }]}>Reset Onboarding</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={[styles.version, { color: theme.colors.textSecondary }]}>Version 1.0.0</Text>
        <Text style={[styles.copyright, { color: theme.colors.textSecondary }]}>© 2025 MathScan AI</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold" as const,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  sectionContent: {
    marginHorizontal: 16,
    borderRadius: 12,
  },
  settingItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 16,
    borderBottomWidth: 1,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500" as const,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
  },
  debugButton: {
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: "center" as const,
  },
  debugButtonText: {
    fontSize: 14,
  },
  footer: {
    alignItems: "center" as const,
    paddingVertical: 20,
    marginBottom: 20,
  },
  version: {
    fontSize: 13,
    marginBottom: 4,
  },
  copyright: {
    fontSize: 13,
  },
});