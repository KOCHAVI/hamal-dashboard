import React, { useState } from 'react';
import { useAppContext } from '../store';
import { Shield, Users, User, KeyRound, Phone, LogIn, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

type LoginMode = 'select' | 'hot' | 'admin';

export const Login = () => {
  const { personnel, setActiveUser, isLoading } = useAppContext();
  const [mode, setMode] = useState<LoginMode>('select');
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const normalizePhone = (num: string) => num.replace(/\D/g, '');

  const handleGuestLogin = () => {
    setActiveUser({
      id: 'guest',
      fullName: 'אורח',
      teamId: '',
      isReservist: false,
      isAdmin: false,
      isHoT: false,
      phoneNumber: '',
      emergencyPhoneNumber: '',
      city: '',
      homeAddress: '',
      currentStatus: 'בית' as any,
      statusUpdatedAt: new Date().toISOString()
    });
  };

  const handleHoTLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const inputNum = normalizePhone(phoneNumber);
    if (!inputNum) {
      setError('נא להזין מספר טלפון תקין.');
      return;
    }

    try {
      const res = await fetch('/api/login/hot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: inputNum }),
      });

      if (res.ok) {
        const userData = await res.json();
        setActiveUser(userData);
        await refreshData();
      } else {
        const err = await res.json();
        setError('לא נמצא ראש צוות עם מספר הטלפון הזה במערכת.');
      }
    } catch (err) {
      setError('שגיאת תקשורת עם השרת.');
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'fufch vnkl' || password === 'כוכבי המלך') {
      const admin = personnel.find(p => p.isAdmin);
      if (admin) {
        setActiveUser(admin);
      } else {
        // Fallback if admin not yet loaded or doesn't exist
        setActiveUser({
          id: 'admin-001',
          fullName: 'מנהל מערכת',
          teamId: '',
          isReservist: false,
          isAdmin: true,
          isHoT: false,
          phoneNumber: '',
          emergencyPhoneNumber: '',
          city: '',
          homeAddress: '',
          currentStatus: 'בית' as any,
          statusUpdatedAt: new Date().toISOString()
        });
      }
    } else {
      setError('סיסמה שגויה.');
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-zinc-900 text-zinc-100" dir="rtl">
      <div className="max-w-md w-full p-8 bg-zinc-800 rounded-3xl border border-zinc-700 shadow-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-500/10 rounded-full mb-4">
            <Shield size={40} className="text-indigo-400" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">פיקוד חמ"ל</h1>
          <p className="text-zinc-400 mt-2 text-sm uppercase tracking-widest">הזדהות בכניסה למערכת</p>
        </div>

        {mode === 'select' && (
          <div className="space-y-4">
            <button 
              onClick={() => setMode('admin')}
              className="w-full flex items-center p-4 bg-zinc-900 hover:bg-zinc-950 border border-zinc-700 hover:border-indigo-500 rounded-xl transition-all group"
            >
              <div className="p-3 bg-red-500/10 text-red-400 rounded-lg group-hover:scale-110 transition-transform ml-4">
                <KeyRound size={24} />
              </div>
              <div className="text-right">
                <div className="font-bold text-lg text-white">מנהל מערכת</div>
                <div className="text-xs text-zinc-500">שליטה מלאה במערכת (סיסמה)</div>
              </div>
            </button>

            <button 
              onClick={() => setMode('hot')}
              className="w-full flex items-center p-4 bg-zinc-900 hover:bg-zinc-950 border border-zinc-700 hover:border-indigo-500 rounded-xl transition-all group"
            >
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:scale-110 transition-transform ml-4">
                <Users size={24} />
              </div>
              <div className="text-right">
                <div className="font-bold text-lg text-white">ראש צוות</div>
                <div className="text-xs text-zinc-500">ניהול משמרות לצוות (מספר טלפון)</div>
              </div>
            </button>

            <button 
              onClick={handleGuestLogin}
              className="w-full flex items-center p-4 bg-zinc-900 hover:bg-zinc-950 border border-zinc-700 hover:border-indigo-500 rounded-xl transition-all group"
            >
              <div className="p-3 bg-zinc-800 text-zinc-400 rounded-lg group-hover:scale-110 transition-transform ml-4 border border-zinc-700">
                <User size={24} />
              </div>
              <div className="text-right">
                <div className="font-bold text-lg text-white">אורח (צפייה בלבד)</div>
                <div className="text-xs text-zinc-500">גישה ללוח נוכחות וסידור משמרות ללא עריכה</div>
              </div>
            </button>
          </div>
        )}

        {mode === 'hot' && (
          <form onSubmit={handleHoTLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">מספר טלפון</label>
              <div className="relative">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="050-0000000"
                  className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl p-3 pr-11 focus:ring-2 focus:ring-indigo-500 outline-none text-left"
                  dir="ltr"
                  value={phoneNumber}
                  onChange={e => {
                    setPhoneNumber(e.target.value);
                    setError('');
                  }}
                />
                <Phone className="absolute right-3 top-3.5 text-zinc-500" size={18} />
              </div>
            </div>
            
            {error && <p className="text-red-400 text-sm font-medium bg-red-400/10 p-2 rounded-lg border border-red-400/20">{error}</p>}
            
            <div className="flex gap-3">
              <button 
                type="submit" 
                disabled={isLoading}
                className={clsx(
                  "flex-1 text-white font-bold py-3 rounded-xl transition-colors flex justify-center items-center gap-2",
                  isLoading ? "bg-zinc-600 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                )}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    מתחבר לנתונים...
                  </>
                ) : (
                  <>
                    <LogIn size={18} /> כניסה
                  </>
                )}
              </button>
              <button type="button" onClick={() => { setMode('select'); setError(''); }} className="px-6 bg-zinc-700 hover:bg-zinc-600 text-white font-medium py-3 rounded-xl transition-colors">
                חזור
              </button>
            </div>
          </form>
        )}

        {mode === 'admin' && (
          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">סיסמת מנהל</label>
              <div className="relative">
                <input 
                  autoFocus
                  type="password" 
                  placeholder="הזן סיסמה..."
                  className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl p-3 pr-11 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                />
                <KeyRound className="absolute right-3 top-3.5 text-zinc-500" size={18} />
              </div>
            </div>
            
            {error && <p className="text-red-400 text-sm font-medium bg-red-400/10 p-2 rounded-lg border border-red-400/20">{error}</p>}
            
            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors flex justify-center items-center gap-2">
                <LogIn size={18} /> כניסה למערכת
              </button>
              <button type="button" onClick={() => { setMode('select'); setError(''); }} className="px-6 bg-zinc-700 hover:bg-zinc-600 text-white font-medium py-3 rounded-xl transition-colors">
                חזור
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
