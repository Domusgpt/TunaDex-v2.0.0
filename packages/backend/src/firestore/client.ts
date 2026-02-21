import { config } from "../config.js";
import type { Project, ProjectTags } from "./types.js";

// ---------------------------------------------------------------------------
// Firebase Admin (conditionally imported)
// ---------------------------------------------------------------------------

type FirestoreDb = FirebaseFirestore.Firestore;

let firestoreDb: FirestoreDb | null = null;
let firestoreInitialized = false;

/**
 * Attempt to initialize Firestore using Firebase Admin.
 * Returns the Firestore instance if credentials are available, otherwise null.
 */
export async function initFirestore(): Promise<FirestoreDb | null> {
  if (firestoreInitialized) return firestoreDb;
  firestoreInitialized = true;

  if (!config.FIREBASE_SA_KEY) {
    console.log("[firestore] No FIREBASE_SA_KEY — using in-memory store");
    return null;
  }

  try {
    const fs = await import("node:fs");
    if (!fs.existsSync(config.FIREBASE_SA_KEY)) {
      console.warn(
        `[firestore] Service account file not found: ${config.FIREBASE_SA_KEY} — using in-memory store`
      );
      return null;
    }

    const admin = await import("firebase-admin");
    const serviceAccount = JSON.parse(
      fs.readFileSync(config.FIREBASE_SA_KEY, "utf-8")
    );

    admin.default.initializeApp({
      credential: admin.default.credential.cert(serviceAccount),
      projectId: config.FIREBASE_PROJECT_ID ?? serviceAccount.project_id,
    });

    firestoreDb = admin.default.firestore();
    console.log("[firestore] Firebase Admin initialized successfully");
    return firestoreDb;
  } catch (err) {
    console.error("[firestore] Failed to initialize Firebase Admin:", err);
    return null;
  }
}

/**
 * Get the Firestore instance (may be null if not initialized).
 */
export function getDb(): FirestoreDb | null {
  return firestoreDb;
}

/**
 * Whether we are using real Firestore vs. in-memory.
 */
export function isUsingFirestore(): boolean {
  return firestoreDb !== null;
}

// ---------------------------------------------------------------------------
// In-Memory Store (fallback)
// ---------------------------------------------------------------------------

const store = new Map<string, Project>();

export const inMemoryStore = {
  getAll(): Project[] {
    return Array.from(store.values());
  },

  getById(id: string): Project | undefined {
    return store.get(id);
  },

  upsert(project: Project): void {
    store.set(project.id, project);
  },

  updateTags(id: string, tags: Partial<ProjectTags>): boolean {
    const existing = store.get(id);
    if (!existing) return false;

    existing.tags = {
      ...existing.tags,
      ...tags,
      custom: tags.custom ?? existing.tags.custom,
    };
    store.set(id, existing);
    return true;
  },

  search(query: string): Project[] {
    const lower = query.toLowerCase();
    return Array.from(store.values()).filter((p) => {
      const haystack = [
        p.id,
        p.fullName,
        p.description,
        p.language ?? "",
        ...p.topics,
        p.tags.category,
        p.tags.status,
        p.tags.group,
        ...p.tags.custom,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(lower);
    });
  },

  clear(): void {
    store.clear();
  },
};
