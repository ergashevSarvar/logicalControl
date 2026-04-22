import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { resources } from "@/i18n/resources";
import { normalizeLocaleCode } from "@/lib/types";

export const LANGUAGE_STORAGE_KEY = "logical-control.user-language";
const DEFAULT_LANGUAGE = "OZ";

function resolveDocumentLanguage(language: string) {
  switch (language) {
    case "UZ":
      return "uz-Cyrl";
    case "OZ":
      return "uz-Latn";
    case "RU":
      return "ru";
    case "EN":
      return "en";
    default:
      return "uz-Latn";
  }
}

function applyDocumentLanguage(language: string) {
  const documentLanguage = resolveDocumentLanguage(language);
  document.documentElement.lang = documentLanguage;
  document.documentElement.dataset.script =
    documentLanguage === "uz-Cyrl" || documentLanguage === "ru" ? "cyrillic" : "latin";
}

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: normalizeLocaleCode(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: ["UZ", "OZ", "RU", "EN"],
    interpolation: {
      escapeValue: false,
    },
  });

applyDocumentLanguage(i18n.language);
i18n.on("languageChanged", (language) => {
  const normalized = normalizeLocaleCode(language);
  if (normalized !== language) {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
    void i18n.changeLanguage(normalized);
    return;
  }

  applyDocumentLanguage(normalized);
});

export default i18n;

