'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  
  // States
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(''); // Menggunakan email sesuai standar Supabase Auth
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Logika Login Real menggunakan Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) {
        // Jika akun salah atau tidak terdaftar, tampilkan pesan error
        setError('Invalid login credentials. Please check your email and password.');
        setIsLoading(false);
      } else if (data.user) {
        // Jika berhasil, arahkan ke dashboard
        router.push('/');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans">
      
      {/* 1. Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-1000" 
        style={{ backgroundImage: "url('/bg-login.png')" }} 
      >
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* Container Utama */}
      <div className="relative z-10 flex w-full max-w-[1280px] px-16 items-center justify-center gap-24 transition-all duration-300">
        
        {/* SISI KIRI: Branding Section */}
        <div className="flex flex-col items-center w-[500px] text-center group">
          
{/* Logo Barisan Atas */}
<div className="flex items-center justify-center gap-8 mb-12 opacity-90 group-hover:opacity-100 transition-opacity duration-500">
  {/* Logo Telkom */}
  <div className="relative w-32 h-20 hover:scale-105 transition-transform duration-300">
    <Image src="/logo-telkom.png" alt="Telkom University" fill className="object-contain" />
  </div>

  {/* Garis Pembatas - Dibuat elemen terpisah agar kontrol jaraknya enak */}
  <div className="h-12 w-[2px] bg-white/20"></div>

  {/* Logo Sisgrid */}
  <div className="relative w-32 h-20 hover:scale-105 transition-transform duration-300">
    <Image src="/logo-sisgrid.png" alt="Sisgrid Laboratory" fill className="object-contain" />
  </div>
</div>
          
          {/* Logo Grafis DGA & Teks */}
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
          
          {/* Footer Text */}
          <p className="text-white italic text-xs mt-24 font-light opacity-60 hover:opacity-100 transition-opacity cursor-default">
            Created by Sisgrid Laboratory Research Team
          </p>
        </div>

        {/* SISI KANAN: Login Card */}
        <div className={`bg-white rounded-[45px] p-18 w-full max-w-[630px] shadow-2xl flex-shrink-0 border border-gray-100 py-20 transform transition-all duration-500 hover:shadow-[0_20px_50px_rgba(45,54,94,0.15)] ${error ? 'border-red-200' : ''}`}>
          
          <div className="mb-8">
            <h2 className="text-5xl font-bold text-[#2D365E] mb-4 tracking-tight">Welcome!</h2>
            <p className="text-[#2D365E] text-lg font-normal leading-tight opacity-80">
              Enter the username and password according to the registered account.
            </p>
          </div>

          {/* Alert Error Peringatan */}
          {error && (
            <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={20} />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2 group">
              <label className="text-[#2D365E] font-bold text-lg block ml-1 transition-colors group-focus-within:text-[#4A55A2]">Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Input your email" 
                className={`w-full px-6 py-4 rounded-[12px] border-[3px] outline-none text-[#2D365E] text-lg font-medium placeholder:text-gray-300 transition-all ${error ? 'border-red-400 bg-red-50/30' : 'border-[#2D365E] focus:border-[#4A55A2] focus:ring-4 focus:ring-[#4A55A2]/10 hover:border-[#4A55A2]'}`}
              />
            </div>

            <div className="space-y-2 relative group">
              <label className="text-[#2D365E] font-bold text-lg block ml-1 transition-colors group-focus-within:text-[#4A55A2]">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Input Password" 
                  className={`w-full px-6 py-4 rounded-[12px] border-[3px] outline-none text-[#2D365E] text-lg font-medium placeholder:text-gray-300 transition-all ${error ? 'border-red-400 bg-red-50/30' : 'border-[#2D365E] focus:border-[#4A55A2] focus:ring-4 focus:ring-[#4A55A2]/10 hover:border-[#4A55A2]'}`}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-[#2D365E] opacity-60 hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded-full"
                >
                  {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-[#2D365E] text-white py-4 rounded-full text-2xl font-bold hover:bg-[#1B2559] transition-all mt-6 shadow-xl active:scale-[0.98] hover:shadow-[0_10px_25px_rgba(45,54,94,0.3)] hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
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