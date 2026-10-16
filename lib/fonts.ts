import { JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";

/* -----------------------------------------------------------------------------------------------
 * Google Fonts
 * -----------------------------------------------------------------------------------------------*/

export const fontMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

/* -----------------------------------------------------------------------------------------------
 * Local Fonts
 * -----------------------------------------------------------------------------------------------*/

export const fontHandwriting = localFont({
  src: "../public/fonts/Virgil.woff2",
  variable: "--font-handwriting",
});

// ...
