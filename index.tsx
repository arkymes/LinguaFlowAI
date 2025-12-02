
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import LiveSession from './components/LiveSession';
import { SCENARIOS } from './constants';
import { Scenario, TeachingMode } from './types';

const App: React.FC = () => {
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [teachingMode, setTeachingMode] = useState<TeachingMode>(TeachingMode.TEACHER);

  if (activeScenario) {
    return (
      <LiveSession 
        scenario={activeScenario} 
        mode={teachingMode} 
        onExit={() => setActiveScenario(null)} 
      />
    );
  }

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto md:max-w-full md:flex-row md:items-center md:justify-center relative">
      
      {/* Mobile Ambient Background */}
      <div className="ambient-glow"></div>
      
      {/* Orange Glow Spot (Top Left) */}
      <div className="fixed top-[-10%] left-[-20%] w-[300px] h-[300px] bg-orange-500/20 rounded-full blur-[100px] pointer-events-none md:w-[500px] md:h-[500px]"></div>

      {/* Main App Container (Mobile Width centered on Desktop) */}
      <main className="flex-1 flex flex-col h-full w-full max-w-[480px] mx-auto p-6 md:h-[800px] md:max-h-[90vh] md:border md:border-white/5 md:rounded-[40px] md:bg-black/20 md:backdrop-blur-3xl md:shadow-2xl overflow-hidden relative">
        
        {/* Header Section */}
        <header className="flex justify-between items-center mb-8 pt-4">
           <div>
             <h2 className="text-slate-400 text-sm font-medium tracking-wide mb-1">Welcome back,</h2>
             <h1 className="text-3xl font-bold text-white tracking-tight">Student</h1>
           </div>
           <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 shadow-lg shadow-orange-500/20 border border-white/10"></div>
        </header>

        {/* Mode Selector (Segmented Control) */}
        <div className="bg-white/5 p-1 rounded-full flex relative mb-8 backdrop-blur-md border border-white/5">
           {/* Slider Animation Background */}
           <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white/10 rounded-full transition-all duration-300 ease-out shadow-sm ${
             teachingMode === TeachingMode.FLUENCY ? 'left-[calc(50%+2px)]' : 'left-1'
           }`}></div>

           <button 
             onClick={() => setTeachingMode(TeachingMode.TEACHER)}
             className={`flex-1 relative z-10 py-3 text-sm font-medium text-center transition-colors ${
               teachingMode === TeachingMode.TEACHER ? 'text-white' : 'text-slate-500'
             }`}
           >
             Teacher Mode
           </button>
           <button 
             onClick={() => setTeachingMode(TeachingMode.FLUENCY)}
             className={`flex-1 relative z-10 py-3 text-sm font-medium text-center transition-colors ${
               teachingMode === TeachingMode.FLUENCY ? 'text-white' : 'text-slate-500'
             }`}
           >
             Fluency Mode
           </button>
        </div>

        {/* Info Card (Context) */}
        <div className="mb-8 p-6 rounded-[32px] bg-gradient-to-br from-orange-500/10 to-purple-500/10 border border-white/5 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/2"></div>
           <h3 className="text-white font-semibold text-lg mb-2 relative z-10">
             {teachingMode === TeachingMode.TEACHER ? 'Strict Correction' : 'Casual Conversation'}
           </h3>
           <p className="text-slate-400 text-sm leading-relaxed relative z-10">
             {teachingMode === TeachingMode.TEACHER 
               ? 'I will interrupt you to fix grammar and pronunciation mistakes instantly.' 
               : 'We will chat naturally. I will prioritize flow over perfection.'}
           </p>
        </div>

        {/* Scenarios List */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
           <div className="flex justify-between items-end mb-4 px-1">
             <h3 className="text-xl font-semibold text-white">Start a Scenario</h3>
             <span className="text-xs text-orange-400/80 font-medium">View All</span>
           </div>

           <div className="space-y-4">
             {SCENARIOS.map((scenario) => (
               <button 
                 key={scenario.id}
                 onClick={() => setActiveScenario(scenario)}
                 className="w-full text-left p-4 rounded-[28px] glass-button flex items-center gap-5 group hover:bg-white/10"
               >
                  {/* Icon Container */}
                  <div className={`w-16 h-16 rounded-[20px] flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 shadow-lg ${
                    scenario.difficulty === 'ROOKIE' ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-400 shadow-emerald-900/20' :
                    scenario.difficulty === 'ADEPT' ? 'bg-gradient-to-br from-orange-500/20 to-amber-500/10 text-orange-400 shadow-orange-900/20' :
                    'bg-gradient-to-br from-purple-500/20 to-pink-500/10 text-purple-400 shadow-purple-900/20'
                  }`}>
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={scenario.iconPath} />
                    </svg>
                  </div>

                  {/* Text */}
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-white font-semibold text-base">{scenario.title}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                         scenario.difficulty === 'ROOKIE' ? 'bg-emerald-500/10 text-emerald-400' :
                         scenario.difficulty === 'ADEPT' ? 'bg-orange-500/10 text-orange-400' :
                         'bg-purple-500/10 text-purple-400'
                      }`}>
                        {scenario.difficulty}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                      {scenario.description}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-white group-hover:bg-white/10 transition-colors">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
               </button>
             ))}
           </div>
        </div>

        {/* Bottom Fade Gradient for Scroll */}
        <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none"></div>

      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
