import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AI-Powered Interactive Dashboard',
  description: 'AIBID Analytics Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${playfair.variable} ${inter.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false} disableTransitionOnChange>
          <AuthProvider>
            {children}
            <Toaster position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
