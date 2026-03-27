import { useState } from 'react';
import { PhoneCall, MapPin, X } from 'lucide-react';
import { saveSOSAlert, getCurrentUserId } from '../firebase';

const RETRY_TIMEOUTS = [8000, 12000, 16000];

async function getLocationWithRetry() {
  if (!navigator.geolocation) return null;
  for (const timeout of RETRY_TIMEOUTS) {
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout,
          enableHighAccuracy: true,
          maximumAge: 0,
        });
      });
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy),
      };
    } catch {
      // retry next timeout
    }
  }
  return null;
}

export default function SOSButton() {
  const [phase, setPhase] = useState('idle'); // idle | confirm | sending | sent | error

  const handleTrigger = () => setPhase('confirm');
  const handleCancel = () => setPhase('idle');

  const handleConfirm = async () => {
    setPhase('sending');
    try {
      const [userId, location] = await Promise.all([
        getCurrentUserId().catch(() => null),
        getLocationWithRetry(),
      ]);

      await saveSOSAlert({
        userId,
        location,
        message: 'ผู้ใช้กดปุ่ม SOS ขอความช่วยเหลือ',
        triggeredAt: new Date().toISOString(),
      });

      setPhase('sent');
      // Auto-close after 10 s so user can still access the app
      setTimeout(() => setPhase('idle'), 10_000);
    } catch {
      setPhase('error');
    }
  };

  return (
    <>
      {/* Floating SOS button — always above bottom nav */}
      <button
        onClick={handleTrigger}
        aria-label="ปุ่มฉุกเฉิน SOS"
        className="fixed bottom-24 right-4 z-40 w-16 h-16 rounded-full bg-danger shadow-lg flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-transform"
      >
        <PhoneCall size={22} className="text-white" strokeWidth={2.5} />
        <span className="text-white text-[11px] font-bold leading-none">SOS</span>
      </button>

      {/* Overlay modals */}
      {phase !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 animate-fade-in-up">
          <div className="w-full max-w-lg bg-white rounded-t-3xl p-6 pb-8 shadow-2xl space-y-5">

            {/* Confirm */}
            {phase === 'confirm' && (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-danger">🚨 ขอความช่วยเหลือ</h2>
                    <p className="text-ink-light text-base mt-1">
                      ระบบจะแจ้งผู้ดูแลของคุณทันที
                    </p>
                  </div>
                  <button onClick={handleCancel} className="p-2 rounded-full bg-cream active:scale-90">
                    <X size={20} className="text-ink-light" />
                  </button>
                </div>
                <div className="bg-danger/10 rounded-2xl p-4 space-y-2 text-base text-ink">
                  <p>📍 ระบบจะพยายามดึงตำแหน่งของคุณ</p>
                  <p>📲 ผู้ดูแลจะได้รับการแจ้งเตือนผ่าน LINE</p>
                  <p>🚑 โทร 1669 ถ้าต้องการรถพยาบาลทันที</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleCancel}
                    className="py-4 rounded-2xl bg-cream text-ink-light text-lg font-semibold active:scale-95 transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="py-4 rounded-2xl bg-danger text-white text-lg font-bold shadow-md active:scale-95 transition-all"
                  >
                    ส่งสัญญาณ
                  </button>
                </div>
              </>
            )}

            {/* Sending */}
            {phase === 'sending' && (
              <div className="text-center py-6 space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-danger/10 flex items-center justify-center animate-pulse">
                  <MapPin size={32} className="text-danger" />
                </div>
                <h2 className="text-xl font-bold text-ink">กำลังส่งสัญญาณ...</h2>
                <p className="text-ink-lighter text-sm">กำลังระบุตำแหน่งและแจ้งผู้ดูแล</p>
              </div>
            )}

            {/* Success */}
            {phase === 'sent' && (
              <div className="text-center py-4 space-y-4">
                <div className="text-5xl">✅</div>
                <h2 className="text-xl font-bold text-serenity-green">ส่งสัญญาณแล้วค่ะ</h2>
                <p className="text-ink-light text-base">ผู้ดูแลได้รับการแจ้งเตือนแล้วนะคะ 🙏</p>
                <a
                  href="tel:1669"
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-danger text-white text-lg font-bold shadow-md active:scale-95 transition-all"
                >
                  <PhoneCall size={20} strokeWidth={2.5} />
                  โทร 1669 (รถพยาบาลฉุกเฉิน)
                </a>
                <button
                  onClick={handleCancel}
                  className="w-full py-3 text-ink-lighter text-base"
                >
                  ปิด
                </button>
              </div>
            )}

            {/* Error */}
            {phase === 'error' && (
              <div className="text-center py-4 space-y-4">
                <div className="text-5xl">⚠️</div>
                <h2 className="text-xl font-bold text-warm">ส่งไม่สำเร็จ</h2>
                <p className="text-ink-light text-base">ไม่สามารถเชื่อมต่อได้ขณะนี้ค่ะ</p>
                <a
                  href="tel:1669"
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-danger text-white text-lg font-bold shadow-md active:scale-95 transition-all"
                >
                  <PhoneCall size={20} strokeWidth={2.5} />
                  โทร 1669 (รถพยาบาลฉุกเฉิน)
                </a>
                <button
                  onClick={handleCancel}
                  className="w-full py-3 text-ink-lighter text-base"
                >
                  ปิด
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
