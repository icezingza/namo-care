// Dharma Quotes mapped to emotions — Thai/English Buddhist wisdom
const dharmaQuotes = {
    sad: [
        {
            th: "ความทุกข์เป็นสิ่งไม่เที่ยง จงปล่อยวางแล้วจะพบความสงบ",
            en: "Suffering is impermanent. Let go, and you will find peace.",
            source: "พุทธพจน์ / Buddha's Teaching"
        },
        {
            th: "น้ำตาทุกหยดย่อมแห้ง เหมือนฝนย่อมหยุด",
            en: "Every tear shall dry, just as every rain must stop.",
            source: "ธรรมะจากหลวงพ่อชา / Ajahn Chah"
        },
        {
            th: "ความเศร้าเป็นเพียงเมฆ ท้องฟ้าข้างในใจเรายังสว่างเสมอ",
            en: "Sadness is only a cloud. The sky within your heart is always bright.",
            source: "ท่านติช นัท ฮันห์ / Thich Nhat Hanh"
        }
    ],
    pain: [
        {
            th: "ความเจ็บปวดเป็นสิ่งไม่เที่ยง หายใจลึกๆ ฉันอยู่ที่นี่กับคุณ",
            en: "Pain is impermanent. Breathe deeply, I am here with you.",
            source: "เมตตาธรรม / Metta Teaching"
        },
        {
            th: "ร่างกายเจ็บ แต่ใจเราเลือกที่จะสงบได้",
            en: "The body may hurt, but the mind can choose to be still.",
            source: "หลวงปู่มั่น / Luang Pu Mun"
        },
        {
            th: "จงเป็นมิตรกับความเจ็บปวด แล้วมันจะสอนความเข้มแข็งให้เรา",
            en: "Befriend your pain, and it will teach you strength.",
            source: "ธรรมะประยุกต์ / Applied Dharma"
        }
    ],
    happy: [
        {
            th: "มุทิตา — ขอร่วมยินดีในความสุขของคุณ ขอให้สุขนี้ยั่งยืน!",
            en: "Mudita — I rejoice in your happiness! May this joy last!",
            source: "พรหมวิหาร ๔ / Four Brahmaviharas"
        },
        {
            th: "ความสุขที่แท้จริง เกิดจากการปล่อยวาง ไม่ใช่จากการยึดมั่น",
            en: "True happiness comes from letting go, not from holding on.",
            source: "พุทธพจน์ / Buddha's Teaching"
        },
        {
            th: "รอยยิ้มของคุณคือแสงสว่างให้โลก จงรักษาไว้",
            en: "Your smile lights up the world. Treasure it always.",
            source: "เมตตาธรรม / Metta Teaching"
        }
    ],
    anxious: [
        {
            th: "หายใจเข้า — สงบ หายใจออก — ยิ้ม อยู่กับปัจจุบันขณะ",
            en: "Breathe in — calm. Breathe out — smile. Stay in this moment.",
            source: "ท่านติช นัท ฮันห์ / Thich Nhat Hanh"
        },
        {
            th: "ความกังวลคือการใช้จินตนาการสร้างสิ่งที่ไม่ต้องการ",
            en: "Worry is using your imagination to create what you don't want.",
            source: "ธรรมะประยุกต์ / Applied Dharma"
        },
        {
            th: "ทุกสิ่งจะผ่านไป เหมือนน้ำในแม่น้ำที่ไหลไม่หยุด",
            en: "Everything shall pass, like the river that never stops flowing.",
            source: "อนิจจัง / Anicca Teaching"
        }
    ],
    neutral: [
        {
            th: "ความสงบคือพลัง ขอให้วันนี้เป็นวันที่ดี",
            en: "Stillness is strength. May today be a good day.",
            source: "อุเบกขา / Upekkha"
        },
        {
            th: "ขอให้สรรพสัตว์จงมีความสุข ปราศจากทุกข์",
            en: "May all beings be happy and free from suffering.",
            source: "เมตตาสูตร / Metta Sutta"
        },
        {
            th: "ทุกลมหายใจคือของขวัญ จงรู้คุณค่าของวินาทีนี้",
            en: "Every breath is a gift. Cherish this very moment.",
            source: "สติปัฏฐาน / Satipatthana"
        }
    ]
};

/**
 * Simulated AI function to generate Dharma advice based on mood.
 * In production, this would call a real AI/LLM endpoint.
 * @param {'happy'|'sad'|'neutral'|'anxious'|'pain'} mood
 * @returns {{ quote: object, type: string, color: string }}
 */
export function generateDharmaAdvice(mood) {
    const moodKey = mood.toLowerCase();
    const quotes = dharmaQuotes[moodKey] || dharmaQuotes.neutral;
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

    const moodMeta = {
        sad: { type: "Dharma Whisper 🙏", color: "blue" },
        pain: { type: "Karuna (Compassion) 💙", color: "purple" },
        happy: { type: "Mudita (Shared Joy) 🌻", color: "saffron" },
        anxious: { type: "Samatha (Calming) 🍃", color: "green" },
        neutral: { type: "Metta (Loving-Kindness) ☀️", color: "warm" },
    };

    return {
        quote: randomQuote,
        type: (moodMeta[moodKey] || moodMeta.neutral).type,
        color: (moodMeta[moodKey] || moodMeta.neutral).color,
    };
}

export default dharmaQuotes;
