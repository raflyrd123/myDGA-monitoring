'use client';

import React, { useState, useEffect } from 'react';
import { SensorCard } from './components/SensorCard';
import { supabase } from './lib/supabase';
import Image from 'next/image';

const LegendItem = ({ color, label, isDark = false }: { color: string, label: string, isDark?: boolean }) => (
  <div className="flex items-center gap-2">
    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }}></div>
    <span className={`text-[11px] font-bold tracking-tight ${isDark ? 'text-gray-400' : 'text-white/60'}`}>{label}</span>
  </div>
);

export default function DashboardPage() {
  // --- SENSOR DATA STATES ---
  const [tempValue, setTempValue] = useState(0);
  const [humidityValue, setHumidityValue] = useState(0);
  const [oilColorValue, setOilColorValue] = useState(0);
  const [floodLevel, setFloodLevel] = useState(0); 
  const [floodText, setFloodText] = useState("0.00");
  
  // REAL TELEMETRY STATE
  const [floatStatus, setFloatStatus] = useState("OFF");

  const [gasData, setGasData] = useState({
    h2: 0, co: 0, nh3: 0, ch4: 0, c3h8: 0, c4h10: 0, c2h4: 0, c2h2: 0, c2h6: 0
  });

  // --- SETTINGS & ANALYTICS STATES ---
  const [settings, setSettings] = useState<any>(null);
  const [peakTemp, setPeakTemp] = useState(0);
  const [lowestTemp, setLowestTemp] = useState(0);
  const [avgTemp, setAvgTemp] = useState(0);

  // --- GAS SENSOR CONFIG MAP ---
  const gasConfigs: any = {
    h2: { title: 'Hydrogen', color: '#00A3E0', icon: 'h2.png', key: 'H2' },
    co: { title: 'Carbon Monoxide', color: '#475569', icon: 'co.png', key: 'CO' },
    nh3: { title: 'Ammonia', color: '#84CC16', icon: 'nh3.png', key: 'NH3' },
    ch4: { title: 'Methane', color: '#F59E0B', icon: 'ch4.png', key: 'CH4' },
    c3h8: { title: 'Propane', color: '#EF4444', icon: 'c3h8.png', key: 'ETH' },
    c4h10: { title: 'Butane', color: '#F97316', icon: 'c4h10.png', key: 'ETH' },
    c2h4: { title: 'Ethylene', color: '#B91C1C', icon: 'c2h4.png', key: 'C2H4' },
    c2h2: { title: 'Acetylene', color: '#7F1D1D', icon: 'c2h2.png', key: 'C2H2' },
    c2h6: { title: 'Ethane', color: '#8B5CF6', icon: 'c2h6.png', key: 'ETH' },
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      // 1. Fetch configurations/thresholds
      const { data: config } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'calibration')
        .single();
      
      if (config) setSettings(config.value);

      // 2. Fetch last 24h logs for analytics calculation
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: pastLogs } = await supabase
        .from('sensor_logs')
        .select('temperature_c')
        .gte('created_at', oneDayAgo);

      // 3. Fetch latest telemetry entry
      const { data: latestSensor } = await supabase
        .from('sensor_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestSensor) {
        updateStates(latestSensor, config?.value);
      }

      if (pastLogs && pastLogs.length > 0) {
        const temps = pastLogs
          .map(log => log.temperature_c)
          .filter(t => t !== null && t > 0);

        if (temps.length > 0) {
          setPeakTemp(Math.max(...temps));
          setLowestTemp(Math.min(...temps));
          setAvgTemp(temps.reduce((acc, curr) => acc + curr, 0) / temps.length);
        }
      } else if (latestSensor?.temperature_c) {
        const t = latestSensor.temperature_c;
        setPeakTemp(t);
        setLowestTemp(t);
        setAvgTemp(t);
      }
    };

    initializeDashboard();

    const channel = supabase
      .channel('sensor_realtime')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'sensor_logs' }, 
        (payload) => {
          const newData = payload.new;
          updateStates(newData, settings);
          
          const t = newData.temperature_c || 0;
          if (t > 0) {
            setPeakTemp(prev => Math.max(prev, t));
            setLowestTemp(prev => prev === 0 ? t : Math.min(prev, t));
            setAvgTemp(prev => prev === 0 ? t : (prev + t) / 2);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [settings]);

  const updateStates = (data: any, currentSettings: any) => {
    setTempValue(data.temperature_c || 0);
    setHumidityValue(data.humidity_pct || 0);
    setOilColorValue(data.oil_color_pct || 0);
    setFloatStatus(data.safety_float || "OFF");

    if (currentSettings?.flood?.groundDistance && currentSettings.flood.groundDistance > 0) {
      const baseline = currentSettings.flood.groundDistance;
      const sensorReading = data.water_level_cm || 0;
      
      const actualWaterHeightCm = Math.max(0, baseline - sensorReading);
      const calcFloodPct = Math.max(0, Math.min(100, (actualWaterHeightCm / baseline) * 100));
      
      setFloodLevel(calcFloodPct);
      setFloodText(actualWaterHeightCm.toFixed(2)); 
    }

    setGasData({
      h2: Number(Number(data.hydrogen_h2 || 0).toFixed(2)),
      co: Number(Number(data.carbon_monoxide_co || 0).toFixed(2)),
      nh3: Number(Number(data.ammonia_nh3 || 0).toFixed(2)),
      ch4: Number(Number(data.methane_ch4 || 0).toFixed(2)),
      c3h8: Number(Number(data.propane_c3h8 || 0).toFixed(2)),
      c4h10: Number(Number(data.butane_c4h10 || 0).toFixed(2)),
      c2h4: Number(Number(data.ethylene_c2h4 || 0).toFixed(2)),
      c2h2: Number(Number(data.acetylene_c2h2 || 0).toFixed(2)),
      c2h6: Number(Number(data.ethane_c2h6 || 0).toFixed(2))
    });
  };

  const getGasStatus = (val: number, gasKey: string) => val > (settings?.gasThresholds?.[gasKey] || 100) ? "Bad" : "Good";
  
  const getTempStatus = (val: number) => {
    if (val <= (settings?.temp?.warn || 80)) return { color: '#2ac764', label: 'Normal' };
    if (val <= (settings?.temp?.crit || 120)) return { color: '#d8db26', label: 'Caution' };
    return { color: '#cb6060', label: 'Critical' };
  };

  const getHumidityColor = (val: number) => {
    if (val <= (settings?.humidity?.dry || 60)) return '#cb6060';
    if (val <= (settings?.humidity?.wet || 80)) return '#2ac764';
    return '#2ac7c7';
  };

  const getFloodStatus = (cm: number, currentFloatStatus: string) => {
    const warnCm = settings?.flood?.warnLevel || 30; 
    const critCm = settings?.flood?.critLevel || 70; 

    if (cm > critCm && currentFloatStatus === "ON") {
      return { color: '#cb6060', label: 'Danger' };
    }
    if (cm > warnCm) {
      return { color: '#d8db26', label: 'Caution' };
    }
    return { color: '#2ac764', label: 'Safe' };
  };

  const getOilColorLabel = (val: number) => {
    if (val <= 20) return "Clear (Excellent)";
    if (val <= 50) return "Slightly Yellow (Light Degradation)";
    if (val <= 80) return "Cloudy (Carbon Saturation)";
    return "Dark (Severe Contamination)";
  };

  if (!settings) return <div className="p-10 font-black uppercase opacity-20 text-[#2D365E]">Syncing Thresholds...</div>;

  const curTemp = getTempStatus(tempValue);
  const curFlood = getFloodStatus(parseFloat(floodText) || 0, floatStatus);

  const renderGauge = (value: number, total: number, color: string, isHalf: boolean = false, customStroke: number = 24) => {
    const radius = 80;
    const dashArray = isHalf ? (Math.PI * radius) : (2 * Math.PI * radius);
    const safeValue = Math.max(0, Math.min(total, value));
    const progress = (safeValue / total) * dashArray;
    
    return (
      <svg width="100%" height="100%" viewBox={isHalf ? "0 0 200 110" : "0 0 200 200"} className="drop-shadow-sm">
        <path d={isHalf ? "M 20,95 A 80,80 0 0,1 180,95" : "M 100,20 A 80,80 0 1,1 99.9,20"} fill="none" stroke="#E1E6E4" strokeWidth={customStroke} strokeLinecap="round" />
        <path d={isHalf ? "M 20,95 A 80,80 0 0,1 180,95" : "M 100,20 A 80,80 0 1,1 99.9,20"} fill="none" stroke={color} strokeWidth={customStroke} strokeLinecap="round"
          strokeDasharray={`${progress} ${dashArray}`}
          style={{ transition: 'all 1s ease-in-out', opacity: value <= 0 ? 0 : 1 }}
        />
      </svg>
    );
  };

  return (
    <div className="p-10">
      <h1 className="text-4xl font-black tracking-tight uppercase leading-none mb-10 text-[#2D365E]">Dashboard</h1>

      {/* GAS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10 text-white font-bold">
        {Object.entries(gasConfigs).map(([gasKey, config]: [string, any]) => {
          const limitValue = settings.gasThresholds?.[config.key] ?? 100;
          return (
            <div key={gasKey} className="relative">
              <SensorCard 
                title={config.title} 
                gasName={gasKey.toUpperCase()}
                value={gasData[gasKey as keyof typeof gasData]}
                unit="ppm"
                status={getGasStatus(gasData[gasKey as keyof typeof gasData], config.key) as 'Good' | 'Bad'}
                color={config.color}
                icon={<Image src={`/icons/${config.icon}?v=1`} alt={gasKey} width={24} height={24} unoptimized />}
              />
              <div className="absolute bottom-12 left-8 flex gap-4">
                <LegendItem color="#2ac764" label={`Good < ${limitValue}`} isDark />
                <LegendItem color="#cb6060" label={`Bad > ${limitValue}`} isDark />
              </div>
            </div>
          );
        })}
      </div>

      {/* ENVIRONMENT ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10 text-white">
        {/* TEMPERATURE CARD */}
        <div className="lg:col-span-5 bg-[#2D365E] rounded-[50px] p-10 flex flex-col items-center shadow-2xl relative min-h-[680px]">
          <div className="flex items-center gap-3 w-full justify-center mb-4">
            <Image src="/icons/temperature.png?v=1" alt="Temp" width={44} height={44} unoptimized />
            <h2 className="text-[22px] font-black tracking-tight text-center">
              {settings.temp?.displayMode === 'oil' ? 'Oil Transformer Temperature' : 'Transformer Body Temperature'}
            </h2>
          </div>
          
          <div className="flex-grow flex items-center justify-center w-full relative">
            <div className="w-[600px] h-[600px]">{renderGauge(tempValue, (settings.temp?.crit || 120) + 10, curTemp.color, false, 14)}</div>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="relative flex items-center translate-x-[-5px] justify-center">
                    <h3 className="text-[130px] font-bold leading-none tracking-tighter">{Math.floor(tempValue)}</h3>
                    <div className="flex flex-col ml-1 items-start justify-center">
                        <span className="text-[43px] font-bold mb-2">°C</span>
                        <span className="text-[43px] font-bold leading-none">,{ (tempValue % 1).toFixed(1).split('.')[1] }</span>
                    </div>
                </div>
                <p className="text-[55px] font-bold tracking-tight leading-none" style={{ color: curTemp.color }}>{curTemp.label}</p>
            </div>
          </div>

          {/* PAGE ANALYTICS PANEL */}
          <div className="w-full flex flex-col items-center mb-6 max-w-[420px]">
            <span className="text-[10px] font-black tracking-widest text-white/40 uppercase mb-2">
              Analytics Metrics (Last 24h)
            </span>
            <div className="w-full flex justify-center gap-4 bg-black/20 px-6 py-3 rounded-2xl border border-white/5 backdrop-blur-sm shadow-inner">
              <div className="text-center flex-1">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Average</span>
                <span className="text-sm font-extrabold text-[#d8db26]">{avgTemp.toFixed(1)}°C</span>
              </div>
              <div className="w-px bg-white/10 h-7 self-center"></div>
              <div className="text-center flex-1">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Peak</span>
                <span className="text-sm font-extrabold text-[#cb6060]">{peakTemp.toFixed(1)}°C</span>
              </div>
              <div className="w-px bg-white/10 h-7 self-center"></div>
              <div className="text-center flex-1">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Lowest</span>
                <span className="text-sm font-extrabold text-[#2ac764]">{lowestTemp.toFixed(1)}°C</span>
              </div>
            </div>
          </div>

          <div className="w-full border-t border-white/10 pt-6">
            <div className="flex justify-center gap-6">
              <LegendItem color="#2ac764" label={`Normal < ${settings.temp?.warn || 80}°C`} />
              <LegendItem color="#d8db26" label={`${settings.temp?.warn || 80}°C < Caution < ${settings.temp?.crit || 120}°C`} />
              <LegendItem color="#cb6060" label={`Critical > ${settings.temp?.crit || 120}°C`} />
            </div>
          </div>
        </div>

        {/* HUMIDITY & OIL COLOR LAYER */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          {/* HUMIDITY */}
          <div className="bg-[#2D365E] rounded-[50px] p-10 flex-1 shadow-2xl flex flex-col justify-center border border-white/5">
            <div className="flex items-center gap-3 w-full justify-center mb-8">
              <Image src="/icons/humidity.png?v=1" alt="Humidity" width={44} height={44} unoptimized />
              <h2 className="text-[28px] font-black tracking-tight text-center">Relative Humidity</h2>
            </div>
            <div className="px-4">
              <div className="w-full h-16 bg-white/10 rounded-full relative overflow-hidden flex items-center mb-6">
                <div className="h-full flex items-center justify-center text-3xl font-black transition-all duration-1000 shadow-lg text-white" style={{ width: `${humidityValue}%`, backgroundColor: getHumidityColor(humidityValue) }}>
                  {humidityValue}%
                </div>
              </div>
              <div className="flex justify-between px-6 text-3xl font-bold mb-6">
                <span style={{ color: '#cb6060', opacity: humidityValue <= (settings.humidity?.dry || 60) ? 1 : 0.2 }}>Dry</span>
                <span style={{ color: '#2ac764', opacity: (humidityValue > (settings.humidity?.dry || 60) && humidityValue <= (settings.humidity?.wet || 80)) ? 1 : 0.2 }}>Normal</span>
                <span style={{ color: '#2ac7c7', opacity: humidityValue > (settings.humidity?.wet || 80) ? 1 : 0.2 }}>Wet</span>
              </div>
              <div className="flex justify-center gap-6 border-t border-white/10 pt-6">
                <LegendItem color="#cb6060" label={`Dry < ${settings.humidity?.dry || 60}%`} />
                <LegendItem color="#2ac764" label={`${settings.humidity?.dry || 60}% < Normal < ${settings.humidity?.wet || 80}%`} />
                <LegendItem color="#2ac7c7" label={`Wet > ${settings.humidity?.wet || 80}%`} />
              </div>
            </div>
          </div>

          {/* OIL COLOR */}
          <div className="bg-[#2D365E] rounded-[50px] p-10 flex-1 shadow-2xl flex flex-col items-center justify-center border border-white/5">
             <div className="flex items-center gap-3 w-full justify-center mb-4">
                <Image src="/icons/oil-color.png?v=1" alt="Oil" width={44} height={44} unoptimized />
                <h2 className="text-[28px] font-black tracking-tight text-center">Oil Transformer Color</h2>
             </div>
             <div className="relative w-full h-[240px] flex justify-center items-end overflow-hidden">
                <div className="w-[600px] h-[220px]">{renderGauge(oilColorValue, 100, oilColorValue > (settings.oil?.crit || 66) ? '#cb6060' : oilColorValue > (settings.oil?.warn || 33) ? '#d8db26' : '#2ac764', true, 22)}</div>
                <div className="absolute bottom-2 flex flex-col items-center justify-center text-center">
                    <div className="font-bold text-[85px] leading-none mb-4">{oilColorValue}%</div>
                </div>
             </div>
             <div className="flex gap-12 font-bold text-3xl mt-4 mb-4">
                <span style={{ color: '#2ac764', opacity: oilColorValue <= (settings.oil?.warn || 33) ? 1 : 0.2 }}>Normal</span>
                <span style={{ color: '#d8db26', opacity: (oilColorValue > (settings.oil?.warn || 33) && oilColorValue <= (settings.oil?.crit || 66)) ? 1 : 0.2 }}>Caution</span>
                <span style={{ color: '#cb6060', opacity: oilColorValue > (settings.oil?.crit || 66) ? 1 : 0.2 }}>Critical</span>
             </div>
              <div className="text-[17px] font-extrabold uppercase tracking-wide mb-5 text-white/50 bg-black/20 px-4 py-1 rounded-full border border-white/5 backdrop-blur-sm">
                      {getOilColorLabel(oilColorValue)}
              </div>
             <div className="flex justify-center gap-6 border-t border-white/10 pt-6 w-full">
                <LegendItem color="#2ac764" label={`Normal < ${settings.oil?.warn || 33}%`} />
                <LegendItem color="#d8db26" label={`${settings.oil?.warn || 33}% < Caution < ${settings.oil?.crit || 66}%`} />
                <LegendItem color="#cb6060" label={`Critical > ${settings.oil?.crit || 66}%`} />
             </div>
          </div>
        </div>
      </div>

      {/* FLOOD EARLY WARNING SYSTEM */}
      <div className="bg-white rounded-[50px] p-10 shadow-2xl border border-gray-100 flex flex-col relative overflow-hidden text-[#2D365E]">
        <div className="flex items-center gap-4 justify-center mb-6 text-3xl font-black">
          <Image src="/icons/flood.png?v=1" alt="Flood" width={40} height={40} unoptimized /> 
          <h2 className="text-center tracking-tight">Flood Early Warning System</h2>
        </div>
        <div className="flex items-center justify-between w-full px-12 mb-8 text-[#2D365E]">
          
          <div className="w-20 h-72 bg-[#E1E6E4] rounded-[32px] p-2 flex flex-col justify-end shadow-inner border-4 border-gray-50/50 relative overflow-hidden shrink-0">
            <div 
              className="w-full transition-all duration-1000 shadow-lg" 
              style={{ 
                height: `${floodLevel}%`, 
                backgroundColor: curFlood.color, 
                borderRadius: floodLevel > 88 ? '24px' : '0px 0px 24px 24px'
              }}
            ></div>
          </div>
          
          <div className="flex flex-col items-start ml-8 flex-grow">
            <p className="text-[60px] font-bold tracking-tight" style={{ color: curFlood.color }}>{curFlood.label}</p>
            <h3 className="text-[110px] font-bold leading-none tracking-tighter text-[#707070]">{floodText} <span className="text-3xl font-black text-gray-300">cm</span></h3>
          </div>

          <div className="text-right">
            <p className="text-[#707070] font-bold text-[45px]">Switch Status:</p>
            <span 
              className="text-[105px] font-bold leading-none uppercase transition-all duration-300" 
              style={{ color: floatStatus === "ON" ? "#cb6060" : "#2ac764" }}
            >
              {floatStatus}
            </span>
          </div>
        </div>

        <div className="flex justify-center gap-10 border-t border-gray-100 pt-6">
           <LegendItem isDark color="#2ac764" label={`Safe < ${settings.flood?.warnLevel || 30} cm`} />
           <LegendItem isDark color="#d8db26" label={`${settings.flood?.warnLevel || 30} cm < Caution < ${settings.flood?.critLevel || 70} cm`} />
           <LegendItem isDark color="#cb6060" label={`Danger > ${settings.flood?.critLevel || 70} cm & Switch ON`} />
           <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-auto">Ground Ref: {settings.flood?.groundDistance || 300} cm</span>
        </div>
      </div>
    </div>
  );
}
