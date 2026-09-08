import { useState } from 'react';
import { LayoutDashboard, ClipboardList, UtensilsCrossed, Settings, LogOut, Menu, X, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Orders', icon: ClipboardList },
  { label: 'Menu', icon: UtensilsCrossed },
  { label: 'Settings', icon: Settings },
];

export default function Sidebar({ active, setActive, shopName }: { active: string; setActive: (s: string) => void; shopName: string }) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-100 px-4 py-3 relative z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center"><Store size={16} className="text-white" /></div>
          <p className="font-bold text-gray-900 text-sm truncate max-w-[160px]">{shopName}</p>
        </div>
        <button onClick={() => setOpen(true)} className="text-gray-700"><Menu size={22} /></button>
      </div>

      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 bg-black/50 z-40 md:hidden" />}

      <aside className={`fixed md:sticky top-0 left-0 h-full md:h-screen w-64 md:w-56 bg-white border-r border-gray-100 flex flex-col z-50
        transform transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 bg-orange-600 rounded-lg flex items-center justify-center shrink-0"><Store size={18} className="text-white" /></div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm leading-none truncate">{shopName}</p>
              <p className="text-xs text-orange-600 font-semibold mt-0.5">VENDOR</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="md:hidden text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {navItems.map(({ label, icon: Icon }) => {
            const isActive = active === label;
            return (
              <button
                key={label}
                onClick={() => { setActive(label); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left
                  ${isActive ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
              >
                <Icon size={17} className={isActive ? 'text-orange-700' : 'text-gray-500'} />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100">
          <button onClick={logout} className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
