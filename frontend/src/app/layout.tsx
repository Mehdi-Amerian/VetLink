import './globals.css';
import type { Metadata } from 'next';
import AuthProvider from '@/providers/auth-provider';
import { Nunito_Sans, Sora } from 'next/font/google';

const sans = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-sans-custom',
  weight: ['400', '500', '600', '700'],
});

const display = Sora({
  subsets: ['latin'],
  variable: '--font-display-custom',
  weight: ['600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'VetLink',
  description: 'VetLink Frontend',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable}`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
