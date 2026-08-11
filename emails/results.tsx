import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";

export function ResultsEmail(props: {
  instituteName: string;
  guardianName: string;
  studentName: string;
  examTitle: string;
  scoreLabel: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>
        Results published: {props.examTitle} — {props.studentName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{props.instituteName}</Heading>
          <Text style={text}>Hello {props.guardianName},</Text>
          <Text style={text}>
            Results for <strong>{props.examTitle}</strong> are now available for{" "}
            {props.studentName}.
          </Text>
          <Text style={score}>{props.scoreLabel}</Text>
          <Text style={muted}>
            Rank visibility depends on institute settings. Contact the institute
            for a full report card if needed.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#F7F8FB",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
};
const container = {
  backgroundColor: "#ffffff",
  margin: "24px auto",
  padding: "24px",
  maxWidth: "520px",
};
const h1 = { color: "#101828", fontSize: "22px", margin: "0 0 16px" };
const text = { color: "#101828", fontSize: "15px", lineHeight: "1.5" };
const score = {
  color: "#E4761B",
  fontSize: "18px",
  fontWeight: 600,
  margin: "16px 0",
};
const muted = { color: "#667085", fontSize: "13px", marginTop: "24px" };
