export const metadata = {
  metadataBase: new URL('https://factcheckai.vercel.app'),
  title: "Fact Check AI | Powered by Google Gemini",
  description:
    "A powerful fact-checking tool using Google Gemini AI to verify information from the web",
  keywords: "fact-check, AI, Google Gemini, verification, truth, fact checker, fake news detector",
  authors: [{ name: 'FactCheck AI Team' }],
  creator: 'FactCheck AI',
  publisher: 'FactCheck AI',
  openGraph: {
    title: 'Fact Check AI - Powered by Google Gemini',
    description: 'Verify facts with the power of artificial intelligence',
    url: 'https://factcheckai.vercel.app',
    siteName: 'Fact Check AI',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Fact Check AI Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fact Check AI - Powered by Google Gemini',
    description: 'Verify facts with the power of artificial intelligence',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};
