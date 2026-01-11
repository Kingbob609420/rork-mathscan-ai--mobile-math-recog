import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
  Platform,
} from "react-native";
import {
  FileText,
  Sparkles,
  ExternalLink,
  BookOpen,
  GraduationCap,
  Download,
  Printer,
} from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { generateText } from "@rork-ai/toolkit-sdk";
import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";

type DifficultyLevel = "beginner" | "intermediate" | "advanced";
type WorksheetType = "practice" | "test" | "homework";

export default function WorksheetsScreen() {
  const { theme } = useTheme();
  const [topic, setTopic] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("intermediate");
  const [problemCount, setProblemCount] = useState("10");
  const [worksheetType, setWorksheetType] = useState<WorksheetType>("practice");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedWorksheet, setGeneratedWorksheet] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const externalResources = [
    {
      name: "Khan Academy",
      description: "Free math practice and lessons",
      url: "https://www.khanacademy.org/math",
      icon: <GraduationCap size={24} color={theme.colors.primary} />,
    },
    {
      name: "Math-Drills",
      description: "Free printable math worksheets",
      url: "https://www.math-drills.com/",
      icon: <FileText size={24} color={theme.colors.primary} />,
    },
    {
      name: "IXL Math",
      description: "Comprehensive math practice",
      url: "https://www.ixl.com/math/",
      icon: <BookOpen size={24} color={theme.colors.primary} />,
    },
    {
      name: "Math Worksheets 4 Kids",
      description: "Thousands of printable worksheets",
      url: "https://www.mathworksheets4kids.com/",
      icon: <Download size={24} color={theme.colors.primary} />,
    },
  ];

  const handleOpenResource = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Unable to open this resource");
      }
    } catch {
      Alert.alert("Error", "Unable to open this resource");
    }
  };

  const handleGenerateWorksheet = async () => {
    if (!topic.trim()) {
      Alert.alert("Missing Information", "Please enter a topic for the worksheet");
      return;
    }

    if (!gradeLevel.trim()) {
      Alert.alert("Missing Information", "Please enter the grade level");
      return;
    }

    setIsGenerating(true);
    setGeneratedWorksheet(null);

    try {
      const prompt = `Generate a ${worksheetType} math worksheet for a ${gradeLevel} grade student on the topic: ${topic}.

Difficulty level: ${difficulty}
Number of problems: ${problemCount}
${additionalNotes ? `Additional requirements: ${additionalNotes}` : ""}

Please create a well-structured worksheet with:
1. A clear title
2. Instructions for the student
3. ${problemCount} problems appropriate for the topic and difficulty level
4. Space for work (indicate with "Work:" or similar)
5. An answer key section at the end

Format the worksheet in a clear, printable format.`;

      console.log("[Worksheets] Generating worksheet with prompt:", prompt);

      const result = await generateText(prompt);

      console.log("[Worksheets] Worksheet generated successfully");
      setGeneratedWorksheet(result);
    } catch (error) {
      console.error("[Worksheets] Error generating worksheet:", error);
      Alert.alert(
        "Generation Failed",
        "Unable to generate worksheet. Please check your connection and try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDifficultyPress = () => {
    Alert.alert("Select Difficulty", "Choose the difficulty level", [
      {
        text: "Beginner",
        onPress: () => setDifficulty("beginner"),
      },
      {
        text: "Intermediate",
        onPress: () => setDifficulty("intermediate"),
      },
      {
        text: "Advanced",
        onPress: () => setDifficulty("advanced"),
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  const handleWorksheetTypePress = () => {
    Alert.alert("Select Type", "Choose the worksheet type", [
      {
        text: "Practice",
        onPress: () => setWorksheetType("practice"),
      },
      {
        text: "Test",
        onPress: () => setWorksheetType("test"),
      },
      {
        text: "Homework",
        onPress: () => setWorksheetType("homework"),
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  const createWorksheetHTML = (content: string) => {
    const formattedContent = content.replace(/\n/g, "<br>");
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Arial', sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              line-height: 1.6;
            }
            h1 {
              color: #333;
              border-bottom: 2px solid #4F46E5;
              padding-bottom: 10px;
            }
            .problem {
              margin: 20px 0;
              padding: 10px;
              background-color: #f9f9f9;
              border-left: 3px solid #4F46E5;
            }
            .answer-key {
              margin-top: 40px;
              padding: 20px;
              background-color: #f0f0f0;
              border-radius: 5px;
            }
          </style>
        </head>
        <body>
          ${formattedContent}
        </body>
      </html>
    `;
  };

  const handlePrintWorksheet = async () => {
    if (!generatedWorksheet) return;

    setIsPrinting(true);
    try {
      const html = createWorksheetHTML(generatedWorksheet);
      
      if (Platform.OS === 'web') {
        const { uri } = await Print.printToFileAsync({ html });
        console.log('[Worksheets] PDF created at:', uri);
        Alert.alert('PDF Ready', 'Your worksheet PDF has been created!');
      } else {
        await Print.printAsync({ html });
      }
    } catch (error) {
      console.error('[Worksheets] Error printing:', error);
      Alert.alert('Print Error', 'Unable to print worksheet. Please try again.');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!generatedWorksheet) return;

    setIsPrinting(true);
    try {
      const html = createWorksheetHTML(generatedWorksheet);
      const { uri } = await Print.printToFileAsync({ html });
      console.log('[Worksheets] PDF exported to:', uri);
      
      await shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
      });
    } catch (error) {
      console.error('[Worksheets] Error exporting PDF:', error);
      Alert.alert('Export Error', 'Unable to export worksheet. Please try again.');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Worksheets</Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
          Generate custom worksheets for your child
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
          AI WORKSHEET GENERATOR
        </Text>
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Topic *</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border },
              ]}
              placeholder="e.g., Addition, Fractions, Algebra"
              placeholderTextColor={theme.colors.textSecondary}
              value={topic}
              onChangeText={setTopic}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Grade Level *</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border },
              ]}
              placeholder="e.g., 3rd, 5th, 7th"
              placeholderTextColor={theme.colors.textSecondary}
              value={gradeLevel}
              onChangeText={setGradeLevel}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Difficulty</Text>
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                ]}
                onPress={handleDifficultyPress}
              >
                <Text style={[styles.selectButtonText, { color: theme.colors.text }]}>
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Problems</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border },
                ]}
                placeholder="10"
                placeholderTextColor={theme.colors.textSecondary}
                value={problemCount}
                onChangeText={setProblemCount}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Type</Text>
            <TouchableOpacity
              style={[
                styles.selectButton,
                { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
              ]}
              onPress={handleWorksheetTypePress}
            >
              <Text style={[styles.selectButtonText, { color: theme.colors.text }]}>
                {worksheetType.charAt(0).toUpperCase() + worksheetType.slice(1)}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Additional Notes</Text>
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border },
              ]}
              placeholder="Any specific requirements or focus areas..."
              placeholderTextColor={theme.colors.textSecondary}
              value={additionalNotes}
              onChangeText={setAdditionalNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.generateButton,
              { backgroundColor: theme.colors.primary },
              isGenerating && styles.generateButtonDisabled,
            ]}
            onPress={handleGenerateWorksheet}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Sparkles size={20} color="#fff" />
                <Text style={styles.generateButtonText}>Generate Worksheet</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {generatedWorksheet && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            GENERATED WORKSHEET
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <ScrollView style={styles.worksheetContent} nestedScrollEnabled>
              <Text style={[styles.worksheetText, { color: theme.colors.text }]}>
                {generatedWorksheet}
              </Text>
            </ScrollView>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.printButton,
                  { backgroundColor: theme.colors.primary },
                  isPrinting && styles.actionButtonDisabled,
                ]}
                onPress={handlePrintWorksheet}
                disabled={isPrinting}
              >
                {isPrinting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Printer size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Print</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.exportButton,
                  { borderColor: theme.colors.primary },
                  isPrinting && styles.actionButtonDisabled,
                ]}
                onPress={handleExportPDF}
                disabled={isPrinting}
              >
                {isPrinting ? (
                  <ActivityIndicator color={theme.colors.primary} size="small" />
                ) : (
                  <>
                    <Download size={18} color={theme.colors.primary} />
                    <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>
                      Export PDF
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
          USEFUL RESOURCES
        </Text>
        <View style={styles.resourcesContainer}>
          {externalResources.map((resource, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.resourceCard, { backgroundColor: theme.colors.card }]}
              onPress={() => handleOpenResource(resource.url)}
              activeOpacity={0.7}
            >
              <View style={[styles.resourceIcon, { backgroundColor: theme.colors.primaryLight }]}>
                {resource.icon}
              </View>
              <View style={styles.resourceContent}>
                <Text style={[styles.resourceName, { color: theme.colors.text }]}>
                  {resource.name}
                </Text>
                <Text style={[styles.resourceDescription, { color: theme.colors.textSecondary }]}>
                  {resource.description}
                </Text>
              </View>
              <ExternalLink size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.bottomPadding} />
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
  card: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600" as const,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top" as const,
  },
  row: {
    flexDirection: "row" as const,
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  selectButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  selectButtonText: {
    fontSize: 16,
  },
  generateButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600" as const,
  },
  worksheetContent: {
    maxHeight: 400,
  },
  worksheetText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "monospace" as const,
  },
  resourcesContainer: {
    gap: 12,
    paddingHorizontal: 16,
  },
  resourceCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 16,
    borderRadius: 12,
  },
  resourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: 12,
  },
  resourceContent: {
    flex: 1,
  },
  resourceName: {
    fontSize: 16,
    fontWeight: "600" as const,
    marginBottom: 2,
  },
  resourceDescription: {
    fontSize: 13,
  },
  bottomPadding: {
    height: 20,
  },
  actionButtons: {
    flexDirection: "row" as const,
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  printButton: {
    backgroundColor: "#4F46E5",
  },
  exportButton: {
    backgroundColor: "transparent" as const,
    borderWidth: 2,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600" as const,
  },
});
