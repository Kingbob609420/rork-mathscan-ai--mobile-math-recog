import React, { Component, ErrorInfo, ReactNode } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { X, RotateCw, Zap, Grid } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/providers/ThemeProvider";

interface CameraState {
  facing: "back" | "front";
  flash: boolean;
  showGrid: boolean;
  cameraLoaded: boolean;
  error: string | null;
  permissionGranted: boolean;
  CameraView: any;
  theme: any;
}

class CameraScreenImpl extends Component<{ theme: any }, CameraState> {
  cameraRef: any = null;
  permissionRequest: any = null;

  constructor(props: { theme: any }) {
    super(props);
    this.state = {
      facing: "back",
      flash: false,
      showGrid: true,
      cameraLoaded: false,
      error: null,
      permissionGranted: false,
      CameraView: null,
      theme: props.theme,
    };
  }

  async componentDidMount() {
    console.log("[Camera] Component mounted");
    console.log("[Camera] Platform:", Platform.OS);
    
    try {
      const cameraModule = await import("expo-camera");
      console.log("[Camera] Camera module loaded");
      
      this.setState({
        CameraView: cameraModule.CameraView,
        cameraLoaded: true,
      });

      const permissions = await cameraModule.Camera.getCameraPermissionsAsync();
      console.log("[Camera] Current permissions:", permissions);
      
      if (permissions.granted) {
        console.log('[Camera] Already have permissions');
        this.setState({ permissionGranted: true });
        return;
      }

      console.log('[Camera] Requesting permission...');
      const requestResult = await cameraModule.Camera.requestCameraPermissionsAsync();
      console.log("[Camera] Permission result:", requestResult);
      
      if (requestResult.granted) {
        console.log('[Camera] Permission granted!');
        this.setState({ permissionGranted: true });
      } else {
        console.log('[Camera] Permission denied');
        Alert.alert(
          "Camera Access Required",
          "We need camera access to scan math problems. You can also use the gallery option instead.",
          [
            {
              text: "OK",
              onPress: () => router.back(),
            },
          ]
        );
      }
    } catch (error) {
      console.error("[Camera] Error:", error);
      this.setState({
        error: "Camera not available",
      });
      
      Alert.alert(
        "Camera Error",
        "Unable to access camera. Please use the gallery option instead.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    }
  }

  toggleCameraFacing = () => {
    this.setState((state) => ({
      facing: state.facing === "back" ? "front" : "back",
    }));
  };

  toggleFlash = () => {
    this.setState((state) => ({ flash: !state.flash }));
  };

  toggleGrid = () => {
    this.setState((state) => ({ showGrid: !state.showGrid }));
  };

  takePicture = async () => {
    if (this.cameraRef) {
      try {
        const photo = await this.cameraRef.takePictureAsync({
          quality: 1,
          base64: false,
        });
        
        const encodedUri = encodeURIComponent(photo.uri);
        console.log('[Camera] Photo taken, URI:', photo.uri);
        console.log('[Camera] Encoded URI:', encodedUri);
        router.push({
          pathname: "/preview" as any,
          params: { imageUri: encodedUri },
        });
      } catch (error) {
        console.error("Error taking picture:", error);
        Alert.alert("Error", "Failed to take picture. Please try again.");
      }
    }
  };



  render() {
    const { facing, flash, showGrid, cameraLoaded, error, permissionGranted, CameraView } = this.state;
    const { theme } = this.props;

    if (error) {
      return (
        <View style={[styles.permissionContainer, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.permissionTitle, { color: theme.colors.error }]}>Camera Error</Text>
          <Text style={[styles.permissionText, { color: theme.colors.textSecondary }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.permissionButtonText, { color: "#fff" }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!cameraLoaded || !CameraView) {
      return (
        <View style={[styles.permissionContainer, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.permissionText, { color: theme.colors.textSecondary, marginTop: 20 }]}>
            Loading camera...
          </Text>
        </View>
      );
    }

    if (!permissionGranted) {
      console.log('[Camera] Render: Permission not granted');
      return (
        <View style={[styles.permissionContainer, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.permissionText, { color: theme.colors.textSecondary, marginTop: 20 }]}>
            Waiting for camera permission...
          </Text>
        </View>
      );
    }

    console.log('[Camera] Render: Showing camera view', { cameraLoaded, permissionGranted, hasCameraView: !!CameraView });

    return (
      <View style={styles.container}>
        <CameraView
          ref={(ref: any) => (this.cameraRef = ref)}
          style={styles.camera}
          facing={facing}
          enableTorch={flash}
        >
          <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => router.back()}
              >
                <X size={28} color="#fff" />
              </TouchableOpacity>

              <View style={styles.controlsRight}>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={this.toggleFlash}
                >
                  <Zap
                    size={24}
                    color="#fff"
                    fill={flash ? "#fff" : "transparent"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={this.toggleGrid}
                >
                  <Grid
                    size={24}
                    color="#fff"
                    strokeWidth={showGrid ? 2.5 : 1.5}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={this.toggleCameraFacing}
                >
                  <RotateCw size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {showGrid && (
              <View style={styles.gridOverlay} pointerEvents="none">
                <View style={styles.gridRow}>
                  <View style={styles.gridCell} />
                  <View style={[styles.gridCell, styles.gridCellMiddle]} />
                  <View style={styles.gridCell} />
                </View>
                <View style={styles.gridRow}>
                  <View style={styles.gridCell} />
                  <View style={[styles.gridCell, styles.gridCellMiddle]} />
                  <View style={styles.gridCell} />
                </View>
                <View style={styles.gridRow}>
                  <View style={styles.gridCell} />
                  <View style={[styles.gridCell, styles.gridCellMiddle]} />
                  <View style={styles.gridCell} />
                </View>
              </View>
            )}

            <View style={styles.guideContainer} pointerEvents="none">
              <View style={styles.guideCorner} />
              <View style={[styles.guideCorner, styles.guideCornerTR]} />
              <View style={[styles.guideCorner, styles.guideCornerBL]} />
              <View style={[styles.guideCorner, styles.guideCornerBR]} />
              <Text style={styles.guideText}>
                Align math problems within the frame
              </Text>
            </View>

            <View style={styles.bottomControls}>
              <TouchableOpacity
                style={styles.captureButton}
                onPress={this.takePicture}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    );
  }
}

class CameraErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Camera error:", error, errorInfo);
    Alert.alert(
      "Camera Error",
      "Failed to initialize camera. Please try again or use the gallery option.",
      [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Error</Text>
          <Text style={styles.permissionText}>
            Failed to load the camera. Please try again.
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: "#6366F1" }]}
            onPress={() => router.back()}
          >
            <Text style={styles.permissionButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function CameraScreen() {
  const { theme } = useTheme();

  return (
    <CameraErrorBoundary>
      <CameraScreenImpl theme={theme} />
    </CameraErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlsRight: {
    flexDirection: "row",
    gap: 12,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  gridOverlay: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    bottom: 120,
    flexDirection: "column",
  },
  gridRow: {
    flex: 1,
    flexDirection: "row",
  },
  gridCell: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  gridCellMiddle: {
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
  },
  guideContainer: {
    position: "absolute",
    top: 120,
    left: 30,
    right: 30,
    bottom: 140,
    justifyContent: "center",
    alignItems: "center",
  },
  guideCorner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "#fff",
    borderTopWidth: 3,
    borderLeftWidth: 3,
    top: 0,
    left: 0,
  },
  guideCornerTR: {
    borderLeftWidth: 0,
    borderRightWidth: 3,
    left: undefined,
    right: 0,
  },
  guideCornerBL: {
    borderTopWidth: 0,
    borderBottomWidth: 3,
    top: undefined,
    bottom: 0,
  },
  guideCornerBR: {
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    top: undefined,
    left: undefined,
    bottom: 0,
    right: 0,
  },
  guideText: {
    color: "#fff",
    fontSize: 14,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bottomControls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#fff",
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
    color: "#000",
  },
  permissionText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
    color: "#666",
  },
  permissionButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: "#6366F1",
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },

});
