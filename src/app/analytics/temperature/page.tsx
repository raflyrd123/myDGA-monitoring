'use client';

import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { Thermometer } from 'lucide-react';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const { fullDate, fullTime, value } = payload[0].payload;
    return (
      <div className="bg-white p-4 rounded-2xl shadow-2xl border border-gray-100 min-w-[200px]">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{fullDate}</p>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold text-gray-500 uppercase">Waktu</span>
          <span className="text-sm font-black text-[#2D365E]">{fullTime}</span>
        </div>
        <div className="flex justify-between items-end border-t border-gray-100 pt-2 mt-2">
          <span className="text-xs font-bold text-gray-500 uppercase">Suhu</span>
          <span className="text-xl font-black text-[#2D365E]">{value.toFixed(2)}°C</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function TemperatureAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('24h');
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [stats, setStats] = useState({ avg: 0, peak: 0, current: 0 });
  const [yMaxLimit, setYMaxLimit] = useState(140); 

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    setLoading(true);
    setHistoryData([]);
    setStats({ avg: 0, peak: 0, current: 0 });

    const { data: config } = await supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'calibration')
      .single();
    if (config) setSettings(config.value);

    let query = supabase
      .from('sensor_logs')
      .select('temperature_c, created_at')
      .order('created_at', { ascending: true });

    if (timeRange !== 'all') {
      let days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
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
      // Data Sanitization: Filter nilai suhu rasional (0°C sampai 500°C)
      const validRawData = allRawData.filter(d => d.temperature_c !== null && d.temperature_c >= 0 && d.temperature_c <= 500);

      if (validRawData.length > 0) {
        const temps = validRawData.map(d => d.temperature_c);
        
        const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
        const peak = Math.max(...temps);
        const current = temps[temps.length - 1];
        setStats({ avg, peak, current });

        const limitCrit = config?.value?.temp?.crit || 120;
        setYMaxLimit(Math.ceil(Math.max(peak + 15, limitCrit + 20)));

        const targetPoints = 55;
        const dynamicStep = Math.ceil(validRawData.length / targetPoints) || 1;

        const trend = validRawData
          .filter((_, index) => index % dynamicStep === 0)
          .map(item => {
            const d = new Date(item.created_at);
            return {
              displayX: timeRange === '24h' 
                ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
              fullDate: d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
              fullTime: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              value: item.temperature_c
            };
          });

        setHistoryData(trend);
      }
    }
    setLoading(false);
  };

  const getStatusInfo = (val: number) => {
    if (!settings || val === 0) return { label: 'TIDAK ADA DATA', color: '#707070' };
    if (val <= settings.temp.warn) return { label: 'NORMAL', color: '#2ac764' };
    if (val <= settings.temp.crit) return { label: 'WASPADA', color: '#d8db26' };
    return { label: 'KRITIS', color: '#cb6060' };
  };

  const currentStatus = getStatusInfo(stats.current);

  return (
    <div className="p-10 text-[#2D365E] min-h-screen bg-[#f8fafc]">
      {/* HEADER BAR */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black uppercase tracking-tight text-[#2D365E]">Analytics - Temperatur</h1>
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
      </div>

      {/* THREE VALUE CARDS METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <div className="bg-white rounded-[40px] p-8 shadow-xl border border-gray-100/50">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Rata-Rata Suhu</p>
          <h3 className="text-5xl font-black text-[#2D365E]">{stats.avg === 0 ? '--' : stats.avg.toFixed(1) + '°C'}</h3>
        </div>
        <div className="bg-white rounded-[40px] p-8 shadow-xl border border-gray-100/50">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Suhu Tertinggi</p>
          <h3 className="text-5xl font-black text-[#cb6060]">{stats.peak === 0 ? '--' : stats.peak.toFixed(1) + '°C'}</h3>
        </div>
        <div className="bg-[#2D365E] rounded-[40px] p-8 shadow-xl flex items-center justify-between overflow-hidden relative border border-white/5">
          <div className="z-10">
            <p className="text-xs font-black text-white/40 uppercase tracking-widest mb-2">Status Suhu</p>
            <h3 className="text-3xl font-black text-white uppercase tracking-tight">{currentStatus.label}</h3>
          </div>
          <div className="w-14 h-14 rounded-full shadow-[0_0_25px_rgba(0,0,0,0.4)] transition-colors duration-500" style={{ backgroundColor: currentStatus.color }}></div>
        </div>
      </div>

      {/* CORE TREND CHART BLOCK */}
      <div className="bg-white rounded-[50px] p-10 shadow-2xl flex flex-col h-[600px] relative border border-gray-100/40">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <h2 className="text-2xl font-black uppercase tracking-tighter">Tren Suhu</h2>
        </div>
        
        <div className="flex-grow flex items-center justify-center w-full">
          {!loading && historyData.length > 0 && settings ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2D365E" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#2D365E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="displayX" axisLine={false} tickLine={false} tick={{fill: '#2D365E', fontSize: 11, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#2D365E', fontSize: 11, fontWeight: 'bold'}} domain={[0, yMaxLimit]} tickFormatter={(tick) => `${tick}°C`} />
                <RechartsTooltip content={<CustomTooltip />} />
                
                {settings.temp?.warn > 0 && (
                  <ReferenceLine y={settings.temp.warn} stroke="#d8db26" strokeDasharray="6 6" strokeWidth={1.5} label={{ value: `WASPADA: ${settings.temp.warn}°C`, position: 'top', fill: '#b4980a', fontSize: 9, fontWeight: 'bold' }} />
                )}
                {settings.temp?.crit > 0 && (
                  <ReferenceLine y={settings.temp.crit} stroke="#cb6060" strokeDasharray="8 8" strokeWidth={2} label={{ value: `KRITIS: ${settings.temp.crit}°C`, position: 'top', fill: '#cb6060', fontSize: 10, fontWeight: 'black' }} />
                )}
                
                <Area type="monotone" dataKey="value" stroke="#2D365E" strokeWidth={4} fillOpacity={1} fill="url(#colorTemp)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : !loading && (
            <div className="flex flex-col items-center opacity-15 select-none">
               <Thermometer className="w-24 h-24 mb-2 text-[#2D365E]" />
               <p className="font-black text-2xl uppercase tracking-[0.2em] text-[#2D365E]">Tidak Ada Data Suhu</p>
            </div>
          )}
        </div>

        {/* THRESHOLD LEGENDS */}
        <div className="flex justify-center gap-10 border-t border-gray-100 pt-8 mt-4 w-full">
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#2ac764]"></div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Normal &lt; {settings?.temp?.warn || 80}°C</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#d8db26]"></div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{settings?.temp?.warn || 80}°C ≤ Waspada ≤ {settings?.temp?.crit || 120}°C</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#cb6060]"></div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kritis &gt; {settings?.temp?.crit || 120}°C</span>
           </div>
        </div>
      </div>
    </div>
  );
}
