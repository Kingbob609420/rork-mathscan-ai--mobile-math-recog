import React from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Trash2, FileText, CheckCircle, XCircle } from "lucide-react-native";
import { router } from "expo-router";
import { useMathScan } from "@/providers/MathScanProvider";
import { useTheme } from "@/providers/ThemeProvider";

export default function HistoryScreen() {
  const { theme } = useTheme();
  const { scans, deleteScan } = useMathScan();

  const handleDelete = (scanId: string) => {
    Alert.alert(
      "Delete Scan",
      "Are you sure you want to delete this scan?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteScan(scanId),
        },
      ]
    );
  };

  const renderScanItem = ({ item }: { item: any }) => {
    const correctCount = item.problems.filter((p: any) => p.isCorrect).length;
    const totalCount = item.problems.length;
    const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

    return (
      <TouchableOpacity
        style={[styles.scanCard, { backgroundColor: theme.colors.card }]}
        onPress={() => router.push(`/results/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.scanHeader}>
          <View style={[styles.scanIcon, { backgroundColor: theme.colors.primaryLight }]}>
            <FileText size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.scanInfo}>
            <Text style={[styles.scanTitle, { color: theme.colors.text }]}>
              {totalCount} Problem{totalCount !== 1 ? "s" : ""}
            </Text>
            <Text style={[styles.scanDate, { color: theme.colors.textSecondary }]}>
              {new Date(item.timestamp).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id)}
          >
            <Trash2 size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={[styles.scanStats, { borderTopColor: theme.colors.borderLight }]}>
          <View style={styles.statItem}>
            <CheckCircle size={16} color={theme.colors.success} />
            <Text style={[styles.statText, { color: theme.colors.text }]}>{correctCount} Correct</Text>
          </View>
          <View style={styles.statItem}>
            <XCircle size={16} color={theme.colors.error} />
            <Text style={[styles.statText, { color: theme.colors.text }]}>
              {totalCount - correctCount} Incorrect
            </Text>
          </View>
          <View style={[styles.accuracyBadge, { backgroundColor: theme.colors.primaryLight }]}>
            <Text style={[styles.accuracyText, { color: theme.colors.primary }]}>{Math.round(accuracy)}%</Text>
          </View>
        </View>

        {item.problems.length > 0 && (
          <View style={[styles.problemPreview, { borderTopColor: theme.colors.borderLight }]}>
            <Text style={[styles.previewTitle, { color: theme.colors.textSecondary }]}>Problems:</Text>
            <Text style={[styles.previewText, { color: theme.colors.text }]} numberOfLines={2}>
              {item.problems.map((p: any) => p.problemText).join(", ")}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (scans.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.colors.iconBackground }]}>
          <FileText size={48} color={theme.colors.textSecondary} />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Scans Yet</Text>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          Start scanning math problems to see them here
        </Text>
        <TouchableOpacity
          style={[styles.scanButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => router.push("/camera")}
        >
          <Text style={[styles.scanButtonText, { color: "#fff" }]}>Scan Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={scans}
        renderItem={renderScanItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  scanCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scanHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  scanIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  scanInfo: {
    flex: 1,
  },
  scanTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  scanDate: {
    fontSize: 13,
  },
  deleteButton: {
    padding: 8,
  },
  scanStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 13,
  },
  accuracyBadge: {
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  accuracyText: {
    fontSize: 13,
    fontWeight: "600",
  },
  problemPreview: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  previewText: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
  },
  scanButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});