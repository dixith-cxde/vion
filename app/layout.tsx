import type { Metadata } from "next";
import { Poppins, EB_Garamond } from "next/font/google";
import "./globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

import { cn } from "@/lib/utils";
import { QueryProvider } from "./_components/provider/query-provider";
import { SocketProvider } from "./_components/provider/socket-provider";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const ebGaramondHeading = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VION",
  description: "Unified Developer Workspace Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(poppins.variable, ebGaramondHeading.variable)}>
      <body className="font-sans antialiased">
        <ClerkProvider>
          <QueryProvider>
            <SocketProvider />
            <TooltipProvider>{children}</TooltipProvider>
          </QueryProvider>
        </ClerkProvider>

        <Toaster richColors position="bottom-right" expand closeButton />
      </body>
    </html>
  );
}
