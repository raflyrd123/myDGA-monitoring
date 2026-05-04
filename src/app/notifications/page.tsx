'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  Trash2, 
  CheckSquare, 
  Square, 
  ShieldCheck,
  RefreshCw,
  Droplets,
  Thermometer,
  Waves
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'critical' | 'warning';
  created_at: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('realtime_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
          new Audio('/sounds/alert-subtle.mp3').play().catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setNotifications(data || []);
    setLoading(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map(n => n.id));
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const { error } = await supabase.from('notifications').delete().in('id', selectedIds);
    if (!error) {
      setNotifications(notifications.filter(n => !selectedIds.includes(n.id)));
      setSelectedIds([]);
    }
  };

  return (
    <div className="p-8 bg-[#F4F7FE] min-h-screen">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-[28px] font-black text-[#2D365E] uppercase tracking-wider leading-none">
            SYSTEM NOTIFICATIONS
          </h1>
        </div>
        
        {notifications.length > 0 && (
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSelectAll}
              className="text-[10px] font-black text-[#2D365E]/40 hover:text-[#2D365E] uppercase tracking-widest flex items-center gap-2 transition-colors"
            >
              {selectedIds.length === notifications.length ? <CheckSquare size={16} /> : <Square size={16} />}
              {selectedIds.length === notifications.length ? 'UNSELECT ALL' : 'SELECT ALL'}
            </button>
            
            {selectedIds.length > 0 && (
              <button 
                onClick={deleteSelected}
                className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-black px-5 py-2.5 rounded-full flex items-center gap-2 transition-all shadow-lg shadow-red-500/20 uppercase tracking-widest"
              >
                <Trash2 size={14} />
                DELETE ({selectedIds.length})
              </button>
            )}
            
            <div className="bg-[#2D365E] text-white text-[10px] font-black px-4 py-2.5 rounded-full uppercase tracking-widest">
              {notifications.length} ALERTS
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="animate-spin text-[#2D365E]/20 mb-4" size={40} />
          <p className="text-[10px] font-black text-[#2D365E]/20 uppercase tracking-widest">Loading Logs...</p>
        </div>
      ) : notifications.length > 0 ? (
        <div className="bg-white rounded-[30px] shadow-sm overflow-hidden border border-[#2D365E]/5">
          {notifications.map((notif) => (
            <div 
              key={notif.id}
              onClick={() => toggleSelect(notif.id)}
              className={`flex items-center gap-6 p-6 cursor-pointer transition-all border-b border-[#F4F7FE] last:border-0 ${
                selectedIds.includes(notif.id) ? 'bg-[#F4F7FE]' : 'hover:bg-[#F4F7FE]/30'
              }`}
            >
              <div className={`${selectedIds.includes(notif.id) ? 'text-[#2D365E]' : 'text-[#2D365E]/10'}`}>
                {selectedIds.includes(notif.id) ? <CheckSquare size={22} /> : <Square size={22} />}
              </div>

              <div className={`shrink-0 p-3 rounded-2xl ${
                notif.type === 'critical' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
              }`}>
                {notif.type === 'critical' ? <AlertTriangle size={20} /> : <Bell size={20} />}
              </div>

              <div className="flex-grow grid grid-cols-12 items-center gap-6">
                {/* Title */}
                <div className="col-span-3">
                   <div className="font-black text-[#2D365E] text-xs uppercase tracking-tight truncate">
                    {notif.title}
                  </div>
                </div>

                {/* Full Detailed Message */}
                <div className="col-span-6">
                  <div className="text-[11px] text-[#2D365E]/60 font-bold uppercase tracking-tight leading-relaxed">
                    {notif.message}
                  </div>
                </div>

                {/* Timestamp */}
                <div className="col-span-3 text-right">
                  <div className="text-[10px] font-black text-[#2D365E]/20 uppercase flex items-center justify-end gap-2">
                    <Clock size={12} />
                    {new Date(notif.created_at).toLocaleString('id-ID', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      day: 'numeric',
                      month: 'short'
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[40px] border border-[#2D365E]/5 p-32 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-16 h-16 bg-[#F4F7FE] text-green-500 rounded-full flex items-center justify-center mb-6">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-xl font-black text-[#2D365E] uppercase tracking-tight">SEMUA SISTEM NORMAL</h2>
          <p className="text-[#2D365E]/30 text-[10px] font-black uppercase mt-3 tracking-widest max-w-xs leading-relaxed">
            Tidak ada parameter abnormal terdeteksi pada unit monitoring saat ini.
          </p>
        </div>
      )}
    </div>
  );
}