'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, RefreshCw, Database, XCircle, Droplets, Sliders, Thermometer, ShieldAlert, Wind, Home, Settings2, CheckCircle2 } from 'lucide-react';

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
        const fetchedValue = data.value;

        // Inisialisasi default parameter suhu & tipe display TA
        if (!fetchedValue.temp) {
          fetchedValue.temp = { warn: 80, crit: 120, displayMode: 'body' };
        } else if (fetchedValue.temp.displayMode === undefined) {
          fetchedValue.temp.displayMode = 'body'; 
        }

        if (!fetchedValue.gasThresholds) fetchedValue.gasThresholds = {};
        if (fetchedValue.gasThresholds.CO === undefined) fetchedValue.gasThresholds.CO = 350;
        if (fetchedValue.gasThresholds.H2 === undefined) fetchedValue.gasThresholds.H2 = 100;
        if (fetchedValue.gasThresholds.CH4 === undefined) fetchedValue.gasThresholds.CH4 = 120;
        if (fetchedValue.gasThresholds.ETH === undefined) fetchedValue.gasThresholds.ETH = 65;
        if (fetchedValue.gasThresholds.C2H2 === undefined) fetchedValue.gasThresholds.C2H2 = 1;
        if (fetchedValue.gasThresholds.C2H4 === undefined) fetchedValue.gasThresholds.C2H4 = 50;
        if (fetchedValue.gasThresholds.NH3 === undefined) fetchedValue.gasThresholds.NH3 = 25;

        if (!fetchedValue.gasCalibration) {
          fetchedValue.gasCalibration = {
            mq135: { cleanAirRs: 1000000.0, airFactor: 3.6, loadResistor: 10000.0 },
            mq8: { cleanAirRs: 600000.0, airFactor: 9.21, loadResistor: 10000.0 },
            tgs2611: { cleanAirRs: 43300.0, airFactor: 1.0, loadResistor: 10000.0 },
            tgs813: { cleanAirRs: 37000.0, airFactor: 2.1, loadResistor: 10000.0 },
            mq9: { cleanAirRs: 175000.0, airFactor: 9.8, loadResistor: 10000.0 },
            tgs2600: { cleanAirRs: 15000.0, airFactor: 1.0, loadResistor: 10000.0 },
            tgs2602: { cleanAirRs: 33900.0, airFactor: 1.0, loadResistor: 10000.0 }
          };
        }
        if (!fetchedValue.sensorOffsets) {
          fetchedValue.sensorOffsets = { shtTempOffset: 0.7, shtHumOffset: -6.48, rtdOffset: 4.73, waterLevelOffset: 0.0 };
        }
        if (!fetchedValue.oilColorCalibration) {
          fetchedValue.oilColorCalibration = { valBening: 19000, valHitam: 4000 };
        }

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
      alert('Seluruh parameter konfigurasi fisis koper DGA berhasil disimpan!');
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

      <div className="space-y-12">
        
        {/* PANEL 1: ARRAY SENSOR GAS */}
        <div className="bg-white rounded-[45px] p-10 shadow-2xl border border-gray-100">
          <div className="flex items-center gap-3 mb-8 border-b pb-6">
            <Sliders className="text-[#2D365E]" size={28} />
            <h2 className="text-2xl font-black uppercase tracking-tighter">Gas Sensor Diagnostics & R0 Calibration Blocks</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-8">
            {/* 1. MQ-135 */}
            <div className="p-6 bg-[#F4F7FE] rounded-[30px] border border-gray-200/50">
              <div className="flex justify-between items-center mb-4 border-b border-gray-200/60 pb-2">
                <p className="font-black text-xs uppercase tracking-widest text-[#2D365E] flex items-center gap-2">
                  <Database size={12} className="text-gray-400" /> Sensor Type: MQ-135
                </p>
                <span className="bg-[#2D365E] text-white px-3 py-1 rounded-lg text-[9px] font-black tracking-widest">TARGET TELEMETRY: CO</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[9px] font-black text-orange-500 uppercase block mb-1">Warning Trigger (PPM)</label>
                  <input type="number" value={config.gasThresholds.CO} onChange={(e) => setConfig({...config, gasThresholds: { ...config.gasThresholds, CO: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-orange-200 outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Clean Air Rs (Ohm)</label>
                  <input type="number" value={config.gasCalibration.mq135.cleanAirRs} onChange={(e) => setConfig({...config, gasCalibration: { ...config.gasCalibration, mq135: { ...config.gasCalibration.mq135, cleanAirRs: Number(e.target.value) } }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Air Factor Constant</label>
                  <input type="number" step="0.01" value={config.gasCalibration.mq135.airFactor} onChange={(e) => setConfig({...config, gasCalibration: { ...config.gasCalibration, mq135: { ...config.gasCalibration.mq135, airFactor: Number(e.target.value) } }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Load Resistor RL (Ohm)</label>
                  <input type="number" value={config.gasCalibration.mq135.loadResistor} onChange={(e) => setConfig({...config, gasCalibration: { ...config.gasCalibration, mq135: { ...config.gasCalibration.mq135, loadResistor: Number(e.target.value) } }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border outline-none" />
                </div>
              </div>
            </div>

            {/* 2. MQ-8 */}
            <div className="p-6 bg-[#F4F7FE] rounded-[30px] border border-gray-200/50">
              <div className="flex justify-between items-center mb-4 border-b border-gray-200/60 pb-2">
                <p className="font-black text-xs uppercase tracking-widest text-[#2D365E] flex items-center gap-2">
                  <Database size={12} className="text-gray-400" /> Sensor Type: MQ-8
                </p>
                <span className="bg-[#2D365E] text-white px-3 py-1 rounded-lg text-[9px] font-black tracking-widest">TARGET TELEMETRY: H2</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[9px] font-black text-orange-500 uppercase block mb-1">Warning Trigger (PPM)</label>
                  <input type="number" value={config.gasThresholds.H2} onChange={(e) => setConfig({...config, gasThresholds: { ...config.gasThresholds, H2: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-orange-200 outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Clean Air Rs (Ohm)</label>
                  <input type="number" value={config.gasCalibration.mq8.cleanAirRs} onChange={(e) => setConfig({...config, gasCalibration: { ...config.gasCalibration, mq8: { ...config.gasCalibration.mq8, cleanAirRs: Number(e.target.value) } }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Air Factor Constant</label>
                  <input type="number" step="0.01" value={config.gasCalibration.mq8.airFactor} onChange={(e) => setConfig({...config, gasCalibration: { ...config.gasCalibration, mq8: { ...config.gasCalibration.mq8, airFactor: Number(e.target.value) } }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Load Resistor RL (Ohm)</label>
                  <input type="number" value={config.gasCalibration.mq8.loadResistor} onChange={(e) => setConfig({...config, gasCalibration: { ...config.gasCalibration, mq8: { ...config.gasCalibration.mq8, loadResistor: Number(e.target.value) } }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border outline-none" />
                </div>
              </div>
            </div>

            {/* 3. TGS2611 */}
            <div className="p-6 bg-[#F4F7FE] rounded-[30px] border border-gray-200/50">
              <div className="flex justify-between items-center mb-4 border-b border-gray-200/60 pb-2">
                <p className="font-black text-xs uppercase tracking-widest text-[#2D365E] flex items-center gap-2">
                  <Database size={12} className="text-gray-400" /> Sensor Type: TGS2611
                </p>
                <span className="bg-[#2D365E] text-white px-3 py-1 rounded-lg text-[9px] font-black tracking-widest">TARGET TELEMETRY: CH4</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[9px] font-black text-orange-500 uppercase block mb-1">Warning Trigger (PPM)</label>
                  <input type="number" value={config.gasThresholds.CH4} onChange={(e) => setConfig({...config, gasThresholds: { ...config.gasThresholds, CH4: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-orange-200 outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Clean Air Rs (Ohm)</label>
                  <input type="number" value={config.gasCalibration.tgs2611.cleanAirRs} onChange={(e) => setConfig({...config, gasCalibration: { ...config.gasCalibration.tgs2611, cleanAirRs: Number(e.target.value) } })} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Air Factor Constant</label>
                  <input type="number" step="0.01" value={config.gasCalibration.tgs2611.airFactor} onChange={(e) => setConfig({...config, gasCalibration: { ...config.gasCalibration, tgs2611: { ...config.gasCalibration.tgs2611, airFactor: Number(e.target.value) } }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Load Resistor RL (Ohm)</label>
                  <input type="number" value={config.gasCalibration.tgs2611.loadResistor} onChange={(e) => setConfig({...config, gasCalibration: { ...config.gasCalibration, tgs2611: { ...config.gasCalibration.tgs2611, loadResistor: Number(e.target.value) } }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border outline-none" />
                </div>
              </div>
            </div>

            {/* 4. TGS813 */}
            <div className="p-6 bg-[#F4F7FE] rounded-[30px] border border-gray-200/50">
              <div className="flex justify-between items-center mb-4 border-b border-gray-200/60 pb-2">
                <p className="font-black text-xs uppercase tracking-widest text-[#2D365E] flex items-center gap-2">
                  <Database size={12} className="text-gray-400" /> Sensor Type: TGS813
                </p>
                <span className="bg-[#2D365E] text-white px-3 py-1 rounded-lg text-[9px] font-black tracking-widest">TARGET TELEMETRY: ETH</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[9px] font-black text-orange-500 uppercase block mb-1">Warning Trigger (PPM)</label>
                  <input type="number" value={config.gasThresholds.ETH} onChange={(e) => setConfig({...config, gasThresholds: { ...config.gasThresholds, ETH: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-orange-200 outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Clean Air Rs (Ohm)</label>
                  <input type="number" value={config.gasCalibration.tgs813.cleanAirRs} onChange={(e) => setConfig({...config, gasCalibration: { ...config.gasCalibration, tgs813: { ...config.gasCalibration.tgs813, cleanAirRs: Number(e.target.value) } }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Air Factor Constant</label>
                  <input type="number" step="0.01" value={config.gasCalibration.tgs813.airFactor} onChange={(e) => setConfig({...config, gasCalibration: { ...config.gasCalibration, tgs813: { ...config.gasCalibration.tgs813, airFactor: Number(e.target.value) } }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Load Resistor RL (Ohm)</label>
                  <input type="number" value={config.gasCalibration.tgs813.loadResistor} onChange={(e) => setConfig({...config, gasCalibration: { ...config.gasCalibration, tgs813: { ...config.gasCalibration.tgs813, loadResistor: Number(e.target.value) } }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border outline-none" />
                </div>
              </div>
            </div>

            {/* 5. MQ-9 */}
            <div className="p-6 bg-[#F4F7FE] rounded-[30px] border border-gray-200/50">
              <div className="flex justify-between items-center mb-4 border-b border-gray-200/60 pb-2">
                <p className="font-black text-xs uppercase tracking-widest text-[#2D365E] flex items-center gap-2">
                  <Database size={12} className="text-gray-400" /> Sensor Type: MQ-9
                </p>
                <span className="bg-[#2D365E] text-white px-3 py-1 rounded-lg text-[9px] font-black tracking-widest">TARGET TELEMETRY: C2H2</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[9px] font-black text-orange-500 uppercase block mb-1">Warning Trigger (PPM)</label>
                  <input type="number" value={config.gasThresholds.C2H2} onChange={(e) => setConfig({...config, gasThresholds: { ...config.gasThresholds, C2H2: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-orange-200 outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Clean Air Rs (Ohm)</label>
                  <input type="number" value={config.gasCalibration.mq9.cleanAirRs} onChange={(e) => setConfig({...config, gasCalibration: { ...config.gasCalibration, mq9: { ...config.gasCalibration.mq9, cleanAirRs: Number(e.target.value) } }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Air Factor Constant</label>
                  <input type="number" step="0.01" value={config.gasCalibration.mq9.airFactor} onChange={(e) => setConfig({...config, gasCalibration: { ...config.gasCalibration, mq9: { ...config.gasCalibration.mq9, airFactor: Number(e.target.value) } }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Load Resistor RL (Ohm)</label>
                  <input type="number" value={config.gasCalibration.mq9.loadResistor} onChange={(e) => setConfig({...config, gasCalibration: { ...config.gasCalibration, mq9: { ...config.gasCalibration.mq9, loadResistor: Number(e.target.value) } }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border outline-none" />
                </div>
              </div>
            </div>

            {/* 6. TGS2600 */}
            <div className="p-6 bg-[#F4F7FE] rounded-[30px] border border-gray-200/50">
              <div className="flex justify-between items-center mb-4 border-b border-gray-200/60 pb-2">
                <p className="font-black text-xs uppercase tracking-widest text-[#2D365E] flex items-center gap-2">
                  <Database size={12} className="text-gray-400" /> Sensor Type: TGS2600
                </p>
                <span className="bg-[#2D365E] text-white px-3 py-1 rounded-lg text-[9px] font-black tracking-widest">TARGET TELEMETRY: C2H4</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[9px] font-black text-orange-500 uppercase block mb-1">Warning Trigger (PPM)</label>
                  <input type="number" value={config.gasThresholds.C2H4} onChange={(e) => setConfig({...config, gasThresholds: { ...config.gasThresholds, C2H4: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-orange-200 outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Clean Air Rs (Ohm)</label>
                  <input type="number" value={config.gasCalibration.tgs2600.cleanAirRs} onChange={(e) => setConfig({...config, gasCalibration: { ...config.gasCalibration, tgs2600: { ...config.gasCalibration.tgs2600, cleanAirRs: Number(e.target.value) } }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Air Factor Constant</label>
                  <input type="number" step="0.01" value={config.gasCalibration.tgs2600.airFactor} onChange={(e) => setConfig({...config, gasCalibration: { ...config.gasCalibration, tgs2600: { ...config.gasCalibration.tgs2600, airFactor: Number(e.target.value) } }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Load Resistor RL (Ohm)</label>
                  <input type="number" value={config.gasCalibration.tgs2600.loadResistor} onChange={(e) => setConfig({...config, gasCalibration: { ...config.gasCalibration, tgs2600: { ...config.gasCalibration.tgs2600, loadResistor: Number(e.target.value) } }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border outline-none" />
                </div>
              </div>
            </div>

            {/* 7. TGS2602 */}
            <div className="p-6 bg-[#F4F7FE] rounded-[30px] border border-gray-200/50">
              <div className="flex justify-between items-center mb-4 border-b border-gray-200/60 pb-2">
                <p className="font-black text-xs uppercase tracking-widest text-[#2D365E] flex items-center gap-2">
                  <Database size={12} className="text-gray-400" /> Sensor Type: TGS2602
                </p>
                <span className="bg-[#2D365E] text-white px-3 py-1 rounded-lg text-[9px] font-black tracking-widest">TARGET TELEMETRY: NH3</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[9px] font-black text-orange-500 uppercase block mb-1">Warning Trigger (PPM)</label>
                  <input type="number" value={config.gasThresholds.NH3} onChange={(e) => setConfig({...config, gasThresholds: { ...config.gasThresholds, NH3: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-orange-200 outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Clean Air Rs (Ohm)</label>
                  <input type="number" value={config.gasCalibration.tgs2602.cleanAirRs} onChange={(e) => setConfig({...config, gasCalibration: { ...config.gasCalibration, tgs2602: { ...config.gasCalibration.tgs2602, cleanAirRs: Number(e.target.value) } }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Air Factor Constant</label>
                  <input type="number" step="0.01" value={config.gasCalibration.tgs2602.airFactor} onChange={(e) => setConfig({...config, gasCalibration: { ...config.gasCalibration, tgs2602: { ...config.gasCalibration.tgs2602, airFactor: Number(e.target.value) } }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Load Resistor RL (Ohm)</label>
                  <input type="number" value={config.gasCalibration.tgs2602.loadResistor} onChange={(e) => setConfig({...config, gasCalibration: { ...config.gasCalibration, tgs2602: { ...config.gasCalibration.tgs2602, loadResistor: Number(e.target.value) } }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border outline-none" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* PANEL 2: THERMODYNAMIC & LIQUID BLOCKS */}
        <div className="bg-white rounded-[45px] p-10 shadow-2xl border border-gray-100">
          <div className="flex items-center gap-3 mb-8 border-b pb-6">
            <Thermometer className="text-[#2D365E]" size={28} />
            <h2 className="text-2xl font-black uppercase tracking-tighter">Thermodynamic & Liquid Characterization Units</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* CARD SUHU */}
            <div className="p-6 bg-[#F4F7FE] rounded-[35px] border border-gray-200/50 flex flex-col justify-between">
              <div>
                <p className="font-black text-sm uppercase tracking-wider text-[#2D365E] border-b pb-2 mb-4 flex items-center gap-2">
                  <Database size={14} className="text-gray-400" /> Temperature Configuration
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-indigo-600 uppercase block mb-1">Dasbor Display Label (TA Opt)</label>
                    <select
                      value={config.temp.displayMode || 'body'}
                      onChange={(e) => setConfig({...config, temp: { ...config.temp, displayMode: e.target.value }})}
                      className="w-full bg-white rounded-xl p-3 font-black text-xs text-indigo-600 border border-indigo-200 outline-none cursor-pointer"
                    >
                      <option value="body">Transformer Body Temperature</option>
                      <option value="oil">Oil Transformer Temperature</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Normal to Caution (°C)</label>
                    <input type="number" value={config.temp.warn} onChange={(e) => setConfig({...config, temp: { ...config.temp, warn: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-gray-200 outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Caution to Critical (°C)</label>
                    <input type="number" value={config.temp.crit} onChange={(e) => setConfig({...config, temp: { ...config.temp, crit: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-gray-200 outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-emerald-600 uppercase block mb-1">MAX31865 Hardware Offset</label>
                    <input type="number" step="0.01" value={config.sensorOffsets.rtdOffset} onChange={(e) => setConfig({...config, sensorOffsets: { ...config.sensorOffsets, rtdOffset: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-black text-sm text-emerald-600 border border-emerald-200 outline-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* CARD HUMIDITY */}
            <div className="p-6 bg-[#F4F7FE] rounded-[35px] border border-gray-200/50 flex flex-col justify-between">
              <div>
                <p className="font-black text-sm uppercase tracking-wider text-[#2D365E] border-b pb-2 mb-4 flex items-center gap-2">
                  <Wind size={14} className="text-gray-400" /> Humidity (SHT20)
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Dry to Normal Limit (%)</label>
                    <input type="number" value={config.humidity.dry} onChange={(e) => setConfig({...config, humidity: { ...config.humidity, dry: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-gray-200 outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Normal to Wet Limit (%)</label>
                    <input type="number" value={config.humidity.wet} onChange={(e) => setConfig({...config, humidity: { ...config.humidity, wet: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-gray-200 outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-emerald-600 uppercase block mb-1">SHT20 Software Hum Offset</label>
                    <input type="number" step="0.01" value={config.sensorOffsets.shtHumOffset} onChange={(e) => setConfig({...config, sensorOffsets: { ...config.sensorOffsets, shtHumOffset: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-black text-sm text-emerald-600 border border-emerald-200 outline-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* CARD WARNA MINYAK */}
            <div className="p-6 bg-[#F4F7FE] rounded-[35px] border border-gray-200/50 flex flex-col justify-between">
              <div>
                <p className="font-black text-sm uppercase tracking-wider text-[#2D365E] border-b pb-2 mb-4 flex items-center gap-2">
                  <Droplets size={14} className="text-gray-400" /> Oil Color (TCS34725)
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Normal to Caution (%)</label>
                    <input type="number" value={config.oil.warn} onChange={(e) => setConfig({...config, oil: { ...config.oil, warn: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-gray-200 outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Caution to Critical (%)</label>
                    <input type="number" value={config.oil.crit} onChange={(e) => setConfig({...config, oil: { ...config.oil, crit: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-bold text-sm text-[#2D365E] border border-gray-200 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8px] font-black text-emerald-600 uppercase block mb-1">VAL_BENING (Pristine)</label>
                      <input type="number" value={config.oilColorCalibration.valBening} onChange={(e) => setConfig({...config, oilColorCalibration: { ...config.oilColorCalibration, valBening: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-2.5 font-black text-xs text-emerald-600 border border-emerald-200 outline-none" />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-emerald-600 uppercase block mb-1">VAL_HITAM (Opaque)</label>
                      <input type="number" value={config.oilColorCalibration.valHitam} onChange={(e) => setConfig({...config, oilColorCalibration: { ...config.oilColorCalibration, valHitam: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-2.5 font-black text-xs text-emerald-600 border border-emerald-200 outline-none" />
                    </div>
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
            <h2 className="text-2xl font-black uppercase tracking-tighter">Water Level & Substation Flood Mitigation</h2>
          </div>
          <div className="p-8 bg-[#F4F7FE] rounded-[35px] border border-gray-200/50">
            <p className="font-black text-xs uppercase tracking-widest text-[#2D365E] mb-6 flex items-center gap-2">
              <Home size={14} className="text-gray-400" /> Transducer Block: JSN-SR04T Ultrasonic
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1.5">Sensor Height Baseline (CM)</label>
                <input type="number" value={config.flood.groundDistance} onChange={(e) => setConfig({...config, flood: { ...config.flood, groundDistance: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-black text-sm text-[#2D365E] border border-gray-200 outline-none" />
              </div>
              <div>
                {/* 🌟 FIX VISUAL LABELS: Satuan diubah menjadi (CM) agar sinkron dengan kalkulasi dasbor baru */}
                <label className="block text-[9px] font-black text-orange-500 uppercase mb-1.5">Caution Threshold Trigger (CM)</label>
                <input type="number" value={config.flood.warnLevel} onChange={(e) => setConfig({...config, flood: { ...config.flood, warnLevel: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-black text-sm text-[#2D365E] border border-orange-200 outline-none" />
              </div>
              <div>
                {/* 🌟 FIX VISUAL LABELS: Satuan diubah menjadi (CM) agar sinkron dengan kalkulasi dasbor baru */}
                <label className="block text-[9px] font-black text-rose-500 uppercase mb-1.5">Danger Threshold Trigger (CM)</label>
                <input type="number" value={config.flood.critLevel} onChange={(e) => setConfig({...config, flood: { ...config.flood, critLevel: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-black text-sm text-[#2D365E] border border-rose-200 outline-none" />
              </div>
              <div>
                <label className="block text-[9px] font-black text-emerald-600 uppercase mb-1.5">Ultrasonic Software Offset (CM)</label>
                <input type="number" step="0.1" value={config.sensorOffsets.waterLevelOffset} onChange={(e) => setConfig({...config, sensorOffsets: { ...config.sensorOffsets, waterLevelOffset: Number(e.target.value) }})} className="w-full bg-white rounded-xl p-3 font-black text-sm text-emerald-600 border border-emerald-200 outline-none" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}