import './globals.css';
import type { Metadata } from 'next';
import AuthProvider from '@/providers/auth-provider';

export const metadata: Metadata = {
  title: 'VetLink',
  description: 'VetLink Frontend',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
