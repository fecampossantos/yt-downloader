import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'YT MP3 Downloader',
  description: 'Download YouTube videos as MP3',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
