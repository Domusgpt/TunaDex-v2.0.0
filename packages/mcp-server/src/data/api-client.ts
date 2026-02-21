const API_BASE = process.env.API_BASE_URL || "http://localhost:3001";

export async function fetchProjects(
  filters?: Record<string, string>
): Promise<any[]> {
  const params = new URLSearchParams(filters);
  const url = `${API_BASE}/api/projects?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchProject(id: string): Promise<any> {
  const res = await fetch(
    `${API_BASE}/api/projects/${encodeURIComponent(id)}`
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchStats(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/projects/stats`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function searchProjects(query: string): Promise<any[]> {
  const res = await fetch(
    `${API_BASE}/api/projects?search=${encodeURIComponent(query)}`
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
