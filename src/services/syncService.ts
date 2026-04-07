// src/services/syncService.ts

import {
    doc,
    setDoc,
    updateDoc,
    onSnapshot,
    serverTimestamp,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    deleteDoc,
    orderBy,
    limit,
    runTransaction
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LiveSession, Participant } from "@/types/sync";

const SESSIONS_COLLECTION = "sessions"; // Keep this for other functions
const COLLECTION_NAME = "sessions"; // New constant for createSession

/**
 * Generates a short, human-readable session ID.
 */
function generateSessionId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Creates a new live session in Firestore.
 */
export async function createSession(initialData: Partial<LiveSession>): Promise<string> {
    const sessionId = generateSessionId();
    const sessionDocRef = doc(db, COLLECTION_NAME, sessionId);

    const newSession: any = {
        sessionId, // Add sessionId here
        currentGameId: 'manual',
        currentShowId: null,
        currentStep: 'waiting',
        teamScores: {},
        activeQuestionId: null,
        activePlayerId: null,
        flippedIndices: [],
        bingoDrawBalls: [],
        matchedPairs: [],
        buzzerWinnerId: null,
        fullGameData: null,
        fullShowData: null,
        ...initialData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    const cleanSession = stripUndefined(newSession);

    await setDoc(sessionDocRef, cleanSession);
    return sessionId;
}

/**
 * Recursively removes undefined values from an object or array.
 */
function stripUndefined(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) {
        return obj.map(stripUndefined);
    }
    if (typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
                result[key] = stripUndefined(value);
            }
        }
        return result;
    }
    return obj;
}

/**
 * Updates an existing session's data.
 */
export async function updateSession(sessionId: string, data: Partial<LiveSession>): Promise<void> {
    const sessionDocRef = doc(db, SESSIONS_COLLECTION, sessionId);
    
    // Firebase crashes if it encounters `undefined` anywhere in the tree.
    const cleanData = stripUndefined(data);
    
    await updateDoc(sessionDocRef, {
        ...cleanData,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Subscribes to changes in a specific session.
 */
export function subscribeToSession(sessionId: string, callback: (session: LiveSession | null) => void) {
    const sessionDocRef = doc(db, SESSIONS_COLLECTION, sessionId);

    return onSnapshot(sessionDocRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data() as LiveSession);
        } else {
            console.warn(`Session ${sessionId} not found.`);
            callback(null);
        }
    }, (error) => {
        console.error("Error subscribing to session:", error);
        callback(null);
    });
}

/**
 * Adds or updates a participant in the session's participants sub-collection.
 */
export async function registerParticipant(sessionId: string, participant: Partial<Participant> & { id: string }): Promise<void> {
    const participantRef = doc(db, SESSIONS_COLLECTION, sessionId, "participants", participant.id);
    await setDoc(participantRef, {
        ...participant,
        lastActive: serverTimestamp()
    }, { merge: true });
}

/**
 * Subscribes to participants in a session.
 */
export function subscribeToParticipants(sessionId: string, callback: (participants: Participant[]) => void) {
    const participantsRef = collection(db, SESSIONS_COLLECTION, sessionId, "participants");
    return onSnapshot(participantsRef, (snapshot) => {
        const participants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participant));
        callback(participants);
    });
}

/**
 * Logic for the "Race Condition" Buzzer using a transaction.
 * The first one to write to 'buzzerLockedBy' wins.
 */
export async function triggerBuzzer(sessionId: string, participantId: string): Promise<boolean> {
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    const participantRef = doc(db, SESSIONS_COLLECTION, sessionId, "participants", participantId);

    try {
        return await runTransaction(db, async (transaction) => {
            const sessionSnap = await transaction.get(sessionRef);
            if (!sessionSnap.exists()) throw new Error("Session not found");

            const session = sessionSnap.data() as LiveSession;

            // Check if buzzer is enabled and not already locked
            if (!session.isBuzzerEnabled || session.buzzerLockedBy) {
                return false;
            }

            // Lock the buzzer
            transaction.update(sessionRef, {
                buzzerLockedBy: participantId,
                lastAction: `buzzer_locked_${participantId}`,
                updatedAt: serverTimestamp()
            });

            // Mark participant as buzzed
            transaction.update(participantRef, {
                isBuzzed: true,
                buzzedAt: serverTimestamp()
            });

            return true;
        });
    } catch (error) {
        console.error("Buzzer transaction failed:", error);
        return false;
    }
}

/**
 * Resets the buzzer for the next round.
 */
export async function resetBuzzer(sessionId: string): Promise<void> {
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    const participantsRef = collection(db, SESSIONS_COLLECTION, sessionId, "participants");

    await updateDoc(sessionRef, {
        buzzerLockedBy: null,
        isBuzzerEnabled: true,
        lastAction: 'buzzer_reset',
        updatedAt: serverTimestamp()
    });

    // Reset all participants (batch-ish)
    const snapshot = await getDocs(participantsRef);
    const promises = snapshot.docs.map(d => updateDoc(d.ref, { isBuzzed: false, buzzedAt: null }));
    await Promise.all(promises);
}
