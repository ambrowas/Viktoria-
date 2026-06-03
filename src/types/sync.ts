// src/types/sync.ts

export type DeviceRole = 'host' | 'player' | 'viewer' | 'judge';
export type SessionStep = 'lobby' | 'question' | 'reveal' | 'scoreboard' | 'intermission' | string;

export interface Participant {
    id: string;
    name: string;
    teamId: string;
    role: DeviceRole;
    isBuzzed: boolean;
    buzzedAt?: any; // Firestore timestamp
    currentInput?: string;
    latency?: number;
    lastActive: any; // Firestore timestamp
}

export interface LiveSession {
    sessionId: string;
    currentGameId: string | null;
    currentShowId?: string | null;
    currentRoundIndex?: number;
    currentGameIndex?: number;
    currentStep: SessionStep;
    isMusicPlaying?: boolean;
    scores: Record<string, number>;
    teamScores?: Record<string, number>;
    teams?: any[]; // The full team definitions for the show
    fullGameData?: any; // The full game object for web/tablet hosts
    fullShowData?: any; // The full show object for web/tablet hosts
    activeQuestionId?: string | null;
    activeCategoryId?: string | null;
    showAnswer?: boolean;
    isAnswerRevealed?: boolean;
    isBuzzerEnabled: boolean;
    currentBuzzedParticipant: string | null;
    buzzedTeam?: string | null;
    buzzerLockedBy?: string | null;
    hostCommand?: {
        type: string;
        payload: any;
        timestamp?: any;
    } | null;
    roscoAnswers?: Record<string, 'pending' | 'correct' | 'wrong'>;
    currentLetter?: string;
    revealedAnswers?: string[];
    usedQuestionIds?: string[];
    strikes?: number;
    activeTeam?: 'A' | 'B';
    currentTeamIndex?: number;
    hasReboundAttempted?: boolean;
    transitionState?: {
        isActive: boolean;
        label: string;
        timestamp: number;
    } | null;
    feedback?: 'correct' | 'wrong' | null;
    revealAnswerInFeedback?: boolean;
    attemptedTeamIndices?: number[];
    isTimerRunning?: boolean;
    timeLeft?: number;
    cardView?: string;
    smartAzzState?: any;
    eliminatedTeamIds?: string[];
    reserveQuestions?: any[];
    activeTieBreaker?: {
        roundType: string;
        question: any;
        revealed: boolean;
        winnerTeamId: string | null;
        loserTeamId: string | null;
    } | null;
    observations?: any[];
    lastAction: string;
    updatedAt: any;
}
