import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Share,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import {
  CheckCircle,
  XCircle,
  Share2,
  Home,
  Camera,
  Calculator,
  Variable,
  Shapes,
  AlertTriangle,
  Info,
  Image as ImageIcon,
} from "lucide-react-native";
import { useMathScan } from "@/providers/MathScanProvider";
import { useTheme } from "@/providers/ThemeProvider";

export default function ResultsScreen() {
  const { theme } = useTheme();
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const { getScanById } = useMathScan();
  
  const scan = getScanById(scanId);

  if (!scan) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>Scan not found</Text>
        <TouchableOpacity
          style={[styles.homeButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={[styles.homeButtonText, { color: "#fff" }]}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const safeProblems = Array.isArray(scan.problems) ? scan.problems : [];
  const correctCount = safeProblems.filter(p => p.isCorrect).length;
  const accuracy = safeProblems.length > 0 
    ? Math.round((correctCount / safeProblems.length) * 100)
    : 0;

  const getProblemTypeIcon = (type?: string) => {
    switch (type) {
      case 'algebra':
        return <Variable size={16} color="#8B5CF6" />;
      case 'geometry':
        return <Shapes size={16} color="#EC4899" />;
      case 'arithmetic':
        return <Calculator size={16} color="#3B82F6" />;
      default:
        return <Calculator size={16} color="#6B7280" />;
    }
  };

  const getProblemTypeColor = (type?: string) => {
    switch (type) {
      case 'algebra':
        return '#8B5CF6';
      case 'geometry':
        return '#EC4899';
      case 'arithmetic':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const getProblemTypeLabel = (type?: string) => {
    switch (type) {
      case 'algebra':
        return 'Algebra';
      case 'geometry':
        return 'Geometry';
      case 'arithmetic':
        return 'Arithmetic';
      default:
        return 'Other';
    }
  };

  const handleShare = async () => {
    try {
      const message = `MathScan Results:\n${correctCount}/${safeProblems.length} correct (${accuracy}% accuracy)\n\nProblems:\n${
        safeProblems.map(p => `${p.problemText}: ${p.isCorrect ? '✓' : '✗'}`).join('\n')
      }`;
      
      await Share.share({
        message,
        title: "MathScan Results",
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleNewScan = () => {
    router.replace("/camera" as any);
  };

  const handleHome = () => {
    router.replace("/(tabs)");
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return theme.colors.textSecondary;
    if (confidence >= 90) return theme.colors.success;
    if (confidence >= 70) return "#F59E0B";
    return theme.colors.error;
  };



  const getQualityColor = (score: number) => {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return "#F59E0B";
    return theme.colors.error;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
      {scan.imageQuality && scan.imageQuality.score < 70 && (
        <View style={[styles.qualityWarning, { backgroundColor: theme.isDark ? "#7C2D12" : "#FEF3C7" }]}>
          <AlertTriangle size={20} color={theme.isDark ? "#FCA5A5" : "#D97706"} />
          <View style={styles.qualityWarningContent}>
            <Text style={[styles.qualityWarningTitle, { color: theme.isDark ? "#FCA5A5" : "#D97706" }]}>
              Image Quality Alert
            </Text>
            <Text style={[styles.qualityWarningText, { color: theme.isDark ? "#FED7AA" : "#92400E" }]}>
              Quality Score: {scan.imageQuality.score}/100 - Results may be less accurate
            </Text>
            {scan.imageQuality.issues.length > 0 && (
              <Text style={[styles.qualityWarningText, { color: theme.isDark ? "#FED7AA" : "#92400E" }]}>
                {(Array.isArray(scan.imageQuality.issues) ? scan.imageQuality.issues : []).slice(0, 2).join(" • ")}
              </Text>
            )}
          </View>
        </View>
      )}

      <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>Scan Summary</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>{safeProblems.length}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.success }]}>
              {correctCount}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Correct</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.error }]}>
              {safeProblems.length - correctCount}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Incorrect</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
              {accuracy}%
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Accuracy</Text>
          </View>
        </View>

        {scan.imageQuality && (
          <View style={[styles.qualitySection, { borderTopColor: theme.colors.border }]}>
            <View style={styles.qualityHeader}>
              <ImageIcon size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.qualityTitle, { color: theme.colors.textSecondary }]}>Image Quality</Text>
            </View>
            <View style={styles.qualityMetrics}>
              <View style={styles.qualityMetric}>
                <Text style={[styles.qualityScore, { color: getQualityColor(scan.imageQuality.score) }]}>
                  {scan.imageQuality.score}
                </Text>
                <Text style={[styles.qualityLabel, { color: theme.colors.textSecondary }]}>Score</Text>
              </View>
              <View style={[styles.qualityBar, { backgroundColor: theme.colors.surface }]}>
                <View
                  style={[
                    styles.qualityBarFill,
                    {
                      width: `${scan.imageQuality.score}%`,
                      backgroundColor: getQualityColor(scan.imageQuality.score)
                    }
                  ]}
                />
              </View>
            </View>
          </View>
        )}
      </View>

      <View style={styles.problemsContainer}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Problem Details</Text>
        {safeProblems.map((problem, index) => (
          <View
            key={index}
            style={[
              styles.problemCard,
              { backgroundColor: theme.colors.card },
              problem.isCorrect ? { borderLeftColor: theme.colors.success } : { borderLeftColor: theme.colors.error },
            ]}
          >
            <View style={styles.problemHeader}>
              <View style={styles.problemHeaderLeft}>
                <View style={[styles.problemNumber, { backgroundColor: theme.colors.iconBackground }]}>
                  <Text style={[styles.problemNumberText, { color: theme.colors.textSecondary }]}>#{index + 1}</Text>
                </View>
                {problem.problemType && (
                  <View style={[styles.typeBadge, { backgroundColor: getProblemTypeColor(problem.problemType) + '20' }]}>
                    {getProblemTypeIcon(problem.problemType)}
                    <Text style={[styles.typeBadgeText, { color: getProblemTypeColor(problem.problemType) }]}>
                      {getProblemTypeLabel(problem.problemType)}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.problemHeaderRight}>
                {problem.confidence !== undefined && (
                  <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(problem.confidence) + '20' }]}>
                    <Info size={12} color={getConfidenceColor(problem.confidence)} />
                    <Text style={[styles.confidenceText, { color: getConfidenceColor(problem.confidence) }]}>
                      {problem.confidence}%
                    </Text>
                  </View>
                )}
                {problem.isCorrect ? (
                  <CheckCircle size={24} color={theme.colors.success} />
                ) : (
                  <XCircle size={24} color={theme.colors.error} />
                )}
              </View>
            </View>
            
            <Text style={[styles.problemText, { color: theme.colors.text }]}>{problem.problemText}</Text>
            
            {problem.userAnswer && (
              <View style={styles.answerRow}>
                <Text style={[styles.answerLabel, { color: theme.colors.textSecondary }]}>Your Answer:</Text>
                <Text
                  style={[
                    styles.answerValue,
                    { color: problem.isCorrect ? theme.colors.success : theme.colors.error },
                  ]}
                >
                  {problem.userAnswer}
                </Text>
              </View>
            )}
            
            {!problem.isCorrect && problem.correctAnswer && (
              <View style={styles.answerRow}>
                <Text style={[styles.answerLabel, { color: theme.colors.textSecondary }]}>Correct Answer:</Text>
                <Text style={[styles.answerValue, { color: theme.colors.success }]}>
                  {problem.correctAnswer}
                </Text>
              </View>
            )}
            
            {Array.isArray(problem.qualityIssues) && problem.qualityIssues.length > 0 && (
              <View style={[styles.qualityIssuesContainer, { backgroundColor: theme.isDark ? "#78350F" : "#FEF3C7" }]}>
                <View style={styles.qualityIssuesHeader}>
                  <AlertTriangle size={14} color={theme.isDark ? "#FCD34D" : "#D97706"} />
                  <Text style={[styles.qualityIssuesTitle, { color: theme.isDark ? "#FCD34D" : "#D97706" }]}>Quality Notes:</Text>
                </View>
                {problem.qualityIssues.map((issue, issueIndex) => (
                  <Text key={issueIndex} style={[styles.qualityIssueText, { color: theme.isDark ? "#FDE68A" : "#92400E" }]}>
                    • {issue}
                  </Text>
                ))}
              </View>
            )}

            {problem.explanation && (
              <View style={[styles.explanationContainer, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.explanationTitle, { color: theme.colors.text }]}>Explanation:</Text>
                <Text style={[styles.explanationText, { color: theme.colors.textSecondary }]}>
                  {problem.explanation}
                </Text>
              </View>
            )}

            {(() => {
              const steps = Array.isArray(problem.steps) ? problem.steps : [];
              if (steps.length === 0) return null;
              return (
                <View style={[styles.stepsContainer, { backgroundColor: theme.isDark ? theme.colors.surface : "#EFF6FF" }]}>
                  <Text style={[styles.stepsTitle, { color: theme.isDark ? theme.colors.primary : "#1E40AF" }]}>Step-by-step solution:</Text>
                  {steps.map((step, stepIndex) => (
                    <View key={stepIndex} style={styles.stepItem}>
                      <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
                        <Text style={[styles.stepNumberText, { color: "#fff" }]}>{stepIndex + 1}</Text>
                      </View>
                      <Text style={[styles.stepText, { color: theme.isDark ? theme.colors.text : "#1E40AF" }]}>{String(step)}</Text>
                    </View>
                  ))}
                </View>
              );
            })()}
          </View>
        ))}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={[styles.shareButton, { backgroundColor: theme.colors.primaryLight }]} onPress={handleShare}>
          <Share2 size={20} color={theme.colors.primary} />
          <Text style={[styles.shareButtonText, { color: theme.colors.primary }]}>Share Results</Text>
        </TouchableOpacity>
        
        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={handleHome}
          >
            <Home size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.secondaryButtonText, { color: theme.colors.textSecondary }]}>Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleNewScan}
          >
            <Camera size={20} color="#fff" />
            <Text style={[styles.primaryButtonText, { color: "#fff" }]}>New Scan</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  problemsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },
  problemCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  problemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  problemHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  problemNumber: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  problemNumberText: {
    fontSize: 12,
    fontWeight: "600",
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  problemText: {
    fontSize: 16,
    marginBottom: 12,
    fontWeight: "500",
  },
  answerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  answerLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  answerValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  explanationContainer: {
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  explanationTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  explanationText: {
    fontSize: 13,
    lineHeight: 20,
  },
  stepsContainer: {
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  stepsTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: "600",
  },
  stepText: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
    paddingTop: 2,
  },
  actionButtons: {
    padding: 16,
    paddingBottom: 32,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  navigationButtons: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
  },
  homeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  qualityWarning: {
    flexDirection: "row",
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    gap: 12,
    alignItems: "flex-start",
  },
  qualityWarningContent: {
    flex: 1,
  },
  qualityWarningTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  qualityWarningText: {
    fontSize: 12,
    lineHeight: 18,
  },
  qualitySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  qualityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  qualityTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  qualityMetrics: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  qualityMetric: {
    alignItems: "center",
  },
  qualityScore: {
    fontSize: 24,
    fontWeight: "bold",
  },
  qualityLabel: {
    fontSize: 10,
  },
  qualityBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  qualityBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  problemHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  confidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: "600",
  },
  qualityIssuesContainer: {
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  qualityIssuesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  qualityIssuesTitle: {
    fontSize: 11,
    fontWeight: "600",
  },
  qualityIssueText: {
    fontSize: 11,
    lineHeight: 16,
    marginLeft: 20,
  },
});
