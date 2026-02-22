import { getLocalIndex, saveLocalIndex } from './local-store.js';
import { SkillNotFoundError } from './errors.js';
import type { RatingInfo, RatingSubmission } from './types.js';

export async function getRatings(name: string): Promise<RatingInfo> {
  const index = await getLocalIndex();
  const entry = index.skills[name];
  if (!entry) {
    throw new SkillNotFoundError(name);
  }
  return entry.rating;
}

export async function submitRating(
  name: string,
  rating: number,
  userId: string,
  comment?: string,
): Promise<RatingInfo> {
  const index = await getLocalIndex();
  const entry = index.skills[name];
  if (!entry) {
    throw new SkillNotFoundError(name);
  }

  // Update the rating locally (in a real system this would go to the registry)
  const current = entry.rating;
  const newCount = current.count + 1;
  const newAverage = (current.average * current.count + rating) / newCount;

  // Update distribution
  const dist = [...current.distribution] as [number, number, number, number, number];
  dist[rating - 1] += 1;

  entry.rating = {
    average: Math.round(newAverage * 10) / 10,
    count: newCount,
    distribution: dist,
  };

  await saveLocalIndex(index);
  return entry.rating;
}

export function formatRating(rating: RatingInfo): string {
  const filled = Math.round(rating.average);
  const empty = 5 - filled;
  const stars = '\u2605'.repeat(filled) + '\u2606'.repeat(empty);
  return `${stars} ${rating.average.toFixed(1)} (${rating.count} ratings)`;
}
