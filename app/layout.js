import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Whealth",
  description: "Innovate Your Financial Health with Whealth",
};

export default function RootLayout({ children }) {
  const currentYear = new Date().getFullYear();

  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.className}`}>
          {/* header */}
          <Header />

          <main className="min-h-screen">{children}</main>
          <Toaster richColors />
          {/* footer */}
          <footer className="bg-blue-50 py-12">
            <div className="container mx-auto px-4 text-center text-gray-600">
              <p>&copy; {currentYear}, <strong>Whealth.</strong> All rights reserved.</p>
              <p>Developed by <strong><a href="https://prajwalpk.vercel.app" target="_blank">Prajwal Kamble.</a></strong></p>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
