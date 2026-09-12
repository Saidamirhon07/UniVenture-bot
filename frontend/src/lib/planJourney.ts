export type JourneyStatus = "complete" | "current" | "building" | "upcoming";

export function getCurrentStageIndex(scores: number[], completionThreshold = 70) {
  const firstIncomplete = scores.findIndex((score) => score < completionThreshold);
  return firstIncomplete === -1 ? Math.max(0, scores.length - 1) : firstIncomplete;
}

export function getJourneyStatus(score: number, index: number, currentIndex: number, completionThreshold = 70): JourneyStatus {
  if (score >= completionThreshold) return "complete";
  if (index === currentIndex) return "current";
  if (score > 0) return "building";
  return "upcoming";
}

export function getLevelProgress(xp: number, levelSize = 250) {
  const safeXp = Math.max(0, xp);
  const earned = safeXp % levelSize;
  return {
    earned,
    remaining: earned === 0 && safeXp > 0 ? levelSize : levelSize - earned,
    percent: Math.round((earned / levelSize) * 100),
  };
}
