// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Activity, Image as ImageIcon, MessageSquare, 
  AlertCircle, ExternalLink, Clock, Filter, ChevronRight
} from 'lucide-react';

// Connect to your Flask Backend
const socket = io('http://localhost:5000');

export default function Dashboard() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ 
    totalBlocked: 0, 
    imagesBlurred: 0, 
    textBlurred: 0,
    status: 'Connected' 
  });
  const [loading, setLoading] = useState(true);

  const parentId = localStorage.getItem('parent_id') || '1';

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch(`http://localhost:5000/logs/${parentId}`);
        const data = await response.json();
        
        const imgCount = data.filter(l => l.category?.includes('Image')).length;
        const txtCount = data.filter(l => l.category?.includes('Text') || l.category?.includes('Content')).length;
        
        setLogs(data);
        setStats(prev => ({
          ...prev,
          totalBlocked: data.length,
          imagesBlurred: imgCount,
          textBlurred: txtCount
        }));
        setLoading(false);
      } catch (error) {
        console.error('Error fetching logs:', error);
        setLoading(false);
      }
    };

    fetchLogs();

    socket.on('new_alert', (data) => {
      setLogs(prev => [data, ...prev].slice(0, 50));
      
      const isImg = data.category?.includes('Image');
      const isTxt = data.category?.includes('Text') || data.category?.includes('Content');

      setStats(prev => ({
        ...prev,
        totalBlocked: prev.totalBlocked + 1,
        imagesBlurred: prev.imagesBlurred + (isImg ? 1 : 0),
        textBlurred: prev.textBlurred + (isTxt ? 1 : 0),
      }));
    });

    return () => socket.off('new_alert');
  }, [parentId]);

  return (
    <div className="pt-24 pb-20 px-4 md:px-8 max-w-7xl mx-auto min-h-screen">
      <header className="mb-12">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-4xl font-black text-white tracking-tight"
        >
          Security <span className="cool-gradient-text">Overview</span>
        </motion.h1>
        <p className="text-slate-500 font-medium mt-1">Real-time protection for your safe browsing environment.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard 
          label="Protection Status" 
          value={stats.status} 
          icon={<Activity />} 
          color="text-emerald-400" 
          bg="bg-emerald-500/10" 
          delay={0}
        />
        <StatCard 
          label="Images Blurred" 
          value={stats.imagesBlurred} 
          icon={<ImageIcon />} 
          color="text-indigo-400" 
          bg="bg-indigo-500/10" 
          delay={0.1}
        />
        <StatCard 
          label="Text Filtering" 
          value={stats.textBlurred} 
          icon={<MessageSquare />} 
          color="text-cyan-400" 
          bg="bg-cyan-500/10" 
          delay={0.2}
        />
        <StatCard 
          label="Total Threats" 
          value={stats.totalBlocked} 
          icon={<Shield />} 
          color="text-red-400" 
          bg="bg-red-500/10" 
          delay={0.3}
        />
      </div>

      {/* Main Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card overflow-hidden"
      >
        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <Filter size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">Activity Intelligence</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Live Monitoring</span>
          </div>
        </div>
        
        <div className="overflow-x-auto darkly-scroll">
          <table className="w-full text-left">
            <thead className="bg-slate-900/50 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">Event Time</th>
                <th className="px-8 py-5">Source Authority</th>
                <th className="px-8 py-5">Classification</th>
                <th className="px-8 py-5">Operation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  <motion.tr><td colSpan="4" className="text-center py-32 text-slate-500 animate-pulse font-bold tracking-widest">INITIALIZING LOGS...</td></motion.tr>
                ) : logs.length === 0 ? (
                  <motion.tr>
                    <td colSpan="4" className="text-center py-32">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-slate-700">
                          <Shield size={32} />
                        </div>
                        <p className="text-slate-500 italic font-medium">No safety events detected. System is secure.</p>
                      </div>
                    </td>
                  </motion.tr>
                ) : (
                  logs.map((log, index) => (
                    <motion.tr 
                      key={log.id || index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="hover:bg-indigo-500/5 transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <Clock size={14} className="text-slate-700" />
                          <span className="text-sm font-mono text-slate-400">{log.time || '00:00:00'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 max-w-md">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white truncate group-hover:text-indigo-400 transition-colors">
                            {log.url?.replace(/^https?:\/\//, '')}
                          </span>
                          <a href={log.url} target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-white">
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          log.category?.includes('Image') 
                            ? 'bg-indigo-500/10 text-indigo-400' 
                            : 'bg-cyan-500/10 text-cyan-400'
                        }`}>
                          {log.category?.includes('Image') ? <ImageIcon size={10} /> : <MessageSquare size={10} />}
                          {log.category}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          <span className="text-xs font-bold text-slate-300">Content Shielded</span>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({ label, value, icon, color, bg, delay }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -5 }}
      className="glass-card p-6 flex items-start justify-between group"
    >
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">{label}</p>
        <p className={`text-3xl font-black ${color} tracking-tight`}>{value}</p>
      </div>
      <div className={`w-12 h-12 ${bg} ${color} rounded-xl flex items-center justify-center border border-white/5 transition-transform group-hover:scale-110`}>
        {React.cloneElement(icon, { size: 22 })}
      </div>
    </motion.div>
  );
}

