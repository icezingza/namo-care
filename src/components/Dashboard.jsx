import { useState } from 'react';
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
} from 'lucide-react';
import { vitalSigns, userProfile } from '../data/mockData';
import { useLocalStorage, getTodayKey, formatThaiDate } from '../hooks/useLocalStorage';
import { generateDharmaAdvice } from '../data/dharma_quotes';
import { saveSOSAlert } from '../firebase';

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

async function getLocationSnapshot() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return {
      status: 'unavailable',
      latitude: null,
      longitude: null,
      accuracyMeters: null,
      error: 'geolocation_not_supported',
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          status: 'ok',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: Math.round(position.coords.accuracy),
          error: null,
        });
      },
      (error) => {
        resolve({
          status: 'error',
          latitude: null,
          longitude: null,
          accuracyMeters: null,
          error: error.message || 'location_error',
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
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

  const greeting = getGreeting();
  const emergencyPhone = getEmergencyPhone();

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
        bloodPressure: {
          systolic: vitalSigns.bloodPressure.systolic,
          diastolic: vitalSigns.bloodPressure.diastolic,
          unit: vitalSigns.bloodPressure.unit,
        },
        heartRate: {
          value: vitalSigns.heartRate.value,
          unit: vitalSigns.heartRate.unit,
        },
        bloodSugar: {
          value: vitalSigns.bloodSugar.value,
          unit: vitalSigns.bloodSugar.unit,
        },
      },
      location,
      lastSync: vitalSigns.lastSync,
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
              {userProfile.name} {userProfile.avatar}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="card px-2 py-3 text-center">
          <Activity size={20} className="mx-auto mb-1 text-danger" />
          <p className="text-lg font-bold text-ink">
            {vitalSigns.bloodPressure.systolic}/{vitalSigns.bloodPressure.diastolic}
          </p>
          <p className="text-xs text-ink-lighter">ความดัน</p>
        </div>
        <div className="card px-2 py-3 text-center">
          <Heart size={20} className="mx-auto mb-1 text-saffron" />
          <p className="text-lg font-bold text-ink">{vitalSigns.heartRate.value}</p>
          <p className="text-xs text-ink-lighter">ชีพจร</p>
        </div>
        <div className="card px-2 py-3 text-center">
          <Droplets size={20} className="mx-auto mb-1 text-serenity-blue" />
          <p className="text-lg font-bold text-ink">{vitalSigns.bloodSugar.value}</p>
          <p className="text-xs text-ink-lighter">น้ำตาล</p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-1">
        <Watch size={14} className="text-serenity-blue" />
        <span className="text-xs text-ink-lighter">ซิงค์จาก Smartwatch: {vitalSigns.lastSync}</span>
        <span className="ml-1 h-2 w-2 rounded-full bg-serenity-green animate-pulse" />
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
          onClick={() => {
            setMedConfirm(true);
            setTimeout(() => setMedConfirm(false), 2000);
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-2xl py-5 px-4 text-lg font-semibold text-white shadow-md transition-all active:scale-95 ${
            medConfirm ? 'bg-serenity-green' : 'bg-saffron'
          }`}
        >
          <Pill size={32} />
          <span>{medConfirm ? 'บันทึกแล้ว ✓' : 'ทานยาแล้ว'}</span>
        </button>
      </div>

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
