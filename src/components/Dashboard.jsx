import { useState } from 'react';
import {
    Heart, Activity, Droplets, Phone, ClipboardPlus, Pill,
    MessageCircleHeart, Watch, ArrowRight, GlassWater,
    Plus, Minus, Sparkles, Sun, Cloud, CloudRain, Zap,
} from 'lucide-react';
import { vitalSigns, userProfile } from '../data/mockData';
import { useLocalStorage, getTodayKey, formatThaiDate } from '../hooks/useLocalStorage';
import { generateDharmaAdvice } from '../data/dharma_quotes';

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 6) return { text: 'ยังไม่นอนเหรอคะ พักผ่อนด้วยนะคะ', emoji: '🌙', period: 'ดึก' };
    if (hour < 12) return { text: 'อรุณสวัสดิ์ค่ะ วันนี้ยิ้มแล้วหรือยัง?', emoji: '🌅', period: 'เช้า' };
    if (hour < 17) return { text: 'สวัสดีตอนบ่ายค่ะ อย่าลืมดื่มน้ำนะคะ', emoji: '☀️', period: 'บ่าย' };
    if (hour < 20) return { text: 'สวัสดีตอนเย็นค่ะ วันนี้เป็นอย่างไรบ้าง?', emoji: '🌇', period: 'เย็น' };
    return { text: 'ราตรีสวัสดิ์ค่ะ พักผ่อนให้สบายนะคะ', emoji: '🌙', period: 'ค่ำ' };
}

function VitalCard({ icon: Icon, iconColor, label, value, unit, status, bgColor }) {
    const statusConfig = {
        normal: { text: 'ปกติ ✓', className: 'text-serenity-green bg-serenity-green-light' },
        warning: { text: 'เฝ้าระวัง', className: 'text-warm bg-warm-light' },
        danger: { text: 'ผิดปกติ!', className: 'text-danger bg-danger-light' },
    };
    const st = statusConfig[status] || statusConfig.normal;

    return (
        <div className="card flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: bgColor }}>
                <Icon size={28} className={iconColor} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-ink-lighter text-sm font-medium">{label}</p>
                <p className="text-2xl font-bold text-ink">
                    {value} <span className="text-base font-normal text-ink-light">{unit}</span>
                </p>
            </div>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${st.className}`}>{st.text}</span>
        </div>
    );
}

function WaterTracker() {
    const [glasses, setGlasses] = useLocalStorage(`namo_water_${getTodayKey()}`, 0);
    const goal = 8;
    const progress = Math.min((glasses / goal) * 100, 100);

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <GlassWater size={20} className="text-serenity-blue" />
                    <span className="font-semibold text-ink">ดื่มน้ำวันนี้</span>
                </div>
                <span className="text-sm text-ink-lighter">{glasses}/{goal} แก้ว</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 bg-cream rounded-full mb-3 overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-serenity-blue to-serenity-green rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Glasses visualization */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1.5 flex-wrap">
                    {Array.from({ length: goal }).map((_, i) => (
                        <div
                            key={i}
                            className={`w-6 h-8 rounded-b-lg border-2 transition-all duration-300 ${i < glasses
                                    ? 'bg-serenity-blue/20 border-serenity-blue'
                                    : 'bg-cream border-ink-lighter/20'
                                }`}
                        />
                    ))}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setGlasses((g) => Math.max(0, g - 1))}
                        className="w-10 h-10 rounded-xl bg-cream-dark flex items-center justify-center active:scale-90 transition-transform"
                    >
                        <Minus size={18} className="text-ink-light" />
                    </button>
                    <button
                        onClick={() => setGlasses((g) => Math.min(goal + 4, g + 1))}
                        className="w-10 h-10 rounded-xl bg-serenity-blue text-white flex items-center justify-center active:scale-90 transition-transform shadow-md"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>

            {glasses >= goal && (
                <p className="text-center text-serenity-green font-semibold text-sm mt-2 animate-fade-in-up">
                    🎉 ดื่มน้ำครบเป้าหมายแล้ว! เก่งมาก
                </p>
            )}
        </div>
    );
}

function DailyWisdom() {
    const [wisdom] = useState(() => generateDharmaAdvice('neutral'));

    return (
        <div className="card bg-gradient-to-r from-saffron-50/80 to-warm-light/50 border border-saffron/10">
            <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-saffron" />
                <span className="text-sm font-semibold text-saffron">ธรรมะประจำวัน</span>
            </div>
            <p className="text-base text-ink leading-relaxed italic animate-breathe">
                "{wisdom.quote.th}"
            </p>
            <p className="text-sm text-ink-lighter mt-1">— {wisdom.quote.source}</p>
        </div>
    );
}

export default function Dashboard({ user, onNavigate }) {
    const [showSOS, setShowSOS] = useState(false);
    const [medConfirm, setMedConfirm] = useState(false);
    const greeting = getGreeting();

    return (
        <div className="pb-safe-bottom px-4 pt-4 space-y-4">
            {/* SOS Overlay */}
            {showSOS && (
                <div className="fixed inset-0 bg-danger/90 z-50 flex flex-col items-center justify-center p-6 animate-fade-in-up">
                    <div className="text-white text-center">
                        <div className="text-7xl mb-4 animate-pulse-gentle">🆘</div>
                        <h2 className="text-3xl font-bold mb-3">กำลังเรียกช่วยเหลือ...</h2>
                        <p className="text-xl mb-2">กำลังแจ้ง: {userProfile.emergencyContact}</p>
                        <p className="text-lg opacity-80 mb-8">📍 ส่งตำแหน่ง GPS แล้ว</p>
                        <button
                            onClick={() => setShowSOS(false)}
                            className="bg-white text-danger text-xl font-bold py-4 px-10 rounded-2xl active:scale-95 transition-transform"
                        >
                            ยกเลิก
                        </button>
                    </div>
                </div>
            )}

            {/* Date */}
            <p className="text-ink-lighter text-sm text-center">{formatThaiDate(new Date())}</p>

            {/* Hero — NaMo Greeting */}
            <div className="card bg-gradient-to-br from-saffron-50 via-white to-saffron-100/30 border border-saffron/10">
                <div className="flex items-start gap-3">
                    <div className="text-4xl shrink-0">{greeting.emoji}</div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <MessageCircleHeart size={18} className="text-saffron" />
                            <span className="text-sm font-semibold text-saffron">NaMo พูด</span>
                        </div>
                        <p className="text-xl font-semibold text-ink leading-relaxed">
                            {greeting.text}
                        </p>
                        <p className="text-ink-light text-base mt-1">
                            {userProfile.name} {userProfile.avatar}
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-3 gap-2">
                <div className="card text-center py-3 px-2">
                    <Activity size={20} className="text-danger mx-auto mb-1" />
                    <p className="text-lg font-bold text-ink">{vitalSigns.bloodPressure.systolic}/{vitalSigns.bloodPressure.diastolic}</p>
                    <p className="text-xs text-ink-lighter">ความดัน</p>
                </div>
                <div className="card text-center py-3 px-2">
                    <Heart size={20} className="text-saffron mx-auto mb-1" />
                    <p className="text-lg font-bold text-ink">{vitalSigns.heartRate.value}</p>
                    <p className="text-xs text-ink-lighter">ชีพจร</p>
                </div>
                <div className="card text-center py-3 px-2">
                    <Droplets size={20} className="text-serenity-blue mx-auto mb-1" />
                    <p className="text-lg font-bold text-ink">{vitalSigns.bloodSugar.value}</p>
                    <p className="text-xs text-ink-lighter">น้ำตาล</p>
                </div>
            </div>

            {/* Smartwatch Sync */}
            <div className="flex items-center gap-2 px-1">
                <Watch size={14} className="text-serenity-blue" />
                <span className="text-xs text-ink-lighter">ซิงค์จาก Smartwatch: {vitalSigns.lastSync}</span>
                <span className="w-2 h-2 rounded-full bg-serenity-green animate-pulse ml-1" />
            </div>

            {/* Emergency SOS */}
            <button
                onClick={() => setShowSOS(true)}
                className="w-full flex items-center justify-center gap-3 py-5 px-6 rounded-2xl bg-danger text-white text-xl font-bold shadow-lg active:scale-95 transition-all animate-sos-pulse"
            >
                <Phone size={28} />
                <span>🆘 เรียกช่วยเหลือฉุกเฉิน</span>
            </button>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => onNavigate?.('record')}
                    className="flex flex-col items-center justify-center gap-2 py-5 px-4 rounded-2xl bg-serenity-blue text-white text-lg font-semibold shadow-md active:scale-95 transition-all"
                >
                    <ClipboardPlus size={32} />
                    <span>บันทึกสุขภาพ</span>
                </button>
                <button
                    onClick={() => {
                        setMedConfirm(true);
                        setTimeout(() => setMedConfirm(false), 2000);
                    }}
                    className={`flex flex-col items-center justify-center gap-2 py-5 px-4 rounded-2xl text-lg font-semibold shadow-md active:scale-95 transition-all ${medConfirm ? 'bg-serenity-green text-white' : 'bg-saffron text-white'
                        }`}
                >
                    <Pill size={32} />
                    <span>{medConfirm ? 'บันทึกแล้ว ✓' : 'ทานยาแล้ว'}</span>
                </button>
            </div>

            {/* Water Tracker */}
            <WaterTracker />

            {/* Daily Wisdom */}
            <DailyWisdom />

            {/* Quick Links */}
            <div className="space-y-2">
                <div className="card flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform" onClick={() => onNavigate?.('mood')}>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">😊</span>
                        <div>
                            <p className="font-semibold text-ink text-lg">เช็คอารมณ์วันนี้</p>
                            <p className="text-ink-lighter text-sm">เลือกอารมณ์เพื่อรับธรรมะ</p>
                        </div>
                    </div>
                    <ArrowRight size={24} className="text-ink-lighter" />
                </div>

                <div className="card flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform" onClick={() => onNavigate?.('meditate')}>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🧘</span>
                        <div>
                            <p className="font-semibold text-ink text-lg">สมาธิภาวนา</p>
                            <p className="text-ink-lighter text-sm">ผ่อนคลายด้วยการหายใจ</p>
                        </div>
                    </div>
                    <ArrowRight size={24} className="text-ink-lighter" />
                </div>
            </div>
        </div>
    );
}
