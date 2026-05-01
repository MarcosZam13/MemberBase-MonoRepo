// ClassWaitlistConfirmedEmail.tsx — Template email para notificar que el miembro subió de waitlist a confirmado

import {
  Html, Head, Body, Container, Section, Text, Hr,
} from "@react-email/components";

interface ClassWaitlistConfirmedEmailProps {
  memberName: string;
  className: string;
  classDate: string;  // Fecha/hora formateada para mostrar al miembro
}

export function ClassWaitlistConfirmedEmail({
  memberName,
  className,
  classDate,
}: ClassWaitlistConfirmedEmailProps): React.ReactNode {
  return (
    <Html lang="es">
      <Head />
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header con acento de marca */}
          <Section style={headerStyle}>
            <Text style={logoStyle}>GymBase</Text>
          </Section>

          <Section style={contentStyle}>
            <Text style={titleStyle}>¡Conseguiste un lugar!</Text>

            <Text style={textStyle}>
              Hola {memberName},
            </Text>

            <Text style={textStyle}>
              Buenas noticias — se liberó un cupo en la clase{" "}
              <strong style={{ color: "#FF5E14" }}>{className}</strong> del{" "}
              <strong style={{ color: "#ffffff" }}>{classDate}</strong>.
            </Text>

            <Text style={textStyle}>
              Tu reserva ha sido <strong style={{ color: "#22C55E" }}>confirmada automáticamente</strong>.
              Recuerda que puedes cancelar hasta 30 minutos antes de que comience la clase.
            </Text>

            <Hr style={hrStyle} />

            <Text style={footerTextStyle}>
              Este mensaje fue enviado automáticamente. Por favor no respondas a este correo.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: "#0A0A0A",
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  margin: "0",
  padding: "20px 0",
};

const containerStyle = {
  maxWidth: "480px",
  margin: "0 auto",
  backgroundColor: "#111111",
  borderRadius: "16px",
  overflow: "hidden" as const,
  border: "1px solid #1E1E1E",
};

const headerStyle = {
  backgroundColor: "#0D0D0D",
  padding: "24px 32px",
  borderBottom: "2px solid #FF5E14",
};

const logoStyle = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#FF5E14",
  margin: "0",
  letterSpacing: "0.04em",
};

const contentStyle = {
  padding: "32px",
};

const titleStyle = {
  fontSize: "22px",
  fontWeight: "700",
  color: "#F5F5F5",
  margin: "0 0 20px 0",
};

const textStyle = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#9A9A9A",
  margin: "0 0 16px 0",
};

const hrStyle = {
  borderColor: "#1E1E1E",
  margin: "24px 0",
};

const footerTextStyle = {
  fontSize: "11px",
  color: "#444444",
  margin: "0",
};
