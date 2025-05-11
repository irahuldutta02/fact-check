import "./globals.css";
import { metadata as siteMetadata } from "./metadata";

export const metadata = siteMetadata;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-primary-gray">
        {children}
        <footer className="py-6 text-center text-sm text-gray-500">
          <p suppressHydrationWarning>
            © 2025 Fact Check AI | Powered by Google Gemini
          </p>
        </footer>
      </body>
    </html>
  );
}
