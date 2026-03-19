import { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend, Area, AreaChart,
} from 'recharts';
import { TrendingUp, Heart, Brain, RefreshCw } from 'lucide-react';
import { bloodPressureHistory, moodHistory } from '../data/mockData';
import PinLock from './PinLock';
import { getVitalHistory as fetchVitalHistory, getMoodHistory as fetchMoodHistory, getCurrentUserId as fetchUserId } from '../firebase';

const MOOD_SCORE = { happy: 5, neutral: 3, anxious: 2, sad: 2, pain: 1 };
const MOOD_EMOJI = { happy: '😊', neutral: '😐', anxious: '😰', sad: '😢', pain: '😣' };
const DAY_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function dayLabel(isoString) {
    const d = new Date(isoString);
    return DAY_TH[d.getDay()];
}

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-3 border border-cream-dark">
                <p className="font-semibold text-ink">{label}</p>
                {payload.map((e, i) => (
                    <p key={i} className="text-sm" style={{ color: e.color }}>
                        {e.name}: <strong>{e.value}</strong>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

function BPChart({ data }) {
    return (
        <div className="card">
            <div className="flex items-center gap-2 mb-4">
                <Heart size={22} className="text-danger" />
                <h3 className="text-lg font-bold text-ink">ความดันโลหิต 7 วัน</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE3" />
                    <XAxis dataKey="day" tick={{ fontSize: 13, fill: '#5D6D7E' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
                    <YAxis domain={[60, 160]} tick={{ fontSize: 12, fill: '#5D6D7E' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '13px' }} iconType="circle" />
                    <Line type="monotone" dataKey="systolic" name="ตัวบน" stroke="#E74C3C" strokeWidth={3} dot={{ r: 5, fill: '#E74C3C' }} activeDot={{ r: 7 }} />
                    <Line type="monotone" dataKey="diastolic" name="ตัวล่าง" stroke="#3498DB" strokeWidth={3} dot={{ r: 5, fill: '#3498DB' }} activeDot={{ r: 7 }} />
                </LineChart>
            </ResponsiveContainer>
            <div className="mt-3 flex gap-3 text-sm">
                <span className="flex items-center gap-1 px-3 py-1.5 bg-serenity-green-light rounded-full">
                    <span className="w-2 h-2 rounded-full bg-serenity-green" />
                    <span className="text-ink-light">ปกติ: &lt;130/85</span>
                </span>
                <span className="flex items-center gap-1 px-3 py-1.5 bg-danger-light rounded-full">
                    <span className="w-2 h-2 rounded-full bg-danger" />
                    <span className="text-ink-light">สูง: &gt;140/90</span>
                </span>
            </div>
        </div>
    );
}

function MoodChart({ data }) {
    return (
        <div className="card">
            <div className="flex items-center gap-2 mb-4">
                <Brain size={22} className="text-serenity-purple" />
                <h3 className="text-lg font-bold text-ink">อารมณ์ 7 วัน</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#E67E22" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#E67E22" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE3" />
                    <XAxis dataKey="day" tick={{ fontSize: 13, fill: '#5D6D7E' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
                    <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 12, fill: '#5D6D7E' }} tickLine={false} axisLine={false}
                        tickFormatter={(v) => ({ 1: '😣', 2: '😢', 3: '😐', 4: '😊', 5: '😄' }[v] || v)} />
                    <Tooltip content={({ active, payload, label }) => {
                        if (active && payload?.length) {
                            const d = payload[0].payload;
                            return (
                                <div className="bg-white rounded-xl shadow-lg p-3 border border-cream-dark">
                                    <p className="font-semibold text-ink">{label}</p>
                                    <p className="text-2xl">{d.emoji}</p>
                                    <p className="text-sm text-ink-light">{d.mood}</p>
                                </div>
                            );
                        }
                        return null;
                    }} />
                    <Area type="monotone" dataKey="score" stroke="#E67E22" strokeWidth={3} fill="url(#moodGrad)"
                        dot={{ r: 6, fill: '#E67E22', stroke: '#FFF', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                </AreaChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-wrap gap-2">
                {data.map((e, i) => (
                    <span key={i} className="flex items-center gap-1 px-3 py-1.5 bg-cream rounded-full">
                        <span className="text-lg">{e.emoji}</span>
                        <span className="text-sm text-ink-light">{e.day}</span>
                    </span>
                ))}
            </div>
        </div>
    );
}

function buildBPChart(vitalRecords) {
    const bpRecords = vitalRecords.filter((r) => r.type === 'bloodPressure');
    if (bpRecords.length < 2) return null;
    // Group by day, take last record per day
    const byDay = {};
    bpRecords.forEach((r) => {
        const key = r.dateKey || r.timestamp?.slice(0, 10) || '';
        byDay[key] = r;
    });
    return Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-7)
        .map(([, r]) => ({
            day: dayLabel(r.timestamp || r.savedAt),
            systolic: Number(r.values?.systolic || 0),
            diastolic: Number(r.values?.diastolic || 0),
        }));
}

function buildMoodChart(moodEntries) {
    if (moodEntries.length < 2) return null;
    const byDay = {};
    moodEntries.forEach((e) => {
        const key = e.dateKey || e.timestamp?.slice(0, 10) || '';
        byDay[key] = e;
    });
    return Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-7)
        .map(([, e]) => ({
            day: dayLabel(e.timestamp || e.savedAt),
            score: MOOD_SCORE[e.mood] || 3,
            emoji: MOOD_EMOJI[e.mood] || '😐',
            mood: e.label || e.mood,
        }));
}

function avgBP(records) {
    const bp = records.filter((r) => r.type === 'bloodPressure');
    if (!bp.length) return null;
    const avgS = Math.round(bp.reduce((s, r) => s + Number(r.values?.systolic || 0), 0) / bp.length);
    const avgD = Math.round(bp.reduce((s, r) => s + Number(r.values?.diastolic || 0), 0) / bp.length);
    return `${avgS}/${avgD}`;
}

function avgMoodScore(entries) {
    if (!entries.length) return null;
    const avg = entries.reduce((s, e) => s + (MOOD_SCORE[e.mood] || 3), 0) / entries.length;
    return avg.toFixed(1);
}

export default function HealthAnalytics() {
    const [unlocked, setUnlocked] = useState(false);
    const [loading, setLoading] = useState(false);
    const [bpData, setBpData] = useState(bloodPressureHistory);
    const [moodData, setMoodData] = useState(moodHistory);
    const [avgBPVal, setAvgBPVal] = useState('128/82');
    const [avgMoodVal, setAvgMoodVal] = useState('3.4');
    const [hasRealData, setHasRealData] = useState(false);

    useEffect(() => {
        if (!unlocked) return;
        setLoading(true);
        (async () => {
            try {
                const uid = await fetchUserId();
                const [vitals, moods] = await Promise.all([fetchVitalHistory(uid, 7), fetchMoodHistory(uid, 7)]);

                const bpChart = buildBPChart(vitals);
                const moodChart = buildMoodChart(moods);

                if (bpChart?.length) { setBpData(bpChart); setAvgBPVal(avgBP(vitals) || '128/82'); setHasRealData(true); }
                if (moodChart?.length) { setMoodData(moodChart); setAvgMoodVal(avgMoodScore(moods) || '3.4'); setHasRealData(true); }
            } catch {
                // Fallback to mock data — no action needed
            } finally {
                setLoading(false);
            }
        })();
    }, [unlocked]);

    if (!unlocked) return <PinLock onUnlock={() => setUnlocked(true)} />;

    return (
        <div className="pb-safe-bottom px-4 pt-4 space-y-5">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-ink mb-1">📈 สถิติสุขภาพ</h2>
                <p className="text-ink-light text-base">
                    {hasRealData ? 'ข้อมูลจริงจากการบันทึกของคุณ' : 'Health & Heart Analytics'}
                </p>
            </div>

            {loading && (
                <div className="flex items-center justify-center gap-2 py-3 text-ink-lighter">
                    <RefreshCw size={18} className="animate-spin" />
                    <span>กำลังโหลดข้อมูล...</span>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <div className="card text-center">
                    <TrendingUp size={24} className="text-serenity-green mx-auto mb-2" />
                    <p className="text-sm text-ink-lighter">ค่าเฉลี่ย BP</p>
                    <p className="text-2xl font-bold text-ink">{avgBPVal}</p>
                    <p className="text-xs text-serenity-green font-medium mt-1">ปกติ ✓</p>
                </div>
                <div className="card text-center">
                    <Heart size={24} className="text-saffron mx-auto mb-2" />
                    <p className="text-sm text-ink-lighter">อารมณ์เฉลี่ย</p>
                    <p className="text-2xl font-bold text-ink">{avgMoodVal}/5</p>
                    <p className="text-xs text-saffron font-medium mt-1">😊 สุขใจ</p>
                </div>
            </div>

            <div className="space-y-5 stagger-children">
                <BPChart data={bpData} />
                <MoodChart data={moodData} />
            </div>

            {!hasRealData && (
                <p className="text-center text-sm text-ink-lighter px-4">
                    💡 บันทึกสุขภาพและเช็กอารมณ์สักพัก แล้วกราฟจะแสดงข้อมูลจริงของคุณ
                </p>
            )}
        </div>
    );
}
