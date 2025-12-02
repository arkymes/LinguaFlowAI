
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import LiveSession from './components/LiveSession';
import { SCENARIOS } from './constants';
import { Scenario, TeachingMode } from './types';

const App: React.FC = () => {
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [teachingMode, setTeachingMode] = useState<TeachingMode>(TeachingMode.TEACHER);
  
  // API Key State Management
  const [apiKey, setApiKey] = useState<string>('');
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);

  useEffect(() => {
    // Load key from storage on boot
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    } else {
      setShowKeyModal(true);
    }
  }, []);

  const handleSaveKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
    setShowKeyModal(false);
  };

  const handleScenarioSelect = (scenario: Scenario) => {
    if (!apiKey) {
      setShowKeyModal(true);
      return;
    }
    setActiveScenario(scenario);
  };

  if (activeScenario && apiKey) {
    return (
      <LiveSession 
        scenario={activeScenario} 
        mode={teachingMode} 
        apiKey={apiKey}
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
           
           {/* Settings / API Key Button */}
           <button 
             onClick={() => setShowKeyModal(true)}
             className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
           >
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
             </svg>
           </button>
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
                 onClick={() => handleScenarioSelect(scenario)}
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

      {/* API Key Modal */}
      {showKeyModal && (
        <ApiKeyModal 
          initialKey={apiKey} 
          onSave={handleSaveKey} 
          onClose={() => apiKey ? setShowKeyModal(false) : null} // Can only close if a key exists
          dismissable={!!apiKey}
        />
      )}
    </div>
  );
};

const ApiKeyModal: React.FC<{ initialKey: string, onSave: (k: string) => void, onClose: () => void, dismissable: boolean }> = ({ initialKey, onSave, onClose, dismissable }) => {
  const [inputVal, setInputVal] = useState(initialKey);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
       <div className="w-full max-w-sm glass-panel p-8 rounded-[32px] border border-white/10 shadow-2xl relative">
          {dismissable && (
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}

          <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center mb-4 text-orange-400 mx-auto">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
          </div>
          
          <h2 className="text-xl font-bold text-white text-center mb-2">Enter API Key</h2>
          <p className="text-slate-400 text-xs text-center mb-6 leading-relaxed">
            To use LinguaFlow, you need a Gemini API Key. Your key is stored locally in your browser and never sent to our servers.
          </p>

          <input 
            type="password" 
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500/50 mb-4 transition-colors placeholder:text-slate-600"
          />

          <button 
            onClick={() => onSave(inputVal)}
            disabled={!inputVal}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-purple-600 rounded-xl text-white font-semibold text-sm shadow-lg shadow-orange-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Key
          </button>
          
          <div className="mt-4 text-center">
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-slate-500 hover:text-white underline underline-offset-2 transition-colors">
              Get a Gemini API Key here
            </a>
          </div>
       </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
