"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const translations = {
  en: "Terms and Conditions",
  es: "Términos y Condiciones",
  pt: "Termos e Condições",
  fr: "Termes et Conditions",
  de: "Nutzungsbedingungen",
  it: "Termini e Condizioni",
  ru: "Условия и положения",
};

type Language = keyof typeof translations;

export function Footer() {
  const [year, setYear] = useState('');
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    setYear(new Date().getFullYear().toString());
    
    if (typeof window !== "undefined") {
      const browserLang = navigator.language.split('-')[0] as Language;
      if (translations[browserLang]) {
        setLang(browserLang);
      }
    }
  }, []);

  return (
    <footer className="py-6 md:px-8 md:py-0 border-t bg-background">
      <div className="container flex flex-col items-center justify-center gap-4 md:h-24 md:flex-row md:justify-between">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          {year && `© ${year} GroupHub. All Rights Reserved.`}
        </p>
        <nav className="flex gap-4 sm:gap-6">
          <Link
            href="/terms"
            className="text-sm font-medium text-muted-foreground hover:text-primary"
          >
            {translations[lang] || translations['en']}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
