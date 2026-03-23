// layout.tsx — Layout raíz de GymBase, hereda providers de @memberbase/core
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GymBase',
  description: 'Plataforma de gestión para gimnasios',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
