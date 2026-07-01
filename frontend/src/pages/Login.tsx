import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

import AnimatedBackground from './login/AnimatedBackground';
import LoginForm from './login/LoginForm';

export default function Login() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ta' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  return (
    <div className="flex min-h-screen bg-white font-sans antialiased">

      {/* LEFT: Animated canvas — 55% */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-shrink-0">
        <AnimatedBackground />
      </div>

      {/* RIGHT: Login panel — 45% */}
      <div className="w-full lg:w-[45%] flex flex-col relative bg-white border-l border-slate-100">

        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-5">
          {/* Brand on right panel (visible only on mobile) */}
          <div className="lg:hidden flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-200">
              <span className="text-white text-sm font-bold">S</span>
            </div>
            <span className="text-sm font-bold text-slate-900">
              Shirt<span className="text-blue-600">ERP</span>
            </span>
          </div>
          <div className="hidden lg:block" />

          {/* Language toggle */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100 border border-transparent hover:border-slate-200"
          >
            <Globe className="w-3.5 h-3.5" />
            {i18n.language === 'en' ? 'தமிழ்' : 'English'}
          </button>
        </div>

        {/* Mobile: animated background header strip */}
        <div className="lg:hidden relative h-36 overflow-hidden">
          <AnimatedBackground />
        </div>

        {/* Centered form area — fills remaining vertical space */}
        <div className="flex-1 flex items-center justify-center px-8 sm:px-14 xl:px-20 py-12">
          <LoginForm onSuccess={() => navigate('/')} />
        </div>

        {/* Bottom footer */}
        <div className="px-8 py-4 text-xs text-slate-300 text-center border-t border-slate-50">
          ShirtERP v2.1.0 &copy; {new Date().getFullYear()} · Manufacturing OS
        </div>
      </div>
    </div>
  );
}
