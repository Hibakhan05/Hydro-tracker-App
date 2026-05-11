import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Droplet,
  Trophy,
  TrendingUp,
  Settings,
  Calendar,
  Bell,
  Target,
  Zap,
  Award,
  Plus,
  X,
  ChevronRight,
  Activity,
  Flame,
  Sun,
  Moon
} from 'lucide-react';

const generateSampleData = (dailyGoal = 2500) => {
  const today = new Date();
  const logs = [];

  for (let i = 14; i >= 0; i--) {
    const dayDate = new Date(today);
    dayDate.setDate(today.getDate() - i);
    dayDate.setHours(0, 0, 0, 0);
    const dateStr = dayDate.toISOString().split('T')[0];

    const entries = Math.floor(Math.random() * 8) + 4;
    const dayLogs = [];
    let totalAmount = 0;

    for (let j = 0; j < entries; j++) {
      const amount = [100, 250, 500][Math.floor(Math.random() * 3)];
      totalAmount += amount;
      const hour = 7 + Math.floor(Math.random() * 14);
      const minute = Math.floor(Math.random() * 60);

      const entryDate = new Date(dayDate);
      entryDate.setHours(hour, minute, 0, 0);
      dayLogs.push({
        id: `${dateStr}-${j}`,
        amount,
        timestamp: entryDate.toISOString()
      });
    }

    logs.push({ date: dateStr, entries: dayLogs, total: totalAmount });
  }

  return logs;
};

const calculateGoal = (profile) => {
  if (!profile) return 2500;
  let base = (profile.weight || 70) * 33;
  if (profile.activityLevel === 'high') base *= 1.3;
  else if (profile.activityLevel === 'moderate') base *= 1.15;
  if (profile.climate === 'hot') base *= 1.2;
  return Math.round(base / 100) * 100;
};

const getInitialState = () => {
  const defaultProfile = {
    name: 'Friend',
    gender: '',
    weight: 70,
    activityLevel: 'moderate',
    climate: 'moderate',
    dailyGoal: 2500
  };
  return {
    profile: null,
    logs: [],
    reminders: { enabled: true, interval: 60, quietStart: '22:00', quietEnd: '07:00' }
  };
};

export default function WaterIntakeTracker() {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('hydrotrack_data');
      return saved ? JSON.parse(saved) : getInitialState();
    } catch {
      return getInitialState();
    }
  });
  const [activeView, setActiveView] = useState('home');
  const [theme, setTheme] = useState('dark');
  const cardStyle = theme === 'dark'
    ? 'bg-white/5 backdrop-blur-sm border-white/10'
    : 'bg-gray-100 border-gray-200 shadow-sm';

  const iconColor = theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600';
  const [showGoalCalculator, setShowGoalCalculator] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [toast, setToast] = useState(null);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({
    name: '',
    weight: 70,
    activityLevel: '',
    climate: ''
  });
  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };
  useEffect(() => {
    if (!data.profile) return;
    try {
      localStorage.setItem('hydrotrack_data', JSON.stringify(data));
    } catch (e) {
      console.warn('localStorage write failed:', e);
    }
  }, [data]);

  const needsOnboarding = !data.profile;

  const today = new Date().toISOString().split('T')[0];
  const todayLog = data.logs.find(log => log.date === today) || { date: today, entries: [], total: 0 };
  const todayTotal = todayLog.total;
  const dailyGoal = data.profile?.dailyGoal || 2500;
  const progress = Math.min((todayTotal / dailyGoal) * 100, 100);
  const remaining = Math.max(dailyGoal - todayTotal, 0);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const addWater = (amount) => {
    const newEntry = {
      id: `${today}-${Date.now()}`,
      amount,
      timestamp: new Date().toISOString()
    };

    setData(prev => {
      const logs = [...prev.logs];
      const todayIndex = logs.findIndex(log => log.date === today);
      const prevTotal = todayIndex >= 0 ? logs[todayIndex].total : 0;
      const newTotal = prevTotal + amount;

      if (todayIndex >= 0) {
        logs[todayIndex] = {
          ...logs[todayIndex],
          entries: [...logs[todayIndex].entries, newEntry],
          total: newTotal
        };
      } else {
        logs.push({ date: today, entries: [newEntry], total: amount });
      }
      if (newTotal >= prev.profile.dailyGoal && prevTotal < prev.profile.dailyGoal) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }

      return { ...prev, logs };
    });

    showToast(`+${amount}ml added`);
  };

  const deleteWater = (entryId, amount) => {
    setData(prev => {
      const logs = [...prev.logs];
      const todayIndex = logs.findIndex(log => log.date === today);
      if (todayIndex >= 0) {
        logs[todayIndex] = {
          ...logs[todayIndex],
          entries: logs[todayIndex].entries.filter(e => e.id !== entryId),
          total: Math.max(logs[todayIndex].total - amount, 0)
        };
      }
      return { ...prev, logs };
    });
    showToast(`-${amount}ml removed`);
  };
  const streaks = useMemo(() => {
    if (!data.profile) return { current: 0, best: 0, total: 0 };

    const goal = data.profile.dailyGoal;
    const sorted = [...data.logs].sort((a, b) => new Date(b.date) - new Date(a.date));
    const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);

    let currentStreak = 0;
    for (let i = 0; i < sorted.length; i++) {
      const logDate = new Date(sorted[i].date); logDate.setHours(0, 0, 0, 0);
      const expected = new Date(todayDate); expected.setDate(todayDate.getDate() - i);
      if (logDate.getTime() !== expected.getTime()) break;
      if (sorted[i].total >= goal) currentStreak++;
      else if (i === 0) break;
      else break;
    }

    let best = 0, temp = 0;
    const asc = [...data.logs].sort((a, b) => new Date(a.date) - new Date(b.date));
    for (const log of asc) {
      if (log.total >= goal) { temp++; if (temp > best) best = temp; }
      else temp = 0;
    }

    return {
      current: currentStreak,
      best: Math.max(best, currentStreak),
      total: data.logs.filter(l => l.entries.length > 0).length
    };
  }, [data.logs, data.profile]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getMotivation = () => {
    if (progress >= 100) return 'Goal crushed!';
    if (progress >= 75) return 'Almost there! Keep going';
    if (progress >= 50) return 'Halfway hydrated!';
    if (progress >= 25) return 'Great start! Stay consistent';
    return 'Time to hydrate!';
  };
  function OnboardingView() {
    const [local, setLocal] = useState(onboardingData);
    const steps = 3;

    const canNext = () => {
      if (onboardingStep === 1) return local.name.trim().length > 0;
      if (onboardingStep === 2) return local.activityLevel !== '';
      return local.climate !== '';
    };

    const handleNext = () => {
      setOnboardingData(local);
      if (onboardingStep < steps) { setOnboardingStep(s => s + 1); return; }
      const profile = { ...local, dailyGoal: calculateGoal(local) };
      const sampleLogs = generateSampleData(profile.dailyGoal);
      setData(prev => ({ ...prev, profile, logs: sampleLogs }));
    };

    return (
      <motion.div
        key={onboardingStep}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        className="flex flex-col gap-6 min-h-screen justify-center pb-16"
      >
        <motion.div
          className="absolute top-6 right-6 z-50"
          initial={false} 
          transition={{ duration: 0 }}>
          <button
            onClick={(e) => {
              e.stopPropagation(); 
              setTheme(theme === 'dark' ? 'light' : 'dark');
            }}
            className={`p-3 rounded-2xl border shadow-lg transition-all
          ${theme === 'dark' ? 'bg-gray-900 border-white/10 text-yellow-400' : 'bg-white border-gray-200 text-indigo-600'}`}
          >
            {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </motion.div>
        <div className="text-center mb-4">
          <div className="text-5xl mb-4 theme === 'dark' ? 'text-cyan-400' : 'text-blue-900'">💧</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-800 to-blue-900 bg-clip-text text-transparent">
            HydroTrack
          </h1>
          <p className="text-gray-400 mt-2">Step {onboardingStep} of {steps}</p>
          <div className="flex gap-2 justify-center mt-3">
            {Array.from({ length: steps }, (_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i < onboardingStep ? 'w-8 bg-cyan-400' : 'w-4 bg-white/20'}`} />
            ))}
          </div>
        </div>

        {onboardingStep === 1 && (
          <div className="space-y-4 px-4">
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-cyan-400' : 'text-blue-900'}`}>
              What's your name?
            </h2>
            <input
              type="text"
              value={local.name}
              onChange={e => setLocal(p => ({ ...p, name: e.target.value }))}
              placeholder="Enter your name"
              className={`w-full p-4 text-lg rounded-2xl border focus:outline-none focus:ring-2 focus:ring-cyan-500 
              ${theme === 'dark'
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-gray-100 border-gray-300 text-gray-900'
                }`}
              autoFocus
            />

            <div>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-cyan-400' : 'text-blue-900'}`}>Weight (kg)</h2>
              <input
                type="number"
                value={local.weight}
                onChange={e => setLocal(p => ({ ...p, weight: parseInt(e.target.value) || 50 }))}
                className={`w-full border rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors ${theme === 'light'
                  ? 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'
                  : 'bg-white/10 border-white/20 text-white placeholder-gray-400'}'
                    ? 'bg-gray-100 border-gray-300 text-gray-900'
                    : 'bg-white/10 border-white/20 text-white'}`}
              />

            </div>
          </div>
        )}

        {onboardingStep === 2 && (
          <div className="space-y-4">
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-cyan-400' : 'text-blue-500'}`}>How active are you?</h2>
            <div className="grid grid-cols-1 gap-3 font-medium">
              {[
                { id: 'low', label: 'Low', desc: 'Mostly sedentary, desk job' },
                { id: 'moderate', label: 'Moderate', desc: 'Light exercise a few days/week' },
                { id: 'high', label: 'High', desc: 'Intense exercise most days' }
              ].map(({ id, label, desc }) => (
                <button
                  key={id}
                  onClick={() => setLocal(p => ({ ...p, activityLevel: id }))}
                  className={`p-4 rounded-2xl text-left transition-all border ${local.activityLevel === id
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-black'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 '
                    }`}
                >
                  <div className={`font-semibold text-lg ${local.activityLevel === id ? 'text-cyan-500' : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {label}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">{desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {onboardingStep === 3 && (
          <div className="space-y-4">
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-cyan-400' : 'text-blue-500'}`}>What's your climate like?</h2>
            <div className="grid grid-cols-1 gap-3 font-medium">
              {[
                { id: 'cool', label: 'Cool', desc: 'Cold or mild temperatures' },
                { id: 'moderate', label: 'Moderate', desc: 'Comfortable year-round' },
                { id: 'hot', label: 'Hot', desc: 'Hot or humid environment' }
              ].map(({ id, label, desc }) => (
                <button
                  key={id}
                  onClick={() => setLocal(p => ({ ...p, climate: id }))}
                  className={`p-4 rounded-2xl text-left transition-all border ${local.climate === id
                    ? 'bg-blue-500/20 border-blue-500/50 text-white'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                >
                  <div className={`font-semibold ${local.climate === id ? 'text-blue-500' : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {label}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">{desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleNext}
          disabled={!canNext()}
          className={`w-full rounded-2xl p-4 font-semibold text-white mt-4 transition-opacity ${canNext()
            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/25'
            : 'bg-white/10 opacity-40 cursor-not-allowed'
            }`}
        >
          {onboardingStep < steps ? 'Continue' : 'Get Started'}
        </motion.button>
      </motion.div>
    );
  };


  function HomeView() {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="flex flex-col gap-6 pb-24"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${theme === 'dark'
              ? 'from-cyan-400 to-blue-400'
              : 'from-cyan-600 to-blue-800'}`}>
              {getGreeting()}{data.profile?.name ? `, ${data.profile.name}` : ''}
            </h1>

            <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} font-semibold`}>Stay hydrated, stay healthy</p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className={`w-12 h-12 rounded-2xl backdrop-blur-sm border transition-colors flex items-center justify-center
    ${theme === 'dark'
                  ? 'bg-white/10 border-white/10 hover:bg-white/20'
                  : 'bg-gray-100 border-gray-200 hover:bg-gray-200'}`}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5 text-blue-900" />
              )}
            </motion.button>

          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveView('settings')}
            className={`w-12 h-12 rounded-2xl backdrop-blur-sm border transition-colors flex items-center justify-center
             ${theme === 'dark'
                ? 'bg-white/10 border-white/10 hover:bg-white/20'
                : 'bg-gray-100 border-gray-200 hover:bg-gray-200'}`}
          >
            <Settings className={`w-5 h-5 ${iconColor}`} />
          </motion.button>

        </div>
        <div className="relative flex items-center justify-center py-8">
          <svg className="w-64 h-64 transform -rotate-90">
            <circle
              cx="128" cy="128" r="110" fill="none"
              stroke={theme === 'dark' ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}
              strokeWidth="16"
            />
            <motion.circle
              cx="128" cy="128" r="110" fill="none"
              stroke="url(#ringGradient)" strokeWidth="16" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 110}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 110 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 110 * (1 - progress / 100) }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
            <defs>
              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#125ed8" />
              </linearGradient>
            </defs>
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="text-center"
            >
              <div className={`text-4xl font-black mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {Math.round(progress)}%
              </div>

              <div className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-400'}`}>
                {todayTotal}ml
              </div>

              <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Target: {dailyGoal}ml
              </div>

              <div className={`mt-2 text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>
                {remaining > 0 ? `${remaining}ml remaining` : "Goal Reached! 🎉"}
              </div>
            </motion.div>
          </div>

        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm border border-cyan-500/20 rounded-3xl p-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-900 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getMotivation()}</h3>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{streaks.current} day streak</p>
            </div>
          </div>
        </motion.div>

        <div className="space-y-3">
          <h3 className={`text-sm font-medium uppercase tracking-wide ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Quick Add
          </h3>

          <div className={"grid grid-cols-1 sm:grid-cols-3 gap-3"}>{[
            { amount: 100, label: 'Small', icon: '💧' },
            { amount: 250, label: 'Cup', icon: '☕' },
            { amount: 500, label: 'Bottle', icon: '🍶' }
          ].map(({ amount, label, icon }) => (
            <motion.button
              key={amount} whileTap={{ scale: 0.95 }} onClick={() => addWater(amount)}
              className={`rounded-2xl p-4 border transition-all flex flex-col items-center justify-center ${cardStyle}`}
            >
              <div className="text-3xl mb-2">{icon}</div>
              <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                {amount}ml
              </div>
              <div className={`text-xs font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                {label}
              </div>
            </motion.button>
          ))}
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }} onClick={() => setShowCustomInput(true)}
            className={`w-full rounded-2xl p-4 font-semibold transition-all flex items-center justify-center gap-2 ${theme === 'dark'
              ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
              : 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'} hover:opacity-90`}

          >
            <Plus className="w-5 h-5" /> Custom Amount
          </motion.button>
        </div>
        {todayLog.entries.length > 0 && (
          <div className="space-y-3">
            <h3 className={`text-sm font-medium uppercase tracking-wide${theme === 'dark' ? 'text-white/70' : 'text-gray-900'}`}>
              Today's Log
            </h3>
            <div className="space-y-2">
              {[...todayLog.entries].reverse().slice(0, 5).map(entry => (
                <motion.div
                  key={entry.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  className={` ${cardStyle}backdrop-blur-sm border rounded-2xl p-4 flex items-center justify-between`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                      <Droplet className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{entry.amount}ml</div>
                      <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </div>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }} onClick={() => deleteWater(entry.id, entry.amount)}
                    className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  function StatsView() {
    const last7 = data.logs.slice(-7);

    const weeklyData = useMemo(() => {
      return last7.map(log => ({
        day: new Date(log.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
        amount: log.total,
        goal: dailyGoal
      }));
    }, []);

    const stats = useMemo(() => {
      if (last7.length === 0) return { avgIntake: 0, goalsAchieved: 0, bestDay: null };
      const totalIntake = last7.reduce((sum, log) => sum + log.total, 0);
      const avgIntake = Math.round(totalIntake / last7.length);
      const goalsAchieved = last7.filter(log => log.total >= dailyGoal).length;
      const bestDay = last7.reduce((max, log) => (log.total > max.total ? log : max), last7[0]);
      return { avgIntake, goalsAchieved, bestDay };
    }, []);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
        className="flex flex-col gap-6 pb-24"
      >
        <div>
          <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Analytics</h2>
          <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Your hydration insights</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={`p-3 rounded-2xl border ${cardStyle}`}>
            <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Avg Daily" value={`${stats.avgIntake}ml`} color="from-cyan-400 to-cyan-500" theme={theme} /> </div>
          <div className={`p-3 rounded-2xl border ${cardStyle}`}>
            <StatCard icon={<Target className="w-5 h-5" />} label="Goals Hit" value={`${stats.goalsAchieved}/7`} color="from-blue-400 to-blue-500" theme={theme} /></div>
          <div className={`p-3 rounded-2xl border ${cardStyle}`}>
            <StatCard icon={<Flame className="w-5 h-5" />} label="Current Streak" value={`${streaks.current} days`} color="from-orange-400 to-orange-500" theme={theme} /></div>
          <div className={`p-3 rounded-2xl border ${cardStyle}`}>
            <StatCard icon={<Award className="w-5 h-5" />} label="Best Streak" value={`${streaks.best} days`} color="from-purple-400 to-purple-500" theme={theme} /></div>
        </div>

        <div className={`backdrop-blur-sm border rounded-3xl p-6 ${cardStyle}`}>
          <h3 className={`font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Weekly Overview</h3>
          {weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="day" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
                <Bar dataKey="amount" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">No data yet. Start logging water!</div>
          )}
        </div>
        {stats.bestDay && (
          <div className={`bg-gradient-to-br ${theme === 'dark' ? 'from-yellow-500/10 to-orange-500/10' : 'from-yellow-400/10 to-orange-500/10'} backdrop-blur-sm border ${theme === 'dark' ? 'border-yellow-500/20' : 'border-yellow-400/20'} rounded-3xl p-6`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Best Day This Week</h3>
                <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  {stats.bestDay.total}ml on {new Date(stats.bestDay.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  }
  function CalendarView() {
    const monthData = useMemo(() => {
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();

      const days = [];

      for (let i = 0; i < firstDay; i++) {
        days.push(null);
      }

      for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(now.getFullYear(), now.getMonth(), i);
        const dateStr = date.toISOString().split('T')[0];
        const log = data.logs.find(l => l.date === dateStr);

        days.push({
          day: i,
          date: dateStr,
          total: log?.total || 0,
          achieved: log ? log.total >= dailyGoal : false,
          isToday: dateStr === today
        });
      }

      return days;
    }, [data.logs, dailyGoal, today]);


    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
        className="flex flex-col gap-6 pb-24"
      >
        <div>
          <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Calendar</h2>
          <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        </div>

        <div className={`backdrop-blur-sm border rounded-3xl p-6 ${cardStyle}`}>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className={`text-center text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {monthData.map((day, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.01 }}
                className={`aspect-square rounded-xl flex items-center justify-center text-sm font-medium ${!day ? 'bg-transparent' : day.achieved ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25' : day.total > 0 ? `${theme === 'dark' ? 'bg-white/10 text-gray-300' : 'bg-cyan-100 text-gray-600'}` : day.isToday ? `${theme === 'dark' ? 'bg-white/10 text-cyan-400 ring-1 ring-cyan-400/50' : 'bg-cyan-50 text-cyan-600 ring-1 ring-cyan-400/50'}` : `${theme === 'dark' ? 'bg-white/5 text-gray-500' : 'bg-gray-100 text-gray-400'}`}`}
              >
                {day?.day}
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-cyan-500 to-blue-500"></div>
            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Goal Achieved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-white/10"></div>
            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Partial</span>
          </div>
        </div>
      </motion.div >
    );
  }
  function SettingsView() {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
        className="flex flex-col gap-6 pb-24"
      >
        <div>
          <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Settings</h2>
          <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Customize your experience</p>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Daily Goal</h3>
          <div className={`backdrop-blur-sm border rounded-3xl p-4 ${cardStyle}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{dailyGoal}ml</div>
                <div className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Target intake per day</div>
              </div>
              <Target className="w-8 h-8 text-cyan-400" />
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowGoalCalculator(true)}
              className={`w-full border rounded-xl p-3 font-medium transition-colors flex items-center justify-center gap-2 
              ${theme === 'dark'
                  ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30'
                  : 'bg-cyan-50 border-cyan-200 text-cyan-600 hover:bg-cyan-100'}`}
            >
              Calculate Recommended Goal <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Reminders</h3>
          <div className={`backdrop-blur-sm border rounded-3xl p-6 space-y-4 ${cardStyle}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-blue-400" />
                <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Enable Reminders</span>
              </div>
              <button
                onClick={() => setData(prev => ({ ...prev, reminders: { ...prev.reminders, enabled: !prev.reminders.enabled } }))}
                className={`w-12 h-7 rounded-full transition-colors relative ${data.reminders.enabled ? 'bg-cyan-500' : (theme === 'dark' ? 'bg-white/20' : 'bg-gray-200')}`}
              >
                <motion.div animate={{ x: data.reminders.enabled ? 24 : 4 }} className="w-5 h-5 bg-white rounded-full absolute top-1" />
              </button>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Interval (minutes)</label>
              <input
                type="number" min="15" max="240"
                value={data.reminders.interval}
                onChange={e => setData(prev => ({ ...prev, reminders: { ...prev.reminders, interval: parseInt(e.target.value) || 60 } }))}
                className={`w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors
                ${theme === 'dark'
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'bg-gray-100 border-gray-200 text-gray-900'}`}
              />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Achievements</h3>
          <div className={`backdrop-blur-sm border rounded-3xl p-6 bg-gradient-to-br from-orange-500/10 to-red-500/10 
          ${theme === 'dark' ? 'border-orange-500/20' : 'border-orange-200'}`}>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Flame className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Days Tracked</div>
                <div className={`text-3xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{streaks.total}</div>
              </div>
            </div>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { setData(getInitialState()); setOnboardingStep(1); }}
          className={`w-full border rounded-2xl p-3 font-medium transition-colors
          ${theme === 'dark'
              ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
              : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'}`}
        >
          Reset & Restart Onboarding
        </motion.button>
      </motion.div>
    );
  }

  function StatCard({ icon, label, value, color, theme }) {
    return (
      <motion.div whileHover={{ scale: 1.02 }} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-3`}>{icon}</div>
        <div className={`text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{label}</div>
        <div className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{value}</div>
      </motion.div>
    );
  }
  function GoalCalculatorModal() {
    const [localProfile, setLocalProfile] = useState({
      weight: data.profile?.weight || 70,
      activityLevel: data.profile?.activityLevel || 'moderate',
      climate: data.profile?.climate || 'moderate'
    });
    const recommended = calculateGoal(localProfile);

    const handleSave = () => {
      setData(prev => ({ ...prev, profile: { ...prev.profile, ...localProfile, dailyGoal: recommended } }));
      setShowGoalCalculator(false);
      showToast('Goal updated!');
    };

    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
        onClick={() => setShowGoalCalculator(false)}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className={`border rounded-3xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl transition-colors
        ${theme === 'dark'
              ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-white/10'
              : 'bg-white border-gray-200'}`}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Calculate Goal
            </h3>
            <button
              onClick={() => setShowGoalCalculator(false)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors
      ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              <X className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-gray-600'}`} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Weight (kg)</label>
              <input
                type="number" value={localProfile.weight}
                onChange={e => setLocalProfile(p => ({ ...p, weight: parseInt(e.target.value) || 70 }))}
                className={`w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors
              ${theme === 'dark' ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Activity Level</label>
              <div className="grid grid-cols-3 gap-2">
                {['low', 'moderate', 'high'].map(level => (
                  <button key={level} onClick={() => setLocalProfile(p => ({ ...p, activityLevel: level }))}
                    className={`p-3 rounded-xl font-medium transition-colors 
                  ${localProfile.activityLevel === level
                        ? 'bg-blue-500 text-white shadow-lg shadow-cyan-500/20'
                        : (theme === 'dark' ? 'bg-white/10 text-gray-400 hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}`}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Climate</label>
              <div className="grid grid-cols-3 gap-2">
                {['cool', 'moderate', 'hot'].map(c => (
                  <button key={c} onClick={() => setLocalProfile(p => ({ ...p, climate: c }))}
                    className={`p-3 rounded-xl font-medium transition-colors 
                  ${localProfile.climate === c
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : (theme === 'dark' ? 'bg-white/10 text-gray-400 hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}`}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className={`border rounded-2xl p-6 mt-6 transition-colors
          ${theme === 'dark'
                ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30'
                : 'bg-cyan-50 border-cyan-100'}`}>
              <div className="text-sm text-gray-400 mb-2">Recommended Daily Goal</div>
              <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">{recommended}ml</div>
              <div className="text-sm text-gray-400 mt-2">Based on your profile</div>
            </div>

            <motion.button whileTap={{ scale: 0.98 }} onClick={handleSave}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl p-4 font-semibold text-white shadow-lg shadow-cyan-500/25">
              Save Goal
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    );
  }
  function CustomInputModal() {
    const handleAdd = () => {
      const amount = parseInt(customAmount);
      if (amount > 0 && amount <= 5000) {
        addWater(amount);
        setShowCustomInput(false);
        setCustomAmount('');
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
        onClick={() => setShowCustomInput(false)}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 rounded-3xl p-6 w-full max-w-sm"
        >
          <h3 className="text-2xl font-bold text-white mb-6">Add Custom Amount</h3>
          <input
            type="number" value={customAmount} onChange={e => setCustomAmount(e.target.value)}
            placeholder="Enter amount (ml)" autoFocus
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white text-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 mb-4"
          />
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setShowCustomInput(false)} className="bg-white/10 rounded-xl p-3 font-medium text-white hover:bg-white/20 transition-colors">Cancel</button>
            <button onClick={handleAdd} className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl p-3 font-semibold text-white">Add Water</button>
          </div>
        </motion.div>
      </motion.div>
    );
  }
  const renderView = () => {
    switch (activeView) {
      case 'home': return <HomeView />;
      case 'stats': return <StatsView />;
      case 'calendar': return <CalendarView />;
      case 'settings': return <SettingsView />;
      default: return <HomeView />;
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-cyan-950 text-white' : 'bg-gradient-to-br from-cyan-50 via-white to-blue-50 text-gray-900'} relative overflow-hidden px-4 sm:px-6`}>
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>
      <div className="relative z-10 w-full max-w-lg mx-auto py-6 sm:py-8">
        <AnimatePresence mode="wait">
          {needsOnboarding ? (
            <OnboardingView key="onboarding" />
          ) : (
            renderView()
          )}
        </AnimatePresence>
      </div>
      {!needsOnboarding && (
        <div className={`fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t z-40 ${theme === 'dark' ? 'bg-gray-900/80 border-white/10' : 'bg-white/90 border-gray-200'}`}>          <div className="max-w-lg mx-auto px-6 py-4">
          <div className="flex items-center justify-around">
            {[
              { id: 'home', icon: Droplet, label: 'Home' },
              { id: 'stats', icon: Activity, label: 'Stats' },
              { id: 'calendar', icon: Calendar, label: 'Calendar' },
              { id: 'settings', icon: Settings, label: 'Settings' }
            ].map(({ id, icon: Icon, label }) => (
              <motion.button
                key={id} whileTap={{ scale: 0.95 }} onClick={() => setActiveView(id)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${activeView === id ? 'text-cyan-400' : 'text-gray-400'}`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{label}</span>
              </motion.button>
            ))}
          </div>
        </div>
        </div>
      )}
      <AnimatePresence>
        {showGoalCalculator && <GoalCalculatorModal />}
        {showCustomInput && <CustomInputModal />}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-2xl shadow-lg shadow-cyan-500/25 font-medium"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="text-center">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="text-8xl mb-4">🎉</motion.div>
              <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Goal Achieved!</div>
              <div className="text-xl text-gray-300 mt-2">You're crushing it!</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

