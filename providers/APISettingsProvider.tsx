import { useState, useEffect, useCallback, useMemo } from "react";
import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_SETTINGS_KEY = "api_settings";

export type APIProvider = "openai" | "deepseek";

interface APISettings {
  provider: APIProvider;
  apiKey: string;
}

interface APISettingsContextType {
  provider: APIProvider;
  apiKey: string;
  isConfigured: boolean;
  setProvider: (provider: APIProvider) => void;
  setApiKey: (key: string) => void;
  clearSettings: () => void;
  generateWithCustomAPI: (prompt: string) => Promise<string>;
}

const DEFAULT_SETTINGS: APISettings = {
  provider: "openai",
  apiKey: "",
};

export const [APISettingsProvider, useAPISettings] = createContextHook<APISettingsContextType>(() => {
  const [settings, setSettings] = useState<APISettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(API_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as APISettings;
        // Migrate old "builtin" provider to "openai"
        if ((parsed.provider as string) === "builtin") {
          parsed.provider = "openai";
          await AsyncStorage.setItem(API_SETTINGS_KEY, JSON.stringify(parsed));
        }
        setSettings(parsed);
      }
    } catch (error) {
      console.error("[APISettings] Error loading settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = useCallback(async (newSettings: APISettings) => {
    try {
      await AsyncStorage.setItem(API_SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error("[APISettings] Error saving settings:", error);
    }
  }, []);

  const setProvider = useCallback((provider: APIProvider) => {
    const newSettings = { ...settings, provider };
    saveSettings(newSettings);
  }, [settings, saveSettings]);

  const setApiKey = useCallback((apiKey: string) => {
    const newSettings = { ...settings, apiKey };
    saveSettings(newSettings);
  }, [settings, saveSettings]);

  const clearSettings = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
  }, [saveSettings]);

  const isConfigured = useMemo(() => {
    return settings.apiKey.trim().length > 0;
  }, [settings]);

  const generateWithCustomAPI = useCallback(async (prompt: string): Promise<string> => {
    const { provider, apiKey } = settings;

    if (!apiKey) {
      throw new Error("API key not configured");
    }

    const endpoint = provider === "openai" 
      ? "https://api.openai.com/v1/chat/completions"
      : "https://api.deepseek.com/chat/completions";

    const model = provider === "openai" ? "gpt-4o-mini" : "deepseek-chat";

    console.log(`[APISettings] Generating with ${provider} using model ${model}`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[APISettings] API error:", errorData);
      throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in API response");
    }

    console.log("[APISettings] Generation successful");
    return content;
  }, [settings]);

  return useMemo(() => ({
    provider: settings.provider,
    apiKey: settings.apiKey,
    isConfigured,
    setProvider,
    setApiKey,
    clearSettings,
    generateWithCustomAPI,
  }), [settings, isConfigured, setProvider, setApiKey, clearSettings, generateWithCustomAPI]);
});
