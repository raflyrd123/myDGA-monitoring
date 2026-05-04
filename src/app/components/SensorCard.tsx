import React from 'react';

interface SensorCardProps {
  title: string;
  gasName: string;
  value: number;
  unit: string;
  status: 'Good' | 'Bad';
  color: string;
  icon: React.ReactNode;
}

export const SensorCard = ({ title, gasName, value, unit, status, color, icon }: SensorCardProps) => {
  const isGood = status === 'Good';

  return (
    <div className="bg-white rounded-[20px] p-8 shadow-sm border border-gray-100 relative overflow-hidden flex flex-col min-h-[320px]">
      
      {/* Top Section: Icon & Badge */}
      <div className="flex justify-between items-start mb-[-20px]">
<div className="w-20 h-20 rounded-[16px] flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: color }}>
  {/* Gunakan wrapper div untuk mengatur ukuran icon secara paksa dan aman */}
  <div className="scale-[2]"> 
    {icon}
  </div>
</div>

        <div className={`px-6 py-2 rounded-full ${isGood ? 'bg-[#F1F9F5]' : 'bg-[#FFF1F1]'}`}>
          <span className={`text-xl font-bold ${isGood ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
            {status}
          </span>
        </div>
      </div>
      
      {/* Content Section: Label & Value */}
      <div className="flex-grow flex flex-col justify-center">
        <p className="text-[#717171] text-2xl font-bold mb-[-5px]">
          {title} ({gasName}) Level
        </p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-[40px] font-[1000] text-[#1A1A1A] tracking-tighter leading-none">
            {value}
          </h3>
          <span className="text-[40px] font-[1000] text-[#1A1A1A]">
            {unit}
          </span>
        </div>
      </div>

      {/* Bottom Line Indicator */}
      <div 
        className="absolute bottom-4 left-6 right-6 h-2 rounded-full" 
        style={{ backgroundColor: color }}
      ></div>
    </div>
  );
};