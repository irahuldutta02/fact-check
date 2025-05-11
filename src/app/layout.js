import "./globals.css";

export const metadata = {
  title: "Fast Check AI",
  description: "A fast and reliable way to check your facts",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
