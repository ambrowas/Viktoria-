// src/screens/Dashboard.tsx
import React from "react";
import type { Game, Screen, Show } from "@/types";
import {
  GameIcon,
  LibraryIcon,
  PlusIcon,
  SparklesIcon,
  TvIcon,
} from "@components/icons/IconDefs";
import { useLanguage } from "@/context/LanguageContext";

// ======================================================
// Dashboard Component with Bilingual UI (🇺🇸 / 🇬🇶)
// ======================================================
interface DashboardProps {
  games: Game[];
  shows: Show[];
  setScreen: (screen: Screen) => void;
  startNewGame: () => void;
  isDark: boolean;
  toggleTheme: () => void;
}

const translations = {
  en: {
    welcome: "Welcome to Viktoria!",
    subtitle: "Your personal game show creation suite.",
    stats: {
      totalGames: "Total Games",
      totalShows: "Total Shows",
      totalQuestions: "Total Questions",
      comingSoon: "Coming Soon",
    },
    actions: {
      title: "Quick Actions",
      createGameTitle: "Create a New Game",
      createGameDesc: "Start from scratch or use AI to generate a new quiz.",
      manageShowsTitle: "Manage Your Shows",
      manageShowsDesc: "Combine games and set up teams for your next event.",
    },
  },
  es: {
    welcome: "¡Bienvenido a Viktoria!",
    subtitle: "Tu suite personal para crear concursos.",
    stats: {
      totalGames: "Juegos Totales",
      totalShows: "Programas Totales",
      totalQuestions: "Preguntas Totales",
      comingSoon: "Próximamente",
    },
    actions: {
      title: "Acciones Rápidas",
      createGameTitle: "Crear un Nuevo Juego",
      createGameDesc:
        "Empieza desde cero o usa IA para generar un nuevo cuestionario.",
      manageShowsTitle: "Gestionar tus Programas",
      manageShowsDesc:
        "Combina juegos y organiza equipos para tu próximo evento.",
    },
  },
};

const StatCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
}> = ({ title, value, icon }) => (
  <div className="bg-base-200 p-6 rounded-lg shadow-lg flex items-center space-x-4">
    <div className="bg-base-300 p-3 rounded-full">{icon}</div>
    <div>
      <div className="text-text-secondary text-sm font-medium">{title}</div>
      <div className="text-3xl font-bold text-text-primary">{value}</div>
    </div>
  </div>
);

const ActionButton: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ title, description, icon, onClick }) => (
  <button
    onClick={onClick}
    className="bg-base-200 p-6 rounded-lg shadow-lg text-left w-full hover:bg-base-300 transition-colors duration-200 flex items-start space-x-4"
  >
    <div className="bg-brand-primary p-3 rounded-lg mt-1">{icon}</div>
    <div>
      <h3 className="text-lg font-bold text-text-primary">{title}</h3>
      <div className="text-text-secondary text-sm">{description}</div>
    </div>
  </button>
);

const Dashboard: React.FC<DashboardProps> = ({
  games,
  shows,
  isDark,
  toggleTheme,
  setScreen,
  startNewGame,
}) => {
  // 🌍 Use global language context
  const { lang, toggleLanguage } = useLanguage();
  const t = translations[lang];

  // 📊 Compute total questions dynamically
  const totalQuestions = games.reduce((acc, game) => {
    switch (game.type) {
      case "JEOPARDY":
        return (
          acc +
          (game.categories?.reduce(
            (cAcc, category) => cAcc + (category.questions?.length || 0),
            0
          ) || 0)
        );
      case "FAMILY_FEUD":
        return acc + (game.rounds?.length || 0);
      default:
        return acc;
    }
  }, 0);

  return (
    <div className="p-8 space-y-8">
      {/* ================= HEADER ================= */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-text-primary">{t.welcome}</h1>
          <div className="text-text-secondary mt-2">{t.subtitle}</div>
        </div>

        <div className="flex items-center gap-3">
          {/* 🌐 Language toggle with FlagCDN flags */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 bg-base-200 px-4 py-2 rounded-lg hover:bg-base-300 transition-colors duration-200"
          >
            {lang === "en" ? (
              <>
                <img
                  src="https://flagcdn.com/us.svg"
                  alt="English"
                  className="w-6 h-4 rounded-sm"
                />
                <span className="text-sm font-semibold">English</span>
              </>
            ) : (
              <>
                <img
                  src="https://flagcdn.com/gq.svg"
                  alt="Español (Guinea Ecuatorial)"
                  className="w-6 h-4 rounded-sm"
                />
                <span className="text-sm font-semibold">Español</span>
              </>
            )}
          </button>

          {/* 🌓 Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 bg-base-200 px-3 py-2 rounded-lg hover:bg-base-300 transition-colors duration-200 text-sm font-semibold"
          >
            <span>{isDark ? "🌙" : "☀️"}</span>
            <span>{isDark ? "Dark" : "Light"}</span>
          </button>
        </div>
      </header>

      {/* ================= STATS ================= */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t.stats.totalGames}
          value={games.length}
          icon={<LibraryIcon className="w-8 h-8 text-brand-accent" />}
        />
        <StatCard
          title={t.stats.totalShows}
          value={shows.length}
          icon={<TvIcon className="w-8 h-8 text-brand-accent" />}
        />
        <StatCard
          title={t.stats.totalQuestions}
          value={totalQuestions}
          icon={<GameIcon className="w-8 h-8 text-brand-accent" />}
        />
        <StatCard
          title={t.stats.comingSoon}
          value={0}
          icon={<SparklesIcon className="w-8 h-8 text-brand-accent" />}
        />
      </section>

      {/* ================= QUICK ACTIONS ================= */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-text-primary">
          {t.actions.title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ActionButton
            title={t.actions.createGameTitle}
            description={t.actions.createGameDesc}
            icon={<PlusIcon className="w-6 h-6 text-black" />}
            onClick={startNewGame}
          />
          <ActionButton
            title={t.actions.manageShowsTitle}
            description={t.actions.manageShowsDesc}
            icon={<TvIcon className="w-6 h-6 text-black" />}
            onClick={() => setScreen("shows")}
          />
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="pt-8 border-t border-base-200 opacity-20 text-[10px] font-mono flex justify-between uppercase tracking-widest">
        <span>Viktoria GameShow Studio</span>
        <span>Build Version: v1.0.43</span>
      </footer>
    </div>
  );
};

export default Dashboard;
