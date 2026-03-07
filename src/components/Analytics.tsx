import React, { useMemo } from 'react';
import { useAppContext } from '../store';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { BarChart3, PieChart as PieIcon, TrendingUp, Users, Clock, Calendar } from 'lucide-react';
import clsx from 'clsx';

export const Analytics = () => {
  const { personnel, teams, shifts, activeUser, darkMode } = useAppContext();
  const isAdmin = activeUser?.isAdmin;

  // Filter data based on role
  const myPersonnel = useMemo(() => personnel.filter(p => {
    if (isAdmin) return !p.isAdmin;
    return p.teamId === activeUser?.teamId;
  }), [personnel, isAdmin, activeUser]);

  const myTeams = useMemo(() => teams.filter(t => {
    if (isAdmin) return true;
    return t.id === activeUser?.teamId;
  }), [teams, isAdmin, activeUser]);

  const myPids = useMemo(() => new Set(myPersonnel.map(p => p.id)), [myPersonnel]);
  
  const myShifts = useMemo(() => shifts.filter(s => 
    s.personnelIds?.some(pid => myPids.has(pid))
  ), [shifts, myPids]);

  // Data 1: Shifts per Soldier
  const shiftsPerSoldierData = useMemo(() => {
    const counts: Record<string, number> = {};
    myShifts.forEach(s => {
      s.personnelIds?.forEach(pid => {
        if (myPids.has(pid)) {
          const name = personnel.find(p => p.id === pid)?.fullName || 'Unknown';
          counts[name] = (counts[name] || 0) + 1;
        }
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [myShifts, myPids, personnel]);

  // Data 2: Team Distribution (Admin Only)
  const teamDistData = useMemo(() => {
    return teams.map(t => ({
      name: t.name,
      value: personnel.filter(p => p.teamId === t.id).length
    })).filter(d => d.value > 0);
  }, [teams, personnel]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-right transition-colors duration-200" dir="rtl">
      <div className="p-8 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-colors">
        <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
          <BarChart3 className="text-indigo-600 dark:text-indigo-400" size={32} />
          מרכז נתונים ואנליטיקה
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm font-medium">
          {isAdmin ? 'סקירה פיקודית של כלל היחידה' : `ביצועי צוות: ${myTeams[0]?.name || 'הצוות שלי'}`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4 transition-colors">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <Users size={24} />
            </div>
            <div>
              <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">חיילים בניהול</div>
              <div className="text-2xl font-black text-zinc-900 dark:text-white">{myPersonnel.length}</div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4 transition-colors">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600 dark:text-emerald-400">
              <Clock size={24} />
            </div>
            <div>
              <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">סה"כ משמרות</div>
              <div className="text-2xl font-black text-zinc-900 dark:text-white">{myShifts.length}</div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4 transition-colors">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl text-amber-600 dark:text-amber-400">
              <TrendingUp size={24} />
            </div>
            <div>
              <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">יחס משמרות לחייל</div>
              <div className="text-2xl font-black text-zinc-900 dark:text-white">
                {myPersonnel.length > 0 ? (myShifts.length / myPersonnel.length).toFixed(1) : 0}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart 1: Bar Chart */}
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
              <Clock size={20} className="text-indigo-500" />
              כמות משמרות (טופ 10)
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shiftsPerSoldierData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={darkMode ? "#3f3f46" : "#e4e4e7"} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100} 
                    tick={{ fill: darkMode ? '#a1a1aa' : '#71717a', fontSize: 12, fontWeight: 'bold' }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: darkMode ? '#18181b' : '#ffffff',
                      color: darkMode ? '#f4f4f5' : '#18181b'
                    }}
                    itemStyle={{ color: darkMode ? '#f4f4f5' : '#18181b' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 8, 8, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Pie or Stats */}
          {isAdmin ? (
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                <PieIcon size={20} className="text-emerald-500" />
                חלוקת חיילים לפי צוותים
              </h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={teamDistData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {teamDistData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        backgroundColor: darkMode ? '#18181b' : '#ffffff',
                        color: darkMode ? '#f4f4f5' : '#18181b'
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[2.5rem] text-white shadow-xl flex flex-col justify-center relative overflow-hidden transition-all">
              <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12">
                <Calendar size={200} />
              </div>
              <h3 className="text-2xl font-black mb-2 relative z-10">מוכנות מבצעית</h3>
              <p className="text-indigo-100 mb-8 relative z-10">נתוני הצוות שלך מעודכנים לזמן אמת.</p>
              
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <div className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">חיילים בחו"ל</div>
                  <div className="text-3xl font-black">{myPersonnel.filter(p => p.currentStatus === 'בחו"ל').length}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <div className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">מילואים פעילים</div>
                  <div className="text-3xl font-black">{myPersonnel.filter(p => p.isReservist).length}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
