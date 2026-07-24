'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Bell, AlertTriangle, Clock, Trash2, CheckSquare, Square, 
  ShieldCheck, RefreshCw, Droplets, Thermometer, Waves, 
  Mail, Plus, X, ChevronLeft, ChevronRight, Wind, MailCheck
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

  // --- EMAIL CHANNELS STATE ---
  const [emailList, setEmailList] = useState<string[]>([]);
  const [newEmailInput, setNewEmailInput] = useState('');

  // --- PAGINATION ---
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

  // ADD EMAIL
  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmailInput.trim().toLowerCase();
    if (email && !emailList.includes(email) && email.includes('@')) {
      const updatedList = [...emailList, email];
      setEmailList(updatedList);
      setNewEmailInput('');

      await supabase
        .from('app_settings')
        .upsert({ 
          id: 'notification_channels', 
          value: { admin_emails: updatedList, enable_email: updatedList.length > 0 }, 
          updated_at: new Date() 
        });
    }
  };

  // REMOVE EMAIL
  const handleRemoveEmail = async (emailToRemove: string) => {
    const updatedList = emailList.filter(email => email !== emailToRemove);
    setEmailList(updatedList);

    await supabase
      .from('app_settings')
      .upsert({ 
        id: 'notification_channels', 
        value: { admin_emails: updatedList, enable_email: updatedList.length > 0 }, 
        updated_at: new Date() 
      });
  };

  // SELECTION & DELETE MANAGEMENT
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

  const deleteSingle = async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (!error) {
      const updatedNotifs = notifications.filter(n => n.id !== id);
      setNotifications(updatedNotifs);
      setSelectedIds(prev => prev.filter(i => i !== id));
      if (currentPage > Math.ceil(updatedNotifs.length / rowsPerPage) && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
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
    if (confirm('Are you sure you want to delete all notifications?')) {
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
    return <AlertTriangle size={18} className="text-rose-500" />;
  };

  // Pagination calculations
  const totalPages = Math.ceil(notifications.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentTableRows = notifications.slice(indexOfFirstRow, indexOfLastRow);
  const latestAlert = notifications[0] || null;

  return (
    <div className="p-10 bg-[#F4F7FE] min-h-screen text-[#2D365E]">
      
      {/* TOP HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-[#2D365E]">Notifications</h1>
        </div>
        
        {!loading && notifications.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={toggleSelectAllView}
              className="bg-white border border-gray-200 text-[#2D365E] text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm"
            >
              {selectedIds.length === currentTableRows.length && currentTableRows.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
              Select All
            </button>
            
            {selectedIds.length > 0 && (
              <button 
                onClick={deleteSelected}
                className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md"
              >
                <Trash2 size={14} /> Delete Selected ({selectedIds.length})
              </button>
            )}

            <button 
              onClick={clearAllNotifications}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md"
            >
              <Trash2 size={14} /> Delete All ({notifications.length})
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* MAIN PANEL: NOTIFICATION LIST */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* LATEST ALERT BANNER */}
          {!loading && latestAlert && (
            <div className="bg-rose-600 rounded-[30px] p-6 text-white shadow-xl relative overflow-hidden border border-rose-500">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-rose-200 mb-3 bg-black/20 w-fit px-3 py-1 rounded-lg">
                <Bell size={14} className="animate-bounce" /> Latest Alert
              </div>
              <h2 className="text-xl font-black tracking-tight mb-2">{latestAlert.title}</h2>
              <p className="text-sm font-medium text-rose-50/90 leading-relaxed mb-4">{latestAlert.message}</p>
              <div className="text-xs font-mono font-bold text-rose-200 flex items-center gap-1.5">
                <Clock size={12} /> {new Date(latestAlert.created_at).toLocaleString('en-US')}
              </div>
            </div>
          )}

          {/* LIST ITEMS */}
          {loading ? (
            <div className="flex flex-col items-center justify-center bg-white rounded-[35px] p-20 shadow-xl border border-gray-100">
              <RefreshCw className="animate-spin text-[#2D365E]/20 mb-3" size={36} />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Notifications...</p>
            </div>
          ) : notifications.length > 0 ? (
            <div className="space-y-4">
              <div className="space-y-3">
                {currentTableRows.map((notif) => {
                  const isSelected = selectedIds.includes(notif.id);
                  return (
                    <div 
                      key={notif.id}
                      className={`flex items-start gap-4 p-5 rounded-2xl border transition-all bg-white shadow-sm hover:shadow-md ${
                        isSelected ? 'border-[#2D365E] bg-blue-50/30' : 'border-gray-100'
                      }`}
                    >
                      <button 
                        onClick={() => toggleSelect(notif.id)}
                        className="mt-1 text-gray-400 hover:text-[#2D365E] transition-colors"
                      >
                        {isSelected ? <CheckSquare size={18} className="text-[#2D365E]" /> : <Square size={18} />}
                      </button>

                      <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${notif.type === 'critical' ? 'bg-rose-50' : 'bg-amber-50'}`}>
                        {resolveDynamicIcon(notif.title, notif.message)}
                      </div>

                      <div className="flex-grow space-y-1">
                        <div className="flex justify-between items-start gap-4">
                          <h4 className="font-black text-sm text-[#2D365E]">{notif.title}</h4>
                          <span className="text-[11px] font-mono font-bold text-gray-400 whitespace-nowrap flex items-center gap-1">
                            <Clock size={11} />
                            {new Date(notif.created_at).toLocaleString('en-US')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 font-medium leading-relaxed">{notif.message}</p>
                      </div>

                      <button 
                        onClick={() => deleteSingle(notif.id)}
                        className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all shrink-0"
                        title="Delete Notification"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center px-4 pt-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <span>Showing {indexOfFirstRow + 1} - {Math.min(indexOfLastRow, notifications.length)} of {notifications.length} entries</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                      disabled={currentPage === 1} 
                      className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-20 transition-all shadow-sm text-[#2D365E]"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-[#2D365E] px-2 font-black">Page {currentPage} of {totalPages}</span>
                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                      disabled={currentPage === totalPages} 
                      className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-20 transition-all shadow-sm text-[#2D365E]"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-[35px] border border-gray-100 p-16 flex flex-col items-center justify-center text-center shadow-xl">
              <ShieldCheck size={48} className="text-emerald-500 mb-3" />
              <h2 className="text-base font-black uppercase text-[#2D365E]">No Notifications Found</h2>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: ALERT RECIPIENT EMAILS */}
        <div className="xl:col-span-4 bg-white rounded-[35px] p-6 shadow-xl border border-gray-100 space-y-5">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
            <MailCheck size={20} className="text-[#2D365E]" />
            <h2 className="text-base font-black uppercase tracking-tight text-[#2D365E]">Alert Recipient Emails</h2>
          </div>

          <form onSubmit={handleAddEmail} className="flex gap-2">
            <input 
              type="email" 
              placeholder="Enter email..."
              value={newEmailInput}
              onChange={(e) => setNewEmailInput(e.target.value)}
              className="flex-grow p-3 bg-[#F4F7FE] text-xs font-bold rounded-xl outline-none focus:ring-1 focus:ring-[#2D365E] border border-gray-100 text-[#2D365E]"
            />
            <button type="submit" className="bg-[#2D365E] text-white p-3 rounded-xl transition-all shadow-md hover:bg-[#3d497c] flex items-center justify-center">
              <Plus size={18} />
            </button>
          </form>

          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {emailList.length > 0 ? (
              emailList.map((email) => (
                <div key={email} className="flex justify-between items-center p-3 bg-[#F4F7FE] rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#2D365E] truncate">
                    <Mail size={14} className="text-indigo-500 shrink-0" />
                    <span className="truncate">{email}</span>
                  </div>
                  
                  <button 
                    onClick={() => handleRemoveEmail(email)} 
                    type="button" 
                    className="text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all p-1 rounded-lg"
                    title="Delete Email"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl select-none text-xs font-bold text-gray-400">
                No emails registered yet
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
