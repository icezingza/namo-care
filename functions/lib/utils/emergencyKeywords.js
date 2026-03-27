"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectEmergencyKeyword = detectEmergencyKeyword;
// Critical: life-threatening symptoms → severity "critical"
const CRITICAL_KEYWORDS = [
    "เจ็บหน้าอก",
    "หายใจไม่ออก",
    "หมดสติ",
    "เป็นลม",
    "ล้มหมดสติ",
    "อัมพาต",
    "ปากเบี้ยว",
    "แขนอ่อนแรง",
    "chest pain",
    "can't breathe",
    "fainted",
    "unconscious"
];
// High: urgent symptoms that need immediate attention
const HIGH_KEYWORDS = [
    "ช่วยด้วย",
    "ฉุกเฉิน",
    "ไม่ไหว",
    "เวียนหัวมาก",
    "ล้ม",
    "ล้มหัวฟาด",
    "เจ็บมาก",
    "ปวดอย่างรุนแรง",
    "มือชา",
    "ตาพร่า",
    "ขาอ่อน",
    "โทรหมอ",
    "เรียกรถพยาบาล",
    "help",
    "emergency",
    "fell",
    "dizzy"
];
function detectEmergencyKeyword(input) {
    // Thai has no case; toLowerCase only affects ASCII/English portions
    const text = input.toLowerCase().trim();
    const criticalMatches = CRITICAL_KEYWORDS.filter((kw) => text.includes(kw.toLowerCase()));
    if (criticalMatches.length > 0) {
        return { matched: true, keywords: criticalMatches, severity: "critical" };
    }
    const highMatches = HIGH_KEYWORDS.filter((kw) => text.includes(kw.toLowerCase()));
    if (highMatches.length > 0) {
        return { matched: true, keywords: highMatches, severity: "high" };
    }
    return { matched: false, keywords: [], severity: null };
}
//# sourceMappingURL=emergencyKeywords.js.map