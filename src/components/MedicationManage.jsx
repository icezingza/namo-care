import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, ArrowLeft, Pill, Check } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { medications as mockMedications } from '../data/mockData';
import { getMedicationSchedules, getCurrentUserId, db, isFirebaseConfigured } from '../firebase';

const TIME_OPTIONS = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
const ICON_OPTIONS = ['💊', '❤️', '☀️', '🛡️', '💉', '🌿', '💧', '⚡'];

const EMPTY_FORM = { nameTh: '', name: '', dosage: '', time: '08:00', purpose: '', icon: '💊' };

function MedForm({ initial = EMPTY_FORM, onSave, onCancel, saving }) {
    const [form, setForm] = useState(initial);
    const valid = form.nameTh.trim() && form.dosage.trim();

    return (
        <div className="card space-y-4 animate-fade-in-up">
            <h3 className="font-bold text-ink text-lg">
                {initial === EMPTY_FORM ? '➕ เพิ่มยาใหม่' : '✏️ แก้ไขยา'}
            </h3>

            {/* Icon picker */}
            <div>
                <label className="text-sm text-ink-lighter mb-2 block">ไอคอน</label>
                <div className="flex gap-2 flex-wrap">
                    {ICON_OPTIONS.map((icon) => (
                        <button key={icon} onClick={() => setForm((p) => ({ ...p, icon }))}
                            className={`text-2xl p-2 rounded-xl border-2 transition-all active:scale-90 ${form.icon === icon ? 'border-saffron bg-saffron-50' : 'border-transparent bg-cream'}`}>
                            {icon}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="text-sm text-ink-lighter mb-1 block">ชื่อยาภาษาไทย *</label>
                <input type="text" value={form.nameTh} placeholder="เช่น แอมโลดิปีน"
                    onChange={(e) => setForm((p) => ({ ...p, nameTh: e.target.value }))}
                    className="w-full py-3 px-4 rounded-xl border-2 border-cream-dark bg-cream text-lg text-ink focus:border-saffron focus:outline-none" />
            </div>

            <div>
                <label className="text-sm text-ink-lighter mb-1 block">ชื่อยาภาษาอังกฤษ</label>
                <input type="text" value={form.name} placeholder="เช่น Amlodipine"
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full py-3 px-4 rounded-xl border-2 border-cream-dark bg-cream text-lg text-ink focus:border-saffron focus:outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-sm text-ink-lighter mb-1 block">ขนาด *</label>
                    <input type="text" value={form.dosage} placeholder="เช่น 5mg"
                        onChange={(e) => setForm((p) => ({ ...p, dosage: e.target.value }))}
                        className="w-full py-3 px-4 rounded-xl border-2 border-cream-dark bg-cream text-lg text-ink focus:border-saffron focus:outline-none" />
                </div>
                <div>
                    <label className="text-sm text-ink-lighter mb-1 block">เวลา</label>
                    <select value={form.time} onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
                        className="w-full py-3 px-4 rounded-xl border-2 border-cream-dark bg-cream text-lg text-ink focus:border-saffron focus:outline-none">
                        {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>

            <div>
                <label className="text-sm text-ink-lighter mb-1 block">วัตถุประสงค์</label>
                <input type="text" value={form.purpose} placeholder="เช่น ความดันโลหิต"
                    onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))}
                    className="w-full py-3 px-4 rounded-xl border-2 border-cream-dark bg-cream text-lg text-ink focus:border-saffron focus:outline-none" />
            </div>

            <div className="flex gap-3 pt-2">
                <button onClick={onCancel}
                    className="flex-1 py-3 rounded-xl border-2 border-ink-lighter/30 text-ink-light font-semibold active:scale-95 transition-all">
                    ยกเลิก
                </button>
                <button onClick={() => valid && onSave(form)} disabled={!valid || saving}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-saffron text-white font-semibold disabled:opacity-50 active:scale-95 transition-all">
                    {saving ? <><Pill size={18} className="animate-pulse" /> กำลังบันทึก...</> : <><Save size={18} /> บันทึก</>}
                </button>
            </div>
        </div>
    );
}

export default function MedicationManage({ onBack }) {
    const [medications, setMedications] = useLocalStorage('namo_medication_list', null);
    const [editing, setEditing] = useState(null); // null = list, 'new' = add form, {med} = edit form
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [userId, setUserId] = useState('local_user');

    useEffect(() => {
        getCurrentUserId().then(async (uid) => {
            setUserId(uid);
            if (medications === null) {
                // First load: try Firestore, fallback to mock
                const remote = await getMedicationSchedules(uid);
                if (remote.length > 0) {
                    setMedications(remote.map((s, i) => ({
                        id: s.id || `remote_${i}`,
                        name: s.name || '',
                        nameTh: s.name || '',
                        dosage: s.dosage || '',
                        time: (s.times || [])[0] || '08:00',
                        purpose: s.purpose || '',
                        icon: '💊',
                    })));
                } else {
                    setMedications(mockMedications);
                }
            }
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const medList = medications || mockMedications;

    const handleSaveNew = async (form) => {
        setSaving(true);
        const newMed = { ...form, id: `local_${Date.now()}` };
        const updated = [...medList, newMed];
        setMedications(updated);

        if (isFirebaseConfigured()) {
            try {
                await db.collection('medicationSchedules').add({
                    userId,
                    name: form.nameTh || form.name,
                    dosage: form.dosage,
                    times: [form.time],
                    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                    purpose: form.purpose,
                    confirmationRequired: true,
                    isActive: true,
                    nextReminderAt: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            } catch { /* Firestore sync failed — local data still saved */ }
        }

        setSaving(false);
        setEditing(null);
    };

    const handleSaveEdit = (form) => {
        const updated = medList.map((m) => m.id === editing.id ? { ...m, ...form } : m);
        setMedications(updated);
        setEditing(null);
    };

    const handleDelete = (id) => {
        setDeletingId(id);
        setTimeout(() => {
            setMedications(medList.filter((m) => m.id !== id));
            setDeletingId(null);
        }, 300);
    };

    if (editing === 'new') {
        return (
            <div className="pb-safe-bottom px-4 pt-4 space-y-4">
                <button onClick={() => setEditing(null)} className="text-ink-light text-base active:text-saffron">
                    ← กลับ
                </button>
                <MedForm onSave={handleSaveNew} onCancel={() => setEditing(null)} saving={saving} />
            </div>
        );
    }

    if (editing && editing !== 'new') {
        return (
            <div className="pb-safe-bottom px-4 pt-4 space-y-4">
                <button onClick={() => setEditing(null)} className="text-ink-light text-base active:text-saffron">
                    ← กลับ
                </button>
                <MedForm initial={editing} onSave={handleSaveEdit} onCancel={() => setEditing(null)} saving={saving} />
            </div>
        );
    }

    return (
        <div className="pb-safe-bottom px-4 pt-4 space-y-5">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 rounded-xl bg-cream-dark active:scale-90 transition-all">
                    <ArrowLeft size={20} className="text-ink-light" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-ink">💊 จัดการยา</h2>
                    <p className="text-ink-lighter text-sm">เพิ่ม แก้ไข หรือลบรายการยา</p>
                </div>
            </div>

            <button
                onClick={() => setEditing('new')}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-saffron text-white text-lg font-semibold shadow-md active:scale-95 transition-all"
            >
                <Plus size={22} />
                เพิ่มยาใหม่
            </button>

            <div className="space-y-3 stagger-children">
                {medList.map((med) => (
                    <div key={med.id}
                        className={`card flex items-center gap-4 transition-all duration-300 ${deletingId === med.id ? 'opacity-0 scale-95' : ''}`}>
                        <div className="w-12 h-12 rounded-xl bg-saffron-50 flex items-center justify-center shrink-0 text-2xl">
                            {med.icon || '💊'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-lg font-semibold text-ink">{med.nameTh}</p>
                            <p className="text-sm text-ink-lighter">{med.name} · {med.dosage}</p>
                            <p className="text-xs text-ink-lighter mt-0.5">{med.time} · {med.purpose}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button onClick={() => setEditing(med)}
                                className="p-2 rounded-xl bg-saffron-50 active:scale-90 transition-all"
                                aria-label="แก้ไข">
                                <Save size={18} className="text-saffron" />
                            </button>
                            <button onClick={() => handleDelete(med.id)}
                                className="p-2 rounded-xl bg-danger-light active:scale-90 transition-all"
                                aria-label="ลบ">
                                <Trash2 size={18} className="text-danger" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {medList.length === 0 && (
                <div className="card text-center py-8">
                    <Pill size={40} className="mx-auto mb-3 text-ink-lighter" />
                    <p className="text-ink-light">ยังไม่มีรายการยา</p>
                    <p className="text-sm text-ink-lighter mt-1">กด "เพิ่มยาใหม่" เพื่อเริ่มต้น</p>
                </div>
            )}
        </div>
    );
}
