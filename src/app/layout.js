import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});


export const metadata = {
  title: "Onbord — Recrutement intelligent",
  description: "Plateforme de qualification automatique des candidatures par IA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={geist.variable}>
      <body className={geist.className}>{children}</body>
    </html>
  );
}
