'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from "./components/Sidebar";
import { Toaster } from 'react-hot-toast'; // Import Toaster
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <html lang="en">
      <body suppressHydrationWarning className="bg-[#F4F7FE]">
        {/* Container untuk notifikasi global */}
        <Toaster 
          position="top-right" 
          reverseOrder={false} 
          toastOptions={{
            // Styling default agar senada dengan UI myDGA
            duration: 5000,
            style: {
              borderRadius: '20px',
              padding: '16px',
              fontWeight: 'bold',
              fontFamily: 'inherit',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            },
          }}
        />

        <div className="flex min-h-screen">
          {!isLoginPage && (
            <div className="w-80 flex-shrink-0">
               <Sidebar />
            </div>
          )}

          <main className="flex-grow bg-[#F4F7FE] overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}