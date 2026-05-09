import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export async function generateMetadata(): Promise<Metadata> {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  return {
    title: 'Snap Tool',
    description: 'Capture and annotate screenshots with ease.',
    other: {
      'fc:miniapp': JSON.stringify({
        version: 'next',
        imageUrl: `${appUrl}/og-image.png`,
        button: {
          title: 'Launch Snap Tool',
          action: {
            type: 'launch_miniapp',
            name: 'Snap Tool',
            url: appUrl,
            splashImageUrl: `${appUrl}/splash.png`,
            splashBackgroundColor: '#000000',
          },
        },
      }),
    },
  };
}

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body suppressHydrationWarning className="font-sans">{children}</body>
    </html>
  );
}
