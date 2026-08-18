import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SKYLD Word Vault",
  description: "Premium AI-powered communication learning platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
   <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-full flex flex-col font-sans antialiased text-foreground bg-background">
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
