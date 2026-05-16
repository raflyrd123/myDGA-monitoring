'use client';

import React, { useState, useEffect } from 'react';
import { SensorCard } from './components/SensorCard';
import { supabase } from './lib/supabase'; 
import Image from 'next/image';
import { Waves } from 'lucide-react';

export default function DashboardPage() {
  // --- STATE DATA SENSOR ---
  const [tempValue, setTempValue] = useState(0);
  const [humidityValue, setHumidityValue] = useState(0);
  const [oilColorValue, setOilColorValue] = useState(0);
  const [floodLevel, setFloodLevel] = useState(0); 
  const [floodText, setFloodText] = useState("0");
  
  // State baru untuk menampung status Float Switch dari Database ('OK' / 'CRITICAL')
  const [floatSwitchStatus, setFloatSwitchStatus] = useState<string>("OK");

  const [gasData, setGasData] = useState({
    h2: 0, co: 0, nh3: 0, ch4: 0, c3h8: 0, c4h10: 0, c2h4: 0, c2h2: 0, c2h6: 0
  });

  // --- STATE SETTINGS ---
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const initializeDashboard = async () => {
      // 1. Ambil data Kalibrasi/Settings
      const { data: config } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'calibration')
        .single();
      
      if (config) setSettings(config.value);

      // 2. Ambil data Sensor Terakhir (Membaca kolom baru: safety_float)
      const { data: sensor } = await supabase
        .from('sensor_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (sensor) {
        setTempValue(sensor.temperature_c || 0);
        setHumidityValue(sensor.humidity_pct || 0);
        setOilColorValue(sensor.oil_color_pct || 0);
        setFloodText(sensor.water_level_cm ? sensor.water_level_cm.toFixed(1) : "0");
        
        // Simpan status float switch dari database ke state
        if (sensor.safety_float) {
          setFloatSwitchStatus(sensor.safety_float.toUpperCase());
        }

        // Hitung persentase untuk sisa bar air di komponen visual (Jika settings ada)
        if (config?.value?.flood) {
          const maxH = config.value.flood.maxHeight || 100;
          const pct = Math.max(0, Math.min(100, (sensor.water_level_cm / maxH) * 100));
          setFloodLevel(pct);
        }
      }
    };

    initializeDashboard();

    // 3. REAL-TIME SUBSCRIPTION (Supabase Listeners)
    const channel = supabase
      .channel('realtime_sensors')
      .on(
        'postgres_changes',
        { event: 'INSERT', table: 'sensor_logs', schema: 'public' },
        (payload) => {
          const newData = payload.new;
          setTempValue(newData.temperature_c || 0);
          setHumidityValue(newData.humidity_pct || 0);
          setOilColorValue(newData.oil_color_pct || 0);
          setFloodText(newData.water_level_cm ? newData.water_level_cm.toFixed(1) : "0");
          
          // Update status float switch secara real-time saat ada data baru masuk
          if (newData.safety_float) {
            setFloatSwitchStatus(newData.safety_float.toUpperCase());
          }

          if (settings?.flood) {
            const maxH = settings.flood.maxHeight || 100;
            const pct = Math.max(0, Math.min(100, (newData.water_level_cm / maxH) * 100));
            setFloodLevel(pct);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [settings]);

  // --- LOGIKA MENENTUKAN STYLE & TEKS BERDASARKAN STATUS REAL FLOAT SWITCH ---
  const getFloodStatusMetrics = () => {
    // Jika koordinat float switch mendeteksi 'CRITICAL' atau pelampung naik (ON / Terangkat)
    if (floatSwitchStatus === "CRITICAL" || floatSwitchStatus === "ON") {
      return {
        color: "#cb6060",        // Merah bahaya
        label: "DANGER",
        switch: "ON"            // Menandakan float switch aktif terangkat air
      };
    }
    
    // Default kondisi aman jika data database bertuliskan 'OK' atau 'OFF'
    return {
      color: "#2ac764",          // Hijau aman
      label: "SAFE",
      switch: "OFF"             // Menandakan float switch di bawah batas aman
    };
  };

  const curFlood = getFloodStatusMetrics();

  return (
    <main className="min-h-screen bg-[#121212] text-white p-8 font-sans">
      {/* HEADER SECTION */}
      <header className="flex justify-between items-center mb-10 border-b border-gray-800 pb-6">
        <div className="flex items-center gap-4">
          <Image src="/sisgrid-logo.png" alt="SISGRID Logo" width={60} height={60} className="object-contain" errors-bypass="true" />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              SISGRID LABORATORY
            </h1>
            <p className="text-gray-400 text-sm font-medium">Smart DGA & Transformer Intelligence Monitoring</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">System Status</p>
          <div className="flex items-center gap-2 mt-1 justify-end">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-sm font-semibold text-gray-300">ONLINE</span>
          </div>
        </div>
      </header>

      {/* CORE INSTRUMENT CARDS GRID */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <SensorCard 
          title="TRANSFORMER TEMPERATURE" 
          value={tempValue} 
          unit="°C" 
          type="temperature"
          status={tempValue > 85 ? "CRITICAL" : tempValue > 65 ? "WARNING" : "NORMAL"}
        />
        <SensorCard 
          title="TRANSFORMER HUMIDITY" 
          value={humidityValue} 
          unit="%" 
          type="humidity"
          status={humidityValue > 75 ? "CRITICAL" : humidityValue > 50 ? "WARNING" : "NORMAL"}
        />
        <SensorCard 
          title="OIL CLARITY DEGRADATION" 
          value={oilColorValue} 
          unit="%" 
          type="oil"
          status={oilColorValue > 80 ? "CRITICAL" : oilColorValue > 40 ? "WARNING" : "NORMAL"}
        />
      </section>

      {/* HYDRAULIC LEVEL & FLOOD INTERLOCK VISUALIZER */}
      <section className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6 mb-8 shadow-2xl">
        <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-4">
          <Waves className="text-emerald-400 w-6 h-6" />
          <h2 className="text-lg font-bold tracking-wide uppercase text-gray-300">Water Level & Safety Guard Interlock</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center py-4">
          {/* Vertical Level Bar Indicator */}
          <div className="w-full h-44 bg-gray-900 rounded-xl flex flex-col justify-end shadow-inner border-4 border-gray-800/50 relative overflow-hidden">
            <div 
              className="w-full rounded-b-lg transition-all duration-1000 shadow-lg" 
              style={{ height: `${floodLevel}%`, backgroundColor: curFlood.color }}
            ></div>
          </div>
          
          {/* Ultrasonic Metric Text */}
          <div className="flex flex-col items-start">
            <p className="text-xl font-bold tracking-wider uppercase mb-1" style={{ color: curFlood.color }}>
              {curFlood.label}
            </p>
            <h3 className="text-7xl font-extrabold leading-none tracking-tighter text-white">
              {floodText} <span className="text-3xl font-medium text-gray-500">cm</span>
            </h3>
          </div>
          
          {/* Real-time Float Switch Status Display */}
          <div className="text-right border-l border-gray-800/80 pl-8 h-full flex flex-col justify-center">
            <p className="text-gray-400 font-bold text-sm tracking-wide uppercase mb-1">Switch Status:</p>
            <span className="text-6xl font-black leading-none uppercase tracking-tight" style={{ color: curFlood.color }}>
              {curFlood.switch}
            </span>
          </div>
        </div>
      </section>

      {/* DGA FAULT GAS COMPLEX ANALYTICS MATRIX */}
      <section className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6 shadow-2xl">
        <h2 className="text-lg font-bold tracking-wide uppercase text-gray-300 mb-4 border-b border-gray-800 pb-4">
          Dissolved Gas Analysis (DGA) Matrix Log
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {Object.entries(gasData).map(([gas, val]) => (
            <div key={gas} className="bg-gray-900/60 border border-gray-800/40 p-4 rounded-xl text-center">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">{gas.toUpperCase()}</p>
              <p className="text-xl font-extrabold text-gray-200">{val} <span className="text-xs text-gray-600 font-normal">ppm</span></p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

// Sub-component Helper Legend (Bypass error scope if not exported)
function LegendItem({ color, label }: { color: string; label: string; isDark?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
      <span className="text-xs text-gray-400 font-medium">{label}</span>
    </div>
  );
}