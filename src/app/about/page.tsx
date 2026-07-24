'use client';

import React from 'react';
import Image from 'next/image';

export default function AboutPage() {
  const team = [
    {
      name: 'Muhammad Kodrat',
      role: 'Lecturer & Research Advisor',
      initials: 'MKO',
      image: '/images/team/kodrat.jpg',
      position: 'object-top'
    },
    {
      name: 'Rafly Rizqi Darmawansyah',
      role: 'Student & Research Assistant',
      initials: 'FLY',
      image: '/images/team/rafly.jpg',
      position: 'object-center'
    },
    {
      name: 'Abu Bakar Shidiq',
      role: 'Student & Research Assistant',
      initials: 'ABU',
      image: '/images/team/abu.jpg',
      position: 'object-center'
    },
    {
      name: 'Devin Marva Kusuma',
      role: 'Student & Research Assistant',
      initials: 'DEV',
      image: '/images/team/devin.jpg',
      position: 'object-center'
    },
    {
      name: 'Devdan Wisesa Putranto',
      role: 'Student & Research Assistant',
      initials: 'DAI',
      image: '/images/team/devdan.jpg',
      position: 'object-center'
    },
    {
      name: 'Nicholas Sandy Kurniawan',
      role: 'Student & Research Assistant',
      initials: 'ION',
      image: '/images/team/nicholas.jpg',
      position: 'object-center'
    },
    {
      name: 'Erza Nugraha',
      role: 'Student & Research Assistant',
      initials: 'GSY',
      image: '/images/team/erza.jpg',
      position: 'object-center'
    }
  ];

  return (
    <div className="p-10 text-[#2D365E] min-h-screen flex flex-col items-center">
      
      {/* HEADER & ABOUT MYDGA */}
      <div className="mb-16 w-full flex flex-col items-center">
        <h1 className="text-5xl font-black uppercase tracking-tighter mb-10 w-full text-left">About myDGA</h1>
        
        <div className="bg-white rounded-[50px] p-12 shadow-2xl border border-gray-50 max-w-5xl w-full text-center">
          <h2 className="text-2xl font-black mb-8 uppercase tracking-widest text-[#2D365E]">Overview</h2>
          <div className="space-y-6 text-xl font-medium leading-relaxed text-gray-500 text-left md:text-center">
            <p>
              <span className="font-bold text-[#2D365E]">myDGA</span> is a power transformer health monitoring system based on Digital Twin technology, developed through intensive research at the <span className="font-bold text-[#2D365E]">SISGRID Laboratory</span>. This research focuses on early internal transformer fault detection to prevent catastrophic failures in electric power transmission systems.
            </p>
            <p>
              By integrating real-time monitoring of temperature, humidity, multi-gas dissolved concentrations, oil color degradation, and water level/flood status via LoRa wireless communication and cloud database infrastructure, this system provides accurate asset condition analytics without requiring continuous manual field testing.
            </p>
            
            <div className="bg-gray-50 p-10 rounded-[40px] border border-gray-100 mt-8 text-left">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 text-center">System Features:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12 text-sm font-bold text-[#2D365E]">
                <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-[#2ac7c7] rounded-full" /> Real-Time Telemetry Dashboard</div>
                <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-[#2ac7c7] rounded-full" /> Automated Duval Triangle Fault Diagnosis</div>
                <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-[#2ac7c7] rounded-full" /> Multi-Gas Trend Analytics (H2, CO, CH4, etc.)</div>
                <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-[#2ac7c7] rounded-full" /> Transformer Temperature & Humidity Tracking</div>
                <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-[#2ac7c7] rounded-full" /> Transformer Oil Color Degradation Monitoring</div>
                <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-[#2ac7c7] rounded-full" /> Ultrasonic Flood Mitigation & Float Switch Alert</div>
                <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-[#2ac7c7] rounded-full" /> LoRa Network QoS & Latency Analytics</div>
                <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-[#2ac7c7] rounded-full" /> Monthly Archive Reporting & CSV Export</div>
                <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-[#2ac7c7] rounded-full" /> Real-Time Email Alerts via SMTP Dispatcher</div>
                <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-[#2ac7c7] rounded-full" /> Dynamic Calibration & Threshold Management</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* OUR TEAM SECTION */}
      <div className="mt-10 w-full">
        <h2 className="text-3xl font-black uppercase tracking-tighter mb-10 ml-4">Our Team</h2>
        
        <div className="flex w-full h-[580px] gap-2 overflow-hidden px-2">
          {team.map((member, index) => (
            <div 
              key={index}
              className="group relative flex-1 min-w-[60px] h-full rounded-[45px] overflow-hidden transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1) hover:flex-[6] shadow-2xl border border-white/10 cursor-pointer bg-[#1a1f35]"
            >
              <div className="absolute inset-0 z-10">
                <div className="absolute inset-0 bg-[#2D365E]/60 group-hover:bg-transparent transition-all duration-700 z-20" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2D365E] via-transparent to-transparent opacity-90 z-20" />
                <Image 
                  src={member.image} 
                  alt={member.name} 
                  fill 
                  className={`object-cover ${member.position} transition-all duration-1000 grayscale-[0.3] group-hover:grayscale-0 group-hover:scale-105`}
                  unoptimized 
                />
              </div>

              <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 group-hover:opacity-0 transition-opacity duration-500">
                <p className="font-black text-white/80 text-xl tracking-tighter">{member.initials}</p>
              </div>

              <div className="absolute bottom-16 left-12 z-40 opacity-0 group-hover:opacity-100 transition-all duration-700 delay-300 translate-y-10 group-hover:translate-y-0 min-w-[600px]">
                <p className="text-[#2ac7c7] text-sm font-black uppercase tracking-[0.5em] mb-3 drop-shadow-md">
                  {member.role}
                </p>
                <h3 className="text-white text-5xl font-black uppercase tracking-tighter leading-none drop-shadow-2xl">
                  {member.name}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-24 mb-10 flex flex-col items-center opacity-30 gap-2">
        <div className="h-[1px] w-20 bg-[#2D365E] mb-2" />
        <p className="text-[9px] font-black uppercase tracking-[0.6em] text-[#2D365E]">
          SISGRID Laboratory • Power System Research Team • 2026
        </p>
      </div>
    </div>
  );
}
