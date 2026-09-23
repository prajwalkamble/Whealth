import {
  Geist,
  Hedvig_Letters_Serif,
  Inter,
  Kumbh_Sans,
  Montserrat,
  Outfit,
  Overpass_Mono,
  Plus_Jakarta_Sans,
  Poppins,
  PT_Sans,
  Roboto,
} from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { PreferencesProvider } from "@/components/preferences-provider";
import PreferencesScript from "@/components/preferences-script";

// Every family the Font and Display Font settings offer, each exposed as a
// CSS variable that globals.css picks through --font-body / --font-display.
// Declaring a family does not download it: browsers fetch a webfont only when
// something on the page is actually set in it.
//
// Each call is written out in full on purpose: next/font reads these options
// at build time, so they have to be literals -- a shared object spread into
// them fails to compile.
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const roboto = Roboto({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
});
const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});
const montserrat = Montserrat({ subsets: ["latin"], display: "swap", variable: "--font-montserrat" });
const ptSans = PT_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
  variable: "--font-pt-sans",
});
const overpassMono = Overpass_Mono({ subsets: ["latin"], display: "swap", variable: "--font-overpass-mono" });
const geist = Geist({ subsets: ["latin"], display: "swap", variable: "--font-geist" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", variable: "--font-jakarta" });
const outfit = Outfit({ subsets: ["latin"], display: "swap", variable: "--font-outfit" });
const kumbh = Kumbh_Sans({ subsets: ["latin"], display: "swap", variable: "--font-kumbh" });
const hedvig = Hedvig_Letters_Serif({
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
  variable: "--font-hedvig",
});

const fontVariables = [
  inter,
  roboto,
  poppins,
  montserrat,
  ptSans,
  overpassMono,
  geist,
  jakarta,
  outfit,
  kumbh,
  hedvig,
]
  .map((font) => font.variable)
  .join(" ");

export const metadata = {
  title: "Whealth",
  description: "Innovate Your Financial Health with Whealth",
};

// Providers only. The header and footer belong to (marketing); the signed-in
// app has its own shell in (main).
export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      {/* suppressHydrationWarning: next-themes sets the theme class on <html>
          before React hydrates, which the server cannot predict. */}
      {/* The font variables belong on <html>: --font-body and --font-display
          are composed on :root, and a var() inside a custom property resolves
          where it is declared. On <body> the families were invisible to that
          declaration, so no font ever applied. */}
      <html lang="en" className={fontVariables} suppressHydrationWarning>
        <head>
          <PreferencesScript />
        </head>
        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <PreferencesProvider>
              {children}
              <Toaster richColors />
            </PreferencesProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
