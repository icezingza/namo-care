import { useState } from 'react';
import { Watch, RefreshCw, Unlink, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  isGoogleFitConnected,
  startGoogleFitConnect,
  disconnectGoogleFit,
  syncGoogleFitVitals,
} from '../services/googleFitService';
import { saveVitalRecord, getCurrentUserId } from '../firebase';

const SUPPORTED = ['Samsung Galaxy Watch', 'Xiaomi Mi Band', 'Fitbit', 'Garmin', 'สมาร์ทวอทช์ Android ทั่วไป'];
const VITAL_LABEL = { heartRate: '💓 อัตราการเต้นหัวใจ', bloodPressure: '🩺 ความดันโลหิต' };

export default function SmartWatchConnect() {
  const [connected, setConnected] = useState(() => isGoogleFitConnected());
  const [phase, setPhase] = useState('idle'); // idle | syncing | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [syncedTypes, setSyncedTypes] = useState([]);
  const [lastSync, setLastSync] = useLocalStorage('namo_gfit_last_sync', null);
  const [showInfo, setShowInfo] = useState(false);

  const handleConnect = async () => {
    setPhase('idle');
    setErrorMsg('');
    try {
      await startGoogleFitConnect(); // navigates away, page unloads
    } catch (e) {
      setErrorMsg(e.message);
      setPhase('error');
    }
  };

  const handleSync = async () => {
    setPhase('syncing');
    setErrorMsg('');
    setSyncedTypes([]);
    try {
      const userId = await getCurrentUserId();
      const synced = await syncGoogleFitVitals(userId, saveVitalRecord);
      setSyncedTypes(synced);
      setLastSync(new Date().toISOString());
      setPhase('success');
    } catch (e) {
      setErrorMsg(e.message);
      setPhase('error');
      if (e.message.includes('หมดอายุ') || e.message.includes('ยังไม่ได้')) {
        setConnected(false);
      }
    }
  };

  const handleDisconnect = () => {
    disconnectGoogleFit();
    setConnected(false);
    setPhase('idle');
    setSyncedTypes([]);
    setLastSync(null);
  };

  if (!connected) {
    return (
      <div className="card space-y-4">
        <button
          onClick={() => setShowInfo((v) => !v)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-saffron-50 flex items-center justify-center shrink-0">
              <Watch size={22} className="text-saffron" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-ink">เชื่อมต่อ Smart Watch</p>
              <p className="text-sm text-ink-lighter">ผ่าน Google Fit / Health Connect</p>
            </div>
          </div>
          {showInfo ? <ChevronUp size={18} className="text-ink-lighter" /> : <ChevronDown size={18} className="text-ink-lighter" />}
        </button>

        {showInfo && (
          <div className="space-y-3 animate-fade-in-up">
            <p className="text-sm text-ink-light leading-relaxed">
              📲 ซิงค์ข้อมูลสุขภาพจาก Smart Watch อัตโนมัติ ไม่ต้องกรอกเอง
            </p>
            <div className="bg-cream rounded-xl p-3 text-sm text-ink-light space-y-1">
              <p className="font-medium text-ink">นาฬิกาที่รองรับ:</p>
              {SUPPORTED.map((s) => <p key={s}>• {s}</p>)}
            </div>
            <p className="text-xs text-ink-lighter">
              ต้องติดตั้งแอป Google Fit หรือ Health Connect บนมือถือ Android และเปิดซิงค์ข้อมูลกับนาฬิกาไว้
            </p>
          </div>
        )}

        {phase === 'error' && (
          <div className="flex items-start gap-2 bg-danger/10 rounded-xl p-3 text-sm text-danger">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          onClick={handleConnect}
          className="w-full py-3.5 rounded-2xl bg-saffron text-white font-semibold text-base active:scale-95 transition-all shadow-sm"
        >
          เชื่อมต่อ Google Fit 🔗
        </button>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
            <Watch size={22} className="text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-ink">Smart Watch เชื่อมต่อแล้ว ✅</p>
            {lastSync ? (
              <p className="text-xs text-ink-lighter">
                ซิงค์ล่าสุด: {new Date(lastSync).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
            ) : (
              <p className="text-xs text-ink-lighter">ยังไม่เคยซิงค์ข้อมูล</p>
            )}
          </div>
        </div>
        <CheckCircle size={20} className="text-green-600 shrink-0" />
      </div>

      {phase === 'success' && (
        <div className={`rounded-xl p-3 text-sm ${syncedTypes.length > 0 ? 'bg-green-50 text-green-800' : 'bg-cream text-ink-light'}`}>
          {syncedTypes.length > 0
            ? `✅ ซิงค์สำเร็จ: ${syncedTypes.map((t) => VITAL_LABEL[t] ?? t).join('  ')}`
            : 'ไม่พบข้อมูลใหม่จาก Smart Watch วันนี้ — ลองใส่นาฬิกาสักพักแล้วซิงค์ใหม่'}
        </div>
      )}

      {phase === 'error' && (
        <div className="flex items-start gap-2 bg-danger/10 rounded-xl p-3 text-sm text-danger">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        onClick={handleSync}
        disabled={phase === 'syncing'}
        className="w-full py-3.5 rounded-2xl bg-saffron text-white font-semibold text-base active:scale-95 transition-all shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
      >
        <RefreshCw size={18} className={phase === 'syncing' ? 'animate-spin' : ''} />
        {phase === 'syncing' ? 'กำลังซิงค์ข้อมูล...' : 'ซิงค์ข้อมูลวันนี้'}
      </button>

      <button
        onClick={handleDisconnect}
        className="w-full py-2.5 rounded-2xl border border-ink-lighter/30 text-ink-lighter text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
      >
        <Unlink size={14} /> ยกเลิกการเชื่อมต่อ
      </button>
    </div>
  );
}
