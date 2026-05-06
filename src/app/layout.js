import "./globals.css";

export const metadata = {
  title: "Onbord — Recrutement intelligent",
  description: "Plateforme de qualification automatique des candidatures par IA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
