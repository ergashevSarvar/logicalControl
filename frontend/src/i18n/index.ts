import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { resources } from "@/i18n/resources";

export const LANGUAGE_STORAGE_KEY = "logical-control.user-language";
const DEFAULT_LANGUAGE = "uzLatn";

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: window.localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: ["uzCyrl", "uzLatn", "ru", "en"],
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
