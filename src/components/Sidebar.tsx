import React, { useState } from "react";
import type { Screen } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import {
  CrownIcon,
  HomeIcon,
  LibraryIcon,
  PlusIcon,
  TvIcon,
  PlayIcon,
} from "@components/icons/IconDefs";
import Lottie from "lottie-react";
import { motion } from "framer-motion";
import puzzleAnimation from "@/assets/animations/puzzle.json";

interface SidebarProps {
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full px-4 py-3 transition-colors duration-200 rounded-lg ${isActive
        ? "bg-brand-primary text-black shadow-lg"
        : "text-text-secondary hover:bg-base-300 hover:text-white"
      }`}
  >
    {icon}
    <span className="ml-4 font-medium">{label}</span>
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ currentScreen, setScreen }) => {
  const { lang } = useLanguage();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const labels = {
    dashboard: lang === "es" ? "Panel Principal" : "Dashboard",
    library: lang === "es" ? "Colección" : "Game Library",
    creator: lang === "es" ? "Creador de Juegos" : "Game Creator",
    shows: lang === "es" ? "Gestor de Shows" : "Show Manager",
    play: lang === "es" ? "Jugar" : "Play Show",
  };

  // Handle 3D tilt effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / 15;
    const y = (e.clientY - rect.top - rect.height / 2) / 15;
    setTilt({ x, y });
  };

  const resetTilt = () => setTilt({ x: 0, y: 0 });

  return (
    <aside className="w-64 h-full bg-base-200 text-text-primary flex flex-col p-4 border-r border-base-300">
      {/* Header */}
      <div className="flex items-center mb-8 px-2">
        <CrownIcon className="w-8 h-8 text-brand-accent" />
        <h1 className="text-2xl font-bold ml-2">Viktoria</h1>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col space-y-2 relative z-10">
        <NavItem
          icon={<HomeIcon className="w-6 h-6" />}
          label={labels.dashboard}
          isActive={currentScreen === "dashboard"}
          onClick={() => setScreen("dashboard")}
        />
        <NavItem
          icon={<LibraryIcon className="w-6 h-6" />}
          label={labels.library}
          isActive={currentScreen === "library"}
          onClick={() => setScreen("library")}
        />
        <NavItem
          icon={<PlusIcon className="w-6 h-6" />}
          label={labels.creator}
          isActive={currentScreen === "creator"}
          onClick={() => setScreen("creator")}
        />
        <NavItem
          icon={<TvIcon className="w-6 h-6" />}
          label={labels.shows}
          isActive={currentScreen === "shows"}
          onClick={() => setScreen("shows")}
        />
        <NavItem
          icon={<PlayIcon className="w-6 h-6" />}
          label={labels.play}
          isActive={currentScreen === "play"}
          onClick={() => setScreen("play")}
        />
      </nav>

      <div className="flex-grow" />

      {/* Floating Puzzle Animation with Tilt + Glow (Larger Version) */}
      <div
        className="flex justify-center mt-6 mb-6 relative cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          resetTilt();
          setIsHovered(false);
        }}
        onMouseEnter={() => setIsHovered(true)}
      >
        <motion.div
          style={{
            rotateX: tilt.y,
            rotateY: -tilt.x,
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: 1,
            y: [0, -10, 0], // slightly larger float distance for bigger size
          }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
          className="w-[240px] opacity-90 [transform-style:preserve-3d]"
        >
          <motion.div
            className="absolute inset-0 rounded-full blur-2xl"
            animate={{
              backgroundColor: isHovered
                ? "rgba(255,255,255,0.25)"
                : "rgba(0,0,0,0.25)",
              scale: isHovered ? 1.3 : 1,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          <Lottie
            animationData={puzzleAnimation}
            loop
            autoplay
            style={{
              filter: isHovered
                ? "drop-shadow(0 0 14px rgba(255,255,255,0.5))"
                : "drop-shadow(0 0 10px rgba(0,0,0,0.25))",
            }}
          />
        </motion.div>
      </div>
      {/* Footer */}
      <div className="text-center text-xs text-slate-500">
        {lang === "es"
          ? "Desarrollado por INICIATIVAS ELEBI"
          : "Powered by INICIATIVAS ELEBI"}
      </div>
    </aside>
  );
};

export default Sidebar;
