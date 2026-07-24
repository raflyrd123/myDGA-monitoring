'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, RefreshCw, Database, XCircle, Droplets, Sliders, Thermometer, ShieldAlert, Wind, Waves } from 'lucide-react';

export default function SettingsPage() {
  const [config, setConfig] = useState<any>(null);
  const [originalConfig, setOriginalConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'calibration')
        .single();

      if (error) {
        setErrorMessage("Data konfigurasi tidak ditemukan di database.");
      } else if (data) {
        const fetchedValue = data.value;

        // Validasi default parameter thresholds agar tidak crash
        if (!fetchedValue.temp) {
          fetchedValue.temp = { warn: 80, crit: 120, displayMode: 'body' };
        }
        if (!fetchedValue.humidity) {
          fetchedValue.humidity = { dry: 20, wet: 70 };
        }
        if (!fetchedValue.oil) {
          fetchedValue.oil = { warn: 40, crit: 75 };
        }
        if (!fetchedValue.flood) {
          fetchedValue.flood = { groundDistance: 50, warnLevel: 15, critLevel: 30 };
        }

        if (!fetchedValue.gasThresholds) fetchedValue.gasThresholds = {};
        if (fetchedValue.gasThresholds.CO === undefined) fetchedValue.gasThresholds.CO = 350;
        if (fetchedValue.gasThresholds.H2 === undefined) fetchedValue.gasThresholds.H2 = 100;
        if (fetchedValue.gasThresholds.CH4 === undefined) fetchedValue.gasThresholds.CH4 = 120;
        if (fetchedValue.gasThresholds.ETH === undefined) fetchedValue.gasThresholds.ETH = 65;
        if (fetchedValue.gasThresholds.C2H2 === undefined) fetchedValue.gasThresholds.C2H2 = 1;
        if (fetchedValue.gasThresholds.C2H4 === undefined) fetchedValue.gasThresholds.C2H4 = 50;
        if (fetchedValue.gasThresholds.NH3 === undefined) fetchedValue.gasThresholds.NH3 = 25;

        setConfig(fetchedValue);
        setOriginalConfig(JSON.stringify(fetchedValue));
      }
    } catch (e) {
      setErrorMessage("Gagal terhubung ke database Supabase.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error: upsertError } = await supabase
        .from('app_settings')
        .upsert({ id: 'calibration', value: config, updated_at: new Date() });

      if (upsertError) throw upsertError;
      setOriginalConfig(JSON.stringify(config));
      alert('Konfigurasi threshold berhasil disimpan!');
    } catch (err: any) {
      alert('Gagal menyimpan konfigurasi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const isDirty = JSON.stringify(config) !== originalConfig;

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#F4F7FE]">
       <div className="flex flex-col items-center gap-4 text-[#2D365E]">
         <RefreshCw className="animate-spin" size={40} />
         <p className="font-black uppercase tracking-widest text-sm">Memuat Konfigurasi...</p>
       </div>
    </div>
  );

  if (errorMessage) return (
    <div className="flex items-center justify-center min-h-screen bg-[#F4F7FE] p-10">
       <div className="bg-white p-10 rounded-[40px] shadow-2xl border-2 border-red-100 flex flex-col items-center text-center max-w-lg">
         <XCircle className="text-red-500 mb-6" size={64} />
         <h2 className="text-2xl font-black uppercase mb-4 text-[#2D365E]">Error Konfigurasi</h2>
         <p className="text-gray-500 font-bold leading-relaxed mb-8">{errorMessage}</p>
         <button onClick={fetchSettings} className="bg-[#2D365E] text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-sm active:scale-95 transition-all">
           Coba Lagi
         </button>
       </div>
    </div>
  );

  return (
    <div className="p-10 text-[#2D365E] bg-[#F4F7FE] min-h-screen">
      
      {/* HEADER BAR */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black uppercase tracking-tight leading-none text-[#2D365E]">Pengaturan Sistem</h1>
        <button 
          onClick={handleSave}
          disabled={saving || !isDirty}
          className={`flex items-center gap-3 px-10 py-4 rounded-[20px] font-black transition-all shadow-lg text-sm ${
            saving || !isDirty 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' 
            : 'bg-[#2D365E] text-white hover:bg-[#3d497c] active:scale-95'
          }`}
        >
          {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
          {saving ? 'MENYIMPAN...' : 'SIMPAN PERUBAHAN'}
        </button>
      </div>

      <div className="space-y-12">
        
        {/* PANEL 1: THRESHOLD SENSOR GAS */}
        <div className="bg-white rounded-[45px] p-10 shadow-2xl border border-gray-100">
          <div className="flex items-center gap-3 mb-8 border-b pb-6">
            <Sliders className="text-[#2D365E]" size={28} />
            <h2 className="text-2xl font-black uppercase tracking-tighter">Threshold Sensor Gas</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* CO */}
            <div className="p-5 bg-[#F4F7FE] rounded-[25px] border border-gray-200/50 flex flex-col justify-between">
              <div>
                <p className="font-black text-[10px] uppercase tracking-widest text-gray-400 mb-1">Sensor: MQ-135</p>
                <h4 className="font-black text-lg text-[#2D365E]">Carbon Monoxide (CO)</h4>
              </div>
              <div className="mt-4">
                <label className="text-[10px] font-black text-orange-500 uppercase block mb-1">Batas Alarm (PPM)</label>
                <input type="number" value={config.gasThresholds.CO} onChange={(e) => setConfig({...config, gasThresholds: { ...config.gasThresholds, CO: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-orange-200 outline-none" />
              </div>
            </div>

            {/* H2 */}
            <div className="p-5 bg-[#F4F7FE] rounded-[25px] border border-gray-200/50 flex flex-col justify-between">
              <div>
                <p className="font-black text-[10px] uppercase tracking-widest text-gray-400 mb-1">Sensor: MQ-8</p>
                <h4 className="font-black text-lg text-[#2D365E]">Hydrogen (H2)</h4>
              </div>
              <div className="mt-4">
                <label className="text-[10px] font-black text-orange-500 uppercase block mb-1">Batas Alarm (PPM)</label>
                <input type="number" value={config.gasThresholds.H2} onChange={(e) => setConfig({...config, gasThresholds: { ...config.gasThresholds, H2: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-orange-200 outline-none" />
              </div>
            </div>

            {/* CH4 */}
            <div className="p-5 bg-[#F4F7FE] rounded-[25px] border border-gray-200/50 flex flex-col justify-between">
              <div>
                <p className="font-black text-[10px] uppercase tracking-widest text-gray-400 mb-1">Sensor: TGS2611</p>
                <h4 className="font-black text-lg text-[#2D365E]">Methane (CH4)</h4>
              </div>
              <div className="mt-4">
                <label className="text-[10px] font-black text-orange-500 uppercase block mb-1">Batas Alarm (PPM)</label>
                <input type="number" value={config.gasThresholds.CH4} onChange={(e) => setConfig({...config, gasThresholds: { ...config.gasThresholds, CH4: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-orange-200 outline-none" />
              </div>
            </div>

            {/* ETH */}
            <div className="p-5 bg-[#F4F7FE] rounded-[25px] border border-gray-200/50 flex flex-col justify-between">
              <div>
                <p className="font-black text-[10px] uppercase tracking-widest text-gray-400 mb-1">Sensor: TGS813</p>
                <h4 className="font-black text-lg text-[#2D365E]">Ethane (C2H6)</h4>
              </div>
              <div className="mt-4">
                <label className="text-[10px] font-black text-orange-500 uppercase block mb-1">Batas Alarm (PPM)</label>
                <input type="number" value={config.gasThresholds.ETH} onChange={(e) => setConfig({...config, gasThresholds: { ...config.gasThresholds, ETH: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-orange-200 outline-none" />
              </div>
            </div>

            {/* C2H2 */}
            <div className="p-5 bg-[#F4F7FE] rounded-[25px] border border-gray-200/50 flex flex-col justify-between">
              <div>
                <p className="font-black text-[10px] uppercase tracking-widest text-gray-400 mb-1">Sensor: MQ-9</p>
                <h4 className="font-black text-lg text-[#2D365E]">Acetylene (C2H2)</h4>
              </div>
              <div className="mt-4">
                <label className="text-[10px] font-black text-orange-500 uppercase block mb-1">Batas Alarm (PPM)</label>
                <input type="number" value={config.gasThresholds.C2H2} onChange={(e) => setConfig({...config, gasThresholds: { ...config.gasThresholds, C2H2: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-orange-200 outline-none" />
              </div>
            </div>

            {/* C2H4 */}
            <div className="p-5 bg-[#F4F7FE] rounded-[25px] border border-gray-200/50 flex flex-col justify-between">
              <div>
                <p className="font-black text-[10px] uppercase tracking-widest text-gray-400 mb-1">Sensor: TGS2600</p>
                <h4 className="font-black text-lg text-[#2D365E]">Ethylene (C2H4)</h4>
              </div>
              <div className="mt-4">
                <label className="text-[10px] font-black text-orange-500 uppercase block mb-1">Batas Alarm (PPM)</label>
                <input type="number" value={config.gasThresholds.C2H4} onChange={(e) => setConfig({...config, gasThresholds: { ...config.gasThresholds, C2H4: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-orange-200 outline-none" />
              </div>
            </div>

            {/* NH3 */}
            <div className="p-5 bg-[#F4F7FE] rounded-[25px] border border-gray-200/50 flex flex-col justify-between">
              <div>
                <p className="font-black text-[10px] uppercase tracking-widest text-gray-400 mb-1">Sensor: TGS2602</p>
                <h4 className="font-black text-lg text-[#2D365E]">Ammonia (NH3)</h4>
              </div>
              <div className="mt-4">
                <label className="text-[10px] font-black text-orange-500 uppercase block mb-1">Batas Alarm (PPM)</label>
                <input type="number" value={config.gasThresholds.NH3} onChange={(e) => setConfig({...config, gasThresholds: { ...config.gasThresholds, NH3: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-orange-200 outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* PANEL 2: THRESHOLD SUHU, KELEMBAPAN & MINYAK */}
        <div className="bg-white rounded-[45px] p-10 shadow-2xl border border-gray-100">
          <div className="flex items-center gap-3 mb-8 border-b pb-6">
            <Thermometer className="text-[#2D365E]" size={28} />
            <h2 className="text-2xl font-black uppercase tracking-tighter">Threshold Suhu, Kelembapan & Minyak</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* CARD SUHU */}
            <div className="p-6 bg-[#F4F7FE] rounded-[35px] border border-gray-200/50 flex flex-col justify-between">
              <div>
                <p className="font-black text-sm uppercase tracking-wider text-[#2D365E] border-b pb-2 mb-4 flex items-center gap-2">
                  <Database size={14} className="text-gray-400" /> Alert Suhu
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-indigo-600 uppercase block mb-1">Mode Sensor Suhu</label>
                    <select
                      value={config.temp.displayMode || 'body'}
                      onChange={(e) => setConfig({...config, temp: { ...config.temp, displayMode: e.target.value }})}
                      className="w-full bg-white rounded-xl p-3 font-black text-xs text-indigo-600 border border-indigo-200 outline-none cursor-pointer"
                    >
                      <option value="body">Suhu Bodi Trafo</option>
                      <option value="oil">Suhu Minyak Trafo</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Batas Waspada (°C)</label>
                    <input type="number" value={config.temp.warn} onChange={(e) => setConfig({...config, temp: { ...config.temp, warn: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-gray-200 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Batas Kritis (°C)</label>
                    <input type="number" value={config.temp.crit} onChange={(e) => setConfig({...config, temp: { ...config.temp, crit: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-gray-200 outline-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* CARD HUMIDITY */}
            <div className="p-6 bg-[#F4F7FE] rounded-[35px] border border-gray-200/50 flex flex-col justify-between">
              <div>
                <p className="font-black text-sm uppercase tracking-wider text-[#2D365E] border-b pb-2 mb-4 flex items-center gap-2">
                  <Wind size={14} className="text-gray-400" /> Alert Kelembapan
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Batas Kering (%)</label>
                    <input type="number" value={config.humidity.dry} onChange={(e) => setConfig({...config, humidity: { ...config.humidity, dry: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-gray-200 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Batas Lembap (%)</label>
                    <input type="number" value={config.humidity.wet} onChange={(e) => setConfig({...config, humidity: { ...config.humidity, wet: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-gray-200 outline-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* CARD WARNA MINYAK */}
            <div className="p-6 bg-[#F4F7FE] rounded-[35px] border border-gray-200/50 flex flex-col justify-between">
              <div>
                <p className="font-black text-sm uppercase tracking-wider text-[#2D365E] border-b pb-2 mb-4 flex items-center gap-2">
                  <Droplets size={14} className="text-gray-400" /> Alert Warna Minyak
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Batas Waspada (%)</label>
                    <input type="number" value={config.oil.warn} onChange={(e) => setConfig({...config, oil: { ...config.oil, warn: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-gray-200 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Batas Kritis (%)</label>
                    <input type="number" value={config.oil.crit} onChange={(e) => setConfig({...config, oil: { ...config.oil, crit: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-gray-200 outline-none" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* PANEL 3: LEVEL AIR */}
        <div className="bg-white rounded-[45px] p-10 shadow-2xl border border-gray-100">
          <div className="flex items-center gap-3 mb-8 border-b pb-6">
            <ShieldAlert className="text-[#2D365E]" size={28} />
            <h2 className="text-2xl font-black uppercase tracking-tighter">Threshold Level Air</h2>
          </div>
          <div className="p-8 bg-[#F4F7FE] rounded-[35px] border border-gray-200/50">
            <p className="font-black text-xs uppercase tracking-widest text-[#2D365E] mb-6 flex items-center gap-2">
              <Waves size={14} className="text-gray-400" /> Water Level Alert (JSN-SR04T)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Baseline Tinggi Sensor (cm)</label>
                <input type="number" value={config.flood.groundDistance} onChange={(e) => setConfig({...config, flood: { ...config.flood, groundDistance: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-black text-sm text-[#2D365E] border border-gray-200 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-orange-500 uppercase mb-1.5">Batas Waspada (cm)</label>
                <input type="number" value={config.flood.warnLevel} onChange={(e) => setConfig({...config, flood: { ...config.flood, warnLevel: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-black text-sm text-[#2D365E] border border-orange-200 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-rose-500 uppercase mb-1.5">Batas Bahaya (cm)</label>
                <input type="number" value={config.flood.critLevel} onChange={(e) => setConfig({...config, flood: { ...config.flood, critLevel: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-black text-sm text-[#2D365E] border border-rose-200 outline-none" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
