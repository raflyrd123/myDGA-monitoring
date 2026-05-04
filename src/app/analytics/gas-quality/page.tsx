'use client';

import React, { useState, useEffect } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, 
  Radar as RadarRecharts, Tooltip as RechartsTooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { supabase } from '../../lib/supabase';
import Image from 'next/image';

// Custom Tooltip Mewah: Tanggal, Jam Lengkap, dan Nilai
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const { fullDate, fullTime, value } = payload[0].payload;
    return (
      <div className="bg-white p-4 rounded-2xl shadow-2xl border border-gray-100 min-w-[200px]">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{fullDate}</p>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold text-gray-500 uppercase">Timestamp</span>
          <span className="text-sm font-black text-[#2D365E]">{fullTime}</span>
        </div>
        <div className="flex justify-between items-end border-t pt-2 mt-2">
          <span className="text-xs font-bold text-gray-500 uppercase">Value</span>
          <span className="text-xl font-black text-[#2D365E]">{value.toFixed(2)}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function GasQualityPage() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [radarData, setRadarData] = useState<any[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [selectedGas, setSelectedGas] = useState<string>('methane_ch4');
  const [loading, setLoading] = useState(true);
  const [duval, setDuval] = useState<any>( { id: 'NONE', label: 'TIDAK ADA DATA', ch4p: 0, c2h4p: 0, c2h2p: 0 });

  const gasOptions = [
    { key: 'hydrogen_h2', label: 'Hydrogen' },
    { key: 'methane_ch4', label: 'Methane' },
    { key: 'ethane_c2h6', label: 'Ethane' },
    { key: 'ethylene_c2h4', label: 'Ethylene' },
    { key: 'acetylene_c2h2', label: 'Acetylene' },
    { key: 'carbon_monoxide_co', label: 'CO' },
  ];

  useEffect(() => {
    fetchData();
  }, [timeRange, selectedGas]);

  const fetchData = async () => {
    setLoading(true);
    let days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const { data } = await supabase
      .from('sensor_logs')
      .select('*')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      const latest = data[data.length - 1];
      setRadarData([
        { subject: 'Hydrogen', value: calculateAvg(data, 'hydrogen_h2') },
        { subject: 'Methane', value: calculateAvg(data, 'methane_ch4') },
        { subject: 'Ethane', value: calculateAvg(data, 'ethane_c2h6') },
        { subject: 'Ethylene', value: calculateAvg(data, 'ethylene_c2h4') },
        { subject: 'Acetylene', value: calculateAvg(data, 'acetylene_c2h2') },
        { subject: 'CO', value: calculateAvg(data, 'carbon_monoxide_co') },
      ]);
      runDiagnosis(latest.methane_ch4, latest.ethylene_c2h4, latest.acetylene_c2h2);

      const trend = data.filter((_, index) => {
        if (timeRange === '24h') return index % 5 === 0; 
        if (timeRange === '7d') return index % 60 === 0; 
        return index % 120 === 0; 
      }).map(item => {
        const d = new Date(item.created_at);
        return {
          displayX: timeRange === '24h' 
            ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
          fullDate: d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
          fullTime: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          value: item[selectedGas] || 0
        };
      });
      setHistoryData(trend);
    } else {
      setRadarData([]); setHistoryData([]);
      setDuval({ id: 'NONE', label: 'TIDAK ADA DATA', ch4p: 0, c2h4p: 0, c2h2p: 0 });
    }
    setLoading(false);
  };

  const calculateAvg = (arr: any[], key: string): number => 
    arr.reduce((acc: number, curr: any) => acc + (curr[key] || 0), 0) / arr.length;

  const runDiagnosis = (ch4: number, c2h4: number, c2h2: number) => {
    const total = ch4 + c2h4 + c2h2;
    if (total === 0) return;
    const ch4p = (ch4 / total) * 100;
    const c2h4p = (c2h4 / total) * 100;
    const c2h2p = (c2h2 / total) * 100;

    // FIX: Redundansi dihapus. Hanya deskripsi status tanpa kode ID di dalam teks
    let id = 'DT'; let label = 'Electrical and Thermal';
    if (c2h2p > 13) { id = 'D2'; label = 'Discharge of High Energy'; }
    else if (c2h4p > 23 && ch4p > 40) { id = 'T3'; label = 'Thermal Fault > 700°C'; }
    else if (ch4p > 98) { id = 'PD'; label = 'Partial Discharge'; }
    else if (c2h4p < 20 && ch4p < 98) { id = 'D1'; label = 'Discharge of Low Energy'; }
    setDuval({ id, label, ch4p, c2h4p, c2h2p });
  };

  return (
    <div className="p-10 text-[#2D365E]">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black uppercase tracking-tight text-[#2D365E]">Analytics - Gas Quality</h1>
        <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-100">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <button key={range} onClick={() => setTimeRange(range)} className={`px-6 py-2 rounded-lg font-bold transition-all ${timeRange === range ? 'bg-[#2D365E] text-white' : 'text-gray-400 hover:text-[#2D365E]'}`}>{range.toUpperCase()}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        <div className="lg:col-span-7 bg-white rounded-[50px] p-10 shadow-2xl min-h-[600px] flex flex-col relative text-[#2D365E]">
          <h2 className="text-2xl font-black mb-8 border-b pb-4 uppercase tracking-tighter">Gas Radar Composition (Avg)</h2>
          <div className="flex-grow flex items-center justify-center">
            {loading ? <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2D365E]"></div> : radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#E1E6E4" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#2D365E', fontWeight: 'bold', fontSize: 14 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                  <RadarRecharts name="Gas Level" dataKey="value" stroke="#2D365E" strokeWidth={3} fill="#2D365E" fillOpacity={0.6} />
                  <RechartsTooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : <div className="text-center font-black opacity-20 uppercase tracking-[0.3em]">No Logs Available</div>}
          </div>
        </div>

        <div className="lg:col-span-5 bg-[#2D365E] rounded-[50px] p-10 shadow-2xl text-white flex flex-col border border-white/5 overflow-hidden relative">
          <h2 className="text-2xl font-black mb-8 uppercase text-center tracking-tighter">Duval Diagnosis</h2>
          <div className="relative w-full aspect-square p-6">
            <img src="/images/duval/base-triangle.png" className="absolute inset-0 w-full h-full object-contain z-10 pointer-events-none" />
            {[ 'PD', 'T1', 'T2', 'T3', 'D1', 'D2', 'DT' ].map((zid) => (
              <img key={zid} src={`/images/duval/zone-${zid.toLowerCase()}.png`} className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-1000 ${duval.id === zid ? 'opacity-100 saturate-100' : 'opacity-10 saturate-0'}`} />
            ))}
          </div>
          <div className="mt-8 space-y-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-[10px] font-bold text-white/40 uppercase">CH4 REL</p><p className="text-xl font-black">{duval.ch4p.toFixed(1)}%</p></div>
              <div><p className="text-[10px] font-bold text-white/40 uppercase">C2H4 REL</p><p className="text-xl font-black">{duval.c2h4p.toFixed(1)}%</p></div>
              <div><p className="text-[10px] font-bold text-white/40 uppercase">C2H2 REL</p><p className="text-xl font-black">{duval.c2h2p.toFixed(1)}%</p></div>
            </div>
            
            {/* DIAGNOSIS BOX: Bersih dan tidak dobel[cite: 1] */}
            <div className="bg-white/10 p-6 rounded-[35px] border border-white/20 text-center shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]">
              <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em] mb-3">DIAGNOSIS STATUS</p>
              <div className="flex flex-col items-center gap-3">
                <span className="bg-[#ff4d4d] text-white px-5 py-1.5 rounded-xl text-lg font-black shadow-[0_0_15px_rgba(255,77,77,0.5)]">
                  {duval.id}
                </span>
                <h3 className="text-xl font-black uppercase text-white tracking-tight leading-tight">
                  {duval.label}
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[50px] p-10 shadow-2xl flex flex-col h-[550px] text-[#2D365E]">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <h2 className="text-2xl font-black uppercase tracking-tighter">Gas Trend Analysis</h2>
          <select value={selectedGas} onChange={(e) => setSelectedGas(e.target.value)} className="bg-[#2D365E] text-white px-6 py-2 rounded-xl font-bold text-sm outline-none cursor-pointer">
            {gasOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
          </select>
        </div>
        <div className="flex-grow">
          {!loading && historyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2D365E" stopOpacity={0.3}/><stop offset="95%" stopColor="#2D365E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="displayX" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#2D365E', fontSize: 12, fontWeight: 'bold'}} 
                  interval={timeRange === '24h' ? 12 : 'preserveStartEnd'} 
                />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#2D365E', fontSize: 12, fontWeight: 'bold'}} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" stroke="#2D365E" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : !loading && <div className="flex items-center justify-center h-full font-black opacity-20 uppercase tracking-[0.3em]">No History Available</div>}
        </div>
      </div>
    </div>
  );
}