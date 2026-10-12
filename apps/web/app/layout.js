import {
  Caveat,
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
// Only used for the handwritten aside on the pricing page. Declaring a family
// does not download it -- the browser fetches a webfont only when something is
// actually set in it.
const caveat = Caveat({ subsets: ["latin"], display: "swap", variable: "--font-caveat" });
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
  caveat,
]
  .map((font) => font.variable)
  .join(" ");

export const metadata = {
  title: "WHealthOS",
  description: "Understand your money and make smarter decisions with WHealthOS.",
};

// Providers only. The header and footer belong to (marketing); the signed-in
// app has its own shell in (main).
//
// No ClerkProvider here. It used to wrap everything, which meant the landing
// page, the calculators and the legal pages all loaded Clerk's JavaScript,
// set its cookies and wrote to its localStorage for visitors with nothing to
// sign in to. It now lives in the layouts that actually need it: (auth) and
// (main) always, and (marketing) only for someone already signed in. The
// demo mounts none at all.
export default function RootLayout({ children }) {
  return (
    <>
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
    </>
  );
}
