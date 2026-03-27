"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeAndSaveRiskScore = computeAndSaveRiskScore;
const firestore_1 = require("firebase-admin/firestore");
const WEIGHTS = {
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
async function computeAndSaveRiskScore(db, userId) {
    const cutoff = firestore_1.Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const snap = await db
        .collection("behaviorSignals")
        .where("userId", "==", userId)
        .where("computedAt", ">=", cutoff)
        .limit(50)
        .get();
    if (snap.empty)
        return 0;
    // Bucket scores by signal type
    const typeScores = {
        emotion: [],
        adherence: [],
        silence: [],
        checkin: [],
    };
    snap.docs.forEach((doc) => {
        const d = doc.data();
        const type = d.signalType;
        if (Object.prototype.hasOwnProperty.call(typeScores, type)) {
            typeScores[type].push(d.score);
        }
    });
    // Weighted average across signal types present
    let weighted = 0;
    let totalWeight = 0;
    Object.entries(typeScores).forEach(([type, scores]) => {
        if (scores.length === 0)
            return;
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const w = WEIGHTS[type] ?? 0;
        weighted += avg * w;
        totalWeight += w;
    });
    const currentScore = totalWeight > 0 ? Math.round(weighted / totalWeight) : 0;
    // Trend: compare last 3 days vs days 3-7
    // If no older data exists we cannot determine direction — default to stable
    const midCutoff = firestore_1.Timestamp.fromMillis(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const recentDocs = snap.docs.filter((d) => d.data().computedAt.toMillis() >= midCutoff.toMillis());
    const olderDocs = snap.docs.filter((d) => d.data().computedAt.toMillis() < midCutoff.toMillis());
    let trend = "stable";
    if (recentDocs.length > 0 && olderDocs.length > 0) {
        const avg = (docs) => docs.reduce((s, d) => s + d.data().score, 0) / docs.length;
        const recentAvg = avg(recentDocs);
        const olderAvg = avg(olderDocs);
        const diff = recentAvg - olderAvg;
        if (diff > 10)
            trend = "rising";
        else if (diff < -10)
            trend = "falling";
    }
    await db
        .collection("users")
        .doc(userId)
        .set({
        riskProfile: {
            currentScore,
            trend,
            computedAt: firestore_1.Timestamp.now(),
            signalCount: snap.size,
        },
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    return currentScore;
}
//# sourceMappingURL=riskScoreService.js.map