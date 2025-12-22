import { useState, useEffect, useCallback, useMemo } from "react";
import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";

const THEME_STORAGE_KEY = "app_theme_mode";

type ThemeMode = "light" | "dark" | "system";

interface Colors {
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  primary: string;
  primaryLight: string;
  border: string;
  borderLight: string;
  error: string;
  success: string;
  warning: string;
  icon: string;
  iconBackground: string;
}

interface Theme {
  colors: Colors;
  isDark: boolean;
}

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const lightColors: Colors = {
  background: "#F9FAFB",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  text: "#1F2937",
  textSecondary: "#6B7280",
  primary: "#6366F1",
  primaryLight: "#EEF2FF",
  border: "#E5E7EB",
  borderLight: "#F3F4F6",
  error: "#EF4444",
  success: "#10B981",
  warning: "#F59E0B",
  icon: "#6366F1",
  iconBackground: "#F3F4F6",
};

const darkColors: Colors = {
  background: "#0F172A",
  surface: "#1E293B",
  card: "#1E293B",
  text: "#F1F5F9",
  textSecondary: "#94A3B8",
  primary: "#818CF8",
  primaryLight: "#1E1B4B",
  border: "#334155",
  borderLight: "#1E293B",
  error: "#F87171",
  success: "#34D399",
  warning: "#FBBF24",
  icon: "#818CF8",
  iconBackground: "#334155",
};

export const [ThemeProvider, useTheme] = createContextHook<ThemeContextType>(() => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");

  const loadTheme = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (stored) {
        setThemeModeState(stored as ThemeMode);
      }
    } catch (error) {
      console.error("Error loading theme:", error);
    }
  }, []);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  }, []);

  const theme: Theme = useMemo(() => {
    const isDark = themeMode === "dark" || (themeMode === "system" && systemColorScheme === "dark");
    return {
      colors: isDark ? darkColors : lightColors,
      isDark,
    };
  }, [themeMode, systemColorScheme]);

  return useMemo(() => ({
    theme,
    themeMode,
    setThemeMode,
  }), [theme, themeMode, setThemeMode]);
});
