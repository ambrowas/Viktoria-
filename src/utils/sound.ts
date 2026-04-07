// src/utils/sound.ts

// ✅ Universal path resolver for all environments (web, Electron, dev, build)
function resolvePath(filename: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  return `${base}sounds/${filename}`;
}

type SoundHandle = {
  play: () => void;
  pause: () => void;
  stop: () => void;
  fadeOut: (duration?: number) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (v: number) => void;
  setLoop: (loop: boolean) => void;
  dispose: () => void;
};

// 🎧 Sound creation wrapper
function createSound(filename: string, loop = false, volume = 0.5): SoundHandle {
  let audio: HTMLAudioElement | null = null;

  const ensure = () => {
    if (!audio) {
      audio = new Audio(resolvePath(filename));
      audio.loop = loop;
      audio.volume = volume;
      audio.addEventListener("error", () => {
        console.warn(`⚠️ Failed to load sound: ${resolvePath(filename)}`);
      });
    }
  };

  return {
    play: () => {
      ensure();
      if (!audio) return;
      audio.currentTime = 0;
      audio
        .play()
        .catch(() =>
          console.warn(`⚠️ Could not play sound (user gesture required?): ${filename}`)
        );
    },
    pause: () => {
      if (audio) audio.pause();
    },
    stop: () => {
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
    },
    fadeOut: (duration = 1000) => {
      if (!audio) return;
      const startVolume = audio.volume;
      const step = startVolume / (duration / 50);
      const interval = setInterval(() => {
        if (!audio) {
          clearInterval(interval);
          return;
        }
        if (audio.volume > step) {
          audio.volume -= step;
        } else {
          audio.volume = 0;
          audio.pause();
          audio.volume = startVolume; // Reset for next play
          clearInterval(interval);
        }
      }, 50);
    },
    setPlaybackRate: (rate: number) => {
      if (audio) audio.playbackRate = rate;
    },
    setVolume: (v: number) => {
      if (audio) audio.volume = v;
    },
    setLoop: (loop: boolean) => {
      if (audio) audio.loop = loop;
    },
    dispose: () => {
      if (!audio) return;
      audio.pause();
      audio.src = "";
      audio.load();
      audio = null;
    },
  };
}

/* ---------------------------
 * 🎮 Legacy + Core Sounds
 * --------------------------- */
export const flipSound = createSound("flip.mp3");
export const correctSound = createSound("correct.mp3");
export const wrongSound = createSound("wrong.mp3");
export const winSound = createSound("win.mp3");
export const loseSound = createSound("lose.mp3");
export const timerSound = createSound("timer.mp3", true);
export const victorySound = createSound("victory.mp3", false, 0.9);
export const transitionSound = createSound("transition.mp3");
export const plotagonSound = createSound("plotagon.mp3");
export const countdownSound = createSound("drumming.wav", true, 0.7);
export const correctoSound = createSound("correcto.mp3", false, 0.95);
export const strikeSound = createSound("strike.mp3", false, 0.95);
export const roundWinSound = createSound("dance.mp3", false, 0.85);
export const familyfeud = createSound("familyfeud.wav", false, 0.85);
export const buzzerSound = createSound("buzzer.mp3", false, 0.9);
export const failureSound = createSound("failure.mp3", false, 0.9);
export const magicalSound = createSound("magical.mp3", false, 0.9);
export const violinSound = createSound("violin.mp3", false, 0.9);

/* ---------------------------
 * 💎 Lottery Experience Additions
 * --------------------------- */

// 🎡 Subtle ball spinning sound (like Powerball machine)
export const spinSound = createSound("spinnersound.mp3", false, 0.85);

// 🔊 Dramatic reveal sounds for progressive tension
export const reveal1Sound = createSound("reveal1.mp3", false, 0.4);
export const reveal2Sound = createSound("reveal2.mp3", false, 0.55);
export const reveal3Sound = createSound("reveal3.mp3", false, 0.7);
export const reveal4Sound = createSound("reveal4.mp3", false, 0.85);
export const reveal5Sound = createSound("reveal5.mp3", false, 1.0);

// 💥 Jackpot Fanfare (big brass win)
export const jackpotSound = createSound("jackpot.mp3", false, 1.0);

// 🥁 Short suspense drum roll before results
export const suspenseSound = createSound("suspense.mp3", false, 0.75);

/* ---------------------------
 * 🧰 Export Helper
 * --------------------------- */
export { createSound };

// Convenience: stop all known sounds (used when leaving a game)
export const stopAllSounds = () => {
  [
    flipSound,
    correctSound,
    wrongSound,
    winSound,
    loseSound,
    timerSound,
    victorySound,
    transitionSound,
    plotagonSound,
    countdownSound,
    correctoSound,
    strikeSound,
    roundWinSound,
    familyfeud,
    buzzerSound,
    failureSound,
    magicalSound,
    violinSound,
    spinSound,
    reveal1Sound,
    reveal2Sound,
    reveal3Sound,
    reveal4Sound,
    reveal5Sound,
    jackpotSound,
    suspenseSound,
  ].forEach((s) => s.stop());
};
