import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Strange Grounds',
  description: 'Satellite-aware backcountry conditions intelligence',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
