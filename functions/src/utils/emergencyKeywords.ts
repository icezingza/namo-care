const EMERGENCY_KEYWORDS = [
  "help",
  "emergency",
  "not well",
  "dizzy",
  "pain",
  "chest pain",
  "can't breathe",
  "cannot breathe",
  "fainted",
  "fell",
  "ช่วยด้วย",
  "ฉุกเฉิน",
  "ไม่ไหว",
  "เวียนหัว",
  "เจ็บ",
  "เจ็บหน้าอก",
  "หายใจไม่ออก",
  "ล้ม",
  "หมดสติ",
  "โทรหมอ",
  "เรียกรถพยาบาล"
];

export function detectEmergencyKeyword(input: string): { matched: boolean; keywords: string[] } {
  const normalized = input.toLowerCase().trim();
  const keywords = EMERGENCY_KEYWORDS.filter((kw) => normalized.includes(kw));
  return {
    matched: keywords.length > 0,
    keywords
  };
}
