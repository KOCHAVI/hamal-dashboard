import React, { useState } from 'react';
import { useAppContext } from '../store';
import { Plus, Users, Flag, UserPlus, ShieldCheck, Phone, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export const Management = () => {
  const { 
    campaigns, 
    teams, 
    personnel, 
    addCampaign, 
    addTeamWithHoT, 
    addPersonnel, 
    activeUser,
    showNotification
  } = useAppContext();
  
  // Loading states
  const [isAddingCampaign, setIsAddingCampaign] = useState(false);
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [isAddingSoldier, setIsAddingSoldier] = useState(false);

  // Campaign Form
  const [newCampaignName, setNewCampaignName] = useState('');
  
  // Unified Team Form
  const [teamData, setTeamData] = useState({
    teamName: '',
    hotFullName: '',
    hotPhoneNumber: '',
    campaignId: ''
  });

  // Soldier Form
  const [soldierData, setSoldierData] = useState({
    full_name: '',
    team_id: '',
    phone_number: '',
    is_reservist: false,
    is_abroad: false,
  });

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName || isAddingCampaign) return;
    
    setIsAddingCampaign(true);
    try {
      await addCampaign(newCampaignName, new Date().toISOString());
      setNewCampaignName('');
    } finally {
      setIsAddingCampaign(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamData.teamName || !teamData.hotFullName || !teamData.hotPhoneNumber || !teamData.campaignId || isAddingTeam) {
      if (!isAddingTeam) showNotification('יש למלא את כל שדות הצוות וראש הצוות', 'error');
      return;
    }
    
    setIsAddingTeam(true);
    try {
      await addTeamWithHoT(teamData.teamName, teamData.hotFullName, teamData.hotPhoneNumber, teamData.campaignId);
      setTeamData({ teamName: '', hotFullName: '', hotPhoneNumber: '', campaignId: '' });
    } finally {
      setIsAddingTeam(false);
    }
  };

  const handleAddSoldier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser || isAddingSoldier) return;
    
    const teamToAssign = activeUser.isAdmin ? soldierData.team_id : activeUser.teamId;
    if (!teamToAssign) {
      showNotification('נא לבחור צוות לחייל', 'error');
      return;
    }

    setIsAddingSoldier(true);
    try {
      await addPersonnel({ ...soldierData, team_id: teamToAssign });
      setSoldierData({ full_name: '', team_id: '', phone_number: '', is_reservist: false, is_abroad: false });
    } finally {
      setIsAddingSoldier(false);
    }
  };

  const isAdmin = activeUser?.isAdmin;
  const isHoTForSelectedTeam = isAdmin || (activeUser?.isHoT && (soldierData.team_id === activeUser.teamId || !isAdmin));

  return (
    <div className="h-full overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-4 lg:p-8 text-right transition-colors duration-200" dir="rtl">
      <div className={clsx("mx-auto space-y-6 lg:space-y-8 transition-all", isAdmin ? "max-w-6xl" : "max-w-4xl")}>
        <h2 className="text-2xl lg:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">ניהול כוח אדם</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          
          {isAdmin && (
            <>
              {/* 1. Campaign Management */}
              <div className="bg-white dark:bg-zinc-900 p-4 lg:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors">
                <div className="flex items-center gap-2 mb-4">
                  <Flag className="text-indigo-500" size={20} />
                  <h3 className="text-lg font-bold dark:text-white">ניהול מבצעים</h3>
                </div>
                <form onSubmit={handleCreateCampaign} className="flex flex-col sm:flex-row gap-2">
                  <input 
                    disabled={isAddingCampaign}
                    type="text" 
                    placeholder="שם המבצע"
                    className="flex-1 p-3 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
                    value={newCampaignName}
                    onChange={e => setNewCampaignName(e.target.value)}
                    required
                  />
                  <button 
                    disabled={isAddingCampaign}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-colors disabled:bg-zinc-400 flex justify-center items-center gap-2"
                  >
                    {isAddingCampaign ? <Loader2 className="animate-spin" size={18} /> : 'הוסף'}
                  </button>
                </form>
                <div className="mt-4 space-y-2 max-h-32 overflow-y-auto">
                  {campaigns.map(c => (
                    <div key={c.id} className="p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-700 text-sm flex justify-between items-center transition-colors">
                      <span className="font-bold dark:text-zinc-200 text-xs sm:text-sm">{c.name}</span>
                      <span className="text-[10px] sm:text-xs text-zinc-400 dark:text-zinc-500">{new Date(c.startDate).toLocaleDateString('he-IL')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Unified Team & HoT Creation (Admin Only) */}
              <div className="bg-white dark:bg-zinc-900 p-4 lg:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="text-emerald-500" size={20} />
                  <h3 className="text-lg font-bold dark:text-white">הקמת צוות ומינוי מפקד</h3>
                </div>
                <form onSubmit={handleCreateTeam} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input 
                      disabled={isAddingTeam}
                      placeholder="שם הצוות"
                      className="p-3 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all disabled:opacity-50"
                      value={teamData.teamName}
                      onChange={e => setTeamData({...teamData, teamName: e.target.value})}
                      required
                    />
                    <select 
                      disabled={isAddingTeam}
                      className="p-3 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all disabled:opacity-50"
                      value={teamData.campaignId}
                      onChange={e => setTeamData({...teamData, campaignId: e.target.value})}
                      required
                    >
                      <option value="">בחר מבצע...</option>
                      {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 space-y-3 transition-colors">
                    <div className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">פרטי ראש צוות</div>
                    <input 
                      disabled={isAddingTeam}
                      placeholder="שם מלא של המפקד"
                      className="w-full p-3 border border-emerald-200 dark:border-emerald-800 dark:bg-zinc-800 dark:text-white rounded-xl text-sm outline-none transition-all disabled:opacity-50"
                      value={teamData.hotFullName}
                      onChange={e => setTeamData({...teamData, hotFullName: e.target.value})}
                      required
                    />
                    <input 
                      disabled={isAddingTeam}
                      placeholder="מספר טלפון"
                      className="w-full p-3 border border-emerald-200 dark:border-emerald-800 dark:bg-zinc-800 dark:text-white rounded-xl text-sm outline-none text-left transition-all disabled:opacity-50"
                      dir="ltr"
                      value={teamData.hotPhoneNumber}
                      onChange={e => setTeamData({...teamData, hotPhoneNumber: e.target.value})}
                      required
                    />
                  </div>
                  <button 
                    disabled={isAddingTeam}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-all shadow-md disabled:bg-zinc-400 flex justify-center items-center gap-2"
                  >
                    {isAddingTeam ? <Loader2 className="animate-spin" size={18} /> : 'הקם צוות חדש'}
                  </button>
                </form>
              </div>
            </>
          )}

          {/* 3. Add Soldier (Admin or HoT) */}
          <div className={clsx(
            "bg-white dark:bg-zinc-900 p-4 lg:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors lg:col-span-2",
            !isAdmin && "shadow-xl border-indigo-500/20 dark:border-indigo-500/10"
          )}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
                <UserPlus size={24} />
              </div>
              <h3 className="text-xl font-bold dark:text-white">הוספת חייל חדש לצוות</h3>
            </div>
            
            <form onSubmit={handleAddSoldier} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">שם מלא</label>
                <input 
                  disabled={isAddingSoldier}
                  placeholder="שם החייל"
                  className="w-full p-3 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
                  value={soldierData.full_name}
                  onChange={e => setSoldierData({...soldierData, full_name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">טלפון</label>
                <input 
                  disabled={isAddingSoldier}
                  placeholder="מספר טלפון"
                  className="w-full p-3 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 text-left transition-all disabled:opacity-50"
                  dir="ltr"
                  value={soldierData.phone_number}
                  onChange={e => setSoldierData({...soldierData, phone_number: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">צוות</label>
                {isAdmin ? (
                  <select 
                    disabled={isAddingSoldier}
                    className="w-full p-3 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
                    value={soldierData.team_id}
                    onChange={e => setSoldierData({...soldierData, team_id: e.target.value})}
                    required
                  >
                    <option value="">בחר צוות...</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                ) : (
                  <div className="p-3 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400 rounded-xl text-sm bg-zinc-50 text-zinc-500 cursor-not-allowed flex items-center h-[46px] transition-colors">
                    {teams.find(t => t.id === activeUser?.teamId)?.name || 'הצוות שלי'}
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 px-4 md:col-span-2 lg:col-span-3 py-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-colors">
                <div className="flex items-center gap-3">
                  <input 
                    disabled={isAddingSoldier}
                    type="checkbox"
                    id="isSoldierReservist"
                    className="w-4 h-4 text-indigo-600 rounded dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600"
                    checked={soldierData.is_reservist}
                    onChange={e => setSoldierData({...soldierData, is_reservist: e.target.checked})}
                  />
                  <label htmlFor="isSoldierReservist" className="text-sm font-bold text-zinc-600 dark:text-zinc-400 cursor-pointer">חייל מילואים</label>
                </div>

                <div className="flex items-center gap-3">
                  <input 
                    disabled={isAddingSoldier}
                    type="checkbox"
                    id="isSoldierAbroad"
                    className="w-4 h-4 text-purple-600 rounded dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600"
                    checked={soldierData.is_abroad}
                    onChange={e => setSoldierData({...soldierData, is_abroad: e.target.checked})}
                  />
                  <label htmlFor="isSoldierAbroad" className="text-sm font-bold text-purple-600 cursor-pointer">נמצא בחו"ל</label>
                </div>
              </div>

              <button 
                disabled={!isHoTForSelectedTeam || isAddingSoldier}
                className={clsx(
                  "py-4 rounded-xl font-bold text-white shadow-lg transition-all md:col-span-2 lg:col-span-3 transform active:scale-[0.99] flex justify-center items-center gap-2",
                  (isHoTForSelectedTeam && !isAddingSoldier) ? "bg-indigo-600 hover:bg-indigo-700" : "bg-zinc-300 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-600 cursor-not-allowed grayscale"
                )}
              >
                {isAddingSoldier ? <Loader2 className="animate-spin" size={20} /> : (isHoTForSelectedTeam ? "שמור חייל במערכת" : "אין הרשאה לצוות זה")}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};
