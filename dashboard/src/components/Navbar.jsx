import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Home, LayoutDashboard, LogOut, LogIn, BarChart2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Navbar = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const userPrefix = localStorage.getItem('email')?.split('@')[0] || 'Parent';

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  return (
    <nav className="sticky top-4 z-50 px-4 md:px-8 pointer-events-none">
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-7xl mx-auto glass-card px-6 py-4 flex justify-between items-center pointer-events-auto"
      >
        <Link to="/" className="flex items-center gap-2 group">
          <motion.div 
            whileHover={{ rotate: 15 }}
            className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30"
          >
            <Shield className="text-white" size={22} />
          </motion.div>
          <div>
            <span className="text-xl font-black tracking-tight text-white block leading-none">ChildSafe</span>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Global Filter</span>
          </div>
        </Link>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-6 mr-6 border-r border-slate-800 pr-6">
            <NavLink to="/" icon={<Home size={18} />} label="Home" />
            <NavLink to="/results" icon={<BarChart2 size={18} />} label="Results" />
            {token && <NavLink to="/dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" />}
          </div>

          <div className="flex items-center gap-4">
            {token ? (
              <>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-white leading-none">{userPrefix}</span>
                  <span className="text-[10px] text-emerald-400 font-bold">Safe Mode Active</span>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  className="w-10 h-10 bg-slate-800 hover:bg-red-500/10 hover:text-red-500 text-slate-400 rounded-xl flex items-center justify-center transition-colors border border-slate-700"
                >
                   <LogOut size={18} />
                </motion.button>
              </>
            ) : (
              <Link to="/login">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="premium-button flex items-center gap-2 text-sm"
                >
                  <LogIn size={16} /> Parent Login
                </motion.button>
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </nav>
  );
};

const NavLink = ({ to, icon, label }) => (
  <Link to={to} className="flex items-center gap-2 text-slate-400 hover:text-white font-bold text-sm transition-colors group">
    <span className="text-slate-500 group-hover:text-indigo-400 transition-colors">{icon}</span>
    {label}
  </Link>
);

export default Navbar;