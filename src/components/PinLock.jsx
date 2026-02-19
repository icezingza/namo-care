import { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Delete, Lock } from 'lucide-react';

export default function PinLock({ onUnlock }) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const [success, setSuccess] = useState(false);
    const CORRECT_PIN = '1234';

    const handleDigit = (digit) => {
        if (pin.length >= 4) return;
        const newPin = pin + digit;
        setPin(newPin);
        setError(false);

        if (newPin.length === 4) {
            if (newPin === CORRECT_PIN) {
                setSuccess(true);
                setTimeout(() => onUnlock(), 600);
            } else {
                setError(true);
                setTimeout(() => {
                    setPin('');
                    setError(false);
                }, 800);
            }
        }
    };

    const handleDelete = () => {
        setPin(pin.slice(0, -1));
        setError(false);
    };

    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'];

    return (
        <div className="min-h-dvh flex flex-col items-center justify-center bg-cream px-6">
            <div className="animate-fade-in-up text-center mb-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-saffron-50 flex items-center justify-center">
                    {success ? (
                        <ShieldCheck className="text-serenity-green" size={40} />
                    ) : (
                        <Lock className="text-saffron" size={36} />
                    )}
                </div>
                <h2 className="text-2xl font-bold text-ink mb-2">Guardian Lock 🔒</h2>
                <p className="text-ink-light text-lg">
                    กรุณาใส่ PIN 4 หลักเพื่อดูข้อมูลสุขภาพ
                </p>
                <p className="text-ink-lighter text-sm mt-1">(PIN: 1234)</p>
            </div>

            {/* PIN Dots */}
            <div className="flex gap-4 mb-8">
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className={`w-5 h-5 rounded-full transition-all duration-300 ${error
                                ? 'bg-danger animate-pulse'
                                : success
                                    ? 'bg-serenity-green'
                                    : i < pin.length
                                        ? 'bg-saffron scale-110'
                                        : 'bg-ink-lighter/30'
                            }`}
                    />
                ))}
            </div>

            {/* Error Message */}
            {error && (
                <p className="text-danger text-base mb-4 animate-fade-in-up">
                    รหัสไม่ถูกต้อง ลองอีกครั้งนะคะ
                </p>
            )}

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
                {digits.map((d, i) => {
                    if (d === null) return <div key={i} />;
                    if (d === 'del') {
                        return (
                            <button
                                key={i}
                                onClick={handleDelete}
                                className="touch-target flex items-center justify-center rounded-2xl text-ink-light active:bg-cream-dark transition-colors h-16"
                            >
                                <Delete size={28} />
                            </button>
                        );
                    }
                    return (
                        <button
                            key={i}
                            onClick={() => handleDigit(String(d))}
                            className="touch-target flex items-center justify-center rounded-2xl bg-white text-ink text-2xl font-semibold shadow-sm active:bg-saffron-50 active:scale-95 transition-all h-16"
                        >
                            {d}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
