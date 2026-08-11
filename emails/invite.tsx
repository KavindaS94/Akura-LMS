import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";

export function InviteEmail(props: {
  instituteName: string;
  role: string;
  acceptUrl: string;
  expiresLabel: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>
        You&apos;re invited to join {props.instituteName} on Akura
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Join {props.instituteName}</Heading>
          <Text style={text}>
            You have been invited as a <strong>{props.role}</strong>. Accept the
            invite before {props.expiresLabel}.
          </Text>
          <Text style={text}>
            <Link href={props.acceptUrl} style={link}>
              Accept invitation
            </Link>
          </Text>
          <Text style={muted}>
            If you did not expect this email, you can ignore it.
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
const link = { color: "#E4761B", fontSize: "15px" };
const muted = { color: "#667085", fontSize: "13px", marginTop: "24px" };
