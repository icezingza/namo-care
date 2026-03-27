import { useState, useMemo } from 'react';
import {
  Heart,
  Activity,
  Droplets,
  Phone,
  ClipboardPlus,
  Pill,
  MessageCircleHeart,
  Watch,
  ArrowRight,
  GlassWater,
  Plus,
  Minus,
  Sparkles,
  SmilePlus,
} from 'lucide-react';
import { vitalSigns, userProfile, medications as mockMedications } from '../data/mockData';
import { useLocalStorage, getTodayKey, formatThaiDate } from '../hooks/useLocalStorage';
import { useUserProfile } from '../hooks/useUserProfile';
import { generateDharmaAdvice } from '../data/dharma_quotes';
import { saveSOSAlert, saveMedStatus } from '../firebase';

// Extract latest value for each vital type from recorded history
function useLatestVitals() {
  const [records] = useLocalStorage('namo_vital_records', []);
  return useMemo(() => {
    const latest = {};
    records.forEach((r) => {
      if (!latest[r.type] || r.timestamp > latest[r.type].timestamp) {
        latest[r.type] = r;
      }
    });
    return {
      bloodPressure: latest.bloodPressure
        ? { systolic: Number(latest.bloodPressure.values?.systolic), diastolic: Number(latest.bloodPressure.values?.diastolic) }
        : { systolic: vitalSigns.bloodPressure.systolic, diastolic: vitalSigns.bloodPressure.diastolic },
      heartRate: latest.heartRate
        ? { value: Number(latest.heartRate.values?.value) }
        : { value: vitalSigns.heartRate.value },
      bloodSugar: latest.bloodSugar
        ? { value: Number(latest.bloodSugar.values?.value) }
        : { value: vitalSigns.bloodSugar.value },
      hasRealData: !!(latest.bloodPressure || latest.heartRate || latest.bloodSugar),
      lastRecordedAt: latest.bloodPressure?.timestamp || latest.heartRate?.timestamp || null,
    };
  }, [records]);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return { text: 'ยังไม่นอนเหรอคะ พักผ่อนด้วยนะคะ', emoji: '🌙' };
  if (hour < 12) return { text: 'อรุณสวัสดิ์ค่ะ วันนี้ยิ้มแล้วหรือยัง?', emoji: '🌤️' };
  if (hour < 17) return { text: 'สวัสดีตอนบ่าย อย่าลืมดื่มน้ำค่ะ', emoji: '☀️' };
  if (hour < 20) return { text: 'สวัสดีตอนเย็น วันนี้เป็นอย่างไรบ้าง?', emoji: '🌇' };
  return { text: 'ราตรีสวัสดิ์ค่ะ พักผ่อนให้สบาย', emoji: '🌙' };
}

function getEmergencyPhone() {
  try {
    const raw = window.localStorage.getItem('namo_emergency');
    if (!raw) return userProfile.emergencyContact;
    const contact = JSON.parse(raw);
    return contact?.phone || userProfile.emergencyContact;
  } catch {
    return userProfile.emergencyContact;
  }
}

function singleGeoAttempt(timeout) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        status: 'ok',
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracyMeters: Math.round(pos.coords.accuracy),
        error: null,
      }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout, maximumAge: 30000 },
    );
  });
}

async function getLocationSnapshot() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { status: 'unavailable', latitude: null, longitude: null, accuracyMeters: null, error: 'geolocation_not_supported' };
  }
  const timeouts = [8000, 12000, 16000];
  for (const timeout of timeouts) {
    try {
      return await singleGeoAttempt(timeout);
    } catch { /* retry */ }
  }
  // All attempts exhausted — return degraded payload (no lat/lng)
  return { status: 'error', latitude: null, longitude: null, accuracyMeters: null, error: 'location_unavailable_after_retries' };
}

function useHealthScore(todayKey, takenMeds, vitals) {
  const [moodLog] = useLocalStorage('namo_mood_log', []);
  const [glasses] = useLocalStorage(`namo_water_${todayKey}`, 0);

  return useMemo(() => {
    let score = 0;

    // Vitals (30 pts)
    const { systolic, diastolic } = vitals.bloodPressure;
    score += systolic < 140 && diastolic < 90 ? 30 : systolic < 160 ? 15 : 0;

    // Medication (30 pts)
    const totalMeds = mockMedications.length;
    const taken = Object.values(takenMeds).filter(Boolean).length;
    score += totalMeds > 0 ? Math.round((taken / totalMeds) * 30) : 30;

    // Mood (25 pts)
    const todayMood = moodLog.find((e) => e.dateKey === todayKey);
    const moodPts = { happy: 25, neutral: 15, anxious: 10, sad: 8, pain: 5 };
    score += todayMood ? (moodPts[todayMood.mood] || 10) : 0;

    // Water (15 pts)
    score += Math.round(Math.min(glasses / 8, 1) * 15);

    const pct = Math.min(score, 100);
    const label = pct >= 80 ? 'ดีมาก' : pct >= 60 ? 'ดี' : pct >= 40 ? 'พอใช้' : 'ต้องดูแล';
    const emoji = pct >= 80 ? '🌟' : pct >= 60 ? '😊' : pct >= 40 ? '😐' : '⚠️';
    const color = pct >= 80 ? 'text-serenity-green' : pct >= 60 ? 'text-saffron' : 'text-warm';
    return { pct, label, emoji, color };
  }, [moodLog, takenMeds, glasses, vitals, todayKey]);
}

function TodayOverview({ onNavigate }) {
  const todayKey = getTodayKey();
  const [moodLog] = useLocalStorage('namo_mood_log', []);
  const [takenMeds] = useLocalStorage(`namo_meds_${todayKey}`, {});
  const [glasses] = useLocalStorage(`namo_water_${todayKey}`, 0);

  // Fix: use dateKey (not date) — matches MoodTracker entry shape
  const todayMoodCount = useMemo(
    () => moodLog.filter((e) => e.dateKey === todayKey).length,
    [moodLog, todayKey]
  );
  const takenCount = Object.values(takenMeds).filter(Boolean).length;
  const totalMeds = mockMedications.length;

  const items = [
    {
      label: 'อารมณ์วันนี้',
      value: todayMoodCount > 0 ? `${todayMoodCount} รายการ` : 'ยังไม่บันทึก',
      emoji: todayMoodCount > 0 ? '😊' : '😶',
      ok: todayMoodCount > 0,
      tab: 'mood',
    },
    {
      label: 'ทานยา',
      value: `${takenCount}/${totalMeds} มื้อ`,
      emoji: takenCount >= totalMeds ? '✅' : '💊',
      ok: takenCount >= totalMeds,
      tab: 'medications',
    },
    {
      label: 'ดื่มน้ำ',
      value: `${glasses}/8 แก้ว`,
      emoji: glasses >= 8 ? '🏆' : '💧',
      ok: glasses >= 8,
      tab: null,
    },
  ];

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <SmilePlus size={18} className="text-saffron" />
        <span className="font-semibold text-ink">สรุปวันนี้</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => item.tab && onNavigate?.(item.tab)}
            className={`rounded-2xl p-3 text-center transition-all active:scale-95 ${
              item.ok ? 'bg-serenity-green/10' : 'bg-cream'
            } ${item.tab ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className="text-2xl mb-1">{item.emoji}</div>
            <p className={`text-xs font-semibold ${item.ok ? 'text-serenity-green' : 'text-ink-lighter'}`}>
              {item.value}
            </p>
            <p className="text-[10px] text-ink-lighter mt-0.5">{item.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function WaterTracker() {
  const [glasses, setGlasses] = useLocalStorage(`namo_water_${getTodayKey()}`, 0);
  const goal = 8;
  const progress = Math.min((glasses / goal) * 100, 100);

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GlassWater size={20} className="text-serenity-blue" />
          <span className="font-semibold text-ink">ดื่มน้ำวันนี้</span>
        </div>
        <span className="text-sm text-ink-lighter">
          {glasses}/{goal} แก้ว
        </span>
      </div>

      <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-cream">
        <div
          className="h-full rounded-full bg-gradient-to-r from-serenity-blue to-serenity-green transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: goal }).map((_, i) => (
            <div
              key={i}
              className={`h-8 w-6 rounded-b-lg border-2 transition-all duration-300 ${
                i < glasses ? 'border-serenity-blue bg-serenity-blue/20' : 'border-ink-lighter/20 bg-cream'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setGlasses((g) => Math.max(0, g - 1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-cream-dark transition-transform active:scale-90"
            aria-label="ลดจำนวนแก้วน้ำ"
          >
            <Minus size={18} className="text-ink-light" />
          </button>
          <button
            onClick={() => setGlasses((g) => Math.min(goal + 4, g + 1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-serenity-blue text-white shadow-md transition-transform active:scale-90"
            aria-label="เพิ่มจำนวนแก้วน้ำ"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {glasses >= goal && (
        <p className="mt-2 text-center text-sm font-semibold text-serenity-green animate-fade-in-up">
          🎉 ดื่มน้ำครบเป้าหมายแล้ว เก่งมาก
        </p>
      )}
    </div>
  );
}

function DailyWisdom() {
  const [wisdom] = useState(() => generateDharmaAdvice('neutral'));

  return (
    <div className="card border border-saffron/10 bg-gradient-to-r from-saffron-50/80 to-warm-light/50">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles size={16} className="text-saffron" />
        <span className="text-sm font-semibold text-saffron">ธรรมะประจำวัน</span>
      </div>
      <p className="animate-breathe text-base italic leading-relaxed text-ink">&quot;{wisdom.quote.th}&quot;</p>
      <p className="mt-1 text-sm text-ink-lighter">- {wisdom.quote.source}</p>
    </div>
  );
}

function StatusCard({ emoji, title, description, children }) {
  return (
    <div className="text-white text-center">
      <div className="mb-4 text-7xl animate-pulse-gentle">{emoji}</div>
      <h2 className="mb-3 text-3xl font-bold">{title}</h2>
      <p className="mb-2 text-xl">{description}</p>
      {children}
    </div>
  );
}

export default function Dashboard({ user, onNavigate }) {
  const [showSOS, setShowSOS] = useState(false);
  const [sosStatus, setSosStatus] = useState('idle'); // idle, sending, success, error
  const [sosMessage, setSosMessage] = useState('');
  const [sosReference, setSosReference] = useState('');
  const [medConfirm, setMedConfirm] = useState(false);
  const [takenMeds, setTakenMeds] = useLocalStorage(`namo_meds_${getTodayKey()}`, {});

  const greeting = getGreeting();
  const emergencyPhone = getEmergencyPhone();
  const vitals = useLatestVitals();
  const [profile] = useUserProfile();
  const healthScore = useHealthScore(getTodayKey(), takenMeds, vitals);

  const handleMedConfirm = () => {
    // Mark the first untaken mock medication as taken
    const firstUntaken = mockMedications.find((m) => !takenMeds[m.id]);
    if (firstUntaken) {
      const next = { ...takenMeds, [firstUntaken.id]: true };
      setTakenMeds(next);
      saveMedStatus(user?.uid || 'local_user', getTodayKey(), next);
    }
    setMedConfirm(true);
    setTimeout(() => setMedConfirm(false), 2000);
  };

  const closeSOSOverlay = () => {
    setShowSOS(false);
    setSosStatus('idle');
    setSosMessage('');
    setSosReference('');
  };

  const handleTriggerSOS = async () => {
    setShowSOS(true);
    setSosStatus('sending');
    setSosReference('');
    setSosMessage('กำลังส่งพิกัด GPS และค่าชีพจรล่าสุดไปยังผู้ดูแล...');

    const location = await getLocationSnapshot();
    const payload = {
      patient: {
        uid: user?.uid || null,
        displayName: user?.displayName || userProfile.name,
        lineId: userProfile.lineId,
      },
      caregiver: {
        emergencyPhone,
      },
      vitals: {
        bloodPressure: { systolic: vitals.bloodPressure.systolic, diastolic: vitals.bloodPressure.diastolic, unit: 'mmHg' },
        heartRate: { value: vitals.heartRate.value, unit: 'bpm' },
        bloodSugar: { value: vitals.bloodSugar.value, unit: 'mg/dL' },
      },
      location,
      lastSync: vitals.lastRecordedAt || vitalSigns.lastSync,
      triggeredBy: 'elderly_app',
    };

    try {
      const result = await saveSOSAlert(payload);
      setSosStatus('success');
      setSosReference(result.id || '');
      setSosMessage(
        result.mocked
          ? 'บันทึก SOS ในโหมดจำลอง (ยังไม่ได้ตั้งค่า Firebase env)'
          : 'ส่งเหตุฉุกเฉินสำเร็จ ระบบสามารถให้ Cloud Function ยิง LINE ต่อได้ทันที',
      );
    } catch (error) {
      setSosStatus('error');
      setSosMessage(`ส่ง SOS ไม่สำเร็จ: ${error?.message || 'unknown_error'}`);
    }
  };

  const renderSOSStatus = () => {
    if (sosStatus === 'sending') {
      return (
        <StatusCard emoji="🆘" title="กำลังเรียกช่วยเหลือ..." description={`กำลังแจ้ง: ${emergencyPhone}`}>
          <p className="mb-6 text-base opacity-90">{sosMessage}</p>
        </StatusCard>
      );
    }

    if (sosStatus === 'success') {
      return (
        <StatusCard emoji="✅" title="ส่งแจ้งเหตุแล้ว" description={`แจ้งผู้ดูแล: ${emergencyPhone}`}>
          <p className="mb-2 text-base opacity-90">{sosMessage}</p>
          {sosReference && <p className="mb-6 text-sm opacity-75">Ref: {sosReference}</p>}
        </StatusCard>
      );
    }

    if (sosStatus === 'error') {
      return (
        <StatusCard emoji="⚠️" title="ส่งแจ้งเหตุไม่สำเร็จ" description={`ปลายทาง: ${emergencyPhone}`}>
          <p className="mb-6 text-base opacity-90">{sosMessage}</p>
        </StatusCard>
      );
    }

    return (
      <StatusCard emoji="🆘" title="ฉุกเฉิน" description={`ปลายทาง: ${emergencyPhone}`}>
        <p className="mb-6 text-base opacity-90">ระบบกำลังเตรียมข้อมูลฉุกเฉิน</p>
      </StatusCard>
    );
  };

  return (
    <div className="space-y-4 px-4 pb-safe-bottom pt-4">
      {showSOS && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-danger/90 p-6 animate-fade-in-up">
          {renderSOSStatus()}

          <div className="flex w-full max-w-sm gap-3">
            {sosStatus === 'error' && (
              <button
                onClick={handleTriggerSOS}
                className="flex-1 rounded-2xl bg-warm py-4 text-lg font-bold text-white transition-transform active:scale-95"
              >
                ลองส่งอีกครั้ง
              </button>
            )}

            <button
              onClick={closeSOSOverlay}
              disabled={sosStatus === 'sending'}
              className={`rounded-2xl bg-white py-4 px-8 text-xl font-bold text-danger transition-transform ${
                sosStatus === 'sending' ? 'cursor-not-allowed opacity-70' : 'active:scale-95'
              }`}
            >
              {sosStatus === 'sending' ? 'กำลังส่ง...' : 'ปิด'}
            </button>
          </div>
        </div>
      )}

      <p className="text-center text-sm text-ink-lighter">{formatThaiDate(new Date())}</p>

      <div className="card border border-saffron/10 bg-gradient-to-br from-saffron-50 via-white to-saffron-100/30">
        <div className="flex items-start gap-3">
          <div className="shrink-0 text-4xl">{greeting.emoji}</div>
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <MessageCircleHeart size={18} className="text-saffron" />
              <span className="text-sm font-semibold text-saffron">NaMo พูด</span>
            </div>
            <p className="text-xl font-semibold leading-relaxed text-ink">{greeting.text}</p>
            <p className="mt-1 text-base text-ink-light">
              {profile.name} {profile.avatar}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="card px-2 py-3 text-center">
          <Activity size={20} className="mx-auto mb-1 text-danger" />
          <p className="text-lg font-bold text-ink">
            {vitals.bloodPressure.systolic}/{vitals.bloodPressure.diastolic}
          </p>
          <p className="text-xs text-ink-lighter">ความดัน</p>
        </div>
        <div className="card px-2 py-3 text-center">
          <Heart size={20} className="mx-auto mb-1 text-saffron" />
          <p className="text-lg font-bold text-ink">{vitals.heartRate.value}</p>
          <p className="text-xs text-ink-lighter">ชีพจร</p>
        </div>
        <div className="card px-2 py-3 text-center">
          <Droplets size={20} className="mx-auto mb-1 text-serenity-blue" />
          <p className="text-lg font-bold text-ink">{vitals.bloodSugar.value}</p>
          <p className="text-xs text-ink-lighter">น้ำตาล</p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-1">
        <Watch size={14} className="text-serenity-blue" />
        <span className="text-xs text-ink-lighter">
          {vitals.hasRealData ? 'บันทึกล่าสุดจากแอป' : `ค่าเริ่มต้น (กรุณาบันทึกสุขภาพ)`}
        </span>
        {vitals.hasRealData && <span className="ml-1 h-2 w-2 rounded-full bg-serenity-green animate-pulse" />}
      </div>

      <button
        onClick={handleTriggerSOS}
        disabled={sosStatus === 'sending'}
        className={`w-full rounded-2xl py-5 px-6 text-xl font-bold text-white shadow-lg transition-all ${
          sosStatus === 'sending'
            ? 'cursor-wait bg-danger/80'
            : 'bg-danger animate-sos-pulse active:scale-95'
        }`}
      >
        <span className="flex items-center justify-center gap-3">
          <Phone size={28} />
          <span>{sosStatus === 'sending' ? 'กำลังส่งสัญญาณฉุกเฉิน...' : '🆘 เรียกช่วยเหลือฉุกเฉิน'}</span>
        </span>
      </button>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate?.('record')}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-serenity-blue py-5 px-4 text-lg font-semibold text-white shadow-md transition-all active:scale-95"
        >
          <ClipboardPlus size={32} />
          <span>บันทึกสุขภาพ</span>
        </button>
        <button
          onClick={handleMedConfirm}
          className={`flex flex-col items-center justify-center gap-2 rounded-2xl py-5 px-4 text-lg font-semibold text-white shadow-md transition-all active:scale-95 ${
            medConfirm ? 'bg-serenity-green' : 'bg-saffron'
          }`}
        >
          <Pill size={32} />
          <span>{medConfirm ? 'บันทึกแล้ว ✓' : 'ทานยาแล้ว'}</span>
        </button>
      </div>

      {/* Composite health score */}
      <div className="card flex items-center gap-4 bg-gradient-to-r from-saffron-50/60 to-warm-light/40">
        <div className="relative w-16 h-16 shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="#F0ECE3" strokeWidth="8" />
            <circle cx="32" cy="32" r="26" fill="none" stroke="#E67E22" strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 26}`}
              strokeDashoffset={`${2 * Math.PI * 26 * (1 - healthScore.pct / 100)}`}
              strokeLinecap="round" className="transition-all duration-700" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-ink">
            {healthScore.pct}
          </span>
        </div>
        <div>
          <p className="text-sm text-ink-lighter">สุขภาพวันนี้</p>
          <p className={`text-xl font-bold ${healthScore.color}`}>{healthScore.emoji} {healthScore.label}</p>
          <p className="text-xs text-ink-lighter mt-0.5">จากค่าชีพจร · ยา · อารมณ์ · น้ำ</p>
        </div>
      </div>

      <TodayOverview onNavigate={onNavigate} />
      <WaterTracker />
      <DailyWisdom />

      <div className="space-y-2">
        <button
          onClick={() => onNavigate?.('mood')}
          className="card flex w-full items-center justify-between text-left transition-transform active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">😊</span>
            <div>
              <p className="text-lg font-semibold text-ink">เช็กอารมณ์วันนี้</p>
              <p className="text-sm text-ink-lighter">เลือกอารมณ์เพื่อรับธรรมะและบันทึกความรู้สึก</p>
            </div>
          </div>
          <ArrowRight size={24} className="text-ink-lighter" />
        </button>

        <button
          onClick={() => onNavigate?.('meditate')}
          className="card flex w-full items-center justify-between text-left transition-transform active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧘</span>
            <div>
              <p className="text-lg font-semibold text-ink">สมาธิภาวนา</p>
              <p className="text-sm text-ink-lighter">ผ่อนคลายด้วยการหายใจแบบมีสติ</p>
            </div>
          </div>
          <ArrowRight size={24} className="text-ink-lighter" />
        </button>
      </div>
    </div>
  );
}
