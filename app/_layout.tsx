import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState, Component, ErrorInfo, ReactNode } from "react";
import { View, Text, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MathScanProvider } from "@/providers/MathScanProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { APISettingsProvider } from "@/providers/APISettingsProvider";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync().catch((err) => {
  console.error("[App] Failed to prevent splash screen auto hide:", err);
});

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    console.error("[ErrorBoundary] getDerivedStateFromError:", error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Error caught:", error);
    console.error("[ErrorBoundary] Error message:", error.message);
    console.error("[ErrorBoundary] Error stack:", error.stack);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
    console.error("[ErrorBoundary] Platform:", Platform.OS);
    console.error("[ErrorBoundary] Platform Version:", Platform.Version);
    
    if (error.message && typeof error.message === 'string') {
      if (error.message.includes('TurboModule')) {
        console.error("[ErrorBoundary] TurboModule error detected!");
      }
      if (error.message.includes('Camera')) {
        console.error("[ErrorBoundary] Camera error detected!");
      }
      if (error.message.includes('FileSystem')) {
        console.error("[ErrorBoundary] FileSystem error detected!");
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#fff" }}>
          <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 10, color: "#000" }}>
            Something went wrong
          </Text>
          <Text style={{ textAlign: "center", color: "#666", marginBottom: 20 }}>
            {this.state.error?.message || "An unexpected error occurred"}
          </Text>
          <Text style={{ textAlign: "center", color: "#999", fontSize: 12 }}>
            Please restart the app
          </Text>
          {__DEV__ && this.state.error?.stack && (
            <Text style={{ textAlign: "left", color: "#999", fontSize: 10, marginTop: 20, fontFamily: "monospace" }}>
              {this.state.error.stack}
            </Text>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="camera" options={{ headerShown: false }} />
      <Stack.Screen name="preview" options={{ headerShown: false }} />
      <Stack.Screen name="results/[scanId]" options={{ 
        title: "Scan Results"
      }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => {
    console.log("[App] Creating QueryClient");
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
          retry: 1,
        },
        mutations: {
          retry: 0,
        },
      },
    });
  });

  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    console.log("[App] RootLayout mounted");
    console.log("[App] Platform:", Platform.OS, Platform.Version);
    console.log("[App] Device:", Platform.select({ ios: 'iOS', android: 'Android', web: 'Web' }));
    
    if (Platform.OS !== 'web') {
      try {
        const ErrorUtils = require('react-native').ErrorUtils;
        
        const originalHandler = ErrorUtils.getGlobalHandler();
        
        ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
          console.error("[App] Global error caught");
          console.error("[App] Error:", error);
          console.error("[App] Error message:", error?.message);
          console.error("[App] Error stack:", error?.stack);
          console.error("[App] Is fatal:", isFatal);
          
          if (error?.message) {
            if (error.message.includes('TurboModule')) {
              console.error("[App] TurboModule error in global handler");
            }
            if (error.message.includes('Camera') || error.message.includes('camera')) {
              console.error("[App] Camera-related error detected");
            }
            if (error.message.includes('FileSystem')) {
              console.error("[App] FileSystem error detected");
            }
          }
          
          if (originalHandler) {
            originalHandler(error, isFatal);
          }
        });
        
        console.log("[App] Global error handler set");
      } catch (handlerError) {
        console.error("[App] Failed to set global error handler:", handlerError);
      }
    }
    
    const initTimer = setTimeout(() => {
      console.log("[App] Initialization complete, hiding splash screen");
      setAppReady(true);
      SplashScreen.hideAsync().catch((err) => {
        console.error("[App] Failed to hide splash screen:", err);
      });
    }, 500);
    
    return () => clearTimeout(initTimer);
  }, []);

  if (!appReady) {
    return null;
  }

  console.log("[App] Rendering app structure");

  return (
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider>
              <APISettingsProvider>
                <MathScanProvider>
                  <RootLayoutNav />
                </MathScanProvider>
              </APISettingsProvider>
            </ThemeProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}
