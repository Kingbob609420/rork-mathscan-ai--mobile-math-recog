import { useState, useEffect, useCallback, useMemo } from "react";
import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_KEY_STORAGE = "deepseek_api_key";

interface APISettingsContextType {
  isConfigured: boolean;
  apiKey: string;
  setApiKey: (key: string) => Promise<void>;
  generateWithAI: (prompt: string) => Promise<string>;
}

export const [APISettingsProvider, useAPISettings] = createContextHook<APISettingsContextType>(() => {
  const [apiKey, setApiKeyState] = useState<string>("");

  useEffect(() => {
    AsyncStorage.getItem(API_KEY_STORAGE).then((stored) => {
      if (stored) {
        setApiKeyState(stored);
        console.log("[APISettings] Loaded API key from storage");
      }
    });
  }, []);

  const setApiKey = useCallback(async (key: string) => {
    try {
      await AsyncStorage.setItem(API_KEY_STORAGE, key);
      setApiKeyState(key);
      console.log("[APISettings] API key saved");
    } catch (error) {
      console.error("[APISettings] Failed to save API key:", error);
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

  const isConfigured = useMemo(() => apiKey.length > 0, [apiKey]);

  return useMemo(() => ({
    isConfigured,
    apiKey,
    setApiKey,
    generateWithAI,
  }), [isConfigured, apiKey, setApiKey, generateWithAI]);
});
