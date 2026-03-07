import React, { useState } from 'react';
import { useAppContext } from '../store';
import { Plus, Users, Flag, UserPlus, ShieldCheck, Phone, Loader2, Pencil, Trash2, X, Check, Search } from 'lucide-react';
import clsx from 'clsx';

export const Management = () => {
  const { 
    campaigns, teams, personnel, activeUser,
    addCampaign, updateCampaign, deleteCampaign,
    addTeamWithHoT, updateTeam, deleteTeam,
    addPersonnel, updatePersonnel, deletePersonnel,
    showNotification
  } = useAppContext();
  
  const isAdmin = activeUser?.isAdmin;

  // Loading states
  const [isAddingCampaign, setIsAddingCampaign] = useState(false);
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [isAddingSoldier, setIsAddingSoldier] = useState(false);

  // Forms
  const [newCampaignName, setNewCampaignName] = useState('');
  const [teamData, setTeamData] = useState({ teamName: '', hotFullName: '', hotPhoneNumber: '', campaignId: '' });
  const [soldierData, setSoldierData] = useState({ full_name: '', team_id: '', phone_number: '', is_reservist: false, is_abroad: false });

  // Edit States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuffer, setEditDraft] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName || isAddingCampaign) return;
    setIsAddingCampaign(true);
    try { await addCampaign(newCampaignName, new Date().toISOString()); setNewCampaignName(''); }
    finally { setIsAddingCampaign(false); }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamData.teamName || !teamData.hotFullName || !teamData.hotPhoneNumber || !teamData.campaignId || isAddingTeam) return;
    setIsAddingTeam(true);
    try { await addTeamWithHoT(teamData.teamName, teamData.hotFullName, teamData.hotPhoneNumber, teamData.campaignId); setTeamData({ teamName: '', hotFullName: '', hotPhoneNumber: '', campaignId: '' }); }
    finally { setIsAddingTeam(false); }
  };

  const handleAddSoldier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser || isAddingSoldier) return;
    const teamToAssign = isAdmin ? soldierData.team_id : activeUser.teamId;
    if (!teamToAssign) return showNotification('נא לבחור צוות', 'error');
    setIsAddingSoldier(true);
    try { await addPersonnel({ ...soldierData, team_id: teamToAssign }); setSoldierData({ full_name: '', team_id: '', phone_number: '', is_reservist: false, is_abroad: false }); }
    finally { setIsAddingSoldier(false); }
  };

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setEditDraft({ ...p });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await updatePersonnel(editingId, editBuffer);
      setEditingId(null);
    } catch (e) { showNotification('שגיאה בעדכון', 'error'); }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק חייל זה מהמערכת?')) {
      await deletePersonnel(id);
    }
  };

  const isHoTForSelectedTeam = isAdmin || (activeUser?.isHoT && (soldierData.team_id === activeUser.teamId || !isAdmin));

  // Filter list for the table
  const manageablePersonnel = personnel.filter(p => {
    if (isAdmin) return !p.isAdmin;
    if (activeUser?.isHoT) return p.teamId === activeUser.teamId && !p.isAdmin;
    return false;
  }).filter(p => p.fullName.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="h-full overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-4 lg:p-8 text-right transition-colors duration-200" dir="rtl">
      <div className={clsx("mx-auto space-y-8 transition-all", isAdmin ? "max-w-6xl" : "max-w-4xl")}>
        <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">ניהול כוח אדם</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {isAdmin && (
            <>
              {/* 1. Campaign Management */}
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors">
                <h3 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
                  <Flag className="text-indigo-500" size={20} /> ניהול מבצעים
                </h3>
                <form onSubmit={handleCreateCampaign} className="flex flex-col sm:flex-row gap-2 mb-4">
                  <input disabled={isAddingCampaign} type="text" placeholder="שם המבצע" className="flex-1 p-3 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50" value={newCampaignName} onChange={e => setNewCampaignName(e.target.value)} required />
                  <button disabled={isAddingCampaign} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-colors flex justify-center items-center gap-2">{isAddingCampaign ? <Loader2 className="animate-spin" size={18} /> : 'הוסף'}</button>
                </form>
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {campaigns.map(c => (
                    <div key={c.id} className="p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-700 text-sm flex justify-between items-center">
                      <span className="font-bold dark:text-zinc-200 text-xs sm:text-sm">{c.name}</span>
                      <button onClick={() => deleteCampaign(c.id)} className="text-zinc-400 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Team Creation */}
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors">
                <h3 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
                  <ShieldCheck className="text-emerald-500" size={20} /> הקמת צוות ומינוי מפקד
                </h3>
                <form onSubmit={handleCreateTeam} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input disabled={isAddingTeam} placeholder="שם הצוות" className="p-3 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none" value={teamData.teamName} onChange={e => setTeamData({...teamData, teamName: e.target.value})} required />
                    <select disabled={isAddingTeam} className="p-3 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none" value={teamData.campaignId} onChange={e => setTeamData({...teamData, campaignId: e.target.value})} required>
                      <option value="">בחר מבצע...</option>
                      {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 space-y-3">
                    <input disabled={isAddingTeam} placeholder="שם מלא של המפקד" className="w-full p-3 border border-emerald-200 dark:border-emerald-800 dark:bg-zinc-800 dark:text-white rounded-xl text-sm outline-none" value={teamData.hotFullName} onChange={e => setTeamData({...teamData, hotFullName: e.target.value})} required />
                    <input disabled={isAddingTeam} placeholder="מספר טלפון" className="w-full p-3 border border-emerald-200 dark:border-emerald-800 dark:bg-zinc-800 dark:text-white rounded-xl text-sm outline-none text-left" dir="ltr" value={teamData.hotPhoneNumber} onChange={e => setTeamData({...teamData, hotPhoneNumber: e.target.value})} required />
                  </div>
                  <button disabled={isAddingTeam} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-all shadow-md flex justify-center items-center gap-2">{isAddingTeam ? <Loader2 className="animate-spin" size={18} /> : 'הקם צוות חדש'}</button>
                </form>
              </div>
            </>
          )}

          {/* 3. Add Soldier */}
          <div className={clsx("bg-white dark:bg-zinc-900 p-6 lg:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors lg:col-span-2")}>
            <h3 className="text-xl font-bold dark:text-white mb-6 flex items-center gap-3">
              <UserPlus className="text-indigo-500" size={24} /> הוספת חייל חדש לצוות
            </h3>
            <form onSubmit={handleAddSoldier} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              <input disabled={isAddingSoldier} placeholder="שם החייל" className="p-3 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" value={soldierData.full_name} onChange={e => setSoldierData({...soldierData, full_name: e.target.value})} required />
              <input disabled={isAddingSoldier} placeholder="טלפון" className="p-3 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 text-left" dir="ltr" value={soldierData.phone_number} onChange={e => setSoldierData({...soldierData, phone_number: e.target.value})} required />
              {isAdmin ? (
                <select disabled={isAddingSoldier} className="p-3 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" value={soldierData.team_id} onChange={e => setSoldierData({...soldierData, team_id: e.target.value})} required>
                  <option value="">בחר צוות...</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              ) : (
                <div className="p-3 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400 rounded-xl text-sm bg-zinc-50 text-zinc-500 flex items-center h-[46px]">{teams.find(t => t.id === activeUser?.teamId)?.name || 'הצוות שלי'}</div>
              )}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 px-4 md:col-span-2 lg:col-span-3 py-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-colors">
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" checked={soldierData.is_reservist} onChange={e => setSoldierData({...soldierData, is_reservist: e.target.checked})} /><span className="text-sm font-bold text-zinc-600 dark:text-zinc-400">חייל מילואים</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" className="w-4 h-4 text-purple-600 rounded" checked={soldierData.is_abroad} onChange={e => setSoldierData({...soldierData, is_abroad: e.target.checked})} /><span className="text-sm font-bold text-purple-600">בחו"ל</span></label>
              </div>
              <button disabled={isAddingSoldier} className="py-4 rounded-xl font-bold text-white shadow-lg transition-all md:col-span-2 lg:col-span-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-400 flex justify-center items-center gap-2">{isAddingSoldier ? <Loader2 className="animate-spin" size={20} /> : 'שמור חייל במערכת'}</button>
            </form>
          </div>

          {/* 4. Personnel List (Edit/Delete) */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col transition-colors">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-50/50 dark:bg-zinc-900/50">
              <h3 className="text-xl font-bold dark:text-white">רשימת כוח אדם ({manageablePersonnel.length})</h3>
              <div className="relative w-full sm:w-64">
                <input type="text" placeholder="חיפוש חייל..." className="w-full p-2.5 pr-9 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                <Search className="absolute right-3 top-2.5 text-zinc-400" size={16} />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="text-[10px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-50/30 dark:bg-zinc-900/20">
                    <th className="p-4 border-b dark:border-zinc-800">שם מלא</th>
                    <th className="p-4 border-b dark:border-zinc-800">טלפון</th>
                    <th className="p-4 border-b dark:border-zinc-800">צוות</th>
                    <th className="p-4 border-b dark:border-zinc-800">סוג</th>
                    <th className="p-4 border-b dark:border-zinc-800">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {manageablePersonnel.map(p => {
                    const isEditing = editingId === p.id;
                    const teamName = teams.find(t => t.id === p.teamId)?.name || 'ללא צוות';
                    
                    return (
                      <tr key={p.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="p-4">
                          {isEditing ? (
                            <input className="w-full p-2 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg text-sm" value={editBuffer.fullName} onChange={e => setEditDraft({...editBuffer, fullName: e.target.value})} />
                          ) : (
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">{p.fullName}</span>
                          )}
                        </td>
                        <td className="p-4 text-sm font-mono" dir="ltr">
                          {isEditing ? (
                            <input className="w-full p-2 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg text-sm text-left" dir="ltr" value={editBuffer.phoneNumber} onChange={e => setEditDraft({...editBuffer, phoneNumber: e.target.value})} />
                          ) : (
                            p.phoneNumber
                          )}
                        </td>
                        <td className="p-4 text-sm">
                          {isEditing && isAdmin ? (
                            <select className="w-full p-2 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg text-sm" value={editBuffer.teamId} onChange={e => setEditDraft({...editBuffer, teamId: e.target.value})}>
                              <option value="">ללא צוות</option>
                              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          ) : (
                            <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md text-xs font-bold">{teamName}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1">
                            {p.isReservist && <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded uppercase">מילואים</span>}
                            {p.isHoT && <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded uppercase">מפקד</span>}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            {isEditing ? (
                              <>
                                <button onClick={saveEdit} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"><Check size={14}/></button>
                                <button onClick={() => setEditingId(null)} className="p-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg hover:bg-zinc-300 transition-colors shadow-sm"><X size={14}/></button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEdit(p)} className="p-2 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"><Pencil size={14}/></button>
                                <button onClick={() => handleDelete(p.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"><Trash2 size={14}/></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {manageablePersonnel.length === 0 && (
                <div className="p-20 text-center text-zinc-400 italic text-sm">לא נמצאו חיילים התואמים לחיפוש</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
