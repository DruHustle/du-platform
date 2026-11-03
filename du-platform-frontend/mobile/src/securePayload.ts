import * as SecureStore from "expo-secure-store";

// Keep each entry small enough for Keychain even when all characters use four
// UTF-8 bytes. A staging marker lets us clean up an interrupted write; the
// request is not sent until the completed index is stored.
const prefix = "chunks:v1:";
const staging = "writing:v1:";
async function removeChunks(key: string, count: number) {
  // Await every deletion even if one fails. A session storage queue must not
  // begin a newer write while an older cleanup still has deletions in flight.
  const results = await Promise.allSettled(Array.from({length: count}, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`)));
  const failure = results.find(result => result.status === "rejected");
  if (failure?.status === "rejected") throw failure.reason;
}
export async function saveSecurePayload(key: string, value: string) {
  const parts = value.match(/[\s\S]{1,400}/gu) ?? [];
  if (parts.length > 40) throw new Error("The request is too long to save safely on this device.");
  // Replacing a longer payload must remove its old trailing chunks before the
  // new index is written, or a later logout could no longer discover them.
  await deleteSecurePayload(key);
  let written = 0;
  try {
    await SecureStore.setItemAsync(key, `${staging}${parts.length}`);
    for (const part of parts) {
      await SecureStore.setItemAsync(`${key}.${written}`, part);
      written++;
    }
    await SecureStore.setItemAsync(key, `${prefix}${parts.length}`);
  } catch (error) {
    try {
      await removeChunks(key, written);
      await SecureStore.deleteItemAsync(key);
    } catch { /* Keep the staging marker for cleanup on the next launch. */ }
    throw error;
  }
}
export async function readSecurePayload(key: string) {
  const index = await SecureStore.getItemAsync(key);
  if (index?.startsWith(staging)) { await deleteSecurePayload(key); return null; }
  if (!index || !index.startsWith(prefix)) return index; // supports old single-entry requests
  const count = Number(index.slice(prefix.length));
  if (!Number.isInteger(count) || count < 0 || count > 40) throw new Error("The saved request is invalid.");
  const parts = await Promise.all(Array.from({length: count}, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)));
  if (parts.some(part => part === null)) throw new Error("The saved request is incomplete. Contact support before retrying.");
  return parts.join("");
}
export async function deleteSecurePayload(key: string) {
  const index = await SecureStore.getItemAsync(key);
  const count = index?.startsWith(prefix) ? Number(index.slice(prefix.length)) : index?.startsWith(staging) ? Number(index.slice(staging.length)) : 0;
  if (Number.isInteger(count) && count > 0 && count <= 40)
    await removeChunks(key, count);
  await SecureStore.deleteItemAsync(key);
}
