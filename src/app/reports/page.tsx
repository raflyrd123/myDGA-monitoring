'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Download, FileSpreadsheet, AlertCircle, ArrowLeft, Calendar } from 'lucide-react';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'quick' | 'archive'>('quick');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableData, setAvailableData] = useState<{year: number, months: number[]}[]>([]);
  
  // State untuk melihat detail bulan tertentu
  const [viewDetail, setViewDetail] = useState<{year: number, month: number} | null>(null);

  useEffect(() => {
    if (activeTab === 'quick') {
      setViewDetail(null);
      fetchQuickLogs();
    } else if (!viewDetail) {
      fetchAvailableArchives();
    }
  }, [activeTab, viewDetail]);

  const fetchQuickLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('sensor_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setLogs(data);
    setLoading(false);
  };

  const fetchAvailableArchives = async () => {
    setLoading(true);
    const { data } = await supabase.from('sensor_logs').select('created_at');
    
    if (data) {
      const structure: Record<number, Set<number>> = {};
      data.forEach((item: { created_at: string }) => {
        const d = new Date(item.created_at);
        const y = d.getFullYear();
        const m = d.getMonth();
        if (!structure[y]) structure[y] = new Set();
        structure[y].add(m);
      });

      const formatted = Object.keys(structure)
        .map(y => ({
          year: parseInt(y),
          months: Array.from(structure[parseInt(y)]).sort((a, b) => b - a)
        }))
        .sort((a, b) => b.year - a.year);
      
      setAvailableData(formatted);
    }
    setLoading(false);
  };

  // Fungsi untuk mengambil data spesifik bulan yang di-klik
  const fetchMonthlyDetail = async (year: number, month: number) => {
    setLoading(true);
    const firstDay = new Date(year, month, 1).toISOString();
    const lastDay = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    const { data } = await supabase
      .from('sensor_logs')
      .select('*')
      .gte('created_at', firstDay)
      .lte('created_at', lastDay)
      .order('created_at', { ascending: false });

    if (data) setLogs(data);
    setLoading(false);
    setViewDetail({ year, month });
  };

  const getMonthName = (m: number) => [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ][m];

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ["Timestamp", "H2", "CH4", "C2H4", "C2H2", "Temp", "Hum"];
    const rows = logs.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.hydrogen_h2, log.methane_ch4, log.ethylene_c2h4,
      log.acetylene_c2h2, log.temperature_c, log.humidity_pct
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `myDGA_Report_${viewDetail ? getMonthName(viewDetail.month) + '_' + viewDetail.year : 'Quick'}.csv`;
    a.click();
  };

  return (
    <div className="p-10 text-[#2D365E]">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight mb-4 text-[#2D365E]">Data Reports</h1>
          <div className="flex bg-gray-100 p-1.5 rounded-2xl w-fit">
            <button onClick={() => { setActiveTab('quick'); setViewDetail(null); }} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'quick' ? 'bg-[#2D365E] text-white shadow-lg' : 'text-gray-400 hover:text-[#2D365E]'}`}>QUICK FILTER</button>
            <button onClick={() => setActiveTab('archive')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'archive' ? 'bg-[#2D365E] text-white shadow-lg' : 'text-gray-400 hover:text-[#2D365E]'}`}>MONTHLY ARCHIVE</button>
          </div>
        </div>
        <button onClick={handleExportCSV} className="bg-[#2D365E] text-white px-8 py-4 rounded-2xl font-black text-xs flex items-center gap-3 shadow-xl hover:bg-[#1e2544] transition-all">
          <Download size={18} /> EXPORT CSV
        </button>
      </div>

      {/* HEADER DETAIL BULAN (Hanya muncul jika sedang melihat detail) */}
      {viewDetail && activeTab === 'archive' && (
        <div className="flex items-center gap-4 mb-6 animate-in fade-in slide-in-from-left-4 duration-300">
          <button onClick={() => setViewDetail(null)} className="p-3 bg-white rounded-xl shadow-md hover:bg-gray-50 transition-all text-[#2D365E]">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-black uppercase tracking-widest text-[#2D365E]">
            Arsip {getMonthName(viewDetail.month)} {viewDetail.year}
          </h2>
        </div>
      )}

      {(activeTab === 'quick' || viewDetail) ? (
        <div className="bg-white rounded-[40px] shadow-2xl border border-gray-50 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-[#707070]">Timestamp</th>
                {['H2', 'CH4', 'C2H4', 'C2H2', 'Temp', 'Hum'].map(h => (
                  <th key={h} className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center text-[#707070]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-20 text-center animate-pulse font-black text-gray-200 text-xl tracking-[0.2em]">FETCHING DATA...</td></tr>
              ) : logs.length > 0 ? logs.map((log, i) => (
                <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/30 transition-colors">
                  <td className="p-8 text-xs font-bold text-gray-400 italic">
                    {new Date(log.created_at).toLocaleDateString('id-ID')} - {new Date(log.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                  </td>
                  <td className="p-8 text-center text-lg font-black text-[#2D365E]">{log.hydrogen_h2}</td>
                  <td className="p-8 text-center text-lg font-black text-[#2D365E]">{log.methane_ch4}</td>
                  <td className="p-8 text-center text-lg font-black text-[#2D365E]">{log.ethylene_c2h4}</td>
                  <td className="p-8 text-center text-lg font-black text-[#2D365E]">{log.acetylene_c2h2}</td>
                  <td className={`p-8 text-center text-lg font-black ${log.temperature_c > 100 ? 'text-[#cb6060]' : 'text-[#2D365E]'}`}>{log.temperature_c}°C</td>
                  <td className="p-8 text-center text-lg font-black text-[#2D365E]">{log.humidity_pct}%</td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="p-20 text-center font-black text-gray-300 text-lg tracking-[0.2em]">NO RECORDS FOUND</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-10">
          {availableData.length > 0 ? availableData.map(item => (
            <div key={item.year} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-[1px] flex-grow bg-gray-100"></div>
                <h2 className="text-3xl font-black text-[#2D365E] opacity-20 italic">{item.year}</h2>
                <div className="h-[1px] flex-grow bg-gray-100"></div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {item.months.map(m => (
                  <button 
                    key={m} 
                    onClick={() => fetchMonthlyDetail(item.year, m)} // KLIK DISINI BUAT LIHAT DATA
                    className="group bg-white p-8 rounded-[35px] shadow-lg border border-gray-50 hover:bg-[#2D365E] transition-all flex flex-col items-center gap-3"
                  >
                    <div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-white/10 group-hover:text-white transition-colors">
                      <FileSpreadsheet size={28} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.2em] group-hover:text-white">{getMonthName(m)}</span>
                    <span className="text-[10px] font-bold text-gray-300 group-hover:text-white/40 italic">AVAILABLE</span>
                  </button>
                ))}
              </div>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center p-20 opacity-20 text-center">
              <AlertCircle size={80} className="mb-4 text-[#2D365E]" />
              <p className="text-3xl font-black uppercase tracking-[0.3em] text-[#2D365E]">No Archives Found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}