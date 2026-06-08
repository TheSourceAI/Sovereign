import './globals.css';
import { Fraunces, Outfit, JetBrains_Mono } from 'next/font/google';

// Distinctive pairing: Fraunces (characterful display serif) + Outfit (clean body)
const display = Fraunces({
  subsets: ['latin'],
  weight: ['400', '600', '900'],
  variable: '--font-display',
});
const body = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-body',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

export const metadata = {
  title: 'BRAIN — Command Center',
  description: 'Autonomous business operating system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
