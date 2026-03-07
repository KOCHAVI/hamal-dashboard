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

const MainContent = () => {
  const { sirenMode, activeUser } = useAppContext();
  const [activeTab, setActiveTab] = useState('board');

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
        {activeTab === 'management' && <Management />}
      </main>
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
