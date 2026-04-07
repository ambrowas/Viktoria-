// src/context/SyncContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { LiveSession, Participant, DeviceRole } from '@/types/sync';
import {
    createSession as fbCreateSession,
    updateSession as fbUpdateSession,
    subscribeToSession,
    subscribeToParticipants,
    registerParticipant as fbRegisterParticipant,
    triggerBuzzer as fbTriggerBuzzer
} from '@/services/syncService';
const SYNC_VERSION = "1.0.43"; // Cache busting version

interface SyncContextType {
    sessionId: string | null;
    sessionData: LiveSession | null;
    participants: Participant[];
    isRemoteMode: boolean;
    deviceRole: DeviceRole;
    setDeviceRole: (role: DeviceRole) => void;
    startSession: (initialData?: Partial<LiveSession> | string) => Promise<string>;
    updateSession: (data: Partial<LiveSession>) => Promise<void>;
    joinSession: (sessionId: string, role?: DeviceRole) => void;
    leaveSession: () => void;
    registerMe: (data: Partial<Participant>) => Promise<void>;
    registerParticipant: (sessionId: string, participant: Partial<Participant> & { id: string }) => Promise<void>;
    buzzIn: () => Promise<boolean>;
    triggerAudio: (soundId: string) => Promise<void>;
    applyPoints: (teamId: string, points: number) => Promise<void>;
    triggerTransition: (label: string) => Promise<void>;
    emergencyMute: () => Promise<void>;
    syncStatus: string;
    version: string;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        try {
            return crypto.randomUUID();
        } catch (e) {
            console.warn("SyncContext: crypto.randomUUID failed, using fallback");
        }
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem('viktoria_sessionId'));
    const [sessionData, setSessionData] = useState<LiveSession | null>(null);
    const [remoteParticipants, setRemoteParticipants] = useState<Participant[]>([]);
    const [localParticipants, setLocalParticipants] = useState<Participant[]>([]);
    const [isRemoteMode, setIsRemoteMode] = useState(false);
    const [deviceRole, setDeviceRole] = useState<DeviceRole>(() => (localStorage.getItem('viktoria_deviceRole') as DeviceRole) || 'viewer');
    const [syncStatus, setSyncStatus] = useState<string>('idle');

    // 1. Memoized Callbacks (Defenders of the Realm)
    const startSession = useCallback(async (initialData: Partial<LiveSession> | string = 'manual') => {
        console.log("SyncContext: startSession EXECUTING with initialData:", initialData);
        try {
            const dataToCreate: Partial<LiveSession> = typeof initialData === 'string'
                ? { currentGameId: initialData, currentStep: 'waiting' }
                : { ...initialData, currentStep: initialData?.currentStep || 'waiting' };

            const id = await fbCreateSession(dataToCreate);
            console.log("SyncContext: fbCreateSession SUCCESS, id:", id);
            setSessionId(id);
            return id;
        } catch (error) {
            console.error("SyncContext: fbCreateSession FAILED:", error);
            throw error;
        }
    }, []);

    const updateSession = useCallback(async (data: Partial<LiveSession>) => {
        if (!sessionId) return;
        try {
            await fbUpdateSession(sessionId, data);
        } catch (e: any) {
            console.error("SyncContext: updateSession FAILED", e);
            alert("⚠️ SYNC FAILED: " + e.message);
        }
    }, [sessionId]);

    const joinSession = useCallback((id: string, role: DeviceRole = 'viewer') => {
        if (!id) return;
        setSessionId(id.toUpperCase());
        setDeviceRole(role);
    }, []);

    const leaveSession = useCallback(() => {
        setSessionId(null);
        setDeviceRole('viewer');
        setLocalParticipants([]);
        localStorage.removeItem('viktoria_sessionId');
    }, []);

    const registerMe = useCallback(async (data: Partial<Participant>) => {
        const myId = window.electronAPI ? "host-pc" : (localStorage.getItem('participantId') || generateUUID());
        if (!localStorage.getItem('participantId')) localStorage.setItem('participantId', myId);

        const participant: Participant = {
            id: myId,
            name: data.name || 'Anonymous',
            teamId: data.teamId || '',
            role: deviceRole,
            isBuzzed: false,
            lastActive: null,
            ...data
        } as Participant;

        if (sessionId) {
            try {
                await fbRegisterParticipant(sessionId, participant);
            } catch (e) {
                console.error("SyncContext: registerMe FAILED", e);
            }
        } else {
            setLocalParticipants(prev => {
                const filtered = prev.filter(p => p.id !== participant.id);
                return [...filtered, participant];
            });
        }
    }, [sessionId, deviceRole]);

    const registerParticipant = useCallback(async (id: string, data: Partial<Participant> & { id: string }) => {
        if (sessionId) {
            await fbRegisterParticipant(sessionId, data);
        } else {
            setLocalParticipants(prev => {
                const filtered = prev.filter(p => p.id !== data.id);
                return [...filtered, data as Participant];
            });
        }
    }, [sessionId]);

    const buzzIn = useCallback(async () => {
        if (!sessionId) return false;
        const myId = localStorage.getItem('participantId');
        if (!myId) return false;
        return await fbTriggerBuzzer(sessionId, myId);
    }, [sessionId]);

    const triggerAudio = useCallback(async (soundId: string) => {
        if (!sessionId) return;
        await updateSession({
            hostCommand: {
                type: 'play_audio',
                payload: { soundId },
                timestamp: Date.now()
            }
        });
    }, [sessionId, updateSession]);

    const applyPoints = useCallback(async (teamId: string, points: number) => {
        if (!sessionId || !sessionData) return;
        const currentScores = sessionData.teamScores || {};
        const newScores = {
            ...currentScores,
            [teamId]: (currentScores[teamId] || 0) + points
        };
        await updateSession({ teamScores: newScores });
    }, [sessionId, sessionData, updateSession]);

    const triggerTransition = useCallback(async (label: string) => {
        if (!sessionId) return;
        await updateSession({
            transitionState: {
                isActive: true,
                label,
                timestamp: Date.now()
            }
        });
        setTimeout(async () => {
            await updateSession({ transitionState: null });
        }, 2000);
    }, [sessionId, updateSession]);

    const emergencyMute = useCallback(async () => {
        if (!sessionId) return;
        await updateSession({
            hostCommand: {
                type: 'emergency_mute',
                payload: {},
                timestamp: Date.now()
            }
        });
    }, [sessionId, updateSession]);

    // 2. Effects (The Engine)
    useEffect(() => {
        if (sessionId) localStorage.setItem('viktoria_sessionId', sessionId);
        else localStorage.removeItem('viktoria_sessionId');
    }, [sessionId]);

    useEffect(() => {
        localStorage.setItem('viktoria_deviceRole', deviceRole);
    }, [deviceRole]);

    useEffect(() => {
        if (sessionId && deviceRole !== 'viewer') {
            const roleName = deviceRole === 'host' ? 'Host' : 'Player';
            registerMe({ name: `iPad ${roleName}` });
        }
    }, [sessionId, deviceRole, registerMe]);

    const participants = useMemo(() => {
        const remoteIds = new Set(remoteParticipants.map(p => p.id));
        return [...remoteParticipants, ...localParticipants.filter(p => !remoteIds.has(p.id))];
    }, [remoteParticipants, localParticipants]);

    useEffect(() => {
        if (!sessionId) {
            setSessionData(null);
            setRemoteParticipants([]);
            setIsRemoteMode(false);
            setSyncStatus('idle');
            return;
        }

        console.log("SyncContext: [DEBUG] Subscribing to session:", sessionId);
        setSyncStatus('connecting');
        const unsubSession = subscribeToSession(sessionId, (data) => {
            if (data) {
                setSessionData(data);
                setIsRemoteMode(true);
                setSyncStatus('connected');
            } else {
                console.warn("SyncContext: [DEBUG] Session missing:", sessionId);
                setSyncStatus('error_missing_session');
                // Don't auto-nullify if we want to stay "joined" but waiting
            }
        });

        const unsubParticipants = subscribeToParticipants(sessionId, (list) => {
            setRemoteParticipants(list || []);
        });

        return () => {
            unsubSession();
            unsubParticipants();
        };
    }, [sessionId]);

    return (
        <SyncContext.Provider value={{
            sessionId, sessionData, participants, isRemoteMode, deviceRole,
            setDeviceRole, startSession, updateSession, joinSession, leaveSession,
            registerMe, registerParticipant, buzzIn, triggerAudio, applyPoints,
            triggerTransition, emergencyMute, syncStatus, version: SYNC_VERSION
        }}>
            {children}
        </SyncContext.Provider>
    );
};

export const useSync = () => {
    const context = useContext(SyncContext);
    if (context === undefined) {
        throw new Error('useSync must be used within a SyncProvider');
    }
    return context;
};
