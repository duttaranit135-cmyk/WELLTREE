import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 py-6 text-center text-sm text-slate-500">
      <p>&copy; {new Date().getFullYear()} Family Health Guardian. One Family. One Health Center. One Trusted Guardian.</p>
    </footer>
  );
};
