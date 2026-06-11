'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Bell, AlertTriangle, Clock, Trash2, CheckSquare, Square, 
  ShieldCheck, RefreshCw, Droplets, Thermometer, Waves, 
  Mail, Plus, X, ChevronLeft, ChevronRight, Wind, Settings2
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

  // --- STATE EMAIL CHANNELS ---
  const [emailList, setEmailList] = useState<string[]>([]);
  const [newEmailInput, setNewEmailInput] = useState('');

  // --- PAGINASI (6 BARIS MAKSIMAL ANTI-SPAM) ---
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 6;

  useEffect(() => {
    fetchNotifications();
    fetchEmailSettings();

    const channel = supabase
      .channel('realtime_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
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

  const fetchEmailSettings = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'notification_channels')
        .single();

      if (data && data.value && data.value.admin_emails) {
        setEmailList(data.value.admin_emails);
      } else {
        setEmailList([]);
      }
    } catch (e) {
      setEmailList([]);
    }
  };

  // 🌟 INSTAN SAVE KETIKA TAMBAH EMAIL
  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmailInput.trim().toLowerCase();
    if (email && !emailList.includes(email) && email.includes('@')) {
      const updatedList = [...emailList, email];
      setEmailList(updatedList);
      setNewEmailInput('');

      // Langsung tembak simpan ke database Supabase
      await supabase
        .from('app_settings')
        .upsert({ 
          id: 'notification_channels', 
          value: { admin_emails: updatedList, enable_email: updatedList.length > 0 }, 
          updated_at: new Date() 
        });
    }
  };

  // 🌟 INSTAN DELETE KETIKA KLIK TOMBOL SILANG (X)
  const handleRemoveEmail = async (emailToRemove: string) => {
    const updatedList = emailList.filter(email => email !== emailToRemove);
    setEmailList(updatedList);

    // Langsung hapus dan update data terbaru ke Supabase
    await supabase
      .from('app_settings')
      .upsert({ 
        id: 'notification_channels', 
        value: { admin_emails: updatedList, enable_email: updatedList.length > 0 }, 
        updated_at: new Date() 
      });
  };

  // --- LOGIKA AKSI TOMBOL HAPUS LOG NOTIFIKASI ---
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllView = () => {
    if (selectedIds.length === currentTableRows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentTableRows.map(n => n.id));
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const { error } = await supabase.from('notifications').delete().in('id', selectedIds);
    if (!error) {
      const updatedNotifs = notifications.filter(n => !selectedIds.includes(n.id));
      setNotifications(updatedNotifs);
      setSelectedIds([]); 
      if (currentPage > Math.ceil(updatedNotifs.length / rowsPerPage) && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    }
  };

  const clearAllNotifications = async () => {
    if (notifications.length === 0) return;
    if (confirm('Hapus seluruh log notifikasi di database?')) {
      const { error } = await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (!error) {
        setNotifications([]);
        setSelectedIds([]);
        setCurrentPage(1);
      }
    }
  };

  const resolveDynamicIcon = (title: string, message: string) => {
    const text = (title + ' ' + message).toLowerCase();
    if (text.includes('temp') || text.includes('suhu')) return <Thermometer size={18} className="text-orange-500" />;
    if (text.includes('water') || text.includes('banjir') || text.includes('level')) return <Waves size={18} className="text-cyan-500" />;
    if (text.includes('hum') || text.includes('lembab')) return <Wind size={18} className="text-blue-400" />;
    if (text.includes('oil') || text.includes('warna')) return <Droplets size={18} className="text-amber-600" />;
    return <AlertTriangle size={18} className="text-yellow-500" />;
  };

  // Paginasi
  const totalPages = Math.ceil(notifications.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentTableRows = notifications.slice(indexOfFirstRow, indexOfLastRow);
  const latestAlert = notifications[0] || null;

  return (
    <div className="p-10 bg-[#F4F7FE] min-h-screen text-[#2D365E]">
      
      {/* HEADER ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <h1 className="text-3xl font-black uppercase tracking-tight text-[#2D365E]">Notifications</h1>
        
        {!loading && notifications.length > 0 && (
          <div className="flex flex-wrap items-center gap-4">
            <button 
              onClick={toggleSelectAllView}
              className="text-[10px] font-black text-[#2D365E]/50 hover:text-[#2D365E] uppercase tracking-widest flex items-center gap-1.5 transition-colors"
            >
              {selectedIds.length === currentTableRows.length ? <CheckSquare size={14} /> : <Square size={14} />}
              Pilih Baris
            </button>
            
            {selectedIds.length > 0 && (
              <button 
                onClick={deleteSelected}
                className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-black px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md uppercase tracking-widest"
              >
                <Trash2 size={12} /> Hapus Terpilih ({selectedIds.length})
              </button>
            )}

            <button 
              onClick={clearAllNotifications}
              className="bg-[#2D365E]/10 hover:bg-red-500 hover:text-white text-[#2D365E] text-[10px] font-black px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all uppercase tracking-widest"
            >
              <Trash2 size={12} /> Kosongkan Log ({notifications.length})
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* PANEL KIRI: LIST LOGS */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* RECENT HIGHLIGHT HERO CARD */}
          {!loading && latestAlert && (
            <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-[30px] p-5 text-white shadow-lg border border-white/10 relative">
              <div className="flex gap-1.5 items-center text-[9px] font-black uppercase tracking-widest text-red-100 mb-2 bg-black/20 w-fit px-2.5 py-1 rounded-lg">
                <Bell size={10} className="animate-bounce" /> RECENT ALERT HIGHLIGHT
              </div>
              <h2 className="text-lg font-black uppercase tracking-tight mb-1">{latestAlert.title}</h2>
              <p className="text-xs font-bold text-red-50/90 mb-3 leading-relaxed">{latestAlert.message}</p>
              <div className="text-[9px] font-mono font-black text-red-200 flex items-center gap-1">
                <Clock size={10} /> {new Date(latestAlert.created_at).toLocaleString('id-ID')}
              </div>
            </div>
          )}

          {/* TABLE BOX ALERTS */}
          {loading ? (
            <div className="flex flex-col items-center justify-center bg-white rounded-[35px] p-20 shadow-xl border border-gray-100">
              <RefreshCw className="animate-spin text-[#2D365E]/20 mb-2" size={32} />
              <p className="text-[10px] font-black text-[#2D365E]/30 uppercase tracking-widest">Streaming logs...</p>
            </div>
          ) : notifications.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-white rounded-[35px] shadow-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                {currentTableRows.map((notif) => {
                  const isSelected = selectedIds.includes(notif.id);
                  return (
                    <div 
                      key={notif.id}
                      onClick={() => toggleSelect(notif.id)}
                      className={`flex items-center gap-4 p-4 cursor-pointer transition-all ${
                        isSelected ? 'bg-[#F4F7FE]' : 'hover:bg-gray-50/40'
                      }`}
                    >
                      <div className={isSelected ? 'text-[#2D365E]' : 'text-gray-200'}>
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </div>

                      <div className={`p-2 rounded-xl shrink-0 ${notif.type === 'critical' ? 'bg-red-50' : 'bg-amber-50'}`}>
                        {resolveDynamicIcon(notif.title, notif.message)}
                      </div>

                      <div className="flex-grow grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                        <div className="md:col-span-4">
                          <div className="font-black text-xs uppercase tracking-tight text-[#2D365E] truncate">
                            {notif.title}
                          </div>
                        </div>
                        <div className="md:col-span-5">
                          <div className="text-[11px] text-gray-500 font-bold uppercase tracking-tight truncate">
                            {notif.message}
                          </div>
                        </div>
                        <div className="md:col-span-3 text-left md:text-right">
                          <div className="text-[9px] font-black text-gray-300 uppercase flex items-center justify-start md:justify-end gap-1">
                            <Clock size={10} />
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* NAVIGASI HALAMAN */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center px-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  <span>Log {indexOfFirstRow + 1} - {Math.min(indexOfLastRow, notifications.length)} dari {notifications.length} baris</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-20 transition-all shadow-sm">
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-[#2D365E]">Hal {currentPage} / {totalPages}</span>
                    <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-20 transition-all shadow-sm">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-[35px] border p-16 flex flex-col items-center justify-center text-center shadow-xl">
              <ShieldCheck size={32} className="text-emerald-500 mb-2" />
              <h2 className="text-xs font-black uppercase text-[#2D365E]">Sistem Trafo Normal</h2>
            </div>
          )}
        </div>

        {/* PANEL KANAN: SMTP EMAIL DISPATCHER (INSTAN AUTO SAVE) */}
        <div className="xl:col-span-4 bg-white rounded-[35px] p-6 shadow-xl border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <Settings2 size={18} className="text-[#2D365E]" />
            <h2 className="text-sm font-black uppercase tracking-tight">SMTP Email Dispatcher</h2>
          </div>

          <form onSubmit={handleAddEmail} className="flex gap-2">
            <input 
              type="email" 
              placeholder="Tambah email baru..."
              value={newEmailInput}
              onChange={(e) => setNewEmailInput(e.target.value)}
              className="flex-grow p-2.5 bg-[#F4F7FE] text-xs font-bold rounded-xl outline-none focus:ring-1 focus:ring-[#2D365E]"
            />
            <button type="submit" className="bg-[#2D365E] text-white p-2.5 rounded-xl transition-all shadow-md hover:bg-[#3d497c] flex items-center justify-center">
              <Plus size={16} />
            </button>
          </form>

          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
            {emailList.length > 0 ? (
              emailList.map((email) => (
                <div key={email} className="flex justify-between items-center p-2.5 bg-[#F4F7FE] rounded-xl border border-gray-100 group">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#2D365E] truncate">
                    <Mail size={12} className="text-indigo-500 shrink-0" />
                    <span className="truncate">{email}</span>
                  </div>
                  
                  {/* TOMBOL SILANG LANGSUNG ACTION HAPUS INSTAN */}
                  <button 
                    onClick={() => handleRemoveEmail(email)} 
                    type="button" 
                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all p-1 rounded-lg"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-6 border border-dashed rounded-xl opacity-30 select-none text-[10px] font-black uppercase">
                Belum ada email terdaftar
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}