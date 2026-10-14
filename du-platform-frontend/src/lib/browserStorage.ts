type StorageName = "localStorage" | "sessionStorage";

function safeStorage(name: StorageName) {
  return {
    getItem(key: string): string | null {
      try {
        return window[name].getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key: string, value: string): void {
      try {
        window[name].setItem(key, value);
      } catch {
        /* Storage is optional. */
      }
    },
    removeItem(key: string): void {
      try {
        window[name].removeItem(key);
      } catch {
        /* Storage is optional. */
      }
    },
  };
}

export const safeLocalStorage = safeStorage("localStorage");
export const safeSessionStorage = safeStorage("sessionStorage");
