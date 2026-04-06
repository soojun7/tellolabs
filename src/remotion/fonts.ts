import { loadFont as loadNotoSans } from "@remotion/google-fonts/NotoSansKR";
import { loadFont as loadNotoSerif } from "@remotion/google-fonts/NotoSerifKR";

const { fontFamily: sansFamily } = loadNotoSans("normal", {
  weights: ["400", "500", "700", "900"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});

const { fontFamily: serifFamily } = loadNotoSerif("normal", {
  weights: ["300", "400", "700"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});

const SONGMYEONG_URL =
  "https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2110@1.0/JSongMyung-Regular-KO.woff2";

const LINESEED_JP_FAMILY = "LINESeedJP";

let customFontsLoaded = false;

function loadCustomFonts() {
  if (customFontsLoaded) return;
  customFontsLoaded = true;

  const style = document.createElement("style");
  style.textContent = `
    @font-face {
      font-family: 'Songmyeong';
      src: url('${SONGMYEONG_URL}') format('woff2');
      font-weight: normal;
      font-display: swap;
    }
    @font-face {
      font-family: '${LINESEED_JP_FAMILY}';
      src: url('/fonts/LINESeedJP_OTF_Th.woff2') format('woff2');
      font-weight: 100;
      font-display: swap;
    }
    @font-face {
      font-family: '${LINESEED_JP_FAMILY}';
      src: url('/fonts/LINESeedJP_OTF_Rg.woff2') format('woff2');
      font-weight: 400;
      font-display: swap;
    }
    @font-face {
      font-family: '${LINESEED_JP_FAMILY}';
      src: url('/fonts/LINESeedJP_OTF_Bd.woff2') format('woff2');
      font-weight: 700;
      font-display: swap;
    }
    @font-face {
      font-family: '${LINESEED_JP_FAMILY}';
      src: url('/fonts/LINESeedJP_OTF_Eb.woff2') format('woff2');
      font-weight: 900;
      font-display: swap;
    }
  `;
  document.head.appendChild(style);
}

if (typeof document !== "undefined") {
  loadCustomFonts();
}

export const FONT_SANS = sansFamily;
export const FONT_SERIF = serifFamily;
export const FONT_LINESEED_JP = LINESEED_JP_FAMILY;
export const FONT_SONGMYEONG = "Songmyeong";

export const AVAILABLE_FONTS = [
  { id: "songmyeong", label: "송명", family: "Songmyeong", lang: "ko" },
  { id: "noto-sans", label: "노토 산스", family: sansFamily, lang: "ko" },
  { id: "noto-serif", label: "노토 세리프", family: serifFamily, lang: "ko" },
  { id: "lineseed-jp", label: "LINE Seed", family: LINESEED_JP_FAMILY, lang: "ja" },
] as const;

export type FontId = (typeof AVAILABLE_FONTS)[number]["id"];

export const DEFAULT_FONT: FontId = "songmyeong";
export const DEFAULT_FONT_JA: FontId = "lineseed-jp";

export function getFontFamily(fontId?: string, language?: string): string {
  if (fontId) {
    const found = AVAILABLE_FONTS.find((f) => f.id === fontId);
    if (found) return found.family;
  }
  if (language === "ja") return LINESEED_JP_FAMILY;
  return FONT_SONGMYEONG;
}

export function getFontsForLanguage(language?: string) {
  if (language === "ja") {
    return AVAILABLE_FONTS.filter((f) => f.lang === "ja");
  }
  return AVAILABLE_FONTS.filter((f) => f.lang === "ko");
}
