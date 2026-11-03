/** Always remove local account data, even when the server cannot be reached. */
export async function signOutOnDevice(
  revoke: () => Promise<void>,
  clearLocal: () => Promise<void>
) {
  let revokeFailed = false;
  try { await revoke(); } catch { revokeFailed = true; }
  await clearLocal();
  if (revokeFailed) throw new Error("Signed out on this device, but the server session could not be revoked. Reset your password if you need to invalidate it immediately.");
}
