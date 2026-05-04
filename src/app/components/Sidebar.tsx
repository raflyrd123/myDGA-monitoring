'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
// Tambahkan Bell untuk icon Notifikasi
import { 
  LayoutDashboard, 
  BarChart3, 
  FileText, 
  Info, 
  LogOut, 
  ChevronDown, 
  Settings, 
  Bell 
} from 'lucide-react';

export const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(pathname.includes('/analytics'));

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDay = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { 
      name: 'Analytics', 
      path: '/analytics', 
      icon: <BarChart3 size={20} />,
      hasSub: true,
      subMenu: [
        { name: 'Gas Quality', path: '/analytics/gas-quality' },
        { name: 'Temperature', path: '/analytics/temperature' },
        { name: 'Humidity', path: '/analytics/humidity' },
      ]
    },
    { name: 'Reports', path: '/reports', icon: <FileText size={20} /> },
    // MENU NOTIFICATIONS BARU
    { name: 'Notifications', path: '/notifications', icon: <Bell size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
    { name: 'About Us', path: '/about', icon: <Info size={20} /> },
  ];

  return (
    <aside className="w-80 bg-[#2D365E] text-white flex flex-col min-h-screen sticky top-0 shadow-2xl">
      <div className="p-8 mb-4">
        <Link href="/">
          <Image src="/logo-dga-teks.png" alt="myDGA Logo" width={180} height={50} priority className="cursor-pointer" />
        </Link>
      </div>

      <nav className="flex-grow px-4">
        <p className="text-xs font-bold text-white/40 uppercase tracking-widest px-4 mb-4">Navigation</p>
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.path || (item.hasSub && pathname.includes(item.path));
            
            return (
              <li key={item.name}>
                {item.hasSub ? (
                  <div>
                    <button 
                      onClick={() => setIsAnalyticsOpen(!isAnalyticsOpen)}
                      className={`flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-white/10 text-white font-bold' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                    >
                      <div className="flex items-center gap-4">
                        {item.icon}
                        <span className="text-sm uppercase tracking-wide">{item.name}</span>
                      </div>
                      <ChevronDown size={16} className={`transition-transform duration-300 ${isAnalyticsOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <div className={`overflow-hidden transition-all duration-300 ${isAnalyticsOpen ? 'max-h-40 mt-2' : 'max-h-0'}`}>
                      <ul className="ml-12 space-y-2">
                        {item.subMenu?.map((sub) => (
                          <li key={sub.name}>
                            <Link 
                              href={sub.path}
                              className={`block text-sm py-2 px-4 rounded-lg transition-all ${pathname === sub.path ? 'text-white font-bold bg-white/5' : 'text-white/40 hover:text-white'}`}
                            >
                              {sub.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <Link 
                    href={item.path} 
                    className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-white/10 text-white font-bold' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                  >
                    {item.icon}
                    <span className="text-sm uppercase tracking-wide">{item.name}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-6 border-t border-white/10 bg-[#242c4d]">
        <div className="mb-8 px-2">
          {currentTime ? (
            <>
              <p className="text-sm font-black uppercase leading-none">{formatDay(currentTime)}</p>
              <p className="text-xs text-white/40 font-bold uppercase mt-1 tracking-tighter">{formatTime(currentTime)}</p>
            </>
          ) : (
            <div className="h-8 animate-pulse bg-white/5 rounded-md" />
          )}
        </div>

        <button 
          onClick={() => router.push('/login')}
          className="flex items-center gap-4 px-4 py-3 w-full text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300 group"
        >
          <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-wide">Log Out</span>
        </button>
      </div>
    </aside>
  );
};