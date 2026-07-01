import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';

export default function Placeholder() {
  const location = useLocation();
  const moduleName = location.pathname.replace('/', '');
  const title = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-4">
      <div className="bg-white p-6 rounded-full">
        <Construction className="h-16 w-16 text-slate-500" />
      </div>
      <h2 className="text-2xl font-bold text-slate-700">{title || 'Module'} Module</h2>
      <p className="text-slate-400 max-w-md">
        This module is currently under construction and will be built in the upcoming phases.
      </p>
    </div>
  );
}
