import React, { useState } from 'react';
import { useAppContext } from '../store';
import { Shield, Users, User, KeyRound, Phone, LogIn, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

type LoginMode = 'select' | 'hot' | 'admin';

export const Login = () => {
  const { personnel, setActiveUser, isLoading, refreshData } = useAppContext();
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
    if (!inputNum) { setError('נא להזין מספר טלפון תקין.'); return; }
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
        setError('לא נמצא ראש צוות עם מספר הטלפון הזה במערכת.');
      }
    } catch (err) { setError('שגיאת תקשורת.'); }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'fufch vnkl' || password === 'כוכבי המלך') {
      const admin = personnel.find(p => p.isAdmin);
      setActiveUser(admin || { id: 'admin-001', fullName: 'מנהל מערכת', teamId: '', isReservist: false, isAdmin: true, isHoT: false, phoneNumber: '', emergencyPhoneNumber: '', city: '', homeAddress: '', currentStatus: 'בית' as any, statusUpdatedAt: new Date().toISOString() });
    } else { setError('סיסמה שגויה.'); }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-transparent text-zinc-100 p-4" dir="rtl">
      <div className="max-w-md w-full p-8 bg-white/10 dark:bg-zinc-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl transition-all">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-500/10 rounded-3xl mb-4">
            <Shield size={40} className="text-indigo-400" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">פיקוד חמ"ל</h1>
          <p className="text-zinc-400 mt-2 text-sm uppercase tracking-widest font-bold">מערכת ניהול מבצעית</p>
        </div>

        {mode === 'select' && (
          <div className="space-y-4">
            <button onClick={() => setMode('admin')} className="w-full flex items-center p-4 bg-white/5 dark:bg-black/20 hover:bg-white/10 border border-white/5 hover:border-indigo-500/50 rounded-2xl transition-all group">
              <div className="p-3 bg-red-500/10 text-red-400 rounded-xl group-hover:scale-110 transition-transform ml-4"><KeyRound size={24} /></div>
              <div className="text-right">
                <div className="font-black text-lg text-white">מנהל מערכת</div>
                <div className="text-xs text-zinc-500 font-medium">שליטה מלאה (סיסמה)</div>
              </div>
            </button>
            <button onClick={() => setMode('hot')} className="w-full flex items-center p-4 bg-white/5 dark:bg-black/20 hover:bg-white/10 border border-white/5 hover:border-indigo-500/50 rounded-2xl transition-all group">
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:scale-110 transition-transform ml-4"><Users size={24} /></div>
              <div className="text-right">
                <div className="font-black text-lg text-white">ראש צוות</div>
                <div className="text-xs text-zinc-500 font-medium">ניהול צוות (טלפון)</div>
              </div>
            </button>
            <button onClick={handleGuestLogin} className="w-full flex items-center p-4 bg-white/5 dark:bg-black/20 hover:bg-white/10 border border-white/5 hover:border-indigo-500/50 rounded-2xl transition-all group">
              <div className="p-3 bg-zinc-800 text-zinc-400 rounded-xl group-hover:scale-110 transition-transform ml-4 border border-white/5"><User size={24} /></div>
              <div className="text-right">
                <div className="font-black text-lg text-white">אורח</div>
                <div className="text-xs text-zinc-500 font-medium">צפייה בלבד</div>
              </div>
            </button>
          </div>
        )}

        {mode === 'hot' && (
          <form onSubmit={handleHoTLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 mr-1">מספר טלפון</label>
              <div className="relative">
                <input autoFocus type="text" placeholder="050-0000000" className="w-full bg-black/20 border border-white/10 text-white rounded-2xl p-4 pr-12 focus:ring-2 focus:ring-indigo-500/50 outline-none text-left font-mono" dir="ltr" value={phoneNumber} onChange={e => { setPhoneNumber(e.target.value); setError(''); }} />
                <Phone className="absolute right-4 top-4 text-zinc-500" size={20} />
              </div>
            </div>
            {error && <p className="text-red-400 text-xs font-bold bg-red-400/10 p-3 rounded-xl border border-red-400/20">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={isLoading} className={clsx("flex-1 text-white font-black py-4 rounded-2xl transition-all flex justify-center items-center gap-2 shadow-lg", isLoading ? "bg-zinc-700" : "bg-indigo-600 hover:bg-indigo-500 active:scale-95")}>{isLoading ? <RefreshCw className="animate-spin" size={20} /> : "כניסה"}</button>
              <button type="button" onClick={() => { setMode('select'); setError(''); }} className="px-6 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all">חזור</button>
            </div>
          </form>
        )}

        {mode === 'admin' && (
          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 mr-1">סיסמת מנהל</label>
              <div className="relative">
                <input autoFocus type="password" placeholder="••••••••" className="w-full bg-black/20 border border-white/10 text-white rounded-2xl p-4 pr-12 focus:ring-2 focus:ring-indigo-500/50 outline-none" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} />
                <KeyRound className="absolute right-4 top-4 text-zinc-500" size={20} />
              </div>
            </div>
            {error && <p className="text-red-400 text-xs font-bold bg-red-400/10 p-3 rounded-xl border border-red-400/20">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black py-4 rounded-2xl transition-all shadow-lg flex justify-center items-center gap-2">כניסה למערכת</button>
              <button type="button" onClick={() => { setMode('select'); setError(''); }} className="px-6 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all">חזור</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
