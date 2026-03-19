import { useState, useEffect } from 'react';
import {
  Home, SmilePlus, Pill, BarChart3, Flower2, ClipboardPlus, User, Users, WifiOff,
} from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import MoodTracker from './components/MoodTracker';
import MedicationTracker from './components/MedicationTracker';
import MedicationManage from './components/MedicationManage';
import HealthAnalytics from './components/HealthAnalytics';
import MeditationTimer from './components/MeditationTimer';
import RecordVitals from './components/RecordVitals';
import ProfileSettings from './components/ProfileSettings';
import CaregiverDashboard from './components/CaregiverDashboard';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { DEFAULT_SETTINGS } from './data/settings';
import { getAlerts, getCurrentUserId } from './firebase';

const tabs = [
  { key: 'home', label: 'หน้าหลัก', icon: Home },
  { key: 'mood', label: 'อารมณ์', icon: SmilePlus },
  { key: 'medications', label: 'ยา', icon: Pill },
  { key: 'meditate', label: 'สมาธิ', icon: Flower2 },
  { key: 'record', label: 'บันทึก', icon: ClipboardPlus },
  { key: 'analytics', label: 'สถิติ', icon: BarChart3 },
  { key: 'caregiver', label: 'ผู้ดูแล', icon: Users },
  { key: 'profile', label: 'โปรไฟล์', icon: User },
];

const BOTTOM_NAV_KEYS = ['home', 'mood', 'medications', 'caregiver', 'profile'];

function OfflineBanner() {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 py-2 px-4 bg-ink text-white text-sm font-medium">
      <WifiOff size={16} />
      <span>ออฟไลน์ — ข้อมูลถูกบันทึกในเครื่อง จะซิงค์เมื่อมีสัญญาณ</span>
    </div>
  );
}

function BottomNav({ active, onNavigate, alertCount }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-cream-dark z-40 dark:bg-ink/95 dark:border-ink-light/20">
      <div className="max-w-lg mx-auto flex">
        {tabs.filter((t) => BOTTOM_NAV_KEYS.includes(t.key)).map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.key;
          const showBadge = tab.key === 'caregiver' && alertCount > 0 && !isActive;
          return (
            <button
              key={tab.key}
              onClick={() => onNavigate(tab.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 transition-all duration-200 relative ${
                isActive ? 'text-saffron' : 'text-ink-lighter dark:text-ink-lighter'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-saffron rounded-b-full" />
              )}
              <span className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-danger rounded-full flex items-center justify-center text-white text-[9px] font-bold animate-pulse">
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </span>
              <span className={`text-[10px] leading-tight font-medium ${isActive ? 'font-semibold' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function AppHeader({ activeTab, onNavigate, profile }) {
  const getTitle = () => {
    switch (activeTab) {
      case 'mood': return 'เช็คอารมณ์';
      case 'medications': return 'ยาประจำวัน';
      case 'meditate': return 'สมาธิภาวนา';
      case 'record': return 'บันทึกสุขภาพ';
      case 'analytics': return 'สถิติสุขภาพ';
      case 'caregiver': return 'แดชบอร์ดผู้ดูแล';
      case 'med-manage': return 'จัดการยา';
      case 'profile': return 'โปรไฟล์';
      default: return 'NaMo Care';
    }
  };

  return (
    <header className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-cream-dark/50 z-30 dark:bg-ink/90 dark:border-ink-light/20">
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xl">🙏</span>
          <h1 className="text-lg font-bold text-saffron">{getTitle()}</h1>
        </div>
        <button
          onClick={() => onNavigate('profile')}
          className="w-9 h-9 rounded-full bg-saffron-50 flex items-center justify-center"
          aria-label="โปรไฟล์"
        >
          <span className="text-lg">{profile?.avatar || '👵'}</span>
        </button>
      </div>
    </header>
  );
}

function PageTransition({ children, activeKey }) {
  return (
    <div key={activeKey} className="animate-fade-in-up" style={{ animationDuration: '0.25s' }}>
      {children}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [settings, setSettings] = useLocalStorage('namo_settings', DEFAULT_SETTINGS);
  const [alertCount, setAlertCount] = useState(0);
  const [profile] = useLocalStorage('namo_profile', null);
  const isOnline = useOnlineStatus();

  // Apply dark mode class reactively
  useEffect(() => {
    document.documentElement.classList.toggle('dark', !!settings.darkMode);
  }, [settings.darkMode]);

  // Load open alert count after login — runs once per session
  useEffect(() => {
    if (!user) return;
    getCurrentUserId().then(async (uid) => {
      try {
        const alerts = await getAlerts(uid, 20);
        const open = alerts.filter((a) => a.status !== 'acknowledged' && a.status !== 'resolved');
        setAlertCount(open.length);
      } catch { /* no alerts if Firestore unavailable */ }
    });
  }, [user]);

  const handleLogin = (userData) => setUser(userData);

  const handleLogout = () => {
    setUser(null);
    setActiveTab('home');
    setAlertCount(0);
  };

  const handleNavigate = (tab) => {
    // Clear badge when user opens caregiver tab
    if (tab === 'caregiver') setAlertCount(0);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return <Dashboard user={user} onNavigate={handleNavigate} />;
      case 'mood':
        return <MoodTracker />;
      case 'medications':
        return <MedicationTracker onManage={() => handleNavigate('med-manage')} />;
      case 'med-manage':
        return <MedicationManage onBack={() => handleNavigate('medications')} />;
      case 'meditate':
        return <MeditationTimer />;
      case 'record':
        return <RecordVitals />;
      case 'analytics':
        return <HealthAnalytics />;
      case 'caregiver':
        return <CaregiverDashboard />;
      case 'profile':
        return <ProfileSettings onLogout={handleLogout} settings={settings} onSettingsChange={setSettings} />;
      default:
        return <Dashboard user={user} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="max-w-lg mx-auto min-h-dvh bg-cream dark:bg-ink">
      {!isOnline && <OfflineBanner />}
      <AppHeader activeTab={activeTab} onNavigate={handleNavigate} profile={profile} />
      <main className="pb-20">
        <PageTransition activeKey={activeTab}>
          {renderPage()}
        </PageTransition>
      </main>
      <BottomNav active={activeTab} onNavigate={handleNavigate} alertCount={alertCount} />
    </div>
  );
}
