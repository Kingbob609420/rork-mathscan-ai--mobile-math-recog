import { useCallback, useMemo } from "react";
import createContextHook from "@nkzw/create-context-hook";

const DEEPSEEK_API_KEY = "sk-ae40dbba273f46a5bf7b4839deabcae4";

interface APISettingsContextType {
  isConfigured: boolean;
  generateWithAI: (prompt: string) => Promise<string>;
}

export const [APISettingsProvider, useAPISettings] = createContextHook<APISettingsContextType>(() => {
  const generateWithAI = useCallback(async (prompt: string): Promise<string> => {
    console.log("[AI] Generating with DeepSeek");

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
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
  }, []);

  return useMemo(() => ({
    isConfigured: true,
    generateWithAI,
  }), [generateWithAI]);
});
