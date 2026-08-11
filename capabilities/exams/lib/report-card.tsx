import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#101828",
  },
  brand: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#667085",
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    marginBottom: 4,
  },
  muted: {
    color: "#667085",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E4E7EC",
  },
  label: { color: "#667085" },
  value: { fontWeight: "bold" },
});

export type ReportCardProps = {
  instituteName: string;
  studentName: string;
  className: string;
  examTitle: string;
  examDate: string;
  score: number;
  maxMarks: number;
  percentage: number;
  letter: string | null;
  rank: number | null;
  attendancePercent: number | null;
};

export function ReportCardDocument(props: ReportCardProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>Akura</Text>
        <Text style={styles.title}>Report card</Text>
        <Text style={styles.muted}>{props.instituteName}</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Student</Text>
          <Text style={styles.value}>{props.studentName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Class</Text>
          <Text style={styles.value}>{props.className}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Exam</Text>
          <Text style={styles.value}>{props.examTitle}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{props.examDate}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Score</Text>
          <Text style={styles.value}>
            {props.score} / {props.maxMarks} ({props.percentage}%)
          </Text>
        </View>
        {props.letter ? (
          <View style={styles.row}>
            <Text style={styles.label}>Grade</Text>
            <Text style={styles.value}>{props.letter}</Text>
          </View>
        ) : null}
        {props.rank != null ? (
          <View style={styles.row}>
            <Text style={styles.label}>Class rank</Text>
            <Text style={styles.value}>{props.rank}</Text>
          </View>
        ) : null}
        {props.attendancePercent != null ? (
          <View style={styles.row}>
            <Text style={styles.label}>Attendance</Text>
            <Text style={styles.value}>{props.attendancePercent}%</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
