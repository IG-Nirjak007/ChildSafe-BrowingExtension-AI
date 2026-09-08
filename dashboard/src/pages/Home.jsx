import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, Lock, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="relative overflow-hidden pt-32 pb-20 px-4 md:px-8">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full -z-10" />
      
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs mb-8 uppercase tracking-widest"
          >
            <Zap size={14} /> Secured by Trained AI Models
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black mb-6 leading-[1.1]"
          >
            Protecting Their <br />
            <span className="cool-gradient-text">Digital Innocence</span>
          </motion.h1>
          
          <motion.p 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
             className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-medium"
          >
            Real-time content guard that detects and blurs harmful text and explicit images 
            automatically, ensuring a safe browsing experience for your children.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <Link to="/login">
              <button className="premium-button flex items-center gap-3 text-lg py-4 px-10 group">
                Open Parent Portal <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <button className="px-10 py-4 glass-card font-bold hover:bg-slate-800/50 transition-colors border-slate-700">
              Download Extension
            </button>
          </motion.div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <FeatureCard 
            icon={<Eye className="text-cyan-400" size={24} />}
            title="Visual Shield"
            description="Our AI scans every image in milliseconds, blurring explicit content before it reaches the eyes."
          />
          <FeatureCard 
            icon={<Shield className="text-indigo-400" size={24} />}
            title="Text Sentinel"
            description="Deep analysis of webpage text to filter out toxicity, hate speech, and inappropriate conversations."
          />
          <FeatureCard 
            icon={<Lock className="text-emerald-400" size={24} />}
            title="Parental Control"
            description="Detailed dashboard with real-time logs, customizable thresholds, and safety reports."
          />
        </div>

        {/* Status Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="mt-32 glass-card p-12 text-center"
        >
          <div className="flex justify-center gap-12 flex-wrap">
             <StatItem value="88%" label="AI Accuracy" />
             <StatItem value="<800ms" label="Latency" />
             <StatItem value="24/7" label="Monitoring" />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <motion.div 
    whileHover={{ y: -10 }}
    className="glass-card p-8 group border-transparent hover:border-indigo-500/30 transition-all"
  >
    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-slate-800 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-colors">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
    <p className="text-slate-400 leading-relaxed text-sm font-medium">{description}</p>
  </motion.div>
);

const StatItem = ({ value, label }) => (
  <div>
    <div className="text-4xl font-black text-white mb-2">{value}</div>
    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</div>
  </div>
);

export default Home;
