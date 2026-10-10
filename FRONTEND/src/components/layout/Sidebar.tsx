import React from 'react';

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-screen p-4 hidden md:block">
      <nav className="space-y-1">
        <span className="text-xs uppercase font-semibold text-slate-400">Navigation</span>
      </nav>
    </aside>
  );
};
