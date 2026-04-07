import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "es";

interface LanguageContextType {
  lang: Language;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>("en");

  // ✅ Fetch saved language from main process
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        if (!window.electronAPI) {
          const storedLang = localStorage.getItem("viktoria_lang");
          if (storedLang === "en" || storedLang === "es") {
            setLang(storedLang);
          }
          return;
        }
        const storedLang = await window.electronAPI.invoke("get-language");
        if (storedLang === "en" || storedLang === "es") {
          setLang(storedLang);
        }
      } catch (error) {
        console.error("Failed to load language preference:", error);
      }
    };
    loadLanguage();
  }, []);

  // ✅ Save changes to main process
  const saveLanguage = async (newLang: Language) => {
      try {
        if (!window.electronAPI) {
          localStorage.setItem("viktoria_lang", newLang);
          setLang(newLang);
          return;
        }
        await window.electronAPI.invoke("set-language", newLang);
        setLang(newLang);
      } catch (error) {
        console.error("Failed to save language preference:", error);
      }
  };

  const toggleLanguage = () => {
    const nextLang = lang === "en" ? "es" : "en";
    saveLanguage(nextLang);
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, setLanguage: saveLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
