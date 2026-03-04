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

const MainContent = () => {
  const { sirenMode } = useAppContext();
  const [activeTab, setActiveTab] = useState('board');

  if (sirenMode) {
    return <SirenMode />;
  }

  return (
    <div className="flex h-screen w-full bg-zinc-50 overflow-hidden font-sans text-zinc-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 h-full overflow-hidden relative">
        {activeTab === 'board' && <LiveBoard />}
        {activeTab === 'reservists' && <Reservists />}
        {activeTab === 'scheduler' && <Scheduler />}
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
