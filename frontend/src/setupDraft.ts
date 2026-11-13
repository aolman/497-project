// Holds the name typed on Welcome until setup finishes. sessionStorage keeps it across a page refresh.

const KEY = "steady.setup.name";

export function saveDraftName(name: string) {
  try {
    sessionStorage.setItem(KEY, name);
  } catch {
    /* storage unavailable: name is optional */
  }
}

export function readDraftName(): string {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function clearDraftName() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
