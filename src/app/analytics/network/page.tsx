'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, ReferenceLine, Legend, LineChart, Line
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { Activity, Wifi, AlertTriangle, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Download, ArrowUpDown, Calendar, Folder, Hash, XCircle, Signal, Trash2, ChevronDown, FileSpreadsheet } from 'lucide-react';

const CustomNetworkTooltip = ({ active, payload, mode }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 rounded-2xl shadow-2xl border border-gray-100 min-w-[220px]">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{data.fullDate}</p>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold text-gray-500 uppercase">Log Time</span>
          <span className="text-sm font-black text-[#2D365E]">{data.fullTime}</span>
        </div>
        <div className="border-t border-gray-100 pt-2 mt-2 space-y-1">
          {mode === 'qos' ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase">Latency:</span>
                <span className="text-sm font-black text-[#2D365E]">{data.latency.toFixed(0)} ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-600 uppercase">Throughput:</span>
                <span className="text-sm font-black text-emerald-600">{data.throughput.toFixed(2)} bps</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase">RSSI:</span>
                <span className="text-sm font-black text-[#2D365E]">{data.rssi} dBm</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase">SNR:</span>
                <span className="text-sm font-black text-cyan-600">{data.snr.toFixed(1)} dB</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default function NetworkAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('24h');
  const [chartMode, setChartMode] = useState<'qos' | 'signal'>('qos');
  const [networkData, setNetworkData] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({ avgLatency: 0, avgRssi: 0, avgSnr: 0 });

  // CHECKBOX & DELETE MANAGEMENT STATE
  const [selectedIds, setSelectedIds] = useState<any[]>([]);

  const [selectedMonth, setSelectedMonth] = useState<string>(''); 
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); 
  const rowsPerPage = 10;
  const [pageInput, setPageInput] = useState<string>('');

  // EXPORT DROPDOWN STATE
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  const fetchNetworkMetricsRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatWaktuDikirim = (ts: any) => {
    if (!ts || ts === '-') return '-';
    if (!isNaN(Number(ts)) && String(ts).length >= 10) {
      const num = Number(ts);
      return new Date(num < 1e11 ? num * 1000 : num).toLocaleString('en-US');
    }
    return String(ts);
  };

  const fetchNetworkMetrics = async () => {
    if (networkData.length === 0) setLoading(true);
    
    let query = supabase
      .from('sensor_logs')
      .select('id, created_at, timestamp_kirim, lora_rssi, lora_snr, packet_id')
      .order('created_at', { ascending: true });

    if (timeRange !== 'all') {
      const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', cutoff);
    }

    let allRawData: any[] = [];
    let fromOffset = 0;
    let keepFetching = true;

    while (keepFetching) {
      const { data: chunk, error } = await query.range(fromOffset, fromOffset + 999);

      if (error || !chunk || chunk.length === 0) {
        keepFetching = false;
      } else {
        allRawData = [...allRawData, ...chunk];
        if (chunk.length < 1000) {
          keepFetching = false;
        } else {
          fromOffset += 1000;
        }
      }
    }

    if (allRawData.length > 0) {
      let totalLatency = 0;
      let validLatencyCount = 0;
      let totalRssi = 0;
      let totalSnr = 0;
      let validSignalCount = 0;
      let lossCount = 0;
      let expectedNextId = null;
      let lastTimestamp = null; 
      const allMappedLogs: any[] = [];
      
      allRawData.forEach((item, idx) => {
        const d = new Date(item.created_at);
        const waktuDiterimaCloud = d.getTime(); 
        const packetId = item.packet_id || idx + 1;
        
        let isNewSession = false;
        let timeGapSeconds = 10; 
        
        if (lastTimestamp !== null) {
          const timeGapMinutes = (waktuDiterimaCloud - lastTimestamp) / (1000 * 60);
          timeGapSeconds = (waktuDiterimaCloud - lastTimestamp) / 1000;
          
          if (timeGapMinutes > 30) { 
            isNewSession = true;
            timeGapSeconds = 10; 
          }
        }
        lastTimestamp = waktuDiterimaCloud;

        const rssi = item.lora_rssi || 0;
        const snr = item.lora_snr || 0;
        const monthGroup = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

        let latency = 0;
        if (item.timestamp_kirim && item.timestamp_kirim !== '-') {
          const strTs = String(item.timestamp_kirim).trim();
          const isoStr = strTs.includes('T') ? strTs : strTs.replace(' ', 'T') + '+07:00';
          const waktuKirimNode = new Date(isoStr).getTime();

          if (!isNaN(waktuKirimNode) && waktuKirimNode > 0) {
            const diff = waktuDiterimaCloud - waktuKirimNode;
            latency = diff > 0 ? diff : 0;
          }
        }

        if (timeGapSeconds <= 0) timeGapSeconds = 1; 
        const throughput = (220 * 8) / timeGapSeconds; 

        if (expectedNextId !== null && packetId > expectedNextId && !isNewSession) {
          const gapSize = packetId - expectedNextId;
          
          if (gapSize > 0 && gapSize < 30) { 
            lossCount += gapSize;
            for (let lostId = expectedNextId; lostId < packetId; lostId++) {
              allMappedLogs.push({
                id: lostId,
                dbId: null,
                isLost: true, 
                displayX: '', 
                fullDate: d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
                fullTime: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                timestamp_kirim: '-',
                created_at: item.created_at,
                rawDate: new Date(waktuDiterimaCloud - 1000), 
                monthGroup,
                latency: 0,
                rssi: 0,
                snr: 0,
                throughput: 0
              });
            }
          }
        }
        
        expectedNextId = packetId + 1;
        if (latency > 0) {
          totalLatency += latency;
          validLatencyCount++;
        }

        if (rssi !== 0) {
          totalRssi += rssi;
          totalSnr += snr;
          validSignalCount++;
        }

        allMappedLogs.push({
          id: packetId,
          dbId: item.id, 
          isLost: false,
          displayX: '', 
          fullDate: d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
          fullTime: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          timestamp_kirim: formatWaktuDikirim(item.timestamp_kirim),
          created_at: item.created_at,
          rawDate: d, 
          monthGroup,
          latency,
          rssi,
          snr,
          throughput 
        });
      });

      const avgLatency = validLatencyCount > 0 ? (totalLatency / validLatencyCount) : 0;
      const avgRssi = validSignalCount > 0 ? (totalRssi / validSignalCount) : 0;
      const avgSnr = validSignalCount > 0 ? (totalSnr / validSignalCount) : 0;

      setStats({ avgLatency, avgRssi, avgSnr });

      const targetPoints = 55;
      const dynamicStep = Math.ceil(allMappedLogs.length / targetPoints) || 1;

      const processedChartData = allMappedLogs
        .filter(item => !item.isLost)
        .filter((_, index) => index % dynamicStep === 0)
        .map(item => ({
          ...item,
          displayX: timeRange === '24h' 
            ? item.rawDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : item.rawDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
        }));

      setChartData(processedChartData);
      setNetworkData(allMappedLogs); 

      if (!selectedMonth && allMappedLogs.length > 0) {
        setSelectedMonth(allMappedLogs[allMappedLogs.length - 1].monthGroup);
      }
    } else {
      setChartData([]);
      setNetworkData([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNetworkMetricsRef.current = fetchNetworkMetrics;
  });

  useEffect(() => {
    fetchNetworkMetricsRef.current();

    const networkChannel = supabase
      .channel('live-network-stream')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_logs' }, () => {
        fetchNetworkMetricsRef.current();
      })
      .subscribe();

    return () => { supabase.removeChannel(networkChannel); };
  }, [timeRange]);

  // DELETE LOGIC (WITH CHUNKING FOR LARGE DATASETS)
  const handleDeleteLog = async (dbId: any, packetId: any) => {
    if (!dbId) return;
    const confirmDelete = window.confirm(`Are you sure you want to permanently delete packet #${packetId} from Supabase?`);
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.from('sensor_logs').delete().eq('id', dbId);
      if (error) throw error;

      setNetworkData(prev => prev.filter(log => log.dbId !== dbId));
      setSelectedIds(prev => prev.filter(id => id !== dbId));
      alert("Data successfully deleted!");
    } catch (err: any) {
      alert("Failed to delete data: " + err.message);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    
    const confirmDelete = window.confirm(`Are you sure you want to permanently delete ${selectedIds.length} selected items from Supabase?`);
    if (!confirmDelete) return;

    setLoading(true);
    try {
      const batchSize = 500;
      for (let i = 0; i < selectedIds.length; i += batchSize) {
        const batch = selectedIds.slice(i, i + batchSize);
        const { error } = await supabase.from('sensor_logs').delete().in('id', batch);
        if (error) throw error;
      }

      setNetworkData(prev => prev.filter(log => !selectedIds.includes(log.dbId)));
      setSelectedIds([]);
      alert("All selected items successfully deleted!");
      fetchNetworkMetrics();
    } catch (err: any) {
      alert("Failed to delete selected items: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllCurrentMonth = async () => {
    if (!selectedMonth || sortedLogs.length === 0) return;

    const confirm1 = window.confirm(`⚠️ CRITICAL ACTION!\nAre you sure you want to delete ALL records for ${selectedMonth} (${filteredMonthLogs.length} rows) from the cloud database?`);
    if (!confirm1) return;

    const confirm2 = window.confirm("🔥 This action is destructive and cannot be undone. Click OK to proceed.");
    if (!confirm2) return;

    setLoading(true);
    try {
      const idsToDelete = filteredMonthLogs.map(l => l.dbId).filter(Boolean);
      
      // Batch delete in chunks of 500 to prevent HTTP payload overflow / timeout
      const batchSize = 500;
      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        const { error } = await supabase.from('sensor_logs').delete().in('id', batch);
        if (error) throw error;
      }

      setNetworkData(prev => prev.filter(log => log.monthGroup !== selectedMonth));
      setSelectedIds([]);
      alert(`Records for ${selectedMonth} successfully cleared!`);
      fetchNetworkMetrics();
    } catch (err: any) {
      alert("Failed to clear month data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    setCurrentPage(1);
    setPageInput('');
  };

  const filteredMonthLogs = networkData.filter(log => log.monthGroup === selectedMonth);
  
  const sortedLogs = [...filteredMonthLogs].sort((a, b) => {
    if (sortOrder === 'desc') {
      return b.rawDate.getTime() - a.rawDate.getTime();
    } else {
      return a.rawDate.getTime() - b.rawDate.getTime();
    }
  });

  const totalMonthsAvailable = Array.from(new Set(networkData.map(log => log.monthGroup)));
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

  // EXPORT CSV HELPER
  const generateCSV = (dataList: any[], filename: string) => {
    const headers = ['Packet ID', 'Status', 'Sent Time', 'Received Time', 'End-to-End Latency (ms)', 'RSSI (dBm)', 'SNR (dB)', 'Throughput (bps)'];
    const rows = dataList.map(log => [
      `PKT-${String(log.id).padStart(3, '0')}`,
      log.isLost ? 'FAILED' : 'SUCCESS',
      `"${log.timestamp_kirim}"`,
      `"${new Date(log.created_at).toLocaleString('en-US')}"`,
      log.isLost ? '0' : log.latency.toFixed(0),
      log.isLost ? '0' : log.rssi,
      log.isLost ? '0' : log.snr.toFixed(1),
      log.isLost ? '0' : log.throughput.toFixed(2)
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportDropdown(false);
  };

  const exportCurrentMonth = () => {
    if (sortedLogs.length === 0 || !selectedMonth) return;
    generateCSV(sortedLogs, `LoRa_Network_Data_${selectedMonth.replace(/\s+/g, '_')}.csv`);
  };

  const exportAllTimeData = async () => {
    setLoading(true);
    let allTimeLogs: any[] = [];
    let fromOffset = 0;
    let keepFetching = true;

    while (keepFetching) {
      const { data: chunk, error } = await supabase
        .from('sensor_logs')
        .select('created_at, timestamp_kirim, lora_rssi, lora_snr, packet_id')
        .order('created_at', { ascending: true })
        .range(fromOffset, fromOffset + 999);

      if (error || !chunk || chunk.length === 0) {
        keepFetching = false;
      } else {
        allTimeLogs = [...allTimeLogs, ...chunk];
        if (chunk.length < 1000) {
          keepFetching = false;
        } else {
          fromOffset += 1000;
        }
      }
    }

    const mappedAllTime = allTimeLogs.map((item, idx) => {
      const d = new Date(item.created_at);
      const waktuDiterimaCloud = d.getTime(); 
      const packetId = item.packet_id || idx + 1;
      let latency = 0;
      if (item.timestamp_kirim && item.timestamp_kirim !== '-') {
        const strTs = String(item.timestamp_kirim).trim();
        const isoStr = strTs.includes('T') ? strTs : strTs.replace(' ', 'T') + '+07:00';
        const waktuKirimNode = new Date(isoStr).getTime();
        if (!isNaN(waktuKirimNode) && waktuKirimNode > 0) {
          const diff = waktuDiterimaCloud - waktuKirimNode;
          latency = diff > 0 ? diff : 0;
        }
      }
      return {
        id: packetId,
        isLost: false,
        timestamp_kirim: formatWaktuDikirim(item.timestamp_kirim),
        created_at: item.created_at,
        latency,
        rssi: item.lora_rssi || 0,
        snr: item.lora_snr || 0,
        throughput: 1760 / 10 
      };
    });

    if (mappedAllTime.length > 0) {
      generateCSV(mappedAllTime, `LoRa_Network_Data_AllTime.csv`);
    } else {
      alert("No data available to export.");
    }
    setLoading(false);
  };

  const hasSignalData = chartData.some(item => item.rssi !== 0);
  const currentTableDbIds = currentTableRows.map(r => r.dbId).filter(Boolean);

  return (
    <div className="p-10 text-[#2D365E] min-h-screen bg-[#f8fafc]">
      
      {/* HEADER BAR */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black uppercase tracking-tight text-[#2D365E]">
          Analytics - Network QoS
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-100">
            {(['24h', '7d', '30d', 'all'] as const).map((range) => (
              <button 
                key={range} 
                onClick={() => setTimeRange(range)} 
                className={`px-6 py-2 rounded-lg font-bold transition-all ${timeRange === range ? 'bg-[#2D365E] text-white' : 'text-gray-400 hover:text-[#2D365E]'}`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>

          {/* EXPORT DROPDOWN */}
          <div className="relative" ref={exportDropdownRef}>
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
                  disabled={sortedLogs.length === 0}
                  className="w-full text-left px-4 py-3 text-xs font-black text-[#2D365E] hover:bg-gray-50 flex items-center gap-2 uppercase disabled:opacity-30"
                >
                  <FileSpreadsheet size={14} className="text-cyan-500" /> Export Current Month ({sortedLogs.length} Logs)
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
      </div>

      {/* METRICS CARD ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <div className="bg-white rounded-[40px] p-8 shadow-xl border border-gray-100/50 flex flex-col justify-between">
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-400" /> Average Latency
            </p>
            <h3 className="text-5xl font-black text-[#2D365E]">
              {loading ? '--' : `${stats.avgLatency.toFixed(0)} ms`}
            </h3>
          </div>
          <span className="text-[11px] font-black text-gray-400 tracking-widest mt-4 uppercase">
            End-to-End Latency
          </span>
        </div>

        <div className="bg-white rounded-[40px] p-8 shadow-xl border border-gray-100/50 flex flex-col justify-between">
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-gray-400" /> Average RSSI
            </p>
            <h3 className="text-5xl font-black text-blue-600">
              {loading ? '--' : `${stats.avgRssi.toFixed(1)} dBm`}
            </h3>
          </div>
          <span className="text-[11px] font-black text-gray-400 tracking-widest mt-4 uppercase">
            Radio Signal Strength
          </span>
        </div>

        <div className="bg-[#2D365E] rounded-[40px] p-8 shadow-xl flex items-center justify-between overflow-hidden relative border border-white/5">
          <div className="z-10">
            <p className="text-xs font-black text-white/40 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Signal className="w-4 h-4 text-cyan-400" /> Average SNR
            </p>
            <h3 className="text-5xl font-black text-cyan-400 tracking-tight mb-1">
              {loading ? '--' : `${stats.avgSnr.toFixed(1)} dB`}
            </h3>
            <p className="text-xs font-bold text-white/50 uppercase mt-2">
              Signal to Noise Ratio
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 font-black text-xs">
             LoRa
          </div>
        </div>
      </div>

      {/* CORE CHART BLOCK */}
      <div className="bg-white rounded-[50px] p-10 shadow-2xl flex flex-col h-[530px] relative border border-gray-100/40 mb-10">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button 
              onClick={() => setChartMode('qos')}
              className={`px-5 py-2 rounded-lg text-xs font-black uppercase transition-all ${chartMode === 'qos' ? 'bg-white text-[#2D365E] shadow-sm' : 'text-gray-400'}`}
            >
              Latency & Throughput Trend
            </button>
            <button 
              onClick={() => setChartMode('signal')}
              className={`px-5 py-2 rounded-lg text-xs font-black uppercase transition-all ${chartMode === 'signal' ? 'bg-white text-[#2D365E] shadow-sm' : 'text-gray-400'}`}
            >
              RF Signal Quality (RSSI / SNR)
            </button>
          </div>
        </div>

        <div className="flex-grow flex items-center justify-center w-full">
          {loading ? (
            <div className="animate-pulse font-black text-gray-200 text-2xl uppercase tracking-widest">Processing Database...</div>
          ) : chartData.length > 0 ? (
            chartMode === 'qos' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: 10, right: 10 }}>
                  <defs>
                    <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2D365E" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2D365E" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="displayX" axisLine={false} tickLine={false} tick={{fill: '#2D365E', fontSize: 11, fontWeight: 'bold'}} />
                  <YAxis width={65} axisLine={false} tickLine={false} tick={{fill: '#2D365E', fontSize: 11, fontWeight: 'bold'}} domain={[0, 4000]} label={{ value: 'Performance Metric Level', angle: -90, position: 'insideLeft', fill: '#2D365E', offset: 5, fontWeight: 'bold', fontSize: 11 }} />
                  <RechartsTooltip content={<CustomNetworkTooltip mode="qos" />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <ReferenceLine y={2500} stroke="#cb6060" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'High Latency Threshold', fill: '#cb6060', fontSize: 10, fontWeight: 'bold', position: 'top' }} />
                  <Area type="monotone" dataKey="latency" name="Latency (ms)" stroke="#2D365E" strokeWidth={4} fillOpacity={1} fill="url(#colorLatency)" />
                  <Line type="monotone" dataKey="throughput" name="Throughput (bps)" stroke="#10b981" strokeWidth={3} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : hasSignalData ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="displayX" axisLine={false} tickLine={false} tick={{fill: '#2D365E', fontSize: 11, fontWeight: 'bold'}} />
                  <YAxis width={65} axisLine={false} tickLine={false} tick={{fill: '#2D365E', fontSize: 11, fontWeight: 'bold'}} domain={[-130, 20]} label={{ value: 'Signal Level (dBm / dB)', angle: -90, position: 'insideLeft', fill: '#2D365E', offset: 5, fontWeight: 'bold', fontSize: 11 }} />
                  <RechartsTooltip content={<CustomNetworkTooltip mode="signal" />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <ReferenceLine y={-115} stroke="#cb6060" strokeDasharray="6 6" strokeWidth={1.5} label={{ value: 'LoRa Sensitivity Edge (-115 dBm)', fill: '#cb6060', fontSize: 9, fontWeight: 'bold', position: 'bottom' }} />
                  <Line type="monotone" dataKey="rssi" name="RSSI (dBm)" stroke="#3b82f6" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="snr" name="SNR (dB)" stroke="#06b6d4" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center opacity-25 select-none py-20">
                <Wifi className="w-24 h-24 mb-2 text-[#2D365E]" />
                <p className="font-black text-2xl uppercase tracking-[0.2em] text-[#2D365E]">No Signal Data Available</p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center opacity-15 select-none">
               <AlertTriangle className="w-24 h-24 mb-2 text-[#2D365E]" />
               <p className="font-black text-2xl uppercase tracking-[0.2em] text-[#2D365E]">No Data Available</p>
            </div>
          )}
        </div>
      </div>

      {/* SECTION WITH DELETE CONTROLS */}
      <div className="bg-[#2D365E] rounded-[50px] p-10 shadow-2xl border border-white/5 text-white flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">LoRa Communication Performance Data</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap">
            {selectedIds.length > 0 && (
              <button 
                onClick={handleDeleteSelected}
                className="flex items-center gap-2 bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 px-4 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all shadow-sm"
              >
                <Trash2 className="w-4 h-4" /> Delete Selected ({selectedIds.length})
              </button>
            )}

            <button 
              onClick={handleDeleteAllCurrentMonth}
              disabled={filteredMonthLogs.length === 0}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-30 text-white px-4 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all shadow-md"
            >
              <Trash2 className="w-4 h-4" /> Clear Current Month
            </button>

            <button 
              onClick={toggleSortOrder}
              className="flex items-center gap-2 bg-white/10 border border-white/10 px-4 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase hover:bg-white/20 transition-all"
            >
              <ArrowUpDown className="w-4 h-4" /> Sort: {sortOrder === 'desc' ? 'Latest' : 'Oldest'}
            </button>
          </div>
        </div>

        {/* FOLDERS GRID CONTROLLER */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 mb-8">
          {!loading && totalMonthsAvailable.length > 0 ? (
            totalMonthsAvailable.map((month) => {
              const isActive = selectedMonth === month;
              const shortMonthName = month.split(' ')[0]; 
              return (
                <button
                  key={month}
                  onClick={() => {
                    setSelectedMonth(month);
                    setCurrentPage(1); 
                    setPageInput('');
                    setSelectedIds([]);
                  }}
                  className={`flex flex-col items-center justify-center p-6 rounded-[30px] border transition-all duration-300 ${
                    isActive 
                      ? 'bg-white text-[#2D365E] border-white shadow-xl scale-105' 
                      : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  <Folder className={`w-10 h-10 mb-2 transition-transform ${isActive ? 'text-[#2D365E] scale-110' : 'text-white/40'}`} />
                  <span className="font-black text-xs uppercase tracking-widest">{shortMonthName}</span>
                </button>
              );
            })
          ) : !loading && (
            <div className="col-span-full flex flex-col items-center justify-center py-10 opacity-30 border border-dashed border-white/10 rounded-2xl select-none">
               <Folder className="w-12 h-12 mb-2" />
               <span className="text-xs font-black uppercase tracking-widest">No Data Folders Found</span>
            </div>
          )}
        </div>

        {/* FILTERED TABLE */}
        {!loading && selectedMonth && sortedLogs.length > 0 ? (
          <div className="bg-black/10 rounded-[35px] border border-white/5 p-6 transition-all duration-500">
            <div className="flex items-center gap-2 mb-4 text-white/40 text-[10px] font-black uppercase tracking-widest">
              <Calendar className="w-3 h-3 text-cyan-400" />
              <span>LoRa Communication Data for {selectedMonth} ({filteredMonthLogs.length} Logs)</span>
            </div>
            
            <div className="overflow-x-auto w-full mb-6">
              <table className="w-full text-left border-collapse min-w-[1800px]">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest">
                    <th className="pb-3 pl-4 text-center w-12">
                      <input 
                        type="checkbox"
                        checked={currentTableDbIds.length > 0 && currentTableDbIds.every(id => selectedIds.includes(id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(prev => Array.from(new Set([...prev, ...currentTableDbIds])));
                          } else {
                            setSelectedIds(prev => prev.filter(id => !currentTableDbIds.includes(id)));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-[#2D365E] focus:ring-[#2D365E] cursor-pointer"
                      />
                    </th>
                    <th className="pb-3">Packet ID</th>
                    <th className="pb-3">Sent Time</th>
                    <th className="pb-3">Received Time</th>
                    <th className="pb-3 text-center">Status</th>
                    <th className="pb-3 text-center">Topology</th>
                    <th className="pb-3">End-to-End Latency</th>
                    <th className="pb-3">RSSI (dBm)</th>
                    <th className="pb-3">SNR (dB)</th>
                    <th className="pb-3">Throughput (bps)</th>
                    <th className="pb-3 text-center pr-4">Action</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-bold divide-y divide-white/5">
                  {currentTableRows.map((log: any) => {
                    if (log.isLost) {
                      return (
                        <tr key={`lost-${log.id}`} className="bg-rose-500/5 hover:bg-rose-500/10 border-l-4 border-rose-500 transition-colors group">
                          <td className="py-4 text-center pl-4">
                            <input type="checkbox" disabled className="w-4 h-4 rounded border-gray-300 opacity-20 cursor-not-allowed" />
                          </td>
                          <td className="py-3.5 font-mono font-black text-rose-400">
                            #PKT-{String(log.id).padStart(3, '0')}
                          </td>
                          <td className="py-4 font-mono text-rose-300/60">-</td>
                          <td className="py-4 font-mono text-rose-300/60">
                            {new Date(log.created_at).toLocaleString('en-US')}
                          </td>
                          <td className="py-4 text-center">
                            <span className="px-3 py-1 rounded-lg text-[9px] font-black bg-rose-500/20 border border-rose-500/30 text-rose-400 tracking-wide uppercase">
                              FAILED
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center justify-center gap-2 text-[9px] font-black text-rose-400/40 bg-rose-950/20 py-1 px-2.5 rounded-lg border border-rose-500/10 max-w-[240px] mx-auto">
                              <span>RASPI</span><XCircle className="w-2.5 h-2.5 text-rose-500" />
                              <span className="text-rose-500 font-black">BROKEN LINK</span><XCircle className="w-2.5 h-2.5 text-rose-500" />
                              <span>GATEWAY</span>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className="px-2 py-0.5 rounded text-[9px] font-black border bg-rose-500/20 border-rose-500/30 text-rose-400">
                              DROPPED
                            </span>
                          </td>
                          <td className="py-4 text-rose-400/30 font-mono">--</td>
                          <td className="py-4 text-rose-400/30 font-mono">--</td>
                          <td className="py-4 font-mono text-rose-400/30">0.00</td>
                          <td className="py-4 text-center pr-4 font-mono text-rose-400/20">-</td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={`success-${log.dbId || log.id}`} className={`transition-colors group ${selectedIds.includes(log.dbId) ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                        <td className="py-4 text-center pl-4">
                          <input 
                            type="checkbox"
                            checked={selectedIds.includes(log.dbId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds(prev => [...prev, log.dbId]);
                              } else {
                                setSelectedIds(prev => prev.filter(id => id !== log.dbId));
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-[#2D365E] focus:ring-[#2D365E] cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 font-mono text-white/40 group-hover:text-white">
                          #PKT-{String(log.id).padStart(3, '0')}
                        </td>
                        <td className="py-4 font-mono text-cyan-300 font-bold">
                          {log.timestamp_kirim}
                        </td>
                        <td className="py-4 font-mono text-white/70">
                          {new Date(log.created_at).toLocaleString('en-US')}
                        </td>
                        <td className="py-4 text-center">
                          <span className="px-3 py-1 rounded-lg text-[9px] font-black bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 tracking-wide uppercase">
                            SUCCESS
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center justify-center gap-2 text-[9px] font-black text-white/50 bg-black/30 py-1 px-2.5 rounded-lg border border-white/5 max-w-[240px] mx-auto">
                            <span>RASPI</span><ArrowRight className="w-2.5 h-2.5 text-emerald-400" />
                            <span>LORA 1</span><ArrowRight className="w-2.5 h-2.5 text-emerald-400" />
                            <span>GATEWAY</span>
                          </div>
                        </td>
                        <td className="py-4 font-mono text-emerald-400">
                          {log.latency === 0 ? '0 ms' : `${log.latency.toFixed(0)} ms`}
                        </td>
                        <td className="py-4 text-cyan-400 font-mono">
                          {log.rssi === 0 ? '--' : `${log.rssi} dBm`} 
                        </td>
                        <td className="py-4 text-cyan-300 font-mono">
                          {log.snr.toFixed(1)} dB
                        </td>
                        <td className="py-4 font-mono text-emerald-400">
                          {log.throughput.toFixed(2)}
                        </td>
                        <td className="py-4 text-center pr-4">
                          <button 
                            onClick={() => handleDeleteLog(log.dbId, log.id)}
                            className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 transition-all shadow-sm"
                            title="Delete this row"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* NAVIGATION CONTROLS */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-white/5 pt-4 text-[11px] text-white/40 font-bold uppercase tracking-wider">
                <span>Showing {indexOfFirstRow + 1} - {Math.min(indexOfLastRow, sortedLogs.length)} of {sortedLogs.length} logs</span>
                
                <div className="flex items-center gap-6">
                  <form onSubmit={handlePageJump} className="flex items-center gap-2 bg-white/5 border border-white/10 p-1 rounded-xl">
                    <Hash className="w-3.5 h-3.5 text-white/30 ml-2" />
                    <input 
                      type="number" 
                      placeholder="Page..." 
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      min={1}
                      max={totalPages}
                      className="w-20 bg-transparent text-center font-black text-white outline-none text-xs placeholder:text-white/20"
                    />
                    <button type="submit" className="bg-white text-[#2D365E] px-3 py-1 rounded-lg text-[10px] font-black tracking-wide uppercase hover:bg-gray-100 transition-all">Go</button>
                  </form>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => { setCurrentPage(prev => Math.max(prev - 1, 1)); setPageInput(''); }}
                      disabled={currentPage === 1}
                      className="p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-20 transition-all"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-white font-black px-1">Page {currentPage} of {totalPages}</span>
                    <button 
                      onClick={() => { setCurrentPage(prev => Math.min(prev + 1, totalPages)); setPageInput(''); }}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-20 transition-all"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : !loading && (
          <div className="text-center py-14 bg-black/10 rounded-[35px] border border-white/5 text-white/20 font-black uppercase tracking-widest text-xs select-none">
             Awaiting Telemetry Stream...
          </div>
        )}

      </div>
    </div>
  );
}
