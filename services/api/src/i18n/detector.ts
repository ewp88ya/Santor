import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "./config.js";

export function detectLocale(
  language?: string,
): Locale {
  if (!language) {
    return DEFAULT_LOCALE;
  }

  const locale =
    language
      .split(",")[0]
      .split("-")[0]
      .toLowerCase();

  if (
    SUPPORTED_LOCALES.includes(
      locale as Locale,
    )
  ) {
    return locale as Locale;
  }

  return DEFAULT_LOCALE;
}
