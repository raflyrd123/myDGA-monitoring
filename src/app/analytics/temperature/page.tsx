'use client';

import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { Thermometer } from 'lucide-react'; // Icon pendukung untuk No Data

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
          <span className="text-xs font-bold text-gray-500 uppercase">Temperature</span>
          <span className="text-xl font-black text-[#2D365E]">{value.toFixed(1)}°C</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function TemperatureAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [stats, setStats] = useState({ avg: 0, peak: 0 });

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    setLoading(true);
    
    // FIX: Reset data awal agar tidak ada data "hantu" dari range sebelumnya
    setHistoryData([]);
    setStats({ avg: 0, peak: 0 });

    const { data: config } = await supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'calibration')
      .single();
    if (config) setSettings(config.value);

    let days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const { data } = await supabase
      .from('sensor_logs')
      .select('temperature_c, created_at')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      const temps = data.map(d => d.temperature_c || 0);
      const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
      const peak = Math.max(...temps);
      setStats({ avg, peak });

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
          value: item.temperature_c || 0
        };
      });
      setHistoryData(trend);
    }
    setLoading(false);
  };

  const getStatusInfo = (val: number) => {
    if (!settings || val === 0) return { label: 'NO DATA', color: '#707070' }; // Handle no data[cite: 1]
    if (val <= settings.temp.warn) return { label: 'NORMAL', color: '#2ac764' };
    if (val <= settings.temp.crit) return { label: 'CAUTION', color: '#d8db26' };
    return { label: 'CRITICAL', color: '#cb6060' };
  };

  const currentStatus = getStatusInfo(stats.peak);

  return (
    <div className="p-10 text-[#2D365E]">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black uppercase tracking-tight">Analytics - Temperature</h1>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <div className="bg-white rounded-[40px] p-8 shadow-xl border border-gray-50">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Average Temp</p>
          <h3 className="text-5xl font-black text-[#2D365E]">{stats.avg === 0 ? '--' : stats.avg.toFixed(1) + '°C'}</h3>
        </div>
        <div className="bg-white rounded-[40px] p-8 shadow-xl border border-gray-50">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Peak Temp</p>
          <h3 className="text-5xl font-black text-[#cb6060]">{stats.peak === 0 ? '--' : stats.peak.toFixed(1) + '°C'}</h3>
        </div>
        <div className="bg-[#2D365E] rounded-[40px] p-8 shadow-xl flex items-center justify-between overflow-hidden relative">
          <div className="z-10">
            <p className="text-xs font-black text-white/40 uppercase tracking-widest mb-2">Status</p>
            <h3 className="text-3xl font-black text-white uppercase">{currentStatus.label}</h3>
          </div>
          <div className="w-16 h-16 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.3)]" style={{ backgroundColor: currentStatus.color }}></div>
        </div>
      </div>

      <div className="bg-white rounded-[50px] p-10 shadow-2xl flex flex-col h-[600px] relative">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <h2 className="text-2xl font-black uppercase tracking-tighter">Temperature Trend</h2>
          <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">{timeRange} History</span>
        </div>
        
        <div className="flex-grow flex items-center justify-center">
          {loading ? (
            <div className="animate-pulse font-black text-gray-200 text-3xl uppercase tracking-widest">Syncing...</div>
          ) : historyData.length > 0 && settings ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2D365E" stopOpacity={0.3}/><stop offset="95%" stopColor="#2D365E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="displayX" axisLine={false} tickLine={false} tick={{fill: '#2D365E', fontSize: 12, fontWeight: 'bold'}} interval={timeRange === '24h' ? 12 : 'preserveStartEnd'} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#2D365E', fontSize: 12, fontWeight: 'bold'}} domain={[0, (dataMax: number) => Math.max(dataMax + 20, settings.temp.crit + 20)]} />
                <RechartsTooltip content={<CustomTooltip />} />
                <ReferenceLine y={settings.temp.crit} stroke="#cb6060" strokeDasharray="8 8" strokeWidth={2} label={{ value: `ALERT: ${settings.temp.crit}°C`, position: 'top', fill: '#cb6060', fontSize: 10, fontWeight: 'black' }} />
                <Area type="monotone" dataKey="value" stroke="#2D365E" strokeWidth={4} fillOpacity={1} fill="url(#colorTemp)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center opacity-20">
               <Thermometer className="w-20 h-20 mb-4" />
               <p className="font-black text-3xl uppercase tracking-[0.3em]">No Temperature Data Available</p>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-10 border-t border-gray-50 pt-8 mt-4">
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#2ac764]"></div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Normal &lt; {settings?.temp.warn}°C</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#d8db26]"></div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Caution &lt; {settings?.temp.crit}°C</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#cb6060]"></div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Critical &gt; {settings?.temp.crit}°C</span>
           </div>
        </div>
      </div>
    </div>
  );
}