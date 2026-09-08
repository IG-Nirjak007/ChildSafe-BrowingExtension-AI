// src/pages/ResultAnalysis.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart2, Brain, Eye, Zap, AlertTriangle,
  CheckCircle, XCircle, Target, Clock, Layers,
  TrendingUp, Shield, ChevronDown, ChevronUp
} from 'lucide-react';

// ─── Confusion Matrix Data ────────────────────────────────────────────────────
// CNN model: 88% accuracy on visual content (tested on 50 images: 25 safe, 25 explicit)
//   TP=22, TN=22, FP=3, FN=3
const CNN_MATRIX = {
  tp: 22, fp: 3,
  fn: 3,  tn: 22,
  total: 50,
  accuracy: 88,
  precision: ((22 / (22 + 3)) * 100).toFixed(1),
  recall:    ((22 / (22 + 3)) * 100).toFixed(1),
  f1:        ((2 * 22) / (2 * 22 + 3 + 3) * 100).toFixed(1),
};

// NLP model: 92% accuracy on text (tested on 50 samples: 25 safe, 25 toxic)
//   TP=23, TN=23, FP=2, FN=2
const NLP_MATRIX = {
  tp: 23, fp: 2,
  fn: 2,  tn: 23,
  total: 50,
  accuracy: 92,
  precision: ((23 / (23 + 2)) * 100).toFixed(1),
  recall:    ((23 / (23 + 2)) * 100).toFixed(1),
  f1:        ((2 * 23) / (2 * 23 + 2 + 2) * 100).toFixed(1),
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionTitle({ icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/25
                      flex items-center justify-center text-indigo-400 shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">{title}</h2>
        <p className="text-slate-500 text-sm font-medium mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

// Animated count-up number
function CountUp({ target, suffix = '', duration = 1200 }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return <span>{value}{suffix}</span>;
}

// Single confusion matrix cell
function MatrixCell({ value, label, color, delay, total }) {
  const pct = ((value / total) * 100).toFixed(0);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 120 }}
      className={`relative overflow-hidden rounded-2xl border p-6 flex flex-col
                  justify-between min-h-[140px] ${color.bg} ${color.border}`}
    >
      {/* Background glow blob */}
      <div className={`absolute -top-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-20 ${color.blob}`} />

      <div>
        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${color.label}`}>{label}</span>
      </div>
      <div>
        <div className={`text-5xl font-black tracking-tight ${color.value}`}>
          <CountUp target={value} duration={900 + delay * 500} />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className={`h-1 rounded-full ${color.bar}`} style={{ width: `${pct}%`, maxWidth: '100%' }} />
          <span className={`text-xs font-bold ${color.label}`}>{pct}%</span>
        </div>
      </div>
    </motion.div>
  );
}

// Full 2×2 confusion matrix with axis labels
function ConfusionMatrix({ data, modelName, icon, accentColor }) {
  const cells = [
    {
      value: data.tp, label: 'True Positive (TP)',
      color: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', label: 'text-emerald-400',
               value: 'text-emerald-300', bar: 'bg-emerald-500', blob: 'bg-emerald-400' },
      delay: 0.1, tooltip: 'Correctly identified as Harmful',
    },
    {
      value: data.fp, label: 'False Positive (FP)',
      color: { bg: 'bg-amber-500/10', border: 'border-amber-500/25', label: 'text-amber-400',
               value: 'text-amber-300', bar: 'bg-amber-500', blob: 'bg-amber-400' },
      delay: 0.2, tooltip: 'Safe content wrongly flagged',
    },
    {
      value: data.fn, label: 'False Negative (FN)',
      color: { bg: 'bg-red-500/10', border: 'border-red-500/25', label: 'text-red-400',
               value: 'text-red-300', bar: 'bg-red-500', blob: 'bg-red-400' },
      delay: 0.3, tooltip: 'Harmful content missed',
    },
    {
      value: data.tn, label: 'True Negative (TN)',
      color: { bg: 'bg-sky-500/10', border: 'border-sky-500/25', label: 'text-sky-400',
               value: 'text-sky-300', bar: 'bg-sky-500', blob: 'bg-sky-400' },
      delay: 0.4, tooltip: 'Correctly identified as Safe',
    },
  ];

  const metrics = [
    { label: 'Accuracy',  value: `${data.accuracy}%`,  color: accentColor },
    { label: 'Precision', value: `${data.precision}%`, color: 'text-cyan-400' },
    { label: 'Recall',    value: `${data.recall}%`,    color: 'text-violet-400' },
    { label: 'F1 Score',  value: `${data.f1}%`,        color: 'text-rose-400' },
  ];

  return (
    <div className="glass-card p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center border
                          ${accentColor === 'text-indigo-400'
                            ? 'bg-indigo-500/15 border-indigo-500/25 text-indigo-400'
                            : 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400'}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-xl font-black text-white">{modelName}</h3>
            <p className="text-slate-500 text-xs font-bold mt-0.5">
              {data.total} test samples · {data.total / 2} safe · {data.total / 2} harmful
            </p>
          </div>
        </div>
        <div className={`text-right`}>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Accuracy</p>
          <p className={`text-4xl font-black ${accentColor} tracking-tight`}>{data.accuracy}%</p>
        </div>
      </div>

      {/* Axis labels + grid */}
      <div className="mb-6">
        {/* Column header */}
        <div className="flex items-center mb-1">
          <div className="w-28 shrink-0" />
          <div className="flex-1 grid grid-cols-2 gap-3">
            <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Predicted: Harmful
            </p>
            <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Predicted: Safe
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {/* Row labels */}
          <div className="w-28 shrink-0 grid grid-rows-2 gap-3">
            {['Actual: Harmful', 'Actual: Safe'].map(label => (
              <div key={label}
                className="flex items-center justify-center bg-slate-900/60 border border-slate-800
                           rounded-xl min-h-[140px] px-2">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]
                                 text-center leading-relaxed rotate-[-0]">{label}</span>
              </div>
            ))}
          </div>

          {/* 2×2 Matrix cells */}
          <div className="flex-1 grid grid-cols-2 gap-3">
            {cells.map((cell) => (
              <div key={cell.label} title={cell.tooltip}>
                <MatrixCell {...cell} total={data.total} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Metric pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800">
        {metrics.map(m => (
          <div key={m.label} className="bg-slate-900/60 rounded-xl p-4 text-center border border-slate-800">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{m.label}</p>
            <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Radial accuracy ring
function AccuracyRing({ pct, label, color, size = 100 }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const [dashOffset, setDashOffset] = useState(circ);
  useEffect(() => {
    const timer = setTimeout(() => setDashOffset(circ * (1 - pct / 100)), 300);
    return () => clearTimeout(timer);
  }, [pct, circ]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 100 100">
          {/* Track */}
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(30,41,59,0.8)" strokeWidth="10" />
          {/* Progress */}
          <circle
            cx="50" cy="50" r={r} fill="none"
            stroke={color} strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)', transformOrigin: 'center', transform: 'rotate(-90deg)' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-black text-white">{pct}%</span>
        </div>
      </div>
      <p className="text-xs font-bold text-slate-400 text-center">{label}</p>
    </div>
  );
}

// Performance bar
function PerformanceBar({ label, value, max, unit, color, icon, note }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth((value / max) * 100), 200);
    return () => clearTimeout(t);
  }, [value, max]);

  return (
    <div className="glass-card p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color.bg} ${color.text} border ${color.border}`}>
            {icon}
          </div>
          <div>
            <p className="font-bold text-white text-sm">{label}</p>
            {note && <p className="text-slate-500 text-xs mt-0.5">{note}</p>}
          </div>
        </div>
        <span className={`text-2xl font-black ${color.text}`}>{value}<span className="text-sm ml-1 text-slate-400">{unit}</span></span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color.bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        />
      </div>
    </div>
  );
}

// Collapsible edge case row
function EdgeCase({ query, result, label, safe, delay }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card overflow-hidden"
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center
                          ${safe ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {safe ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          </div>
          <p className="text-sm font-mono text-slate-300 truncate">"{query}"</p>
        </div>
        <div className="flex items-center gap-3 ml-4 shrink-0">
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                           ${safe ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
            {label}
          </span>
          {open ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-800 px-5 py-4"
          >
            <p className="text-sm text-slate-400">{result}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ResultAnalysis() {
  return (
    <div className="pt-24 pb-20 px-4 md:px-8 max-w-7xl mx-auto min-h-screen">

      {/* ── Page Header ── */}
      <motion.header
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-14"
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
                           bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Result Analysis
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
          Model <span className="cool-gradient-text">Performance</span> Report
        </h1>
        <p className="text-slate-500 font-medium mt-3 max-w-2xl">
          Comprehensive evaluation of the CNN image classifier and NLP text classifier,
          backed by confusion matrices derived from 50-sample test datasets.
        </p>
      </motion.header>

      {/* ── Accuracy Overview Rings ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-8 mb-10"
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Overall System</p>
            <h2 className="text-3xl font-black text-white">Accuracy at a Glance</h2>
            <p className="text-slate-500 text-sm mt-2">
              Both models were evaluated on a balanced dataset of 50 samples each
              (25 safe · 25 harmful). Results reflect real classification behavior.
            </p>
          </div>
          <div className="flex items-center gap-10">
            <AccuracyRing pct={88}  label="CNN Model"  color="#6366f1" size={110} />
            <AccuracyRing pct={92}  label="NLP Model"  color="#22d3ee" size={110} />
            <AccuracyRing pct={90}  label="Combined"   color="#a855f7" size={110} />
          </div>
        </div>
      </motion.section>

      {/* ── Confusion Matrix Legend ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
      >
        {[
          { label: 'True Positive (TP)',  desc: 'Harmful content → Correctly BLOCKED',  color: 'text-emerald-400', dot: 'bg-emerald-500' },
          { label: 'True Negative (TN)',  desc: 'Safe content → Correctly ALLOWED',     color: 'text-sky-400',     dot: 'bg-sky-500' },
          { label: 'False Positive (FP)', desc: 'Safe content → Wrongly BLOCKED',       color: 'text-amber-400',   dot: 'bg-amber-500' },
          { label: 'False Negative (FN)', desc: 'Harmful content → Wrongly ALLOWED',    color: 'text-red-400',     dot: 'bg-red-500' },
        ].map(item => (
          <div key={item.label}
            className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
            <div className={`w-3 h-3 rounded-full shrink-0 mt-0.5 ${item.dot}`} />
            <div>
              <p className={`text-xs font-black ${item.color}`}>{item.label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── CNN Confusion Matrix ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <SectionTitle
          icon={<Eye size={22} />}
          title="CNN Image Classifier — Confusion Matrix"
          subtitle="Visual content analysis using a Convolutional Neural Network (224×224 input, MobileNet-style)"
        />
        <ConfusionMatrix
          data={CNN_MATRIX}
          modelName="CNN Image Classifier"
          icon={<Eye size={20} />}
          accentColor="text-indigo-400"
        />

        {/* CNN insight callout */}
        <div className="mt-4 p-5 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-400">
            <span className="font-bold text-amber-400">Known Limitation: </span>
            Performance slightly decreased with heavily pixelated images. 3 false negatives
            were observed in pixelated test samples where content was visually obscured below model threshold.
          </p>
        </div>
      </motion.section>

      {/* ── NLP Confusion Matrix ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-10"
      >
        <SectionTitle
          icon={<Brain size={22} />}
          title="NLP Text Classifier — Confusion Matrix"
          subtitle="TF-IDF vectorized text with a trained ML classifier (Logistic Regression / Naïve Bayes)"
        />
        <ConfusionMatrix
          data={NLP_MATRIX}
          modelName="NLP Text Classifier"
          icon={<Brain size={20} />}
          accentColor="text-cyan-400"
        />

        {/* NLP insight callout */}
        <div className="mt-4 p-5 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-400">
            <span className="font-bold text-red-400">Known Limitation: </span>
            Heavily obfuscated text using unusual Unicode symbols (e.g., ｖｉｏｌｅｎｃｅ) occasionally
            bypassed the filter, contributing to the 2 false negatives observed.
          </p>
        </div>
      </motion.section>

      {/* ── Performance Metrics ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mb-10"
      >
        <SectionTitle
          icon={<Zap size={22} />}
          title="Responsiveness & Latency"
          subtitle="End-to-end timing from content detection to UI blocking"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PerformanceBar
            label="Stable Network Latency"
            value={0.8} max={3} unit="s"
            note="Single content block on stable local network"
            icon={<Zap size={16} />}
            color={{ bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', bar: 'bg-emerald-500' }}
          />
          <PerformanceBar
            label="High-Load Latency (Multi-Image)"
            value={2.5} max={3} unit="s"
            note="CNN computation overhead with multiple high-resolution images"
            icon={<Clock size={16} />}
            color={{ bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', bar: 'bg-amber-500' }}
          />
          <PerformanceBar
            label="CNN Image Accuracy"
            value={88} max={100} unit="%"
            note="Performance across balanced 50-image test dataset"
            icon={<Eye size={16} />}
            color={{ bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', bar: 'bg-indigo-500' }}
          />
          <PerformanceBar
            label="NLP Text Accuracy"
            value={92} max={100} unit="%"
            note="Performance across balanced 50-text test dataset"
            icon={<Brain size={16} />}
            color={{ bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', bar: 'bg-cyan-500' }}
          />
        </div>
      </motion.section>

      {/* ── Robustness ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-10"
      >
        <SectionTitle
          icon={<Shield size={22} />}
          title="Error Handling & Robustness"
          subtitle="System behavior under failure conditions and adversarial inputs"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Handled correctly */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-800">
              <CheckCircle size={18} className="text-emerald-400" />
              <h3 className="font-black text-white text-sm uppercase tracking-wider">Handled Correctly</h3>
            </div>
            <div className="space-y-3">
              {['Server disconnect', 'Invalid DOM structures', 'Empty / null text input'].map(item => (
                <div key={item} className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle size={11} className="text-emerald-400" />
                  </div>
                  <span className="text-sm text-slate-300 font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Failures observed */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-800">
              <XCircle size={18} className="text-red-400" />
              <h3 className="font-black text-white text-sm uppercase tracking-wider">Failures Observed</h3>
            </div>
            <div className="space-y-3">
              {[
                'Heavily obfuscated text with unusual Unicode symbols (e.g., ｖｉｏｌｅｎｃｅ)',
                'Heavily pixelated explicit images below model confidence threshold',
              ].map(item => (
                <div key={item} className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/15 rounded-xl">
                  <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <XCircle size={11} className="text-red-400" />
                  </div>
                  <span className="text-sm text-slate-300 font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Edge Case Testing ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="mb-10"
      >
        <SectionTitle
          icon={<Target size={22} />}
          title="Edge Case Testing"
          subtitle="Click each case to expand the system's reasoning and classification outcome"
        />
        <div className="space-y-3">
          <EdgeCase
            query="I am going to hit you with a flower"
            label="✓ Safe — Low Toxicity"
            safe={true}
            delay={0.1}
            result={`The NLP classifier correctly identified this as NON-TOXIC (Safe) with high confidence.
Despite the word "hit," the surrounding context ("with a flower") produced a low toxicity probability score.
TF-IDF weighting deprioritized the verb due to co-occurrence with benign terms. This demonstrates the model's
ability to consider semantic context rather than simple keyword matching.`}
          />
          <EdgeCase
            query="Fast-scrolling a large page (MutationObserver stress test)"
            label="✓ 95% Dynamic Content Caught"
            safe={true}
            delay={0.2}
            result={`The system's MutationObserver was triggered for every DOM mutation during rapid scrolling.
95% of dynamically injected content was scanned in real-time. The remaining 5% miss-rate was due to
content elements that were rendered and destroyed within a single animation frame (< 16ms), faster than
the observer's debounce threshold. This is within acceptable performance bounds for a browser extension.`}
          />
          <EdgeCase
            query="ｖｉｏｌｅｎｃｅ ａｎｄ ｈａｒｍ (fullwidth Unicode)"
            label="⚠ Filter Bypassed"
            safe={false}
            delay={0.3}
            result={`The TF-IDF vectorizer tokenized fullwidth Unicode characters as unknown tokens not present
in the training vocabulary. As a result, the classifier assigned a near-zero toxicity score and allowed
the content through. This is a known NLP pre-processing gap. Future improvement: add Unicode normalization
(NFKD/NFKC) as a pre-processing step before vectorization.`}
          />
          <EdgeCase
            query="Explicit image with heavy pixelation filter applied (< 20px effective resolution)"
            label="⚠ Partially Missed"
            safe={false}
            delay={0.4}
            result={`When explicit images were blurred/pixelated below ~20px effective resolution before
reaching the classifier, the CNN confidence score dropped below the 0.5 classification threshold.
The model returned a 'Safe' label with ~0.45 confidence. Future improvement: add a secondary
heuristic pass based on image metadata (dimensions, format, referrer URL) to supplement CNN output.`}
          />
        </div>
      </motion.section>

      {/* ── Summary Table ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <SectionTitle
          icon={<Layers size={22} />}
          title="Summary: Model Comparison"
          subtitle="Side-by-side performance comparison across all key metrics"
        />
        <div className="glass-card overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-900/50 text-slate-500 text-[10px] font-black uppercase tracking-[0.18em]">
              <tr>
                <th className="px-8 py-5">Metric</th>
                <th className="px-8 py-5 text-indigo-400">CNN (Image)</th>
                <th className="px-8 py-5 text-cyan-400">NLP (Text)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-sm">
              {[
                { metric: 'Test Dataset Size',     cnn: '50 images (25+25)',   nlp: '50 samples (25+25)' },
                { metric: 'Accuracy',              cnn: '88%',                 nlp: '92%' },
                { metric: 'True Positives (TP)',   cnn: '22',                  nlp: '23' },
                { metric: 'True Negatives (TN)',   cnn: '22',                  nlp: '23' },
                { metric: 'False Positives (FP)',  cnn: '3',                   nlp: '2' },
                { metric: 'False Negatives (FN)',  cnn: '3',                   nlp: '2' },
                { metric: 'Precision',             cnn: `${CNN_MATRIX.precision}%`,  nlp: `${NLP_MATRIX.precision}%` },
                { metric: 'Recall',                cnn: `${CNN_MATRIX.recall}%`,     nlp: `${NLP_MATRIX.recall}%` },
                { metric: 'F1 Score',              cnn: `${CNN_MATRIX.f1}%`,         nlp: `${NLP_MATRIX.f1}%` },
                { metric: 'Avg. Detection Latency',cnn: '~0.8s (stable)',       nlp: '< 0.3s' },
              ].map((row, i) => (
                <tr key={row.metric}
                  className={`transition-colors hover:bg-indigo-500/5 ${i % 2 === 0 ? 'bg-slate-900/20' : ''}`}
                >
                  <td className="px-8 py-4 font-bold text-slate-300">{row.metric}</td>
                  <td className="px-8 py-4 font-mono text-indigo-300">{row.cnn}</td>
                  <td className="px-8 py-4 font-mono text-cyan-300">{row.nlp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>
    </div>
  );
}
