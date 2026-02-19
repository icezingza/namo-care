import { useState } from 'react';
import {
    Activity, Heart, Droplets, Save, Check,
    TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import { useLocalStorage, getTodayKey, formatThaiTime } from '../hooks/useLocalStorage';

const vitalTypes = [
    {
        key: 'bloodPressure',
        label: 'ความดันโลหิต',
        labelEn: 'Blood Pressure',
        icon: Activity,
        iconColor: 'text-danger',
        bgColor: '#FDEDEC',
        fields: [
            { name: 'systolic', label: 'ตัวบน (Systolic)', unit: 'mmHg', min: 70, max: 200, placeholder: '120' },
            { name: 'diastolic', label: 'ตัวล่าง (Diastolic)', unit: 'mmHg', min: 40, max: 130, placeholder: '80' },
        ],
        evaluate: (values) => {
            const sys = Number(values.systolic);
            const dia = Number(values.diastolic);
            if (sys < 120 && dia < 80) return { status: 'normal', text: 'ปกติ ✓', color: 'text-serenity-green' };
            if (sys < 140 && dia < 90) return { status: 'warning', text: 'เฝ้าระวัง ⚠️', color: 'text-warm' };
            return { status: 'danger', text: 'สูงผิดปกติ! ⚠️', color: 'text-danger' };
        },
    },
    {
        key: 'heartRate',
        label: 'อัตราการเต้นหัวใจ',
        labelEn: 'Heart Rate',
        icon: Heart,
        iconColor: 'text-saffron',
        bgColor: '#FEF5E7',
        fields: [
            { name: 'value', label: 'ค่าที่วัดได้', unit: 'bpm', min: 40, max: 200, placeholder: '72' },
        ],
        evaluate: (values) => {
            const hr = Number(values.value);
            if (hr >= 60 && hr <= 100) return { status: 'normal', text: 'ปกติ ✓', color: 'text-serenity-green' };
            if (hr >= 50 && hr <= 110) return { status: 'warning', text: 'เฝ้าระวัง ⚠️', color: 'text-warm' };
            return { status: 'danger', text: 'ผิดปกติ! ⚠️', color: 'text-danger' };
        },
    },
    {
        key: 'bloodSugar',
        label: 'น้ำตาลในเลือด',
        labelEn: 'Blood Sugar',
        icon: Droplets,
        iconColor: 'text-serenity-blue',
        bgColor: '#EBF5FB',
        fields: [
            { name: 'value', label: 'ค่าที่วัดได้', unit: 'mg/dL', min: 30, max: 500, placeholder: '100' },
        ],
        evaluate: (values) => {
            const bs = Number(values.value);
            if (bs < 100) return { status: 'normal', text: 'ปกติ ✓', color: 'text-serenity-green' };
            if (bs < 126) return { status: 'warning', text: 'เฝ้าระวัง ⚠️', color: 'text-warm' };
            return { status: 'danger', text: 'สูง! ⚠️', color: 'text-danger' };
        },
    },
];

export default function RecordVitals({ onBack }) {
    const [activeType, setActiveType] = useState(null);
    const [values, setValues] = useState({});
    const [saved, setSaved] = useState(false);
    const [records, setRecords] = useLocalStorage('namo_vital_records', []);

    const handleInputChange = (fieldName, value) => {
        setValues((prev) => ({ ...prev, [fieldName]: value }));
        setSaved(false);
    };

    const handleSave = () => {
        if (!activeType) return;
        const evaluation = activeType.evaluate(values);
        const record = {
            type: activeType.key,
            values: { ...values },
            evaluation,
            timestamp: new Date().toISOString(),
            dateKey: getTodayKey(),
        };
        setRecords((prev) => [record, ...prev]);
        setSaved(true);
        setTimeout(() => {
            setActiveType(null);
            setValues({});
            setSaved(false);
        }, 1500);
    };

    const isFormValid = activeType?.fields.every((f) => {
        const v = Number(values[f.name]);
        return v >= f.min && v <= f.max;
    });

    const todayRecords = records.filter((r) => r.dateKey === getTodayKey());

    if (activeType) {
        const Icon = activeType.icon;
        const evaluation = isFormValid ? activeType.evaluate(values) : null;

        return (
            <div className="pb-safe-bottom px-4 pt-4 space-y-5">
                <button onClick={() => { setActiveType(null); setValues({}); }} className="text-ink-light text-base active:text-saffron">
                    ← กลับ
                </button>

                <div className="card text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: activeType.bgColor }}>
                        <Icon size={32} className={activeType.iconColor} />
                    </div>
                    <h3 className="text-xl font-bold text-ink">{activeType.label}</h3>
                    <p className="text-ink-lighter text-sm">{activeType.labelEn}</p>
                </div>

                {/* Input Fields */}
                <div className="space-y-4">
                    {activeType.fields.map((field) => (
                        <div key={field.name} className="card">
                            <label className="block text-ink font-semibold text-lg mb-2">{field.label}</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    placeholder={field.placeholder}
                                    min={field.min}
                                    max={field.max}
                                    value={values[field.name] || ''}
                                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                                    className="flex-1 py-4 px-5 rounded-xl border-2 border-cream-dark bg-cream text-2xl font-bold text-ink text-center focus:border-saffron focus:outline-none transition-colors"
                                />
                                <span className="text-ink-lighter text-lg shrink-0">{field.unit}</span>
                            </div>
                            <p className="text-ink-lighter text-xs mt-1">
                                ช่วงปกติ: {field.min} - {field.max} {field.unit}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Real-time Evaluation */}
                {evaluation && (
                    <div className={`card text-center animate-fade-in-up ${evaluation.status === 'normal' ? 'bg-serenity-green-light' :
                            evaluation.status === 'warning' ? 'bg-warm-light' : 'bg-danger-light'
                        }`}>
                        <p className={`text-xl font-bold ${evaluation.color}`}>{evaluation.text}</p>
                    </div>
                )}

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={!isFormValid || saved}
                    className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-xl font-semibold shadow-lg active:scale-95 transition-all disabled:opacity-50 ${saved ? 'bg-serenity-green text-white' : 'bg-saffron text-white'
                        }`}
                >
                    {saved ? (
                        <><Check size={28} className="animate-checkmark" /> <span>บันทึกแล้ว ✓</span></>
                    ) : (
                        <><Save size={24} /> <span>บันทึก</span></>
                    )}
                </button>
            </div>
        );
    }

    return (
        <div className="pb-safe-bottom px-4 pt-4 space-y-5">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-ink mb-1">📋 บันทึกสุขภาพ</h2>
                <p className="text-ink-light text-base">Record Your Vitals</p>
            </div>

            {/* Vital Type Selection */}
            <div className="space-y-3 stagger-children">
                {vitalTypes.map((type) => {
                    const Icon = type.icon;
                    const todayCount = todayRecords.filter((r) => r.type === type.key).length;
                    return (
                        <button
                            key={type.key}
                            onClick={() => setActiveType(type)}
                            className="card w-full flex items-center gap-4 active:scale-[0.98] transition-all"
                        >
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: type.bgColor }}>
                                <Icon size={28} className={type.iconColor} />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-lg font-semibold text-ink">{type.label}</p>
                                <p className="text-sm text-ink-lighter">{type.labelEn}</p>
                            </div>
                            {todayCount > 0 && (
                                <span className="text-sm bg-serenity-green-light text-serenity-green px-3 py-1 rounded-full font-medium">
                                    วันนี้ {todayCount} ครั้ง
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Today's Records */}
            {todayRecords.length > 0 && (
                <div className="card">
                    <h3 className="font-semibold text-ink text-lg mb-3">📝 บันทึกวันนี้</h3>
                    <div className="space-y-2">
                        {todayRecords.slice(0, 5).map((record, i) => {
                            const type = vitalTypes.find((t) => t.key === record.type);
                            if (!type) return null;
                            const Icon = type.icon;
                            return (
                                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-cream">
                                    <Icon size={18} className={type.iconColor} />
                                    <span className="text-ink font-medium">{type.label}</span>
                                    <span className={`text-sm font-semibold ml-auto ${record.evaluation.color}`}>
                                        {Object.values(record.values).join('/')}
                                    </span>
                                    <span className="text-ink-lighter text-xs">
                                        {formatThaiTime(new Date(record.timestamp))}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
