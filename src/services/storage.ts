// src/services/storage.ts
import { storage } from "@services/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export const uploadImageAndGetUrl = async (
  file: File,
  gameId: string,
  matchId: string
): Promise<string> => {
  const storageRef = ref(
    storage,
    `memory_games/${gameId}/${matchId}_${file.name}`
  );
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};
    