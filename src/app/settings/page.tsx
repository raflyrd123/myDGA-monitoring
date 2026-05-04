'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, RefreshCw, AlertTriangle, Home, Database, XCircle, Droplets } from 'lucide-react';

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
        setErrorMessage("Data kalibrasi tidak ditemukan di database.");
      } else if (data) {
        setConfig(data.value);
        setOriginalConfig(JSON.stringify(data.value));
      }
    } catch (e) {
      setErrorMessage("Gagal terhubung ke database.");
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
      alert('Settings Berhasil Disimpan!');
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Logika pengecekan perubahan data
  const isDirty = JSON.stringify(config) !== originalConfig;

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#F4F7FE]">
       <div className="flex flex-col items-center gap-4 text-[#2D365E]">
         <RefreshCw className="animate-spin" size={40} />
         <p className="font-black uppercase tracking-widest text-sm">Membaca Data Database...</p>
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
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black uppercase tracking-tight leading-none text-[#2D365E]">System Settings</h1>
        
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
          {saving ? 'UPDATING...' : 'SAVE CHANGES'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-[#2D365E]">
        
        {/* GAS LIMITS */}
        <div className="lg:col-span-12 bg-white rounded-[45px] p-10 shadow-2xl border border-gray-100">
          <div className="flex items-center gap-3 mb-8 border-b pb-6">
            <AlertTriangle className="text-orange-500" size={28} />
            <h2 className="text-2xl font-black uppercase tracking-tighter">Gas Warning Limits (PPM)</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
            {Object.keys(config.gasThresholds).map((gas) => (
              <div key={gas} className="space-y-2 text-[#2D365E]">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">{gas} LIMIT</label>
                <input 
                  type="number" 
                  value={config.gasThresholds[gas]} 
                  onChange={(e) => setConfig({...config, gasThresholds: {...config.gasThresholds, [gas]: Number(e.target.value)}})}
                  className="w-full bg-[#F4F7FE] border-none rounded-2xl p-4 font-bold text-[#2D365E] focus:ring-2 focus:ring-[#2D365E] text-sm outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        {/* ENVIRONMENT & OIL */}
        <div className="lg:col-span-8 bg-white rounded-[45px] p-10 shadow-2xl border border-gray-100 text-[#2D365E]">
          <div className="flex items-center gap-3 mb-8 border-b pb-6">
            <Home className="text-[#2D365E]" size={28} />
            <h2 className="text-2xl font-black uppercase tracking-tighter">Environment & Oil Thresholds</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Temperature */}
            <div className="space-y-4 text-[#2D365E]">
               <p className="font-black text-xs uppercase tracking-widest flex items-center gap-2"><Database size={14}/> Temperature (°C)</p>
               <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase">Normal to Caution</label>
                    <input type="number" value={config.temp.warn} onChange={(e) => setConfig({...config, temp: {...config.temp, warn: Number(e.target.value)}})} className="w-full bg-[#F4F7FE] rounded-xl p-3 font-bold text-sm text-[#2D365E]" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase">Caution to Critical</label>
                    <input type="number" value={config.temp.crit} onChange={(e) => setConfig({...config, temp: {...config.temp, crit: Number(e.target.value)}})} className="w-full bg-[#F4F7FE] rounded-xl p-3 font-bold text-sm text-[#2D365E]" />
                  </div>
               </div>
            </div>

            {/* Humidity */}
            <div className="space-y-4 text-[#2D365E]">
               <p className="font-black text-xs uppercase tracking-widest flex items-center gap-2"><Database size={14}/> Humidity (%)</p>
               <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase">Dry to Normal</label>
                    <input type="number" value={config.humidity.dry} onChange={(e) => setConfig({...config, humidity: {...config.humidity, dry: Number(e.target.value)}})} className="w-full bg-[#F4F7FE] rounded-xl p-3 font-bold text-sm text-[#2D365E]" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase">Normal to Wet</label>
                    <input type="number" value={config.humidity.wet} onChange={(e) => setConfig({...config, humidity: {...config.humidity, wet: Number(e.target.value)}})} className="w-full bg-[#F4F7FE] rounded-xl p-3 font-bold text-sm text-[#2D365E]" />
                  </div>
               </div>
            </div>

            {/* Oil Color */}
            <div className="space-y-4 text-[#2D365E]">
               <p className="font-black text-xs uppercase tracking-widest flex items-center gap-2"><Droplets size={14}/> Oil Color (%)</p>
               <div className="space-y-3 text-[#2D365E]">
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase text-[#2D365E]">Normal to Caution</label>
                    <input type="number" value={config.oil.warn} onChange={(e) => setConfig({...config, oil: {...config.oil, warn: Number(e.target.value)}})} className="w-full bg-[#F4F7FE] rounded-xl p-3 font-bold text-sm text-[#2D365E]" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase text-[#2D365E]">Caution to Critical</label>
                    <input type="number" value={config.oil.crit} onChange={(e) => setConfig({...config, oil: {...config.oil, crit: Number(e.target.value)}})} className="w-full bg-[#F4F7FE] rounded-xl p-3 font-bold text-sm text-[#2D365E]" />
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* FLOOD SYSTEM */}
        <div className="lg:col-span-4 bg-white rounded-[45px] p-10 shadow-2xl border border-gray-100 text-[#2D365E]">
          <div className="flex items-center gap-3 mb-8 border-b pb-6">
            <Database size={28} />
            <h2 className="text-2xl font-black uppercase tracking-tighter">Flood System</h2>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Sensor Height (CM)</label>
              <input type="number" value={config.flood.groundDistance} onChange={(e) => setConfig({...config, flood: {...config.flood, groundDistance: Number(e.target.value)}})} className="w-full bg-[#F4F7FE] border-none rounded-2xl p-4 text-2xl font-black text-[#2D365E]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Caution %</label>
                <input type="number" value={config.flood.warnLevel} onChange={(e) => setConfig({...config, flood: {...config.flood, warnLevel: Number(e.target.value)}})} className="w-full bg-[#F4F7FE] rounded-2xl p-4 font-bold text-sm text-[#2D365E]" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Danger %</label>
                <input type="number" value={config.flood.critLevel} onChange={(e) => setConfig({...config, flood: {...config.flood, critLevel: Number(e.target.value)}})} className="w-full bg-[#F4F7FE] rounded-2xl p-4 font-bold text-sm text-[#2D365E]" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}