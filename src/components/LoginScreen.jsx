import { useState } from 'react';
import { MessageCircleHeart } from 'lucide-react';

export default function LoginScreen({ onLogin }) {
    const [loading, setLoading] = useState(false);

    const handleLogin = () => {
        setLoading(true);
        // Simulate LINE Login delay
        setTimeout(() => {
            onLogin({
                uid: 'line_somsri_001',
                displayName: 'คุณยาย สมศรี',
                nameEn: 'Grandma Somsri',
            });
        }, 1200);
    };

    return (
        <div className="min-h-dvh flex flex-col items-center justify-center bg-cream px-6">
            {/* Logo & Branding */}
            <div className="animate-fade-in-up text-center mb-10">
                <div className="w-28 h-28 mx-auto mb-6 rounded-full bg-saffron-50 flex items-center justify-center shadow-lg">
                    <span className="text-6xl">🙏</span>
                </div>
                <h1 className="text-3xl font-bold text-saffron mb-2">NaMo Care</h1>
                <p className="text-ink-light text-lg">
                    Digital Health & Soul Guardian
                </p>
                <p className="text-ink-lighter text-base mt-1">
                    ดูแลสุขภาพกายและใจ ด้วยความเมตตา
                </p>
            </div>

            {/* NaMo Introduction */}
            <div className="card mb-8 max-w-sm w-full text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center justify-center gap-2 mb-3">
                    <MessageCircleHeart className="text-saffron" size={24} />
                    <span className="text-lg font-semibold text-ink">สวัสดีค่ะ</span>
                </div>
                <p className="text-ink-light text-base leading-relaxed">
                    ฉันชื่อ <strong className="text-saffron">นะโม</strong> เป็นผู้ช่วยดูแลสุขภาพ
                    และจิตใจของคุณค่ะ ให้ฉันดูแลคุณนะคะ 💛
                </p>
            </div>

            {/* LINE Login Button */}
            <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full max-w-sm flex items-center justify-center gap-3 py-4 px-8 rounded-2xl text-white font-semibold text-xl shadow-lg active:scale-95 transition-all duration-200 disabled:opacity-70"
                style={{ backgroundColor: '#06C755' }}
            >
                {loading ? (
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        <span>กำลังเข้าสู่ระบบ...</span>
                    </div>
                ) : (
                    <>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.271.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                        </svg>
                        <span>เข้าสู่ระบบด้วย LINE</span>
                    </>
                )}
            </button>

            {/* Footer */}
            <p className="mt-8 text-ink-lighter text-sm text-center">
                🔒 ปลอดภัย · เป็นส่วนตัว · ด้วยความเมตตา
            </p>
        </div>
    );
}
