import { useState } from 'react';
import {
    User, Phone, Shield, Bell, Moon,
    ChevronRight, Heart, LogOut, Edit3, Save, Link,
} from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useUserProfile } from '../hooks/useUserProfile';
import { DEFAULT_SETTINGS } from '../data/settings';
import { saveCaregiverLink, getCurrentUserId } from '../firebase';

// eslint-disable-next-line no-unused-vars
function SettingsToggle({ label, labelEn, icon: SettingIcon, enabled, onToggle }) {
    return (
        <button onClick={onToggle} className="card flex items-center gap-4 w-full active:scale-[0.98] transition-all">
            <div className="w-11 h-11 rounded-xl bg-saffron-50 flex items-center justify-center shrink-0">
                <SettingIcon size={22} className="text-saffron" />
            </div>
            <div className="flex-1 text-left">
                <p className="font-semibold text-ink">{label}</p>
                <p className="text-sm text-ink-lighter">{labelEn}</p>
            </div>
            <div className={`w-14 h-8 rounded-full flex items-center px-1 transition-colors duration-300 ${enabled ? 'bg-serenity-green' : 'bg-ink-lighter/30'
                }`}>
                <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${enabled ? 'translate-x-6' : 'translate-x-0'
                    }`} />
            </div>
        </button>
    );
}

export default function ProfileSettings({ onLogout, settings: settingsProp, onSettingsChange }) {
    // If settings are lifted to App.jsx use them; otherwise manage locally (fallback)
    const [localSettings, setLocalSettings] = useLocalStorage('namo_settings', DEFAULT_SETTINGS);
    const settings = settingsProp ?? localSettings;
    const setSettings = (updater) => {
        const next = typeof updater === 'function' ? updater(settings) : updater;
        if (onSettingsChange) onSettingsChange(next);
        else setLocalSettings(next);
    };

    const [profile, updateProfile] = useUserProfile();
    const [editingProfile, setEditingProfile] = useState(false);
    const [tempProfile, setTempProfile] = useState({ name: profile.name, age: profile.age });

    const saveProfile = () => {
        updateProfile({ name: tempProfile.name, age: Number(tempProfile.age) });
        setEditingProfile(false);
    };

    const [emergencyContact, setEmergencyContact] = useLocalStorage('namo_emergency', {
        name: 'ลูกชาย สมชาย',
        phone: '092-xxx-xxxx',
        relation: 'ลูกชาย',
    });

    const [editingContact, setEditingContact] = useState(false);
    const [tempContact, setTempContact] = useState(emergencyContact);
    const [pinChanged, setPinChanged] = useState(false);

    const [caregiverLineId, setCaregiverLineId] = useLocalStorage('namo_caregiver_line_id', '');
    const [editingCaregiver, setEditingCaregiver] = useState(false);
    const [tempCaregiverId, setTempCaregiverId] = useState(caregiverLineId);
    const [caregiverSaving, setCaregiverSaving] = useState(false);

    const saveCaregiverLinkHandler = async () => {
        if (!tempCaregiverId.trim()) return;
        setCaregiverSaving(true);
        try {
            const uid = await getCurrentUserId();
            await saveCaregiverLink(uid, tempCaregiverId.trim());
            setCaregiverLineId(tempCaregiverId.trim());
        } catch { /* fallback to local only */ }
        setCaregiverSaving(false);
        setEditingCaregiver(false);
    };

    const toggleSetting = (key) => {
        setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const saveContact = () => {
        setEmergencyContact(tempContact);
        setEditingContact(false);
    };

    return (
        <div className="pb-safe-bottom px-4 pt-4 space-y-5">
            {/* Profile Header */}
            <div className="card text-center bg-gradient-to-r from-saffron-50 to-warm-light">
                <div className="w-24 h-24 mx-auto mb-3 rounded-full bg-white shadow-lg flex items-center justify-center">
                    <span className="text-5xl">{profile.avatar}</span>
                </div>
                {editingProfile ? (
                    <div className="space-y-3 text-left">
                        <div>
                            <label className="text-sm text-ink-lighter mb-1 block">ชื่อ</label>
                            <input
                                type="text"
                                value={tempProfile.name}
                                onChange={(e) => setTempProfile((p) => ({ ...p, name: e.target.value }))}
                                className="w-full py-3 px-4 rounded-xl border-2 border-cream-dark bg-white text-lg text-ink focus:border-saffron focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-ink-lighter mb-1 block">อายุ (ปี)</label>
                            <input
                                type="number"
                                min="1"
                                max="120"
                                value={tempProfile.age}
                                onChange={(e) => setTempProfile((p) => ({ ...p, age: e.target.value }))}
                                className="w-full py-3 px-4 rounded-xl border-2 border-cream-dark bg-white text-lg text-ink focus:border-saffron focus:outline-none"
                            />
                        </div>
                        <div className="flex gap-3 pt-1">
                            <button
                                onClick={saveProfile}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-saffron text-white font-semibold active:scale-95"
                            >
                                <Save size={18} /> บันทึก
                            </button>
                            <button
                                onClick={() => setEditingProfile(false)}
                                className="flex-1 py-3 rounded-xl bg-cream-dark text-ink font-semibold active:scale-95"
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold text-ink">{profile.name}</h2>
                        <p className="text-ink-lighter text-sm mt-1">อายุ {profile.age} ปี</p>
                        {profile.lineId && (
                            <div className="flex items-center justify-center gap-2 mt-2 text-sm text-serenity-green">
                                <Heart size={14} />
                                <span>LINE: {profile.lineId}</span>
                            </div>
                        )}
                        <button
                            onClick={() => { setTempProfile({ name: profile.name, age: profile.age }); setEditingProfile(true); }}
                            className="mt-3 flex items-center gap-1.5 mx-auto text-saffron text-sm font-medium active:scale-95"
                        >
                            <Edit3 size={15} /> แก้ไขโปรไฟล์
                        </button>
                    </>
                )}
            </div>

            {/* Emergency Contact */}
            <div className="card">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-ink text-lg flex items-center gap-2">
                        <Phone size={20} className="text-danger" />
                        ผู้ติดต่อฉุกเฉิน
                    </h3>
                    <button
                        onClick={() => {
                            if (editingContact) saveContact();
                            else {
                                setTempContact(emergencyContact);
                                setEditingContact(true);
                            }
                        }}
                        className="flex items-center gap-1 text-saffron font-medium text-sm active:scale-95"
                    >
                        {editingContact ? <><Save size={16} /> บันทึก</> : <><Edit3 size={16} /> แก้ไข</>}
                    </button>
                </div>

                {editingContact ? (
                    <div className="space-y-3">
                        <div>
                            <label className="text-sm text-ink-lighter mb-1 block">ชื่อ</label>
                            <input
                                type="text"
                                value={tempContact.name}
                                onChange={(e) => setTempContact((p) => ({ ...p, name: e.target.value }))}
                                className="w-full py-3 px-4 rounded-xl border-2 border-cream-dark bg-cream text-lg text-ink focus:border-saffron focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-ink-lighter mb-1 block">เบอร์โทร</label>
                            <input
                                type="tel"
                                value={tempContact.phone}
                                onChange={(e) => setTempContact((p) => ({ ...p, phone: e.target.value }))}
                                className="w-full py-3 px-4 rounded-xl border-2 border-cream-dark bg-cream text-lg text-ink focus:border-saffron focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-ink-lighter mb-1 block">ความสัมพันธ์</label>
                            <input
                                type="text"
                                value={tempContact.relation}
                                onChange={(e) => setTempContact((p) => ({ ...p, relation: e.target.value }))}
                                className="w-full py-3 px-4 rounded-xl border-2 border-cream-dark bg-cream text-lg text-ink focus:border-saffron focus:outline-none"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 py-2">
                            <User size={18} className="text-ink-lighter" />
                            <span className="text-ink">{emergencyContact.name}</span>
                            <span className="text-ink-lighter text-sm ml-auto">({emergencyContact.relation})</span>
                        </div>
                        <div className="flex items-center gap-3 py-2">
                            <Phone size={18} className="text-ink-lighter" />
                            <span className="text-ink font-semibold text-lg">{emergencyContact.phone}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Caregiver Linking */}
            <div className="card">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-ink text-lg flex items-center gap-2">
                        <Link size={20} className="text-serenity-blue" />
                        เชื่อมผู้ดูแล
                    </h3>
                    <button
                        onClick={() => {
                            if (editingCaregiver) saveCaregiverLinkHandler();
                            else { setTempCaregiverId(caregiverLineId); setEditingCaregiver(true); }
                        }}
                        disabled={caregiverSaving}
                        className="flex items-center gap-1 text-saffron font-medium text-sm active:scale-95 disabled:opacity-50"
                    >
                        {editingCaregiver
                            ? (caregiverSaving ? 'กำลังบันทึก...' : <><Save size={16} /> บันทึก</>)
                            : <><Edit3 size={16} /> แก้ไข</>}
                    </button>
                </div>
                {editingCaregiver ? (
                    <div className="space-y-2">
                        <label className="text-sm text-ink-lighter block">LINE User ID ของผู้ดูแล</label>
                        <input
                            type="text"
                            value={tempCaregiverId}
                            onChange={(e) => setTempCaregiverId(e.target.value)}
                            placeholder="เช่น Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            className="w-full py-3 px-4 rounded-xl border-2 border-cream-dark bg-cream text-base text-ink focus:border-saffron focus:outline-none"
                        />
                        <p className="text-xs text-ink-lighter">LINE User ID ขึ้นต้นด้วย "U" ตามด้วยตัวเลข 32 หลัก</p>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 py-1">
                        <Heart size={18} className="text-serenity-green shrink-0" />
                        {caregiverLineId ? (
                            <div>
                                <p className="text-ink text-sm font-medium">เชื่อมแล้ว ✓</p>
                                <p className="text-ink-lighter text-xs">{caregiverLineId.slice(0, 8)}…</p>
                            </div>
                        ) : (
                            <p className="text-ink-lighter text-sm">ยังไม่ได้เชื่อมผู้ดูแล</p>
                        )}
                    </div>
                )}
            </div>

            {/* Settings */}
            <div className="space-y-3">
                <h3 className="font-bold text-ink text-lg px-1">⚙️ การตั้งค่า</h3>

                <SettingsToggle
                    label="การแจ้งเตือนยา"
                    labelEn="Medication Reminders"
                    icon={Bell}
                    enabled={settings.notifications}
                    onToggle={() => toggleSetting('notifications')}
                />

                <SettingsToggle
                    label="โหมดกลางคืน"
                    labelEn="Dark Mode"
                    icon={Moon}
                    enabled={settings.darkMode}
                    onToggle={() => toggleSetting('darkMode')}
                />

                <SettingsToggle
                    label="ปุ่ม SOS"
                    labelEn="Emergency SOS"
                    icon={Shield}
                    enabled={settings.sosEnabled}
                    onToggle={() => toggleSetting('sosEnabled')}
                />
            </div>

            {/* PIN Change */}
            <div className="card">
                <button
                    onClick={() => {
                        setPinChanged(true);
                        setTimeout(() => setPinChanged(false), 2000);
                    }}
                    className="w-full flex items-center gap-4 active:scale-[0.98] transition-all"
                >
                    <div className="w-11 h-11 rounded-xl bg-serenity-blue-light flex items-center justify-center shrink-0">
                        <Shield size={22} className="text-serenity-blue" />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="font-semibold text-ink">เปลี่ยนรหัส PIN</p>
                        <p className="text-sm text-ink-lighter">Guardian Lock PIN</p>
                    </div>
                    {pinChanged ? (
                        <span className="text-serenity-green font-semibold text-sm">✓ สำเร็จ</span>
                    ) : (
                        <ChevronRight size={20} className="text-ink-lighter" />
                    )}
                </button>
            </div>

            {/* App Info */}
            <div className="card text-center bg-cream">
                <p className="text-xl mb-1">🙏</p>
                <p className="font-bold text-saffron text-lg">NaMo Care</p>
                <p className="text-ink-lighter text-sm">v1.0.0 Premium</p>
                <p className="text-ink-lighter text-xs mt-1">
                    Digital Health & Soul Guardian
                </p>
                <p className="text-ink-lighter text-xs">
                    ดูแลสุขภาพกายและใจ ด้วยความเมตตา 💛
                </p>
            </div>

            {/* Logout */}
            <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-danger-light text-danger text-lg font-semibold active:scale-95 transition-all"
            >
                <LogOut size={22} />
                <span>ออกจากระบบ</span>
            </button>
        </div>
    );
}
