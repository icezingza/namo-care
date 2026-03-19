import { useState, useEffect } from 'react';
import { Bell, Heart, Activity, Pill, RefreshCw, CheckCircle, AlertTriangle, Clock, ShieldCheck } from 'lucide-react';
import { getAlerts, getDailyCheckins, getBehaviorSignals, getCurrentUserId } from '../firebase';
import { useLocalStorage, getTodayKey, formatThaiDate } from '../hooks/useLocalStorage';
import PinLock from './PinLock';

const CAREGIVER_PIN = '5678';

const SEVERITY_CONFIG = {
    critical: { bg: 'bg-danger-light', border: 'border-danger', text: 'text-danger', label: 'วิกฤต', icon: '🚨' },
    high: { bg: 'bg-warm-light', border: 'border-warm', text: 'text-warm', label: 'สูง', icon: '⚠️' },
    medium: { bg: 'bg-saffron-50', border: 'border-saffron', text: 'text-saffron', label: 'ปานกลาง', icon: '🔔' },
    low: { bg: 'bg-serenity-green-light', border: 'border-serenity-green', text: 'text-serenity-green', label: 'ต่ำ', icon: 'ℹ️' },
};

const ALERT_TYPE_LABEL = {
    emergency: 'ฉุกเฉิน',
    inactivity: 'ไม่มีความเคลื่อนไหว',
    emotion: 'อารมณ์',
    medication_missed: 'ลืมทานยา',
    no_checkin: 'ไม่เช็กอิน',
};

const MOOD_EMOJI = { happy: '😊', neutral: '😐', sad: '😢', anxious: '😰', pain: '😣' };

function formatTime(isoStr) {
    if (!isoStr) return '';
    try {
        return new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' }).format(new Date(isoStr));
    } catch { return ''; }
}

function AlertCard({ alert }) {
    const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;
    return (
        <div className={`rounded-2xl p-4 border ${cfg.bg} ${cfg.border} animate-fade-in-up`}>
            <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-bold ${cfg.text}`}>{cfg.label}</span>
                        <span className="text-sm text-ink-lighter">{ALERT_TYPE_LABEL[alert.type] || alert.type}</span>
                        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${alert.status === 'acknowledged' ? 'bg-serenity-green-light text-serenity-green' : 'bg-danger-light text-danger'}`}>
                            {alert.status === 'acknowledged' ? 'รับทราบแล้ว' : 'รอดำเนินการ'}
                        </span>
                    </div>
                    <p className="text-base font-semibold text-ink mt-1">{alert.title}</p>
                    {alert.detail && <p className="text-sm text-ink-light mt-0.5">{alert.detail}</p>}
                    <p className="text-xs text-ink-lighter mt-1">{formatTime(alert.triggeredAt)}</p>
                </div>
            </div>
        </div>
    );
}

function CheckinRow({ checkin }) {
    const statusConfig = {
        responded: { icon: '✅', text: 'ตอบแล้ว', color: 'text-serenity-green' },
        no_response: { icon: '❌', text: 'ไม่ตอบ', color: 'text-danger' },
        pending: { icon: '⏳', text: 'รอตอบ', color: 'text-warm' },
    };
    const s = statusConfig[checkin.status] || statusConfig.pending;
    return (
        <div className="flex items-center gap-3 py-2 px-3 rounded-xl bg-cream">
            <span className="text-xl">{s.icon}</span>
            <span className="text-ink text-base">{checkin.dateKey || checkin.scheduledAt?.slice(0, 10)}</span>
            <span className={`ml-auto text-sm font-semibold ${s.color}`}>{s.text}</span>
            {checkin.response?.emotionLabel && (
                <span className="text-lg">{MOOD_EMOJI[checkin.response.emotionLabel] || '😐'}</span>
            )}
        </div>
    );
}

function SignalBadge({ signal }) {
    const cfg = SEVERITY_CONFIG[signal.severity] || SEVERITY_CONFIG.low;
    const typeLabel = { silence: '🔇 เงียบ', emotion: '💭 อารมณ์', adherence: '💊 ยา', checkin: '📋 เช็กอิน' };
    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${cfg.bg} ${cfg.border}`}>
            <span className="text-base">{typeLabel[signal.signalType] || signal.signalType}</span>
            <span className={`ml-auto text-sm font-bold ${cfg.text}`}>{signal.score}/100</span>
        </div>
    );
}

// Derive simple summary from localStorage data when Firestore data isn't available
function useLocalSummary() {
    const todayKey = getTodayKey();
    const [moodLog] = useLocalStorage('namo_mood_log', []);
    const [takenMeds] = useLocalStorage(`namo_meds_${todayKey}`, {});
    const [vitalRecords] = useLocalStorage('namo_vital_records', []);

    const todayMoods = moodLog.filter((e) => e.dateKey === todayKey);
    const latestMood = todayMoods[0];
    const takenCount = Object.values(takenMeds).filter(Boolean).length;
    const todayVitals = vitalRecords.filter((r) => r.dateKey === todayKey);
    const latestBP = todayVitals.find((r) => r.type === 'bloodPressure');

    return { latestMood, takenCount, latestBP };
}

export default function CaregiverDashboard() {
    const [unlocked, setUnlocked] = useState(false);

    if (!unlocked) {
        return (
            <PinLock
                pin={CAREGIVER_PIN}
                title="แดชบอร์ดผู้ดูแล 👨‍👩‍👧"
                hint={`PIN ผู้ดูแล: ${CAREGIVER_PIN}`}
                onUnlock={() => setUnlocked(true)}
            />
        );
    }

    return <CaregiverContent />;
}

function CaregiverContent() {
    const [alerts, setAlerts] = useState([]);
    const [checkins, setCheckins] = useState([]);
    const [signals, setSignals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(null);
    const { latestMood, takenCount, latestBP } = useLocalSummary();

    const load = async () => {
        setLoading(true);
        try {
            const uid = await getCurrentUserId();
            const [a, c, s] = await Promise.all([
                getAlerts(uid, 10),
                getDailyCheckins(uid, 7),
                getBehaviorSignals(uid, 8),
            ]);
            setAlerts(a);
            setCheckins(c);
            setSignals(s);
            setLastRefresh(new Date());
        } catch {
            // Fail silently — show local data only
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const openAlerts = alerts.filter((a) => a.status !== 'acknowledged' && a.status !== 'resolved');

    return (
        <div className="pb-safe-bottom px-4 pt-4 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-ink">👨‍👩‍👧 ผู้ดูแล</h2>
                    <p className="text-ink-lighter text-sm">{formatThaiDate(new Date())}</p>
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    className="p-2 rounded-xl bg-cream-dark active:scale-90 transition-all"
                    aria-label="รีเฟรช"
                >
                    <RefreshCw size={20} className={`text-ink-light ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Today's quick summary from local data */}
            <div className="grid grid-cols-3 gap-2">
                <div className="card px-2 py-3 text-center">
                    <span className="text-2xl">{latestMood ? MOOD_EMOJI[latestMood.mood] : '—'}</span>
                    <p className="text-xs text-ink-lighter mt-1">อารมณ์วันนี้</p>
                    <p className="text-sm font-semibold text-ink">{latestMood?.label || 'ยังไม่เช็ก'}</p>
                </div>
                <div className="card px-2 py-3 text-center">
                    <Pill size={20} className="mx-auto mb-1 text-saffron" />
                    <p className="text-lg font-bold text-ink">{takenCount}</p>
                    <p className="text-xs text-ink-lighter">มื้อยาวันนี้</p>
                </div>
                <div className="card px-2 py-3 text-center">
                    <Activity size={18} className="mx-auto mb-1 text-danger" />
                    <p className="text-sm font-bold text-ink">
                        {latestBP ? `${latestBP.values?.systolic}/${latestBP.values?.diastolic}` : '—'}
                    </p>
                    <p className="text-xs text-ink-lighter">ความดัน</p>
                </div>
            </div>

            {/* Active Alerts */}
            <div className="space-y-3">
                <h3 className="font-bold text-ink text-lg flex items-center gap-2">
                    <Bell size={20} className="text-danger" />
                    การแจ้งเตือน
                    {openAlerts.length > 0 && (
                        <span className="ml-auto bg-danger text-white text-sm px-2.5 py-0.5 rounded-full font-bold">
                            {openAlerts.length}
                        </span>
                    )}
                </h3>

                {loading && (
                    <div className="card text-center py-6 text-ink-lighter">
                        <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
                        <p>กำลังโหลดข้อมูล...</p>
                    </div>
                )}

                {!loading && alerts.length === 0 && (
                    <div className="card text-center py-6">
                        <CheckCircle size={32} className="mx-auto mb-2 text-serenity-green" />
                        <p className="font-semibold text-ink">ไม่มีการแจ้งเตือนใหม่</p>
                        <p className="text-sm text-ink-lighter mt-1">ทุกอย่างปกติดี 🙏</p>
                    </div>
                )}

                {alerts.slice(0, 5).map((a, i) => <AlertCard key={a.id || i} alert={a} />)}
            </div>

            {/* Risk Signals */}
            {signals.length > 0 && (
                <div className="space-y-3">
                    <h3 className="font-bold text-ink text-lg flex items-center gap-2">
                        <AlertTriangle size={20} className="text-warm" />
                        สัญญาณความเสี่ยง
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        {signals.slice(0, 4).map((s, i) => <SignalBadge key={s.id || i} signal={s} />)}
                    </div>
                </div>
            )}

            {/* Check-in History */}
            <div className="space-y-3">
                <h3 className="font-bold text-ink text-lg flex items-center gap-2">
                    <Clock size={20} className="text-serenity-blue" />
                    เช็กอิน 7 วัน
                </h3>
                {!loading && checkins.length === 0 && (
                    <p className="text-ink-lighter text-sm px-1">ยังไม่มีข้อมูลเช็กอินจาก LINE Bot</p>
                )}
                <div className="space-y-1.5">
                    {checkins.slice(0, 7).map((c, i) => <CheckinRow key={c.id || i} checkin={c} />)}
                </div>
            </div>

            {lastRefresh && (
                <p className="text-center text-xs text-ink-lighter pb-2">
                    อัปเดตล่าสุด: {formatTime(lastRefresh.toISOString())}
                </p>
            )}
        </div>
    );
}
