import { useState, useEffect } from 'react';
import { Check, Clock, Pill, Plus } from 'lucide-react';
import { medications as mockMedications } from '../data/mockData';
import { useLocalStorage, getTodayKey } from '../hooks/useLocalStorage';
import { saveMedStatus, getMedStatus, getMedicationSchedules, getCurrentUserId } from '../firebase';

export default function MedicationTracker({ onManage }) {
    const todayKey = getTodayKey();
    const [takenMeds, setTakenMeds] = useLocalStorage(`namo_meds_${todayKey}`, {});
    const [medications, setMedications] = useState(mockMedications);
    const [userId, setUserId] = useState('local_user');

    useEffect(() => {
        getCurrentUserId().then(async (uid) => {
            setUserId(uid);
            // Try loading today's status from Firestore (merge with localStorage)
            const remote = await getMedStatus(uid, todayKey);
            if (remote) setTakenMeds((prev) => ({ ...remote, ...prev }));
            // Try loading medication schedule from Firestore
            const schedules = await getMedicationSchedules(uid);
            if (schedules.length > 0) {
                const mapped = schedules.map((s, i) => ({
                    id: s.id || i,
                    name: s.name,
                    nameTh: s.name,
                    dosage: s.dosage || '',
                    time: (s.times || [])[0] || '08:00',
                    purpose: s.purpose || '',
                    icon: '💊',
                }));
                setMedications(mapped);
            }
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const toggleMed = (id) => {
        setTakenMeds((prev) => {
            const next = { ...prev, [id]: !prev[id] };
            // Sync to Firestore (fire-and-forget)
            saveMedStatus(userId, todayKey, next);
            return next;
        });
    };

    const takenCount = Object.values(takenMeds).filter(Boolean).length;
    const totalCount = medications.length;
    const progress = totalCount > 0 ? (takenCount / totalCount) * 100 : 0;

    const timeGroups = medications.reduce((acc, med) => {
        if (!acc[med.time]) acc[med.time] = [];
        acc[med.time].push(med);
        return acc;
    }, {});

    const timeLabels = {
        '08:00': { label: 'เช้า (Morning)', icon: '🌅' },
        '12:00': { label: 'กลางวัน (Afternoon)', icon: '☀️' },
        '18:00': { label: 'เย็น (Evening)', icon: '🌇' },
    };

    return (
        <div className="pb-safe-bottom px-4 pt-4 space-y-5">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-ink mb-1">💊 ยาประจำวัน</h2>
                <p className="text-ink-light text-base">Daily Medications</p>
            </div>

            {/* Progress Card */}
            <div className="card bg-gradient-to-r from-saffron-50 to-serenity-green-light">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="text-lg font-semibold text-ink">ทานยาแล้ว</p>
                        <p className="text-3xl font-bold text-saffron">
                            {takenCount} <span className="text-xl text-ink-light font-normal">/ {totalCount}</span>
                        </p>
                    </div>
                    <div className="w-20 h-20 relative">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={progress === 100 ? '#27AE60' : '#E67E22'} strokeWidth="3" strokeDasharray={`${progress}, 100`} strokeLinecap="round" className="transition-all duration-700 ease-out" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            {progress === 100 ? <span className="text-2xl">✅</span> : <span className="text-lg font-bold text-saffron">{Math.round(progress)}%</span>}
                        </div>
                    </div>
                </div>
                {progress === 100 && (
                    <div className="text-center py-2 animate-fade-in-up">
                        <p className="text-serenity-green font-semibold text-lg">🎉 ทานยาครบทุกมื้อแล้ว! เก่งมากค่ะ</p>
                    </div>
                )}
            </div>

            {/* Medication List */}
            <div className="space-y-4 stagger-children">
                {Object.entries(timeGroups).map(([time, meds]) => (
                    <div key={time}>
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <span className="text-xl">{timeLabels[time]?.icon || '⏰'}</span>
                            <span className="font-semibold text-ink text-lg">{timeLabels[time]?.label || time}</span>
                            <Clock size={16} className="text-ink-lighter ml-1" />
                            <span className="text-ink-lighter text-sm">{time}</span>
                        </div>
                        <div className="space-y-2">
                            {meds.map((med) => {
                                const taken = takenMeds[med.id];
                                return (
                                    <div key={med.id} onClick={() => toggleMed(med.id)}
                                        className={`card flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all duration-300 ${taken ? 'bg-serenity-green-light border border-serenity-green/20' : ''}`}>
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${taken ? 'bg-serenity-green text-white' : 'bg-cream border-2 border-ink-lighter/30'}`}>
                                            {taken ? <Check size={28} className="animate-checkmark" /> : <span className="text-2xl">{med.icon}</span>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-lg font-semibold transition-all ${taken ? 'text-ink-lighter line-through' : 'text-ink'}`}>{med.nameTh}</p>
                                            <p className="text-sm text-ink-lighter">{med.name} · {med.dosage}</p>
                                            <p className="text-xs text-ink-lighter mt-0.5">{med.purpose}</p>
                                        </div>
                                        <div className={`px-3 py-1.5 rounded-full text-sm font-semibold shrink-0 ${taken ? 'bg-serenity-green text-white' : 'bg-saffron-50 text-saffron'}`}>
                                            {taken ? 'ทานแล้ว ✓' : 'ยังไม่ทาน'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="card text-center bg-saffron-50/50">
                <Pill size={24} className="text-saffron mx-auto mb-2" />
                <p className="text-ink-light text-base">💡 แตะที่ยาแต่ละตัวเพื่อบันทึกว่าทานแล้ว</p>
                <p className="text-ink-lighter text-sm mt-1">ข้อมูลจะถูกบันทึกอัตโนมัติ ✓</p>
            </div>

            {onManage && (
                <button
                    onClick={onManage}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-saffron text-saffron font-semibold text-lg active:scale-95 transition-all"
                >
                    <Plus size={20} />
                    จัดการรายการยา
                </button>
            )}
        </div>
    );
}
