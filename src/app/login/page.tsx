'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  
  // States untuk manajemen input dan loading
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 1. Eksekusi Login ke Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) {
        // Tampilkan pesan error jika kredensial tidak valid[cite: 2]
        setError('Invalid login credentials. Please check your email and password.');
        setIsLoading(false);
      } else if (data.user) {
        // 2. Refresh router untuk memastikan session terbaru terdaftar di sisi server[cite: 2]
        router.refresh();
        
        // 3. JURUS FINAL: Redirect langsung ke path /dashboard dengan sedikit jeda
        // agar cookie session sempat tertanam sempurna di browser[cite: 2]
        setTimeout(() => {
          window.location.href = '/dashboard'; 
        }, 500);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans">
      
      {/* Background Image Page Login[cite: 2] */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-1000" 
        style={{ backgroundImage: "url('/bg-login.png')" }} 
      >
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* Container Utama UI myDGA[cite: 2] */}
      <div className="relative z-10 flex w-full max-w-[1280px] px-16 items-center justify-center gap-24 transition-all duration-300">
        
        {/* SISI KIRI: Branding Section[cite: 2] */}
        <div className="flex flex-col items-center w-[500px] text-center group">
          
          <div className="flex items-center justify-center gap-8 mb-12 opacity-90 group-hover:opacity-100 transition-opacity duration-500">
            <div className="relative w-32 h-20 hover:scale-105 transition-transform duration-300">
              <Image src="/logo-telkom.png" alt="Telkom University" fill className="object-contain" />
            </div>

            <div className="h-12 w-[2px] bg-white/20"></div>

            <div className="relative w-32 h-20 hover:scale-105 transition-transform duration-300">
              <Image src="/logo-sisgrid.png" alt="Sisgrid Laboratory" fill className="object-contain" />
            </div>
          </div>
          
          <div className="flex flex-col items-center">
             <div className="relative w-64 h-64 mb-6 drop-shadow-2xl hover:scale-110 transition-transform duration-500 ease-in-out cursor-pointer">
                <Image src="/logo-dga.png" alt="myDGA" fill className="object-contain" />
             </div>
             
             <div className="space-y-0 text-white select-none">
                <h2 className="text-3xl font-medium tracking-tight leading-tight">
                  Dissolved Gas Analysis
                </h2>
                <h2 className="text-3xl font-medium tracking-tight leading-tight">
                  Transformer Monitoring
                </h2>
             </div>
          </div>
          
          <p className="text-white italic text-xs mt-24 font-light opacity-60">
            Created by Sisgrid Laboratory Research Team
          </p>
        </div>

        {/* SISI KANAN: Login Card[cite: 2] */}
        <div className={`bg-white rounded-[45px] p-18 w-full max-w-[630px] shadow-2xl flex-shrink-0 border border-gray-100 py-20 transform transition-all duration-500 hover:shadow-[0_20px_50px_rgba(45,54,94,0.15)] ${error ? 'border-red-200' : ''}`}>
          
          <div className="mb-8 px-6 text-left">
            <h2 className="text-5xl font-bold text-[#2D365E] mb-4 tracking-tight">Welcome!</h2>
            <p className="text-[#2D365E] text-lg font-normal leading-tight opacity-80">
              Enter the username and password according to the registered account.
            </p>
          </div>

          {/* Alert Error jika login gagal[cite: 2] */}
          {error && (
            <div className="mx-6 mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={20} />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6 px-6">
            <div className="space-y-2 group text-left">
              <label className="text-[#2D365E] font-bold text-lg block ml-1">Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Input your email" 
                className={`w-full px-6 py-4 rounded-[12px] border-[3px] outline-none text-[#2D365E] text-lg font-medium transition-all ${error ? 'border-red-400 bg-red-50/30' : 'border-[#2D365E] focus:border-[#4A55A2] hover:border-[#4A55A2]'}`}
              />
            </div>

            <div className="space-y-2 relative group text-left">
              <label className="text-[#2D365E] font-bold text-lg block ml-1">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Input Password" 
                  className={`w-full px-6 py-4 rounded-[12px] border-[3px] outline-none text-[#2D365E] text-lg font-medium transition-all ${error ? 'border-red-400 bg-red-50/30' : 'border-[#2D365E] focus:border-[#4A55A2] hover:border-[#4A55A2]'}`}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-[#2D365E] opacity-60 hover:opacity-100 p-1"
                >
                  {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-[#2D365E] text-white py-4 rounded-full text-2xl font-bold hover:bg-[#1B2559] transition-all mt-6 shadow-xl active:scale-[0.98] flex justify-center items-center"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Login'
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}