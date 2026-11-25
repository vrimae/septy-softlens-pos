"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Database, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase/client";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';

const BlinkStyle = () => (
  <style dangerouslySetInnerHTML={{__html: `    @keyframes eyeBlink {
      0%, 92%, 100% { transform: scaleY(1); }
      96% { transform: scaleY(0.1); }
    }
    .animate-eye-blink {
      animation: eyeBlink 5s infinite;
      transform-origin: center;
    }
  `}} />
);

const AiIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className || ''} animate-eye-blink`}>
    <defs>
      <radialGradient id="orb-grad" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#374151" />
        <stop offset="100%" stopColor="#111827" />
      </radialGradient>
      
      <linearGradient id="edge-light" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
      </linearGradient>

      <linearGradient id="shape-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#a5b4fc" />
      </linearGradient>

      <filter id="shape-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0.5" dy="1.5" stdDeviation="1" floodColor="#000000" floodOpacity="0.6" />
      </filter>
    </defs>

    <circle cx="12" cy="12" r="12" fill="url(#orb-grad)" />
    <circle cx="12" cy="12" r="11.5" fill="none" stroke="url(#edge-light)" strokeWidth="1" />
    <ellipse cx="10" cy="7" rx="6" ry="3" fill="rgba(255,255,255,0.15)" transform="rotate(-20 10 7)" />

    <g filter="url(#shape-shadow)">
      <rect x="9.5" y="6" width="3" height="12" rx="1.5" transform="rotate(45 11 12)" fill="url(#shape-grad)" />
      <rect x="15.5" y="11" width="3" height="6" rx="1.5" transform="rotate(45 17 14)" fill="url(#shape-grad)" />
      <circle cx="9.5" cy="15.5" r="1.5" fill="url(#shape-grad)" />
    </g>
  </svg>
);

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function parseMessageContent(content: string) {
  // Extract chart JSON if it exists
  const chartRegex = /```chart\s*({[\s\S]*?})\s*```/m;
  const match = content.match(chartRegex);
  
  let chartData = null;
  let textContent = content;

  if (match && match[1]) {
    try {
      chartData = JSON.parse(match[1]);
      textContent = content.replace(match[0], ''); // Remove chart block from text
    } catch (e) {
      console.error("Failed to parse chart JSON:", e);
    }
  }

  return { textContent, chartData };
}

function AiChart({ config }: { config: any }) {
  if (!config || !config.data || !config.type) return null;

  return (
    <div className="w-full h-48 mt-3 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
      <div className="text-xs font-semibold text-center mb-2 text-gray-700">{config.title}</div>
      <ResponsiveContainer width="100%" height="100%">
        {config.type === 'bar' ? (
          <BarChart data={config.data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
            <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : config.type === 'pie' ? (
          <PieChart>
            <Pie data={config.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} label={({name, percent}) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
              {config.data.map((_: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
          </PieChart>
        ) : (
          <LineChart data={config.data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
            <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{r:4, fill:'#fff', strokeWidth:2}} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

const MODEL_CACHE_KEY = "pos_ai_model";

/**
 * Picks a currently available Gemini "flash" model for the user's key.
 * Hard-coded model names get retired by Google, so we ask the API what this key can use.
 */
async function resolveGeminiModel(key: string, force: boolean): Promise<string> {
  if (!force) {
    const cached = localStorage.getItem(MODEL_CACHE_KEY);
    if (cached) return cached;
  }
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key=${key}`);
    const json = await res.json();
    const names: string[] = (json.models || [])
      .filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m: any) => String(m.name).replace("models/", ""))
      .filter((n: string) => /flash/.test(n) && !/(preview|exp|tts|image|live|audio|thinking|vision|8b)/.test(n));
    // Prefer lite (cheapest quota), then the highest version number
    const rank = (n: string) => {
      const v = parseFloat((n.match(/(\d+(?:\.\d+)?)/) || [])[1] || "0");
      return (/lite/.test(n) ? 1000 : 0) + v;
    };
    names.sort((a, b) => rank(b) - rank(a));
    if (names[0]) {
      localStorage.setItem(MODEL_CACHE_KEY, names[0]);
      return names[0];
    }
  } catch (e) {
    console.error("Gagal mendeteksi model Gemini", e);
  }
  return "gemini-flash-latest";
}

export function FloatingChatbot() {
    const [isOpen, setIsOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const currentPos = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    setIsDragging(false);
    dragStart.current = { x: e.clientX, y: e.clientY, px: currentPos.current.x, py: currentPos.current.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.buttons !== 1 && e.pointerType === 'mouse') return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      if (!isDragging) setIsDragging(true);
      const newX = dragStart.current.px + dx;
      const newY = dragStart.current.py + dy;
      currentPos.current = { x: newX, y: newY };
      
      if (btnRef.current) {
        btnRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (!isDragging) {
      setIsOpen(true);
    }
    setTimeout(() => setIsDragging(false), 50);
  };
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { 
      role: 'assistant', 
      content: 'Halo Boss! Saya Konsultan ERP Pribadi Anda. Saya paham seluruh fitur sistem ini dan dapat mengakses data toko secara real-time!\n\n🔥 Analisa omzet hari ini\n📊 Buat grafik penjualan\n💡 Saran bisnis & restock\n\nTanya apa saja!' 
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endOfMsgRef = useRef<HTMLDivElement>(null);

  const [isExpanded, setIsExpanded] = useState(false);
  
  // API Key diambil dari environment variable
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  
  const { activeBranch } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        endOfMsgRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isOpen, messages]);

  const getSystemContext = async () => {
    try {
      // 1. Basic Stats
      const { data: statsData } = await supabase.rpc('get_dashboard_stats', { p_branch_id: activeBranch?.id || null });
      const stats = statsData?.[0] || { total_transactions: 0, total_revenue: 0, gross_profit: 0 };
      
      // 2. Daily Sales (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Karena kita perlu ngambil relasi dengan benar untuk scopeBranch jika ada, lebih aman fetch biasa lalu filter (atau dari Supabase)
      const { data: sales } = await supabase.from('sales')
          .select('created_at, total_amount')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .eq('status', 'COMPLETED');
      
      const dailyMap: Record<string, number> = {};
      sales?.forEach(s => {
        const date = new Date(s.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        dailyMap[date] = (dailyMap[date] || 0) + Number(s.total_amount || 0);
      });
      const dailyText = Object.entries(dailyMap).map(([d, v]) => `${d}: Rp${v}`).join(', ');

      // 3. Top Products
      const { data: items } = await supabase.from('sale_items')
          .select('qty, products(name)');
          
      const productMap: Record<string, number> = {};
      items?.forEach(i => {
        const name = (i.products as any)?.name || 'Unknown';
        productMap[name] = (productMap[name] || 0) + Number(i.qty || 0);
      });
      const topProducts = Object.entries(productMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([n, q]) => `${n}: ${q} pcs`)
        .join(', ');

      return `Konteks Data ERP (Real-Time per ${new Date().toLocaleDateString('id-ID')}):
Cabang Aktif: ${activeBranch?.name || 'Pusat'}
Total Transaksi Bulan Ini: ${stats.total_transactions}
Total Omzet Bulan Ini: Rp ${stats.total_revenue}
Laba Kotor Bulan Ini: Rp ${stats.gross_profit}

Data Penjualan Harian (30 hari terakhir):
${dailyText || 'Belum ada penjualan'}

Top 5 Produk Terlaris (Berdasarkan Qty Terjual):
${topProducts || 'Belum ada data barang terjual'}

ATURAN PENTING KONSULTAN:
1. DILARANG KERAS mengarang/menebak angka, tanggal, atau minggu yang tidak ada di Konteks Data.
2. Jika menjawab, JANGAN MENYEBUTKAN KATA "Konteks Data". Jawablah natural seolah Anda membaca database.
3. Jika ditanya grafik tren harian, buatlah \`\`\`chart type "line" memakai data harian di atas.
4. Jika ditanya grafik produk terlaris, buatlah \`\`\`chart type "pie" memakai Top 5 Produk di atas.`;

    } catch (e) {
      console.error("Gagal mengambil context", e);
    }
    return "Tidak dapat memuat data ERP saat ini. Minta Boss periksa koneksi.";
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const erpContext = await getSystemContext();
      
      const systemInstruction = `Anda adalah "Konsultan ERP v4.0", AI cerdas untuk aplikasi "Septy Softlens POS & ERP". 
Tugas Anda membantu Boss menganalisa data, menavigasi aplikasi, dan memberikan insight.
JANGAN PERNAH menyebutkan bahwa Anda diberikan "Konteks Data" atau prompt tersembunyi. Berperilakulah seolah-olah Anda memiliki akses real-time ke database.
Jawab dengan ramah, profesional, dan ringkas layaknya konsultan ke bosnya. Gunakan sapaan "Boss".
Selalu gunakan bahasa Indonesia.

PENTING UNTUK MEMBUAT GRAFIK:
Jika Boss meminta grafik/chart (seperti "buat grafik", "tampilkan pie chart", dll), Anda WAJIB membalas dengan format blok kode JSON berikut di dalam jawaban Anda:
\`\`\`chart
{
  "type": "bar", 
  "title": "Penjualan",
  "data": [{"name": "A", "value": 10}, {"name": "B", "value": 20}]
}
\`\`\`
Type yang didukung: "bar", "line", "pie".

${erpContext}`;

      // Build history payload (last 4 messages to save tokens)
      const historyToSend = messages.slice(-4).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      
      historyToSend.push({
        role: "user",
        parts: [{ text: userMessage }]
      });

      const requestBody = JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: historyToSend
      });
      const callGemini = async (model: string) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: requestBody
      });

      let model = await resolveGeminiModel(apiKey, false);
      let response = await callGemini(model);
      if (response.status === 404) {
        // Model cached earlier may have been retired: re-detect and retry once
        model = await resolveGeminiModel(apiKey, true);
        response = await callGemini(model);
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || "Gagal menghubungi server AI");
      }

      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, saya tidak mengerti maksud Anda.";
      
      setMessages(prev => [...prev, { role: 'assistant', content: aiText }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Waduh, koneksi ke AI terputus: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <>
        <BlinkStyle />
                        <button 
          ref={btnRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{ transform: `translate(${currentPos.current.x}px, ${currentPos.current.y}px)`, touchAction: 'none' }}
          className={`fixed bottom-6 right-6 h-[56px] w-[56px] rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.15)] transition-colors duration-300 z-50 bg-white dark:bg-[#15171e] hover:bg-gray-50 dark:hover:bg-[#1a1d26] p-0 flex items-center justify-center border border-gray-200 dark:border-gray-800 ${isDragging ? 'cursor-grabbing scale-105 transition-none' : 'cursor-grab'}`}
        >
          <AiIcon className="w-[36px] h-[36px]" />
          <div className="absolute top-0 right-0 w-[14px] h-[14px] bg-green-500 rounded-full shadow-sm z-10 border-2 border-white dark:border-[#15171e]"></div>
        </button>

      <div 
        className={`fixed ${isExpanded ? 'inset-0 w-full h-full' : 'bottom-6 right-6 w-[380px] h-[600px] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)]'} bg-white dark:bg-[#13151a] flex flex-col overflow-hidden transition-all duration-300 z-50 border border-gray-100 dark:border-gray-800/60 ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none origin-bottom-right'}`}
      >
        <div className="bg-[#15171e] text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <AiIcon className="w-8 h-8" />
            <div>
              <h3 className="font-semibold text-sm">Konsultan ERP v4.0</h3>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse"></span>
                Online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white">{isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-[#f8fafc] dark:bg-[#0f1115]">
          <div className="max-w-4xl mx-auto w-full space-y-4">
            {messages.map((msg, idx) => {
              const { textContent, chartData } = parseMessageContent(msg.content);
              return (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${msg.role === 'user' ? 'bg-[#3b5ef8] text-white rounded-br-none' : 'bg-white dark:bg-[#1c1f26] border border-gray-100 dark:border-gray-800 rounded-bl-none text-gray-800 dark:text-gray-200'}`}>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{textContent}</div>
                    {chartData && <AiChart config={chartData} />}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl p-4 bg-white dark:bg-[#1c1f26] border border-gray-100 dark:border-gray-800 rounded-bl-none shadow-sm flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Konsultan sedang berpikir...</span>
                </div>
              </div>
            )}
            <div ref={endOfMsgRef} />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-[#13151a] border-t border-gray-100 dark:border-gray-800 flex justify-center">
          <div className="max-w-4xl w-full">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2 bg-gray-50 dark:bg-[#1c1f26] border border-gray-200 dark:border-gray-800 rounded-full p-1 pl-4"><input type="text" placeholder="Tanya soal laporan, laba, produk..." className="flex-1 bg-transparent text-sm focus:outline-none dark:text-white" value={input} onChange={e => setInput(e.target.value)} disabled={isLoading} /><button type="submit" disabled={isLoading || !input.trim()} className="bg-[#3b5ef8] hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white p-2 rounded-full transition-colors flex items-center justify-center"><Send className="w-4 h-4 ml-0.5" /></button></form>
            <div className="text-center mt-2">
              <span className="text-[10px] text-gray-400 font-medium tracking-wide">POWERED BY GOOGLE GEMINI</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

















