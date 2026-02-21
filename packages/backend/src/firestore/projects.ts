import { getDb, isUsingFirestore, inMemoryStore } from "./client.js";
import type { Project, ProjectTags } from "./types.js";

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface ProjectFilters {
  category?: string;
  status?: string;
  group?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ProjectStats {
  totalRepos: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  totalOpenPRs: number;
  recentCommitsCount: number;
}

// ---------------------------------------------------------------------------
// Firestore collection name
// ---------------------------------------------------------------------------

const COLLECTION = "projects";

// ---------------------------------------------------------------------------
// ProjectStore
// ---------------------------------------------------------------------------

export const ProjectStore = {
  /**
   * Get all projects, optionally filtered.
   */
  async getAllProjects(filters?: ProjectFilters): Promise<Project[]> {
    let projects: Project[];

    if (isUsingFirestore()) {
      projects = await firestoreGetAll(filters);
    } else {
      projects = filters?.search
        ? inMemoryStore.search(filters.search)
        : inMemoryStore.getAll();

      // Apply tag filters
      if (filters?.category) {
        projects = projects.filter(
          (p) => p.tags.category === filters.category
        );
      }
      if (filters?.status) {
        projects = projects.filter((p) => p.tags.status === filters.status);
      }
      if (filters?.group) {
        projects = projects.filter((p) => p.tags.group === filters.group);
      }
    }

    // Sort by updatedAt descending
    projects.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    // Pagination
    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? 100;
    return projects.slice(offset, offset + limit);
  },

  /**
   * Get a single project by its id (repo name).
   */
  async getProject(id: string): Promise<Project | undefined> {
    if (isUsingFirestore()) {
      return firestoreGetById(id);
    }
    return inMemoryStore.getById(id);
  },

  /**
   * Create or update a project.
   */
  async upsertProject(project: Project): Promise<void> {
    if (isUsingFirestore()) {
      await firestoreUpsert(project);
    } else {
      inMemoryStore.upsert(project);
    }
  },

  /**
   * Batch upsert multiple projects.
   */
  async upsertMany(projects: Project[]): Promise<void> {
    if (isUsingFirestore()) {
      await firestoreUpsertMany(projects);
    } else {
      for (const project of projects) {
        inMemoryStore.upsert(project);
      }
    }
  },

  /**
   * Update just the tags on a project.
   */
  async updateProjectTags(
    id: string,
    tags: Partial<ProjectTags>
  ): Promise<boolean> {
    if (isUsingFirestore()) {
      return firestoreUpdateTags(id, tags);
    }
    return inMemoryStore.updateTags(id, tags);
  },

  /**
   * Full-text search across projects.
   */
  async searchProjects(query: string): Promise<Project[]> {
    if (isUsingFirestore()) {
      // Firestore doesn't support native full-text search.
      // Pull all docs and filter in-memory.
      const all = await firestoreGetAll();
      return filterBySearch(all, query);
    }
    return inMemoryStore.search(query);
  },

  /**
   * Compute aggregate statistics.
   */
  async getStats(): Promise<ProjectStats> {
    const all = isUsingFirestore()
      ? await firestoreGetAll()
      : inMemoryStore.getAll();

    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalOpenPRs = 0;
    let recentCommitsCount = 0;

    for (const p of all) {
      const cat = p.tags.category || "uncategorized";
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;

      const st = p.tags.status || "unknown";
      byStatus[st] = (byStatus[st] ?? 0) + 1;

      totalOpenPRs += p.openPRs.length;
      recentCommitsCount += p.recentCommits.length;
    }

    return {
      totalRepos: all.length,
      byCategory,
      byStatus,
      totalOpenPRs,
      recentCommitsCount,
    };
  },
};

// ---------------------------------------------------------------------------
// Firestore helpers
// ---------------------------------------------------------------------------

async function firestoreGetAll(
  filters?: ProjectFilters
): Promise<Project[]> {
  const db = getDb()!;
  let ref: FirebaseFirestore.Query = db.collection(COLLECTION);

  if (filters?.category) {
    ref = ref.where("tags.category", "==", filters.category);
  }
  if (filters?.status) {
    ref = ref.where("tags.status", "==", filters.status);
  }
  if (filters?.group) {
    ref = ref.where("tags.group", "==", filters.group);
  }

  const snapshot = await ref.get();
  let projects = snapshot.docs.map((doc) => doc.data() as Project);

  if (filters?.search) {
    projects = filterBySearch(projects, filters.search);
  }

  return projects;
}

async function firestoreGetById(id: string): Promise<Project | undefined> {
  const db = getDb()!;
  const doc = await db.collection(COLLECTION).doc(id).get();
  return doc.exists ? (doc.data() as Project) : undefined;
}

async function firestoreUpsert(project: Project): Promise<void> {
  const db = getDb()!;
  await db
    .collection(COLLECTION)
    .doc(project.id)
    .set(JSON.parse(JSON.stringify(project)), { merge: true });
}

async function firestoreUpsertMany(projects: Project[]): Promise<void> {
  const db = getDb()!;
  const BATCH_LIMIT = 500;

  for (let i = 0; i < projects.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    const chunk = projects.slice(i, i + BATCH_LIMIT);

    for (const project of chunk) {
      const ref = db.collection(COLLECTION).doc(project.id);
      batch.set(ref, JSON.parse(JSON.stringify(project)), { merge: true });
    }

    await batch.commit();
  }
}

async function firestoreUpdateTags(
  id: string,
  tags: Partial<ProjectTags>
): Promise<boolean> {
  const db = getDb()!;
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();

  if (!doc.exists) return false;

  const updateData: Record<string, unknown> = {};
  if (tags.category !== undefined) updateData["tags.category"] = tags.category;
  if (tags.status !== undefined) updateData["tags.status"] = tags.status;
  if (tags.priority !== undefined) updateData["tags.priority"] = tags.priority;
  if (tags.group !== undefined) updateData["tags.group"] = tags.group;
  if (tags.custom !== undefined) updateData["tags.custom"] = tags.custom;

  await ref.update(updateData);
  return true;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function filterBySearch(projects: Project[], query: string): Project[] {
  const lower = query.toLowerCase();
  return projects.filter((p) => {
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
}
