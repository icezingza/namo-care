import { useState } from 'react';
import {
    Timer, Play, Pause, RotateCcw, Wind,
    Flower2, Moon, Sun, Heart,
} from 'lucide-react';

const programs = [
    {
        key: 'breathing',
        name: 'หายใจสงบ',
        nameEn: 'Calm Breathing',
        icon: '🌬️',
        description: 'หายใจเข้า 4 วิ — กลั้น 4 วิ — ออก 6 วิ',
        inhale: 4,
        hold: 4,
        exhale: 6,
        rounds: 5,
        color: 'from-serenity-blue-light to-serenity-green-light',
        borderColor: 'border-serenity-blue',
    },
    {
        key: 'metta',
        name: 'เมตตาภาวนา',
        nameEn: 'Loving-Kindness',
        icon: '💛',
        description: 'แผ่เมตตาให้ตนเองและผู้อื่น',
        inhale: 5,
        hold: 3,
        exhale: 7,
        rounds: 4,
        color: 'from-saffron-50 to-warm-light',
        borderColor: 'border-saffron',
    },
    {
        key: 'sleep',
        name: 'เตรียมนอน',
        nameEn: 'Sleep Prep',
        icon: '🌙',
        description: 'ผ่อนคลายก่อนนอน หายใจช้าๆ',
        inhale: 4,
        hold: 7,
        exhale: 8,
        rounds: 4,
        color: 'from-serenity-purple-light to-serenity-blue-light',
        borderColor: 'border-serenity-purple',
    },
];

const mantras = [
    'ขอให้ข้าพเจ้ามีความสุข',
    'ขอให้ข้าพเจ้าปราศจากทุกข์',
    'ขอให้สรรพสัตว์มีความสุข',
    'ขอให้สรรพสัตว์ปราศจากทุกข์',
    'พุท — โธ',
];

export default function MeditationTimer() {
    const [selectedProgram, setSelectedProgram] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [phase, setPhase] = useState('ready'); // ready, inhale, hold, exhale, done
    const [currentRound, setCurrentRound] = useState(0);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [intervalId, setIntervalId] = useState(null);
    const [mantraIndex, setMantraIndex] = useState(0);

    const startProgram = (program) => {
        setSelectedProgram(program);
        setCurrentRound(0);
        setPhase('ready');
        setIsRunning(false);
        setMantraIndex((prev) => (prev + 1) % mantras.length);
    };

    const startBreathing = () => {
        if (!selectedProgram) return;
        setIsRunning(true);
        setCurrentRound(1);
        setPhase('inhale');
        setSecondsLeft(selectedProgram.inhale);

        const id = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    // Transition to next phase
                    setPhase((currentPhase) => {
                        if (currentPhase === 'inhale') {
                            setSecondsLeft(selectedProgram.hold);
                            return 'hold';
                        }
                        if (currentPhase === 'hold') {
                            setSecondsLeft(selectedProgram.exhale);
                            return 'exhale';
                        }
                        if (currentPhase === 'exhale') {
                            setCurrentRound((r) => {
                                const nextRound = r + 1;
                                if (nextRound > selectedProgram.rounds) {
                                    clearInterval(id);
                                    setIsRunning(false);
                                    setMantraIndex((mi) => (mi + 1) % mantras.length);
                                    return r;
                                }
                                return nextRound;
                            });
                            setSecondsLeft(selectedProgram.inhale);
                            return 'inhale';
                        }
                        return currentPhase;
                    });
                    return prev;
                }
                return prev - 1;
            });
        }, 1000);

        setIntervalId(id);
    };

    const pauseBreathing = () => {
        if (intervalId) clearInterval(intervalId);
        setIsRunning(false);
    };

    const resetProgram = () => {
        if (intervalId) clearInterval(intervalId);
        setIsRunning(false);
        setPhase('ready');
        setCurrentRound(0);
        setSecondsLeft(0);
    };

    const backToList = () => {
        resetProgram();
        setSelectedProgram(null);
    };

    const phaseLabels = {
        ready: { text: 'พร้อมเริ่ม', emoji: '🧘' },
        inhale: { text: 'หายใจเข้า...', emoji: '🌬️' },
        hold: { text: 'กลั้นหายใจ...', emoji: '✨' },
        exhale: { text: 'หายใจออก...', emoji: '🍃' },
        done: { text: 'สาธุ 🙏', emoji: '✅' },
    };

    // Check if done
    const isDone = !isRunning && currentRound > 0 && phase === 'inhale' && secondsLeft === 0;

    // Circle animation size
    const getCircleScale = () => {
        if (phase === 'inhale') return 'scale-110';
        if (phase === 'hold') return 'scale-110';
        if (phase === 'exhale') return 'scale-90';
        return 'scale-100';
    };

    if (!selectedProgram) {
        return (
            <div className="pb-safe-bottom px-4 pt-4 space-y-5">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-ink mb-1">🧘 สมาธิภาวนา</h2>
                    <p className="text-ink-light text-base">Mindfulness & Meditation</p>
                </div>

                {/* Daily Mantra */}
                <div className="card text-center bg-gradient-to-r from-saffron-50 to-warm-light">
                    <p className="text-sm text-saffron font-semibold mb-2">✨ คำภาวนาวันนี้</p>
                    <p className="text-xl font-semibold text-ink animate-breathe">
                        "{mantras[mantraIndex]}"
                    </p>
                </div>

                {/* Programs */}
                <div className="space-y-3 stagger-children">
                    {programs.map((program) => (
                        <button
                            key={program.key}
                            onClick={() => startProgram(program)}
                            className={`card w-full text-left flex items-center gap-4 active:scale-[0.98] transition-all border-l-4 ${program.borderColor}`}
                        >
                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${program.color} flex items-center justify-center shrink-0`}>
                                <span className="text-3xl">{program.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-lg font-bold text-ink">{program.name}</p>
                                <p className="text-sm text-ink-lighter">{program.nameEn}</p>
                                <p className="text-sm text-ink-light mt-1">{program.description}</p>
                                <p className="text-xs text-ink-lighter mt-1">
                                    {program.rounds} รอบ · ~{(program.inhale + program.hold + program.exhale) * program.rounds} วินาที
                                </p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Tips */}
                <div className="card bg-serenity-green-light/50 text-center">
                    <p className="text-ink-light text-base">
                        🍃 นั่งสบายๆ หลับตา ตามลมหายใจ<br />
                        <span className="text-sm text-ink-lighter">Sit comfortably, close your eyes, follow your breath</span>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-safe-bottom px-4 pt-4 space-y-5">
            {/* Back Button */}
            <button
                onClick={backToList}
                className="flex items-center gap-2 text-ink-light text-base active:text-saffron"
            >
                ← กลับ
            </button>

            {/* Program Header */}
            <div className="text-center">
                <span className="text-4xl">{selectedProgram.icon}</span>
                <h2 className="text-2xl font-bold text-ink mt-2">{selectedProgram.name}</h2>
                <p className="text-ink-light text-base">{selectedProgram.nameEn}</p>
            </div>

            {/* Breathing Circle */}
            <div className="flex justify-center py-6">
                <div className={`relative w-52 h-52 rounded-full bg-gradient-to-br ${selectedProgram.color} flex items-center justify-center shadow-xl transition-transform duration-[2000ms] ease-in-out ${getCircleScale()}`}>
                    {/* Inner circle */}
                    <div className="w-40 h-40 rounded-full bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                        {isDone ? (
                            <>
                                <span className="text-4xl mb-1">✅</span>
                                <p className="text-lg font-bold text-serenity-green">สาธุ 🙏</p>
                            </>
                        ) : (
                            <>
                                <p className="text-3xl mb-1">{phaseLabels[phase]?.emoji}</p>
                                <p className="text-lg font-semibold text-ink">{phaseLabels[phase]?.text}</p>
                                {isRunning && (
                                    <p className="text-4xl font-bold text-saffron mt-1">{secondsLeft}</p>
                                )}
                            </>
                        )}
                    </div>

                    {/* Pulse rings */}
                    {isRunning && (
                        <>
                            <div className="absolute inset-0 rounded-full border-2 border-saffron/20 animate-ping" style={{ animationDuration: '3s' }} />
                        </>
                    )}
                </div>
            </div>

            {/* Round Counter */}
            <div className="text-center">
                <p className="text-ink-light text-base">
                    รอบที่ {Math.min(currentRound, selectedProgram.rounds)} / {selectedProgram.rounds}
                </p>
                <div className="flex justify-center gap-2 mt-2">
                    {Array.from({ length: selectedProgram.rounds }).map((_, i) => (
                        <div
                            key={i}
                            className={`w-3 h-3 rounded-full transition-all duration-500 ${i < currentRound ? 'bg-saffron' : 'bg-ink-lighter/30'
                                }`}
                        />
                    ))}
                </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-4">
                {isDone ? (
                    <button
                        onClick={resetProgram}
                        className="flex items-center gap-2 py-4 px-8 rounded-2xl bg-saffron text-white text-lg font-semibold shadow-lg active:scale-95 transition-all"
                    >
                        <RotateCcw size={24} />
                        <span>ทำอีกครั้ง</span>
                    </button>
                ) : !isRunning ? (
                    <button
                        onClick={startBreathing}
                        className="flex items-center gap-2 py-4 px-10 rounded-2xl bg-saffron text-white text-lg font-semibold shadow-lg active:scale-95 transition-all"
                    >
                        <Play size={24} />
                        <span>เริ่ม</span>
                    </button>
                ) : (
                    <>
                        <button
                            onClick={pauseBreathing}
                            className="flex items-center gap-2 py-4 px-6 rounded-2xl bg-warm text-white text-lg font-semibold shadow-lg active:scale-95 transition-all"
                        >
                            <Pause size={24} />
                            <span>หยุด</span>
                        </button>
                        <button
                            onClick={resetProgram}
                            className="flex items-center gap-2 py-4 px-6 rounded-2xl bg-cream-dark text-ink-light text-lg font-semibold active:scale-95 transition-all"
                        >
                            <RotateCcw size={24} />
                            <span>รีเซ็ต</span>
                        </button>
                    </>
                )}
            </div>

            {/* Mantra during session */}
            {(isRunning || isDone) && (
                <div className="card text-center animate-fade-in-up bg-saffron-50/50">
                    <p className="text-sm text-saffron font-semibold mb-1">🙏 คำภาวนา</p>
                    <p className="text-lg text-ink font-medium animate-breathe">
                        "{mantras[mantraIndex]}"
                    </p>
                </div>
            )}
        </div>
    );
}
