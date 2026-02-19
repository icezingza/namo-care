// Mock data simulating 7 days of health monitoring

export const vitalSigns = {
    bloodPressure: { systolic: 128, diastolic: 82, unit: "mmHg", status: "normal" },
    heartRate: { value: 72, unit: "bpm", status: "normal" },
    bloodSugar: { value: 105, unit: "mg/dL", status: "normal", fasting: true },
    lastSync: "2 minutes ago",
};

export const bloodPressureHistory = [
    { day: "Mon", systolic: 130, diastolic: 85 },
    { day: "Tue", systolic: 125, diastolic: 80 },
    { day: "Wed", systolic: 135, diastolic: 88 },
    { day: "Thu", systolic: 128, diastolic: 82 },
    { day: "Fri", systolic: 122, diastolic: 78 },
    { day: "Sat", systolic: 126, diastolic: 80 },
    { day: "Sun", systolic: 128, diastolic: 82 },
];

export const moodHistory = [
    { day: "Mon", mood: "happy", score: 5, emoji: "😊" },
    { day: "Tue", mood: "neutral", score: 3, emoji: "😐" },
    { day: "Wed", mood: "sad", score: 2, emoji: "😢" },
    { day: "Thu", mood: "happy", score: 5, emoji: "😊" },
    { day: "Fri", mood: "anxious", score: 2, emoji: "😰" },
    { day: "Sat", mood: "happy", score: 4, emoji: "😊" },
    { day: "Sun", mood: "neutral", score: 3, emoji: "😐" },
];

export const medications = [
    {
        id: 1,
        name: "Amlodipine",
        nameTh: "แอมโลดิปีน",
        dosage: "5mg",
        time: "08:00",
        purpose: "Blood Pressure",
        icon: "💊",
    },
    {
        id: 2,
        name: "Metformin",
        nameTh: "เมทฟอร์มิน",
        dosage: "500mg",
        time: "08:00",
        purpose: "Blood Sugar",
        icon: "💊",
    },
    {
        id: 3,
        name: "Aspirin",
        nameTh: "แอสไพริน",
        dosage: "81mg",
        time: "12:00",
        purpose: "Heart Health",
        icon: "❤️",
    },
    {
        id: 4,
        name: "Vitamin D",
        nameTh: "วิตามินดี",
        dosage: "1000 IU",
        time: "12:00",
        purpose: "Bone Health",
        icon: "☀️",
    },
    {
        id: 5,
        name: "Omeprazole",
        nameTh: "โอเมพราโซล",
        dosage: "20mg",
        time: "18:00",
        purpose: "Stomach",
        icon: "🛡️",
    },
];

export const userProfile = {
    name: "คุณยาย สมศรี",
    nameEn: "Grandma Somsri",
    age: 72,
    avatar: "👵",
    lineId: "somsri_grandma",
    emergencyContact: "092-xxx-xxxx",
};
