import * as SecureStore from "expo-secure-store";

// Keep each entry small enough for Keychain even when all characters use four
// UTF-8 bytes. A staging marker lets us clean up an interrupted write; the
// request is not sent until the completed index is stored.
const prefix = "chunks:v1:";
const staging = "writing:v1:";
export async function saveSecurePayload(key: string, value: string) {
  const parts = value.match(/[\s\S]{1,400}/gu) ?? [];
  if (parts.length > 40) throw new Error("The request is too long to save safely on this device.");
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
      await Promise.all(Array.from({length: written}, (_, index) => SecureStore.deleteItemAsync(`${key}.${index}`)));
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
    await Promise.all(Array.from({length: count}, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`)));
  await SecureStore.deleteItemAsync(key);
}
