'use client';

import React, { useState, useEffect } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, 
  Radar as RadarRecharts, Tooltip as RechartsTooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { supabase } from '../../lib/supabase';
import Image from 'next/image';

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
        <div className="flex justify-between items-end border-t border-gray-100 pt-2 mt-2">
          <span className="text-xs font-bold text-gray-500 uppercase">Value</span>
          <span className="text-xl font-black text-[#2D365E]">{value.toFixed(2)} ppm</span>
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
  const [duval, setDuval] = useState<any>({ id: 'NONE', label: 'TIDAK ADA DATA', ch4p: 0, c2h4p: 0, c2h2p: 0 });

  const gasOptions = [
    { key: 'hydrogen_h2', label: 'Hydrogen (H2)' },
    { key: 'methane_ch4', label: 'Methane (CH4)' },
    { key: 'ethane_c2h6', label: 'Ethane (C2H6)' },
    { key: 'ethylene_c2h4', label: 'Ethylene (C2H4)' },
    { key: 'acetylene_c2h2', label: 'Acetylene (C2H2)' },
    { key: 'carbon_monoxide_co', label: 'Carbon Monoxide (CO)' },
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
      
      runDiagnosis(latest.methane_ch4 || 0, latest.ethylene_c2h4 || 0, latest.acetylene_c2h2 || 0);

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
    if (total === 0) {
      setDuval({ id: 'NONE', label: 'TIDAK ADA DATA', ch4p: 0, c2h4p: 0, c2h2p: 0 });
      return;
    }
    const ch4p = (ch4 / total) * 100;
    const c2h4p = (c2h4 / total) * 100;
    const c2h2p = (c2h2 / total) * 100;

    let id = 'DT'; 
    let label = 'Mixed Thermal and Electrical Fault';

    if (ch4p >= 98) {
      id = 'PD';
      label = 'Partial Discharge (Corona)';
    } else if (c2h2p > 4 && c2h2p <= 13 && c2h4p < 20) {
      id = 'T1';
      label = 'Thermal Fault < 300°C';
    } else if (c2h2p <= 4) {
      if (c2h4p < 20) { id = 'T1'; label = 'Thermal Fault < 300°C'; }
      else if (c2h4p >= 20 && c2h4p < 50) { id = 'T2'; label = 'Thermal Fault 300°C - 700°C'; }
      else { id = 'T3'; label = 'Thermal Fault > 700°C'; }
    } else if (c2h2p > 13) {
      if (c2h4p < 23) { id = 'D1'; label = 'Discharge of Low Energy (Sparking)'; }
      else { id = 'D2'; label = 'Discharge of High Energy (Arcing)'; }
    }

    setDuval({ id, label, ch4p, c2h4p, c2h2p });
  };

  const getActiveGasLabel = () => {
    const current = gasOptions.find(opt => opt.key === selectedGas);
    return current ? current.label : 'Gas';
  };

  return (
    <div className="p-10 text-[#2D365E] min-h-screen bg-[#f8fafc]">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black uppercase tracking-tight text-[#2D365E]">Analytics - Gas Quality</h1>
        <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-100">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <button key={range} onClick={() => setTimeRange(range)} className={`px-6 py-2 rounded-lg font-bold transition-all ${timeRange === range ? 'bg-[#2D365E] text-white' : 'text-gray-400 hover:text-[#2D365E]'}`}>{range.toUpperCase()}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        <div className="lg:col-span-6 bg-white rounded-[50px] p-10 shadow-2xl min-h-[600px] flex flex-col relative text-[#2D365E]">
          <h2 className="text-2xl font-black mb-8 border-b pb-4 uppercase tracking-tighter">Gas Radar Composition (Avg)</h2>
          <div className="flex-grow flex items-center justify-center">
            {loading ? <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2D365E]"></div> : radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="#E1E6E4" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#2D365E', fontWeight: 'bold', fontSize: 13 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <RadarRecharts name="Gas Level" dataKey="value" stroke="#2D365E" strokeWidth={3} fill="#2D365E" fillOpacity={0.4} />
                  <RechartsTooltip formatter={(value: any) => [`${Number(value).toFixed(2)} ppm`, 'Gas Level']} />
                </RadarChart>
              </ResponsiveContainer>
            ) : <div className="text-center font-black opacity-20 uppercase tracking-[0.3em]">No Logs Available</div>}
          </div>
        </div>

        <div className="lg:col-span-6 bg-[#2D365E] rounded-[50px] p-10 shadow-2xl text-white flex flex-col border border-white/5 relative min-h-[600px]">
          <h2 className="text-2xl font-black mb-6 uppercase text-center tracking-tighter">Duval Triangle Analysis</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-grow items-center">
            <div className="md:col-span-6 relative w-full aspect-square bg-black/10 rounded-[35px] border border-white/5 flex items-center justify-center p-2">
              <img src="/images/duval/base-triangle.png" className="absolute inset-0 w-full h-full object-contain p-4 z-10 pointer-events-none" />
              {[ 'PD', 'T1', 'T2', 'T3', 'D1', 'D2', 'DT' ].map((zid) => (
                <img key={zid} src={`/images/duval/zone-${zid.toLowerCase()}.png`} className={`absolute inset-0 w-full h-full object-contain p-4 transition-opacity duration-1000 ${duval.id === zid ? 'opacity-100 saturate-150' : 'opacity-5 saturate-0'}`} />
              ))}
            </div>

            <div className="md:col-span-6 space-y-4">
              <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-2.5 shadow-inner">
                <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">% CH4 (Methane)</span><span className="text-base font-black text-amber-300">{duval.ch4p.toFixed(1)}%</span></div>
                <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">% C2H4 (Ethylene)</span><span className="text-base font-black text-emerald-400">{duval.c2h4p.toFixed(1)}%</span></div>
                <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">% C2H2 (Acetylene)</span><span className="text-base font-black text-cyan-400">{duval.c2h2p.toFixed(1)}%</span></div>
              </div>

              <div className="bg-white/10 p-5 rounded-[30px] border border-white/20 text-center shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]">
                <p className="text-[9px] font-black uppercase text-white/40 tracking-[0.2em] mb-2">DIAGNOSIS STATUS</p>
                <div className="flex flex-col items-center gap-2">
                  {duval.id !== 'NONE' && (
                    <span className="bg-[#ff4d4d] text-white px-4 py-1 rounded-lg text-xs font-black shadow-[0_0_12px_rgba(255,77,77,0.4)]">
                      ZONE {duval.id}
                    </span>
                  )}
                  <h3 className="text-base font-black uppercase text-white tracking-tight leading-tight">
                    {duval.label}
                  </h3>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full border-t border-white/10 pt-4 mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-white/50 font-medium">
            {/* UPDATE FIXED: PD MERAH WOII SESUAI GAMBAR */}
            <div className="bg-black/10 p-2 rounded-xl border border-white/5"><span className="font-bold text-[#ff0000] block">PD (Corona)</span> CH4 ≥ 98%</div>
            <div className="bg-black/10 p-2 rounded-xl border border-white/5"><span className="font-bold text-[#ec4899] block">T1 (Thermal)</span> Temp &lt; 300°C</div>
            <div className="bg-black/10 p-2 rounded-xl border border-white/5"><span className="font-bold text-[#a855f7] block">T2 (Thermal)</span> 300°C - 700°C</div>
            <div className="bg-black/10 p-2 rounded-xl border border-white/5"><span className="font-bold text-[#f97316] block">T3 (Thermal)</span> Temp &gt; 700°C</div>
            <div className="bg-black/10 p-2 rounded-xl border border-white/5"><span className="font-bold text-[#38bdf8] block">D1 (Low Energy)</span> C2H2 &gt; 13% | Spark</div>
            <div className="bg-black/10 p-2 rounded-xl border border-white/5"><span className="font-bold text-[#4ade80] block">D2 (High Energy)</span> C2H2 &gt; 29% | Arc</div>
            <div className="bg-black/10 p-2 rounded-xl border border-white/5 col-span-2"><span className="font-bold text-[#eab308] block">DT (Mixed)</span> Indeterminate Fault Quadran</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[50px] p-10 shadow-2xl flex flex-col h-[550px] text-[#2D365E]">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <h2 className="text-2xl font-black uppercase tracking-tighter">
            Trend Analysis - <span className="text-[#2D365E]">{getActiveGasLabel()}</span>
          </h2>
          <select value={selectedGas} onChange={(e) => setSelectedGas(e.target.value)} className="bg-[#2D365E] text-white px-6 py-2 rounded-xl font-bold text-sm outline-none cursor-pointer border border-transparent hover:bg-[#1e2542] transition-colors">
            {gasOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
          </select>
        </div>
        <div className="flex-grow">
          {!loading && historyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2D365E" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2D365E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="displayX" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#2D365E', fontSize: 11, fontWeight: 'bold'}} 
                  interval={timeRange === '24h' ? 12 : 'preserveStartEnd'} 
                />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#2D365E', fontSize: 11, fontWeight: 'bold'}} />
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