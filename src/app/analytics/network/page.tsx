'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, ReferenceLine, Legend, LineChart, Line
} from 'recharts';
import { supabase } from '../../../lib/supabase';
import { Activity, Wifi, AlertTriangle, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Download, ArrowUpDown, Calendar, Folder, Hash, XCircle, Zap } from 'lucide-react';

const CustomNetworkTooltip = ({ active, payload, mode }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 rounded-2xl shadow-2xl border border-gray-100 min-w-[220px]">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{data.fullDate}</p>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold text-gray-500 uppercase">Waktu Log</span>
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
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [chartMode, setChartMode] = useState<'qos' | 'signal'>('qos');
  const [networkData, setNetworkData] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({ avgLatency: 0, pdr: 100, currentRssi: 0, avgThroughput: 0 });

  const [selectedMonth, setSelectedMonth] = useState<string>(''); 
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); 
  const rowsPerPage = 10;
  const [pageInput, setPageInput] = useState<string>('');

  const fetchNetworkMetricsRef = useRef<() => Promise<void>>(async () => {});

  const fetchNetworkMetrics = async () => {
    if (networkData.length === 0) setLoading(true);
    
    const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    let allRawData: any[] = [];
    let fromOffset = 0;
    let keepFetching = true;

    while (keepFetching) {
      const { data: chunk, error } = await supabase
        .from('sensor_logs')
        .select('created_at, timestamp_kirim, lora_rssi, lora_snr, packet_id')
        .gte('created_at', cutoff)
        .order('created_at', { ascending: true })
        .range(fromOffset, fromOffset + 999);

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
      let lossCount = 0;
      let expectedNextId = null;
      let lastTimestamp = null; 
      let totalThroughput = 0; 
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

        let rssi = item.lora_rssi || 0;
        if (rssi === 0 || rssi < -130) rssi = -92; 
        const snr = item.lora_snr || 0;
        const monthGroup = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase();

        // 🌟 PERHITUNGAN EKSPLISIT STRING DATETIME (WAKTU DITERIMA - WAKTU DIKIRIM RTC)
        let latency = 0;
        if (item.timestamp_kirim && item.timestamp_kirim !== '-') {
          const strTs = String(item.timestamp_kirim).trim();
          // Format standar ISO dengan Timezone WIB (+07:00)
          const isoStr = strTs.includes('T') ? strTs : strTs.replace(' ', 'T') + '+07:00';
          const waktuKirimNode = new Date(isoStr).getTime();

          if (!isNaN(waktuKirimNode) && waktuKirimNode > 0) {
            const diff = waktuDiterimaCloud - waktuKirimNode;
            latency = diff > 0 ? diff : 0; // Selisih waktu nyata murni
          }
        }

        // PERHITUNGAN THROUGHPUT (Payload 220 Bytes = 1760 Bits)
        const payloadSizeBytes = 220; 
        if (timeGapSeconds <= 0) timeGapSeconds = 1; 
        const throughput = (payloadSizeBytes * 8) / timeGapSeconds; 
        totalThroughput += throughput;

        // DETEKSI PACKET LOSS
        if (expectedNextId !== null && packetId > expectedNextId && !isNewSession) {
          const gapSize = packetId - expectedNextId;
          
          if (gapSize > 0 && gapSize < 30) { 
            lossCount += gapSize;
            for (let lostId = expectedNextId; lostId < packetId; lostId++) {
              allMappedLogs.push({
                id: lostId,
                isLost: true, 
                displayX: '', 
                fullDate: d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
                fullTime: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                timestamp_kirim: '-',
                created_at: item.created_at,
                rawDate: new Date(waktuDiterimaCloud - 1000), 
                monthGroup,
                latency: 0,
                rssi: 0,
                distance: 0,
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

        allMappedLogs.push({
          id: packetId,
          isLost: false,
          displayX: '', 
          fullDate: d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
          fullTime: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          timestamp_kirim: item.timestamp_kirim || '-',
          created_at: item.created_at,
          rawDate: d, 
          monthGroup,
          latency,
          rssi,
          distance: Math.pow(10, (-45 - rssi) / (10 * 2.2)),
          snr,
          throughput 
        });
      });

      const avgLatency = validLatencyCount > 0 ? (totalLatency / validLatencyCount) : 0;
      const avgThroughput = validLatencyCount > 0 ? (totalThroughput / validLatencyCount) : 0;
      const totalSentPackets = allRawData.length + lossCount;
      
      let pdr = totalSentPackets > 0 ? (allRawData.length / totalSentPackets) * 100 : 100;

      const lastElement = allMappedLogs[allMappedLogs.length - 1];

      setStats({
        avgLatency,
        pdr,
        currentRssi: lastElement?.isLost ? -92 : (lastElement?.rssi || -92),
        avgThroughput
      });

      const targetPoints = 55;
      const dynamicStep = Math.ceil(allMappedLogs.length / targetPoints) || 1;

      const processedChartData = allMappedLogs
        .filter(item => !item.isLost)
        .filter((_, index) => index % dynamicStep === 0)
        .map(item => ({
          ...item,
          displayX: timeRange === '24h' 
            ? item.rawDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : item.rawDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
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

  const getLatencyStatus = (ms: number) => {
    if (ms === 0) return { text: 'N/A', color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20' };
    if (ms <= 1200) return { text: 'SANGAT BAIK', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    if (ms <= 2200) return { text: 'MODERAT', color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20' };
    return { text: 'LATENSI TINGGI', color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20' };
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

  const exportToCSV = () => {
    if (networkData.length === 0) return;
    const headers = ['Identifikasi Paket', 'Status Transmisi', 'Waktu Inisiasi (Edge Node)', 'Waktu Presipitasi (Cloud Server)', 'End-to-End Latency (ms)', 'RSSI (dBm)', 'SNR (dB)', 'Laju Throughput (bps)'];
    const rows = networkData.map(log => [
      `PKT-${String(log.id).padStart(3, '0')}`,
      log.isLost ? 'FAILED (PACKET LOSS)' : 'SUCCESS',
      `"${log.timestamp_kirim}"`,
      `"${new Date(log.created_at).toLocaleString('id-ID')}"`,
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
    link.setAttribute("download", `LoRa_Network_QoS_Report_${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasSignalData = chartData.some(item => item.rssi !== 0);

  return (
    <div className="p-10 text-[#2D365E] min-h-screen bg-[#f8fafc]">
      
      {/* HEADER BAR */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black uppercase tracking-tight text-[#2D365E]">
          Analytics - Network QoS
        </h1>
        <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-100">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <button 
              key={range} 
              onClick={() => setTimeRange(range)} 
              className={`px-6 py-2 rounded-lg font-bold transition-all ${timeRange === range ? 'bg-[#2D365E] text-white' : 'text-gray-400 hover:text-[#2D365E]'}`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* METRICS CARD ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <div className="bg-white rounded-[40px] p-8 shadow-xl border border-gray-100/50 flex flex-col justify-between">
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-400" /> Rata-Rata Latensi Jaringan
            </p>
            <h3 className="text-5xl font-black text-[#2D365E]">
              {loading ? '--' : `${stats.avgLatency.toFixed(0)} ms`}
            </h3>
          </div>
          <span className={`text-[11px] font-black tracking-widest mt-4 uppercase ${getLatencyStatus(stats.avgLatency).color}`}>
            Status Koneksi: {getLatencyStatus(stats.avgLatency).text}
          </span>
        </div>

        <div className="bg-white rounded-[40px] p-8 shadow-xl border border-gray-100/50 flex flex-col justify-between">
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-gray-400" /> Packet Delivery Ratio (PDR)
            </p>
            <h3 className="text-5xl font-black text-emerald-500">
              {loading ? '--' : `${stats.pdr.toFixed(1)}%`}
            </h3>
          </div>
          <span className="text-[11px] font-black text-gray-400 tracking-widest mt-4 uppercase">
            Rasio Paket Hilang: {loading ? '--' : `${(100 - stats.pdr).toFixed(1)}%`}
          </span>
        </div>

        <div className="bg-[#2D365E] rounded-[40px] p-8 shadow-xl flex items-center justify-between overflow-hidden relative border border-white/5">
          <div className="z-10">
            <p className="text-xs font-black text-white/40 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" /> Rata-Rata Throughput
            </p>
            <h3 className="text-4xl font-black text-white uppercase tracking-tight mb-1">
              {loading ? '--' : `${stats.avgThroughput.toFixed(2)} bps`}
            </h3>
            <p className="text-sm font-bold text-emerald-400">
              RSSI Real-Time: {loading ? '--' : `${stats.currentRssi} dBm`}
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
              Tren Latensi & Throughput
            </button>
            <button 
              onClick={() => setChartMode('signal')}
              className={`px-5 py-2 rounded-lg text-xs font-black uppercase transition-all ${chartMode === 'signal' ? 'bg-white text-[#2D365E] shadow-sm' : 'text-gray-400'}`}
            >
              Kualitas Sinyal RF (RSSI / SNR)
            </button>
          </div>
        </div>

        <div className="flex-grow flex items-center justify-center w-full">
          {loading ? (
            <div className="animate-pulse font-black text-gray-200 text-2xl uppercase tracking-widest">Memproses Telemetri Database...</div>
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
                  <YAxis width={65} axisLine={false} tickLine={false} tick={{fill: '#2D365E', fontSize: 11, fontWeight: 'bold'}} domain={[0, 4000]} label={{ value: 'Tingkat Metrik Performa', angle: -90, position: 'insideLeft', fill: '#2D365E', offset: 5, fontWeight: 'bold', fontSize: 11 }} />
                  <RechartsTooltip content={<CustomNetworkTooltip mode="qos" />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <ReferenceLine y={2500} stroke="#cb6060" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Batas Toleransi Ambang Delay Jaringan', fill: '#cb6060', fontSize: 10, fontWeight: 'bold', position: 'top' }} />
                  <Area type="monotone" dataKey="latency" name="Latency (ms)" stroke="#2D365E" strokeWidth={4} fillOpacity={1} fill="url(#colorLatency)" />
                  <Line type="monotone" dataKey="throughput" name="Throughput (bps)" stroke="#10b981" strokeWidth={3} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : hasSignalData ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="displayX" axisLine={false} tickLine={false} tick={{fill: '#2D365E', fontSize: 11, fontWeight: 'bold'}} />
                  <YAxis width={65} axisLine={false} tickLine={false} tick={{fill: '#2D365E', fontSize: 11, fontWeight: 'bold'}} domain={[-130, 20]} label={{ value: 'Level Sinyal RF (dBm / dB)', angle: -90, position: 'insideLeft', fill: '#2D365E', offset: 5, fontWeight: 'bold', fontSize: 11 }} />
                  <RechartsTooltip content={<CustomNetworkTooltip mode="signal" />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <ReferenceLine y={-115} stroke="#cb6060" strokeDasharray="6 6" strokeWidth={1.5} label={{ value: 'Batas Sensitivitas Minimum LoRa (-115 dBm)', fill: '#cb6060', fontSize: 9, fontWeight: 'bold', position: 'bottom' }} />
                  <Line type="monotone" dataKey="rssi" name="RSSI (dBm)" stroke="#3b82f6" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="snr" name="SNR (dB)" stroke="#06b6d4" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center opacity-25 select-none py-20">
                <Wifi className="w-24 h-24 mb-2 text-[#2D365E]" />
                <p className="font-black text-2xl uppercase tracking-[0.2em] text-[#2D365E]">Tidak Ada Data Sinyal Terrekam</p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center opacity-15 select-none">
               <AlertTriangle className="w-24 h-24 mb-2 text-[#2D365E]" />
               <p className="font-black text-2xl uppercase tracking-[0.2em] text-[#2D365E]">Data Telemetri Jaringan Kosong</p>
            </div>
          )}
        </div>
      </div>

      {/* LIVE DATA TRANSMISSION STREAM ARCHIVE FOLDERS */}
      <div className="bg-[#2D365E] rounded-[50px] p-10 shadow-2xl border border-white/5 text-white flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">Live Telemetry Communication Stream</h2>
              <p className="text-[11px] text-white/50 font-bold uppercase tracking-wider mt-0.5">Arsip Komunikasi Log Kualitas Layanan (QoS) LoRa</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button 
              onClick={toggleSortOrder}
              className="flex items-center gap-2 bg-white/10 border border-white/10 px-4 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase hover:bg-white/20 transition-all"
            >
              <ArrowUpDown className="w-4 h-4" /> Urutan Kronologis: {sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}
            </button>
            <button 
              onClick={exportToCSV}
              disabled={networkData.length === 0}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all shadow-lg"
            >
              <Download className="w-4 h-4" /> Ekspor Laporan (.CSV)
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
               <span className="text-xs font-black uppercase tracking-widest">Direktori Data Bulanan Tidak Ditemukan</span>
            </div>
          )}
        </div>

        {/* DATA CONTAINER FILTERED TABLE */}
        {!loading && selectedMonth && sortedLogs.length > 0 ? (
          <div className="bg-black/10 rounded-[35px] border border-white/5 p-6 transition-all duration-500">
            <div className="flex items-center gap-2 mb-4 text-white/40 text-[10px] font-black uppercase tracking-widest">
              <Calendar className="w-3 h-3 text-cyan-400" />
              <span>Arsip Telemetri Bulanan: {selectedMonth} ({filteredMonthLogs.length} Rekaman Log)</span>
            </div>
            
            <div className="overflow-x-auto w-full mb-6">
              <table className="w-full text-left border-collapse min-w-[1700px]">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest">
                    <th className="pb-3 pl-4">Identifikasi Paket</th>
                    <th className="pb-3">Waktu Inisiasi (Edge Node)</th>
                    <th className="pb-3">Waktu Presipitasi (Cloud Server)</th>
                    <th className="pb-3 text-center">Status Transmisi</th>
                    <th className="pb-3 text-center">Alur Topologi Jaringan</th>
                    <th className="pb-3">End-to-End Latency</th>
                    <th className="pb-3">Kualitas Sinyal RF (RSSI / SNR)</th>
                    <th className="pb-3 pr-4">Laju Throughput</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-bold divide-y divide-white/5">
                  {currentTableRows.map((log: any) => {
                    const latStatus = getLatencyStatus(log.latency);
                    
                    if (log.isLost) {
                      return (
                        <tr key={`lost-${log.id}`} className="bg-rose-500/5 hover:bg-rose-500/10 border-l-4 border-rose-500 transition-colors group">
                          <td className="py-3.5 pl-4 font-mono font-black text-rose-400">
                            #PKT-{String(log.id).padStart(3, '0')}
                          </td>
                          <td className="py-4 font-mono text-rose-300/60">
                            -
                          </td>
                          <td className="py-4 font-mono text-rose-300/60">
                            {new Date(log.created_at).toLocaleString('id-ID')}
                          </td>
                          <td className="py-4 text-center">
                            <span className="px-3 py-1 rounded-lg text-[9px] font-black bg-rose-500/20 border border-rose-500/30 text-rose-400 tracking-wide uppercase">
                              FAILED (PACKET LOSS)
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
                              100% PACKET DROPPED
                            </span>
                          </td>
                          <td className="py-4 text-rose-400/30 font-mono">
                            -- dBm <span className="text-rose-400/20 text-[9px] ml-1">/ -- dB SNR</span>
                          </td>
                          <td className="py-4 pr-4 text-rose-400/30 font-mono">
                            0.00 bps
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={`success-${log.id}`} className="hover:bg-white/5 transition-colors group">
                        <td className="py-3.5 pl-4 font-mono text-white/40 group-hover:text-white">
                          #PKT-{String(log.id).padStart(3, '0')}
                        </td>
                        {/* WAKTU INISIASI (EDGE NODE STRING DATE TIME) */}
                        <td className="py-4 font-mono text-cyan-300 font-bold">
                          {log.timestamp_kirim}
                        </td>
                        {/* WAKTU PRESIPITASI (CLOUD SERVER) */}
                        <td className="py-4 font-mono text-white/70">
                          {new Date(log.created_at).toLocaleString('id-ID')}
                        </td>
                        {/* STATUS TRANSMISI */}
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
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${latStatus.bg} ${latStatus.color}`}>
                            {log.latency === 0 ? '0 ms' : `${log.latency.toFixed(0)} ms`}
                          </span>
                        </td>
                        <td className="py-4 text-cyan-400 font-mono">
                          {log.rssi === 0 ? '--' : `${log.rssi} dBm`} 
                          <span className="text-white/30 text-[9px] ml-1">/ {log.snr.toFixed(1)} dB SNR</span>
                        </td>
                        <td className="py-4 pr-4 text-emerald-400 font-mono">
                          {log.throughput.toFixed(2)} bps
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
                <span>Menampilkan {indexOfFirstRow + 1} - {Math.min(indexOfLastRow, sortedLogs.length)} dari total {sortedLogs.length} rekaman di {selectedMonth}</span>
                
                <div className="flex items-center gap-6">
                  <form onSubmit={handlePageJump} className="flex items-center gap-2 bg-white/5 border border-white/10 p-1 rounded-xl">
                    <Hash className="w-3.5 h-3.5 text-white/30 ml-2" />
                    <input 
                      type="number" 
                      placeholder="Halaman..." 
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      min={1}
                      max={totalPages}
                      className="w-20 bg-transparent text-center font-black text-white outline-none text-xs placeholder:text-white/20"
                    />
                    <button type="submit" className="bg-white text-[#2D365E] px-3 py-1 rounded-lg text-[10px] font-black tracking-wide uppercase hover:bg-gray-100 transition-all">Lompat</button>
                  </form>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => { setCurrentPage(prev => Math.max(prev - 1, 1)); setPageInput(''); }}
                      disabled={currentPage === 1}
                      className="p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-20 transition-all"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-white font-black px-1">Halaman {currentPage} dari {totalPages}</span>
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
             Menunggu Aliran Telemetri Real-Time...
          </div>
        )}

      </div>
    </div>
  );
}
