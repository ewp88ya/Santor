import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_LOCALE,
  type Locale,
} from "./config.js";

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

const cache = new Map<
  string,
  Record<string, string>
>();

function load(locale: Locale) {
  if (cache.has(locale)) {
    return cache.get(locale)!;
  }

  const file =
    path.join(
      __dirname,
      "locales",
      `${locale}.json`,
    );

  const data = JSON.parse(
    fs.readFileSync(file, "utf8"),
  );

  cache.set(locale, data);

  return data;
}

export function t(
  key: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  const lang = load(locale);

  return (
    lang[key] ??
    load(DEFAULT_LOCALE)[key] ??
    key
  );
}
