import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export function AbsenceEmail(props: {
  instituteName: string;
  guardianName: string;
  studentNames: string[];
  className?: string | null;
  sessionDateLabel: string;
}) {
  const list = props.studentNames.join(", ");
  return (
    <Html>
      <Head />
      <Preview>
        Absence notice from {props.instituteName}: {list}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{props.instituteName}</Heading>
          <Text style={text}>Hello {props.guardianName},</Text>
          <Text style={text}>
            {props.studentNames.length === 1
              ? `${props.studentNames[0]} was marked absent`
              : `The following students were marked absent`}
            {props.className ? ` in ${props.className}` : ""} on{" "}
            {props.sessionDateLabel}.
          </Text>
          {props.studentNames.length > 1 ? (
            <Section>
              {props.studentNames.map((name) => (
                <Text key={name} style={bullet}>
                  • {name}
                </Text>
              ))}
            </Section>
          ) : null}
          <Text style={muted}>
            This message was sent automatically. Please contact the institute if
            you have questions.
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
const bullet = { color: "#101828", fontSize: "15px", margin: "4px 0" };
const muted = { color: "#667085", fontSize: "13px", marginTop: "24px" };
