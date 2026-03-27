import type { Firestore } from "firebase-admin/firestore";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

const WEIGHTS: Record<string, number> = {
  emotion: 0.4,
  adherence: 0.3,
  silence: 0.2,
  checkin: 0.1,
};

/**
 * Aggregates behaviorSignals from the last 7 days and writes a computed
 * riskProfile to the user document.
 *
 * Returns the computed currentScore (0–100).
 */
export async function computeAndSaveRiskScore(
  db: Firestore,
  userId: string
): Promise<number> {
  const cutoff = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const snap = await db
    .collection("behaviorSignals")
    .where("userId", "==", userId)
    .where("computedAt", ">=", cutoff)
    .limit(50)
    .get();

  if (snap.empty) return 0;

  // Bucket scores by signal type
  const typeScores: Record<string, number[]> = {
    emotion: [],
    adherence: [],
    silence: [],
    checkin: [],
  };

  snap.docs.forEach((doc) => {
    const d = doc.data();
    const type = d.signalType as string;
    if (Object.prototype.hasOwnProperty.call(typeScores, type)) {
      typeScores[type].push(d.score as number);
    }
  });

  // Weighted average across signal types present
  let weighted = 0;
  let totalWeight = 0;

  Object.entries(typeScores).forEach(([type, scores]) => {
    if (scores.length === 0) return;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const w = WEIGHTS[type] ?? 0;
    weighted += avg * w;
    totalWeight += w;
  });

  const currentScore = totalWeight > 0 ? Math.round(weighted / totalWeight) : 0;

  // Trend: compare last 3 days vs days 3-7
  const midCutoff = Timestamp.fromMillis(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const recentDocs = snap.docs.filter(
    (d) => (d.data().computedAt as Timestamp).toMillis() >= midCutoff.toMillis()
  );
  const olderDocs = snap.docs.filter(
    (d) => (d.data().computedAt as Timestamp).toMillis() < midCutoff.toMillis()
  );

  const avgOf = (docs: typeof snap.docs): number =>
    docs.length === 0
      ? currentScore
      : docs.reduce((s, d) => s + (d.data().score as number), 0) / docs.length;

  const recentAvg = avgOf(recentDocs);
  const olderAvg = avgOf(olderDocs);

  const trend: "rising" | "stable" | "falling" =
    recentAvg - olderAvg > 10
      ? "rising"
      : olderAvg - recentAvg > 10
      ? "falling"
      : "stable";

  await db
    .collection("users")
    .doc(userId)
    .set(
      {
        riskProfile: {
          currentScore,
          trend,
          computedAt: Timestamp.now(),
          signalCount: snap.size,
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  return currentScore;
}
