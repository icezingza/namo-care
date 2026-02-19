import { useState } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend, Area, AreaChart,
} from 'recharts';
import { TrendingUp, Heart, Brain } from 'lucide-react';
import { bloodPressureHistory, moodHistory } from '../data/mockData';
import PinLock from './PinLock';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-3 border border-cream-dark">
                <p className="font-semibold text-ink">{label}</p>
                {payload.map((entry, i) => (
                    <p key={i} className="text-sm" style={{ color: entry.color }}>
                        {entry.name}: <strong>{entry.value}</strong>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

function BPChart() {
    return (
        <div className="card">
            <div className="flex items-center gap-2 mb-4">
                <Heart size={22} className="text-danger" />
                <h3 className="text-lg font-bold text-ink">ความดันโลหิต 7 วัน</h3>
            </div>
            <p className="text-sm text-ink-lighter mb-4">Blood Pressure Trend (7 Days)</p>
            <ResponsiveContainer width="100%" height={240}>
                <LineChart data={bloodPressureHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE3" />
                    <XAxis
                        dataKey="day"
                        tick={{ fontSize: 14, fill: '#5D6D7E' }}
                        tickLine={false}
                        axisLine={{ stroke: '#E5E7EB' }}
                    />
                    <YAxis
                        domain={[60, 160]}
                        tick={{ fontSize: 12, fill: '#5D6D7E' }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        wrapperStyle={{ fontSize: '14px' }}
                        iconType="circle"
                    />
                    <Line
                        type="monotone"
                        dataKey="systolic"
                        name="ตัวบน (Systolic)"
                        stroke="#E74C3C"
                        strokeWidth={3}
                        dot={{ r: 5, fill: '#E74C3C' }}
                        activeDot={{ r: 7 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="diastolic"
                        name="ตัวล่าง (Diastolic)"
                        stroke="#3498DB"
                        strokeWidth={3}
                        dot={{ r: 5, fill: '#3498DB' }}
                        activeDot={{ r: 7 }}
                    />
                </LineChart>
            </ResponsiveContainer>

            {/* Reference Values */}
            <div className="mt-4 flex gap-3 text-sm">
                <div className="flex items-center gap-1 px-3 py-1.5 bg-serenity-green-light rounded-full">
                    <span className="w-2 h-2 rounded-full bg-serenity-green" />
                    <span className="text-ink-light">ปกติ: &lt;130/85</span>
                </div>
                <div className="flex items-center gap-1 px-3 py-1.5 bg-danger-light rounded-full">
                    <span className="w-2 h-2 rounded-full bg-danger" />
                    <span className="text-ink-light">สูง: &gt;140/90</span>
                </div>
            </div>
        </div>
    );
}

function MoodChart() {
    return (
        <div className="card">
            <div className="flex items-center gap-2 mb-4">
                <Brain size={22} className="text-serenity-purple" />
                <h3 className="text-lg font-bold text-ink">อารมณ์ 7 วัน</h3>
            </div>
            <p className="text-sm text-ink-lighter mb-4">Emotional Weather (7 Days)</p>
            <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={moodHistory}>
                    <defs>
                        <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#E67E22" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#E67E22" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE3" />
                    <XAxis
                        dataKey="day"
                        tick={{ fontSize: 14, fill: '#5D6D7E' }}
                        tickLine={false}
                        axisLine={{ stroke: '#E5E7EB' }}
                    />
                    <YAxis
                        domain={[0, 5]}
                        ticks={[1, 2, 3, 4, 5]}
                        tick={{ fontSize: 12, fill: '#5D6D7E' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => {
                            const labels = { 1: '😣', 2: '😢', 3: '😐', 4: '😊', 5: '😄' };
                            return labels[v] || v;
                        }}
                    />
                    <Tooltip
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                    <div className="bg-white rounded-xl shadow-lg p-3 border border-cream-dark">
                                        <p className="font-semibold text-ink">{label}</p>
                                        <p className="text-2xl">{data.emoji}</p>
                                        <p className="text-sm text-ink-light capitalize">{data.mood}</p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="score"
                        name="Mood Score"
                        stroke="#E67E22"
                        strokeWidth={3}
                        fill="url(#moodGradient)"
                        dot={{ r: 6, fill: '#E67E22', stroke: '#FFF', strokeWidth: 2 }}
                        activeDot={{ r: 8 }}
                    />
                </AreaChart>
            </ResponsiveContainer>

            {/* Mood Summary */}
            <div className="mt-4 flex flex-wrap gap-2">
                {moodHistory.map((entry, i) => (
                    <div key={i} className="flex items-center gap-1 px-3 py-1.5 bg-cream rounded-full">
                        <span className="text-lg">{entry.emoji}</span>
                        <span className="text-sm text-ink-light">{entry.day}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function HealthAnalytics() {
    const [unlocked, setUnlocked] = useState(false);

    if (!unlocked) {
        return <PinLock onUnlock={() => setUnlocked(true)} />;
    }

    return (
        <div className="pb-safe-bottom px-4 pt-4 space-y-5">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-2xl font-bold text-ink mb-1">📈 สถิติสุขภาพ</h2>
                <p className="text-ink-light text-base">Health & Heart Analytics</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="card text-center">
                    <TrendingUp size={24} className="text-serenity-green mx-auto mb-2" />
                    <p className="text-sm text-ink-lighter">ค่าเฉลี่ย BP</p>
                    <p className="text-2xl font-bold text-ink">128/82</p>
                    <p className="text-xs text-serenity-green font-medium mt-1">ปกติ ✓</p>
                </div>
                <div className="card text-center">
                    <Heart size={24} className="text-saffron mx-auto mb-2" />
                    <p className="text-sm text-ink-lighter">อารมณ์เฉลี่ย</p>
                    <p className="text-2xl font-bold text-ink">3.4/5</p>
                    <p className="text-xs text-saffron font-medium mt-1">😊 สุขใจ</p>
                </div>
            </div>

            {/* Charts */}
            <div className="space-y-5 stagger-children">
                <BPChart />
                <MoodChart />
            </div>
        </div>
    );
}
