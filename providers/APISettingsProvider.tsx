import { useCallback, useMemo, useState, useEffect } from "react";
import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_KEY_STORAGE_KEY = "deepseek_api_key";

interface APISettingsContextType {
  isConfigured: boolean;
  apiKey: string;
  setApiKey: (key: string) => Promise<void>;
  generateWithAI: (prompt: string) => Promise<string>;
}

export const [APISettingsProvider, useAPISettings] = createContextHook<APISettingsContextType>(() => {
  const [apiKey, setApiKeyState] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const stored = await AsyncStorage.getItem(API_KEY_STORAGE_KEY);
        if (stored) {
          setApiKeyState(stored);
          console.log("[APISettings] Loaded API key from storage");
        }
      } catch (error) {
        console.error("[APISettings] Error loading API key:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadApiKey();
  }, []);

  const setApiKey = useCallback(async (key: string) => {
    try {
      if (key.trim()) {
        await AsyncStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
      } else {
        await AsyncStorage.removeItem(API_KEY_STORAGE_KEY);
      }
      setApiKeyState(key.trim());
      console.log("[APISettings] API key saved");
    } catch (error) {
      console.error("[APISettings] Error saving API key:", error);
      throw error;
    }
  }, []);

  const generateWithAI = useCallback(async (prompt: string): Promise<string> => {
    if (!apiKey) {
      throw new Error("Please configure your DeepSeek API key in Settings to use this feature.");
    }

    console.log("[AI] Generating with DeepSeek");

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
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
      console.error("[AI] API error:", errorData);
      throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in API response");
    }

    console.log("[AI] Generation successful");
    return content;
  }, [apiKey]);

  const isConfigured = useMemo(() => !isLoading && apiKey.length > 0, [isLoading, apiKey]);

  return useMemo(() => ({
    isConfigured,
    apiKey,
    setApiKey,
    generateWithAI,
  }), [isConfigured, apiKey, setApiKey, generateWithAI]);
});
