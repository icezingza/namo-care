import { useState } from 'react';
import { Sparkles, RefreshCw, ArrowLeft, PenLine, Save, Calendar } from 'lucide-react';
import { generateDharmaAdvice } from '../data/dharma_quotes';
import { useLocalStorage, getTodayKey, formatThaiTime } from '../hooks/useLocalStorage';

const moods = [
    { key: 'happy', emoji: '😊', label: 'มีความสุข', labelEn: 'Happy', color: 'bg-saffron-50 border-saffron' },
    { key: 'neutral', emoji: '😐', label: 'เฉยๆ', labelEn: 'Neutral', color: 'bg-warm-light border-warm' },
    { key: 'sad', emoji: '😢', label: 'เศร้า', labelEn: 'Sad', color: 'bg-serenity-blue-light border-serenity-blue' },
    { key: 'anxious', emoji: '😰', label: 'กังวล', labelEn: 'Anxious', color: 'bg-serenity-green-light border-serenity-green' },
    { key: 'pain', emoji: '😣', label: 'เจ็บปวด', labelEn: 'Pain', color: 'bg-serenity-purple-light border-serenity-purple' },
];

function DharmaCard({ advice, onRefresh }) {
    const glowClass = `dharma-glow-${advice.color}`;

    return (
        <div className={`${glowClass} rounded-2xl p-5 animate-fade-in-up`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Sparkles size={20} className="text-saffron" />
                    <span className="font-semibold text-ink">{advice.type}</span>
                </div>
                <button onClick={onRefresh} className="p-2 rounded-full hover:bg-white/50 active:scale-90 transition-all" aria-label="New quote">
                    <RefreshCw size={18} className="text-ink-light" />
                </button>
            </div>
            <blockquote className="text-xl font-semibold text-ink leading-relaxed mb-3 animate-breathe">
                "{advice.quote.th}"
            </blockquote>
            <p className="text-base text-ink-light italic mb-3">"{advice.quote.en}"</p>
            <p className="text-sm text-ink-lighter">— {advice.quote.source}</p>
        </div>
    );
}

export default function MoodTracker() {
    const [selectedMood, setSelectedMood] = useState(null);
    const [advice, setAdvice] = useState(null);
    const [journalNote, setJournalNote] = useState('');
    const [savedNote, setSavedNote] = useState(false);
    const [moodLog, setMoodLog] = useLocalStorage('namo_mood_log', []);

    const todayLogs = moodLog.filter((entry) => entry.dateKey === getTodayKey());

    const handleMoodSelect = (mood) => {
        setSelectedMood(mood);
        const result = generateDharmaAdvice(mood.key);
        setAdvice(result);
        setJournalNote('');
        setSavedNote(false);
    };

    const handleRefresh = () => {
        if (selectedMood) {
            setAdvice(generateDharmaAdvice(selectedMood.key));
        }
    };

    const handleReset = () => {
        setSelectedMood(null);
        setAdvice(null);
        setJournalNote('');
        setSavedNote(false);
    };

    const handleSaveJournal = () => {
        const entry = {
            mood: selectedMood.key,
            emoji: selectedMood.emoji,
            label: selectedMood.label,
            note: journalNote,
            dharma: advice.quote.th,
            timestamp: new Date().toISOString(),
            dateKey: getTodayKey(),
            time: formatThaiTime(new Date()),
        };
        setMoodLog((prev) => [entry, ...prev]);
        setSavedNote(true);
    };

    // Weekly mood summary
    const last7Days = moodLog.slice(0, 28);
    const moodCounts = last7Days.reduce((acc, entry) => {
        acc[entry.mood] = (acc[entry.mood] || 0) + 1;
        return acc;
    }, {});
    const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];

    return (
        <div className="pb-safe-bottom px-4 pt-4 space-y-5">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-2xl font-bold text-ink mb-1">วันนี้รู้สึกอย่างไร? 💛</h2>
                <p className="text-ink-light text-base">เลือกอารมณ์ แล้ว NaMo จะส่งธรรมะให้</p>
            </div>

            {/* Weekly Mood Summary */}
            {dominantMood && (
                <div className="card text-center bg-saffron-50/50">
                    <p className="text-sm text-ink-lighter mb-1">อารมณ์หลักสัปดาห์นี้</p>
                    <div className="flex items-center justify-center gap-3">
                        <span className="text-3xl">{moods.find((m) => m.key === dominantMood[0])?.emoji || '😐'}</span>
                        <span className="font-semibold text-ink">{moods.find((m) => m.key === dominantMood[0])?.label || dominantMood[0]}</span>
                        <span className="text-sm text-ink-lighter">({dominantMood[1]} ครั้ง)</span>
                    </div>
                </div>
            )}

            {/* Mood Selection */}
            <div className="grid grid-cols-5 gap-2">
                {moods.map((mood) => (
                    <button
                        key={mood.key}
                        onClick={() => handleMoodSelect(mood)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all duration-300 active:scale-90 ${selectedMood?.key === mood.key
                                ? `${mood.color} border-2 scale-105 shadow-md`
                                : 'bg-white border-transparent shadow-sm hover:shadow-md'
                            }`}
                    >
                        <span className="text-4xl">{mood.emoji}</span>
                        <span className="text-xs font-medium text-ink">{mood.label}</span>
                    </button>
                ))}
            </div>

            {/* Dharma Response + Journal */}
            {advice && (
                <div className="space-y-4">
                    <DharmaCard advice={advice} onRefresh={handleRefresh} />

                    {/* Breathing (sad/pain/anxious) */}
                    {(selectedMood?.key === 'sad' || selectedMood?.key === 'pain' || selectedMood?.key === 'anxious') && (
                        <div className="card text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                            <p className="text-lg font-semibold text-ink mb-3">🧘 การฝึกหายใจ</p>
                            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-serenity-blue-light to-serenity-green-light flex items-center justify-center animate-breathe">
                                <span className="text-4xl">🌬️</span>
                            </div>
                            <p className="text-ink-light mt-3 text-base">
                                หายใจเข้า... 4 วินาที<br />
                                กลั้น... 4 วินาที<br />
                                หายใจออก... 6 วินาที
                            </p>
                        </div>
                    )}

                    {/* Mudita */}
                    {selectedMood?.key === 'happy' && (
                        <div className="card text-center bg-gradient-to-r from-saffron-50 to-warm-light animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                            <span className="text-5xl">🎉</span>
                            <p className="text-lg font-semibold text-ink mt-2">มุทิตาจิต!</p>
                            <p className="text-ink-light mt-1">ร่วมยินดีกับความสุขของคุณค่ะ</p>
                        </div>
                    )}

                    {/* Journal Note */}
                    <div className="card animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                        <div className="flex items-center gap-2 mb-3">
                            <PenLine size={18} className="text-saffron" />
                            <span className="font-semibold text-ink">บันทึกความรู้สึก (ถ้าอยากเขียน)</span>
                        </div>
                        <textarea
                            value={journalNote}
                            onChange={(e) => { setJournalNote(e.target.value); setSavedNote(false); }}
                            placeholder="วันนี้รู้สึก... / Today I feel..."
                            rows={3}
                            className="w-full py-3 px-4 rounded-xl border-2 border-cream-dark bg-cream text-lg text-ink focus:border-saffron focus:outline-none resize-none transition-colors"
                        />
                        <button
                            onClick={handleSaveJournal}
                            disabled={savedNote}
                            className={`mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-lg transition-all active:scale-95 ${savedNote ? 'bg-serenity-green text-white' : 'bg-saffron text-white shadow-md'
                                }`}
                        >
                            {savedNote ? <><span>✓ บันทึกแล้ว</span></> : <><Save size={20} /><span>บันทึก</span></>}
                        </button>
                    </div>

                    <button
                        onClick={handleReset}
                        className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-cream-dark text-ink-light font-medium active:scale-95 transition-all"
                    >
                        <ArrowLeft size={18} />
                        <span>เลือกอารมณ์ใหม่</span>
                    </button>
                </div>
            )}

            {/* Today's Log */}
            {todayLogs.length > 0 && (
                <div className="card">
                    <h3 className="font-semibold text-ink mb-3 text-lg flex items-center gap-2">
                        <Calendar size={18} className="text-saffron" />
                        บันทึกวันนี้
                    </h3>
                    <div className="space-y-2">
                        {todayLogs.map((entry, i) => (
                            <div key={i} className="py-3 px-4 rounded-xl bg-cream animate-slide-in-right" style={{ animationDelay: `${i * 0.1}s` }}>
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="text-2xl">{entry.emoji}</span>
                                    <span className="text-ink font-medium">{entry.label}</span>
                                    <span className="text-ink-lighter text-sm ml-auto">{entry.time}</span>
                                </div>
                                {entry.note && (
                                    <p className="text-ink-light text-sm mt-1 pl-10 italic">"{entry.note}"</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
