'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Download, FileSpreadsheet, AlertCircle, Calendar, ArrowUpDown, ChevronLeft, ChevronRight, Hash, ChevronDown, Trash2 } from 'lucide-react';

export default function ReportsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableData, setAvailableData] = useState<{year: number, months: number[]}[]>([]);
  
  // Selected IDs state for bulk deletion
  const [selectedIds, setSelectedIds] = useState<any[]>([]);

  // Monthly archive navigation & table controls state
  const [viewDetail, setViewDetail] = useState<{year: number, month: number} | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const rowsPerPage = 10; 

  // Water level calibration settings state
  const [settings, setSettings] = useState<any>(null);

  // Page jump & export dropdown state
  const [pageInput, setPageInput] = useState<string>('');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAvailableArchives();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Timestamp formatting helper
  const formatWaktu = (ts: any) => {
    if (!ts || ts === '-') return '-';
    if (!isNaN(Number(ts)) && String(ts).length >= 10) {
      const num = Number(ts);
      return new Date(num < 1e11 ? num * 1000 : num).toLocaleString('en-US');
    }
    return String(ts);
  };

  const fetchAvailableArchives = async () => {
    setLoading(true);
    
    const { data: config } = await supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'calibration')
      .single();
    if (config) setSettings(config.value);

    // Unlimited row fetch for archives to bypass the default 1000-row limit
    let allDates: any[] = [];
    let fromOffset = 0;
    let keepFetchingDates = true;

    while (keepFetchingDates) {
      const { data: chunk, error } = await supabase
        .from('sensor_logs')
        .select('created_at')
        .range(fromOffset, fromOffset + 999);

      if (error || !chunk || chunk.length === 0) {
        keepFetchingDates = false;
      } else {
        allDates = [...allDates, ...chunk];
        if (chunk.length < 1000) {
          keepFetchingDates = false;
        } else {
          fromOffset += 1000;
        }
      }
    }
    
    if (allDates.length > 0) {
      const structure: Record<number, Set<number>> = {};
      allDates.forEach((item: { created_at: string }) => {
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

      if (formatted.length > 0 && formatted[0].months.length > 0) {
        fetchMonthlyDetail(formatted[0].year, formatted[0].months[0], config?.value);
      }
    } else {
      setLogs([]);
      setAvailableData([]);
      setLoading(false);
    }
  };

  const fetchMonthlyDetail = async (year: number, month: number, currentSettings?: any) => {
    setLoading(true);
    setCurrentPage(1);
    setPageInput('');
    setSelectedIds([]); 
    
    const firstDay = new Date(year, month, 1).toISOString();
    const lastDay = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    const activeSettings = currentSettings || settings;

    let allLogs: any[] = [];
    let fromOffset = 0;
    let keepFetching = true;

    while (keepFetching) {
      const { data, error } = await supabase
        .from('sensor_logs')
        .select('*')
        .gte('created_at', firstDay)
        .lte('created_at', lastDay)
        .order('created_at', { ascending: false })
        .range(fromOffset, fromOffset + 999);

      if (error || !data || data.length === 0) {
        keepFetching = false;
      } else {
        allLogs = [...allLogs, ...data];
        if (data.length < 1000) {
          keepFetching = false;
        } else {
          fromOffset += 1000;
        }
      }
    }

    const processedLogs = allLogs.map(log => {
      const baseline = activeSettings?.flood?.groundDistance || 100;
      const sensorReading = log.water_level_cm || 0;
      const actualWaterHeightCm = Math.max(0, baseline - sensorReading);
      return {
        ...log,
        water_level_actual: actualWaterHeightCm
      };
    });

    setLogs(processedLogs);
    setViewDetail({ year, month });
    setLoading(false);
  };

  // --- DELETE LOGIC (WITH BATCHING TO PREVENT PAYLOAD OVERLOAD) ---
  const handleDeleteLog = async (id: any) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this log entry from Supabase?");
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.from('sensor_logs').delete().eq('id', id);
      if (error) throw error;

      setLogs(prev => prev.filter(log => log.id !== id));
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
      alert("Data successfully deleted!");
    } catch (err: any) {
      alert("Failed to delete data: " + err.message);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    
    const confirmDelete = window.confirm(`Are you sure you want to delete ${selectedIds.length} selected items?`);
    if (!confirmDelete) return;

    setLoading(true);
    try {
      const batchSize = 500;
      for (let i = 0; i < selectedIds.length; i += batchSize) {
        const batch = selectedIds.slice(i, i + batchSize);
        const { error } = await supabase.from('sensor_logs').delete().in('id', batch);
        if (error) throw error;
      }

      setLogs(prev => prev.filter(log => !selectedIds.includes(log.id)));
      setSelectedIds([]);
      alert("All selected items successfully deleted!");
    } catch (err: any) {
      alert("Failed to delete data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllCurrentMonth = async () => {
    if (!viewDetail || logs.length === 0) return;

    const confirm1 = window.confirm(`⚠️ CONFIRM DELETE\nAre you sure you want to delete ALL records (${logs.length} rows) for ${getMonthName(viewDetail.month)} ${viewDetail.year}?`);
    if (!confirm1) return;

    setLoading(true);
    try {
      const idsToDelete = logs.map(l => l.id).filter(Boolean);
      
      const batchSize = 500;
      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        const { error } = await supabase.from('sensor_logs').delete().in('id', batch);
        if (error) throw error;
      }

      setLogs([]);
      setSelectedIds([]);
      alert("Data for this month has been successfully cleared!");
      fetchAvailableArchives(); 
    } catch (err: any) {
      alert("Failed to clear data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (m: number) => [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ][m];

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    setCurrentPage(1);
  };

  const sortedLogs = [...logs].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  const totalPages = Math.ceil(sortedLogs.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentTableRows = sortedLogs.slice(indexOfFirstRow, indexOfLastRow);

  const handlePageJump = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPage = parseInt(pageInput);
    if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= totalPages) {
      setCurrentPage(targetPage);
    }
  };

  const generateCSV = (dataList: any[], filename: string) => {
    const headers = [
      "Sent Time", "Received Time", "Packet ID", "H2 (ppm)", "CO (ppm)", "NH3 (ppm)", "CH4 (ppm)", 
      "C3H8 (ppm)", "C4H10 (ppm)", "C2H4 (ppm)", "C2H2 (ppm)", "C2H6 (ppm)", 
      "Temperature (C)", "Humidity (%)", "Oil Color (%)", "Water Level (cm)", "Float Status"
    ];
    
    const rows = dataList.map(log => [
      `"${formatWaktu(log.timestamp_kirim)}"`,
      `"${new Date(log.created_at).toLocaleString('en-US')}"`,
      log.packet_id ? `PKT-${String(log.packet_id).padStart(3, '0')}` : '-',
      log.hydrogen_h2 ?? 0, log.carbon_monoxide_co ?? 0, log.ammonia_nh3 ?? 0, log.methane_ch4 ?? 0,
      log.propane_c3h8 ?? 0, log.butane_c4h10 ?? 0, log.ethylene_c2h4 ?? 0, log.acetylene_c2h2 ?? 0, log.ethane_c2h6 ?? 0,
      log.temperature_c ?? 0, log.humidity_pct ?? 0, log.oil_color_pct ?? 0, 
      log.water_level_actual !== undefined ? log.water_level_actual.toFixed(2) : (log.water_level_cm ?? 0), 
      log.safety_float || '-'
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setShowExportDropdown(false);
  };

  const exportCurrentMonth = () => {
    if (sortedLogs.length === 0 || !viewDetail) return;
    const name = `myDGA_Report_${getMonthName(viewDetail.month)}_${viewDetail.year}.csv`;
    generateCSV(sortedLogs, name);
  };

  const exportAllTimeData = async () => {
    setLoading(true);
    
    let masterLogs: any[] = [];
    let currentOffset = 0;
    let fetchingMaster = true;

    while (fetchingMaster) {
      const { data, error } = await supabase
        .from('sensor_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + 999);

      if (error || !data || data.length === 0) {
        fetchingMaster = false;
      } else {
        masterLogs = [...masterLogs, ...data];
        if (data.length < 1000) {
          fetchingMaster = false;
        } else {
          currentOffset += 1000;
        }
      }
    }

    const processedMaster = masterLogs.map(log => {
      const baseline = settings?.flood?.groundDistance || 100;
      return {
        ...log,
        water_level_actual: Math.max(0, baseline - (log.water_level_cm || 0))
      };
    });

    if (processedMaster.length > 0) {
      generateCSV(processedMaster, `myDGA_Master_Report_AllTime.csv`);
    } else {
      alert("No data available in the database to export.");
    }
    setLoading(false);
  };

  return (
    <div className="p-10 text-[#2D365E] min-h-screen bg-[#f8fafc]">
      
      {/* TOP HEADER BAR */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-[#2D365E]">Data Reports</h1>
        </div>

        {/* EXPORT BUTTON DROPDOWN */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowExportDropdown(!showExportDropdown)}
            disabled={loading}
            className="bg-[#2D365E] hover:bg-[#1e2544] text-white px-6 py-3.5 rounded-xl font-black text-xs flex items-center gap-3 shadow-xl transition-all uppercase tracking-wider"
          >
            <Download size={16} /> Export Data <ChevronDown size={14} className={`transition-transform duration-200 ${showExportDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showExportDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50">
              <button 
                onClick={exportCurrentMonth}
                disabled={logs.length === 0}
                className="w-full text-left px-4 py-3 text-xs font-black text-[#2D365E] hover:bg-gray-50 flex items-center gap-2 uppercase disabled:opacity-30"
              >
                <FileSpreadsheet size={14} className="text-cyan-500" /> Export Current Month ({logs.length} Data)
              </button>
              <button 
                onClick={exportAllTimeData}
                className="w-full text-left px-4 py-3 text-xs font-black text-emerald-600 hover:bg-gray-50 border-t border-gray-50 flex items-center gap-2 uppercase"
              >
                <Download size={14} className="text-emerald-500" /> Export All Data
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MONTHLY ARCHIVE FOLDERS GRID */}
      <div className="space-y-6 mb-10">
        {availableData.length > 0 ? availableData.map(item => (
          <div key={item.year} className="bg-white rounded-[35px] p-6 border border-gray-100 shadow-sm">
            <div className="text-xs font-black text-gray-400 font-mono mb-4 flex items-center gap-2 uppercase">
              <span>Year {item.year} Archive</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {item.months.map(m => {
                const isCurrentView = viewDetail?.year === item.year && viewDetail?.month === m;
                return (
                  <button 
                    key={m} 
                    onClick={() => fetchMonthlyDetail(item.year, m)} 
                    className={`p-5 rounded-2xl border transition-all flex flex-col items-center gap-2 ${
                      isCurrentView 
                        ? 'bg-[#2D365E] text-white border-[#2D365E] shadow-lg scale-105' 
                        : 'bg-gray-50/50 border-gray-100 hover:bg-gray-50 text-[#2D365E]'
                    }`}
                  >
                    <FileSpreadsheet size={22} className={isCurrentView ? 'text-cyan-400' : 'text-[#2D365E]/40'} />
                    <span className="text-xs font-black uppercase tracking-wider">{getMonthName(m).substring(0,3)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )) : null}
      </div>

      {/* CORE TABLE MANAGEMENT PANEL */}
      {viewDetail ? (
        <div className="bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col p-6">
          
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-50">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#2D365E] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-500" /> Sensor Data for {getMonthName(viewDetail.month)} {viewDetail.year} ({logs.length} Entries)
            </h2>
            
            <div className="flex items-center gap-3">
              {selectedIds.length > 0 && (
                <button 
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide hover:bg-red-100 transition-all shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selectedIds.length})
                </button>
              )}
              
              <button 
                onClick={handleDeleteAllCurrentMonth}
                disabled={logs.length === 0}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-30 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all shadow-md"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear This Month
              </button>

              <button 
                onClick={toggleSortOrder}
                className="flex items-center gap-2 bg-gray-50 border border-gray-200 text-[#2D365E] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide hover:bg-gray-100 transition-all"
              >
                <ArrowUpDown className="w-3.5 h-3.5" /> Sort: {sortOrder === 'desc' ? 'Latest' : 'Oldest'}
              </button>
            </div>
          </div>

          {/* RESPONSIVE TABLE */}
          <div className="overflow-x-auto w-full mb-6 rounded-2xl border border-gray-100">
            <table className="w-full text-left border-collapse min-w-[1900px]">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <th className="p-4 pl-6 text-center whitespace-nowrap w-12">
                    <input 
                      type="checkbox"
                      checked={currentTableRows.length > 0 && currentTableRows.every(r => selectedIds.includes(r.id))}
                      onChange={(e) => {
                        const currentIds = currentTableRows.map(r => r.id);
                        if (e.target.checked) {
                          setSelectedIds(prev => Array.from(new Set([...prev, ...currentIds])));
                        } else {
                          setSelectedIds(prev => prev.filter(id => !currentIds.includes(id)));
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-[#2D365E] focus:ring-[#2D365E] cursor-pointer"
                    />
                  </th>
                  <th className="p-4 whitespace-nowrap">Sent Time</th>
                  <th className="p-4 whitespace-nowrap">Received Time</th>
                  <th className="p-4 text-center whitespace-nowrap">Packet ID</th>
                  <th className="p-4 text-center whitespace-nowrap">H2</th>
                  <th className="p-4 text-center whitespace-nowrap">CO</th>
                  <th className="p-4 text-center whitespace-nowrap">NH3</th>
                  <th className="p-4 text-center whitespace-nowrap">CH4</th>
                  <th className="p-4 text-center whitespace-nowrap">C3H8</th>
                  <th className="p-4 text-center whitespace-nowrap">C4H10</th>
                  <th className="p-4 text-center whitespace-nowrap">C2H4</th>
                  <th className="p-4 text-center whitespace-nowrap">C2H2</th>
                  <th className="p-4 text-center whitespace-nowrap">C2H6</th>
                  <th className="p-4 text-center whitespace-nowrap">Temperature</th>
                  <th className="p-4 text-center whitespace-nowrap">Humidity</th>
                  <th className="p-4 text-center whitespace-nowrap">Oil Color</th>
                  <th className="p-4 text-center whitespace-nowrap">Water Level</th>
                  <th className="p-4 text-center whitespace-nowrap">Float Status</th>
                  <th className="p-4 text-center pr-6 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="text-xs font-bold divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={19} className="p-20 text-center animate-pulse font-black text-gray-300 text-lg tracking-widest">
                      LOADING DATA...
                    </td>
                  </tr>
                ) : currentTableRows.length > 0 ? (
                  currentTableRows.map((log, i) => (
                    <tr key={log.id || i} className={`transition-colors ${selectedIds.includes(log.id) ? 'bg-blue-50/40 hover:bg-blue-50/60' : 'hover:bg-gray-50/40'}`}>
                      <td className="p-4 pl-6 text-center">
                        <input 
                          type="checkbox"
                          checked={selectedIds.includes(log.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(prev => [...prev, log.id]);
                            } else {
                              setSelectedIds(prev => prev.filter(id => id !== log.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-[#2D365E] focus:ring-[#2D365E] cursor-pointer"
                        />
                      </td>
                      <td className="p-4 text-[#2D365E] font-mono font-black whitespace-nowrap">
                        {formatWaktu(log.timestamp_kirim)}
                      </td>
                      <td className="p-4 text-gray-500 font-mono whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-US')}
                      </td>
                      <td className="p-4 text-center text-gray-400 font-mono">
                        #PKT-{String(log.packet_id || indexOfFirstRow + i + 1).padStart(3, '0')}
                      </td>
                      <td className="p-4 text-center text-[#2D365E] font-mono">{log.hydrogen_h2 ?? 0} ppm</td>
                      <td className="p-4 text-center text-[#2D365E] font-mono">{log.carbon_monoxide_co ?? 0} ppm</td>
                      <td className="p-4 text-center text-[#2D365E] font-mono">{log.ammonia_nh3 ?? 0} ppm</td>
                      <td className="p-4 text-center text-[#2D365E] font-mono">{log.methane_ch4 ?? 0} ppm</td>
                      <td className="p-4 text-center text-[#2D365E] font-mono">{log.propane_c3h8 ?? 0} ppm</td>
                      <td className="p-4 text-center text-[#2D365E] font-mono">{log.butane_c4h10 ?? 0} ppm</td>
                      <td className="p-4 text-center text-[#2D365E] font-mono">{log.ethylene_c2h4 ?? 0} ppm</td>
                      <td className="p-4 text-center text-[#2D365E] font-mono">{log.acetylene_c2h2 ?? 0} ppm</td>
                      <td className="p-4 text-center text-[#2D365E] font-mono">{log.ethane_c2h6 ?? 0} ppm</td>
                      <td className="p-4 text-center text-[#2D365E] font-mono">{log.temperature_c ?? 0}°C</td>
                      <td className="p-4 text-center text-[#2D365E] font-mono">{log.humidity_pct ?? 0}%</td>
                      <td className="p-4 text-center text-[#2D365E] font-mono">{log.oil_color_pct ?? 0}%</td>
                      <td className="p-4 text-center text-[#2D365E] font-mono">
                        {log.water_level_actual !== undefined ? log.water_level_actual.toFixed(2) : '0.00'} cm
                      </td>
                      <td className="p-4 text-center text-gray-400 font-mono uppercase">{log.safety_float || 'OFF'}</td>
                      <td className="p-4 text-center pr-6 whitespace-nowrap">
                        <button 
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 transition-colors shadow-sm"
                          title="Delete this row"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={19} className="p-20 text-center font-black text-gray-300 text-lg tracking-widest">
                      NO DATA AVAILABLE FOR THIS MONTH
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* TABLE PAGINATION PANEL */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-100 pt-4 text-xs text-gray-400 font-bold uppercase tracking-wider">
              <span>Showing {indexOfFirstRow + 1} - {Math.min(indexOfLastRow, sortedLogs.length)} of {sortedLogs.length} entries</span>
              
              <div className="flex items-center gap-6">
                <form onSubmit={handlePageJump} className="flex items-center gap-2 bg-gray-50 border border-gray-200 p-1 rounded-xl">
                  <Hash className="w-3.5 h-3.5 text-gray-400 ml-2" />
                  <input 
                    type="number" 
                    placeholder="Page..." 
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    min={1}
                    max={totalPages}
                    className="w-20 bg-transparent text-center font-black text-[#2D365E] outline-none text-xs placeholder:text-gray-300"
                  />
                  <button type="submit" className="bg-[#2D365E] text-white px-3 py-1 rounded-lg text-[10px] font-black tracking-wide uppercase hover:bg-[#1e2544] transition-all">Go</button>
                </form>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setCurrentPage(prev => Math.max(prev - 1, 1)); setPageInput(''); }}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl bg-gray-50 border border-gray-200 text-[#2D365E] hover:bg-gray-100 disabled:opacity-20 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[#2D365E] font-black px-1">Page {currentPage} of {totalPages}</span>
                  <button 
                    onClick={() => { setCurrentPage(prev => Math.min(prev + 1, totalPages)); setPageInput(''); }}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl bg-gray-50 border border-gray-200 text-[#2D365E] hover:bg-gray-100 disabled:opacity-20 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-20 opacity-20 text-center bg-white rounded-[40px] border border-gray-100 shadow-sm">
          <AlertCircle size={60} className="mb-4 text-[#2D365E]" />
          <p className="text-xl font-black uppercase tracking-[0.2em] text-[#2D365E]">No Data Available</p>
        </div>
      )}
    </div>
  );
}
