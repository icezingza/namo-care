import { useState } from 'react';
import {
  Home, SmilePlus, Pill, BarChart3, Flower2, ClipboardPlus, User, LogOut,
} from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import MoodTracker from './components/MoodTracker';
import MedicationTracker from './components/MedicationTracker';
import HealthAnalytics from './components/HealthAnalytics';
import MeditationTimer from './components/MeditationTimer';
import RecordVitals from './components/RecordVitals';
import ProfileSettings from './components/ProfileSettings';

const tabs = [
  { key: 'home', label: 'หน้าหลัก', icon: Home },
  { key: 'mood', label: 'อารมณ์', icon: SmilePlus },
  { key: 'medications', label: 'ยา', icon: Pill },
  { key: 'meditate', label: 'สมาธิ', icon: Flower2 },
  { key: 'record', label: 'บันทึก', icon: ClipboardPlus },
  { key: 'analytics', label: 'สถิติ', icon: BarChart3 },
  { key: 'profile', label: 'โปรไฟล์', icon: User },
];

function BottomNav({ active, onNavigate }) {
  // Show max 5 tabs in bottom nav, rest accessible via profile or dashboard
  const visibleTabs = ['home', 'mood', 'medications', 'meditate', 'profile'];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-cream-dark z-40">
      <div className="max-w-lg mx-auto flex">
        {tabs.filter((t) => visibleTabs.includes(t.key)).map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onNavigate(tab.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 transition-all duration-200 relative ${isActive ? 'text-saffron' : 'text-ink-lighter'
                }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-saffron rounded-b-full" />
              )}
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
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

function AppHeader({ user, activeTab, onNavigate, onLogout }) {
  const getTitle = () => {
    switch (activeTab) {
      case 'mood': return 'เช็คอารมณ์';
      case 'medications': return 'ยาประจำวัน';
      case 'meditate': return 'สมาธิภาวนา';
      case 'record': return 'บันทึกสุขภาพ';
      case 'analytics': return 'สถิติสุขภาพ';
      case 'profile': return 'โปรไฟล์';
      default: return 'NaMo Care';
    }
  };

  return (
    <header className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-cream-dark/50 z-30">
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xl">🙏</span>
          <h1 className="text-lg font-bold text-saffron">{getTitle()}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('profile')}
            className="w-9 h-9 rounded-full bg-saffron-50 flex items-center justify-center"
          >
            <span className="text-lg">👵</span>
          </button>
        </div>
      </div>
    </header>
  );
}

// Simple page transition wrapper
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

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('home');
  };

  const handleNavigate = (tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return <Dashboard user={user} onNavigate={handleNavigate} />;
      case 'mood':
        return <MoodTracker />;
      case 'medications':
        return <MedicationTracker />;
      case 'meditate':
        return <MeditationTimer />;
      case 'record':
        return <RecordVitals onBack={() => handleNavigate('home')} />;
      case 'analytics':
        return <HealthAnalytics />;
      case 'profile':
        return <ProfileSettings user={user} onLogout={handleLogout} />;
      default:
        return <Dashboard user={user} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="max-w-lg mx-auto min-h-dvh bg-cream">
      <AppHeader user={user} activeTab={activeTab} onNavigate={handleNavigate} onLogout={handleLogout} />
      <main className="pb-20">
        <PageTransition activeKey={activeTab}>
          {renderPage()}
        </PageTransition>
      </main>
      <BottomNav active={activeTab} onNavigate={handleNavigate} />
    </div>
  );
}
