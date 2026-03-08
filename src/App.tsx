/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useAppContext } from './store';
import { Sidebar } from './components/Sidebar';
import { LiveBoard } from './components/LiveBoard';
import { SirenMode } from './components/SirenMode';
import { Reservists } from './components/Reservists';
import { Scheduler } from './components/Scheduler';
import { Management } from './components/Management';
import { AbroadBoard } from './components/AbroadBoard';
import { Login } from './components/Login';
import { SADACH } from './components/SADACH';
import { Analytics } from './components/Analytics';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import clsx from 'clsx';

const NotificationToast = () => {
  const { notification } = useAppContext();
  if (!notification) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className={clsx(
        "flex items-center gap-3 px-6 py-3 rounded-2xl shadow-2xl border backdrop-blur-md transition-all",
        notification.type === 'success' && "bg-emerald-500/90 text-white border-emerald-400",
        notification.type === 'error' && "bg-rose-500/90 text-white border-rose-400",
        notification.type === 'info' && "bg-indigo-500/90 text-white border-indigo-400"
      )}>
        {notification.type === 'success' && <CheckCircle2 size={20} />}
        {notification.type === 'error' && <AlertCircle size={20} />}
        {notification.type === 'info' && <Info size={20} />}
        <span className="font-bold text-sm">{notification.message}</span>
      </div>
    </div>
  );
};

const MainContent = () => {
  const { sirenMode, activeUser, activeTab, setActiveTab } = useAppContext();

  if (!activeUser) {
    return <Login />;
  }

  if (sirenMode) {
    return <SirenMode />;
  }

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden font-sans text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 h-full overflow-hidden relative bg-zinc-50 dark:bg-zinc-950 transition-colors duration-200 pt-16 lg:pt-0">
        {activeTab === 'board' && <LiveBoard />}
        {activeTab === 'sadach' && <SADACH />}
        {activeTab === 'reservists' && <Reservists />}
        {activeTab === 'abroad' && <AbroadBoard />}
        {activeTab === 'scheduler' && <Scheduler />}
        {activeTab === 'analytics' && <Analytics />}
        {activeTab === 'management' && <Management />}
      </main>
      <NotificationToast />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
