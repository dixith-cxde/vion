import type { Metadata } from "next";
import { Poppins, Inter, Figtree, EB_Garamond } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { WorkspaceProvider } from "./_components/context/workspace-context-provider";
import { AppSidebarShell } from "./_components/sidebar/app-sidebar-shell";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { SocketProvider } from "./_components/provider/socket-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

const ebGaramondHeading = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-heading",
});

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VION",
  description: "Unified Developer Workspace Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn("font-sans", figtree.variable, ebGaramondHeading.variable)}
    >
      <body className={`${poppins.variable} ${poppins.className} antialiased`}>
        <ClerkProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ClerkProvider>
        <Toaster />
      </body>
    </html>
  );
}
