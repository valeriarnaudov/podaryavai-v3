import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import { en } from "./locales/en/translation";
import { bg } from "./locales/bg/translation";

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en,
            bg,
        },
        fallbackLng: "en",
        interpolation: {
            escapeValue: false, // React is already safe from XSS
        },
    });

export default i18n;
