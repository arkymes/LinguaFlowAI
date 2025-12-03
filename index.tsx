
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import LiveSession from './components/LiveSession';
import { SCENARIOS } from './constants';
import { Scenario, TeachingMode, User } from './types';
import { UserService } from './services/userService';
import { FirebaseService } from './services/firebaseService';

const App: React.FC = () => {
  // User State
  const [user, setUser] = useState<User | null>(null);
  const [isNewUser, setIsNewUser] = useState<boolean>(true); // Controls Onboarding View
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  // App State
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [teachingMode, setTeachingMode] = useState<TeachingMode>(TeachingMode.TEACHER);
  
  // API Key State Management
  const [apiKey, setApiKey] = useState<string>('');
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);

  // Error State for Firebase Domain Issues
  const [authErrorDomain, setAuthErrorDomain] = useState<string | null>(null);

  // Initialize App & Auth Listener
  useEffect(() => {
    // 1. Check Key (Local)
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) setApiKey(storedKey);

    // 2. Listen for Firebase Auth Changes
    const unsubscribe = FirebaseService.auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // User logged in via Google
        try {
          const { user: appUser } = await FirebaseService.syncUser(firebaseUser);
          setUser(appUser);
          setIsNewUser(false);
          // Only prompt key if missing
          if (!storedKey) setShowKeyModal(true);
        } catch (e) {
          console.error("Sync failed", e);
        }
      } else {
        // No Firebase User, check for Local Guest
        const localUser = UserService.getLocalUser();
        if (localUser) {
          setUser(localUser);
          setIsNewUser(false);
          if (!storedKey) setShowKeyModal(true);
        } else {
          // Really new user
          setUser(null);
          setIsNewUser(true);
        }
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setAuthErrorDomain(null); // Clear previous errors
      await FirebaseService.loginWithGoogle();
      // onAuthStateChanged will handle the rest
    } catch (e: any) {
      console.error("Login Error Full:", e);
      
      const errorCode = e.code || '';
      const errorMessage = e.message || '';

      // Check for Unauthorized Domain Error (More robust check)
      if (errorCode === 'auth/unauthorized-domain' || errorMessage.includes('unauthorized-domain')) {
        // Fallback sequence to ensure we always get a string
        const currentDomain = window.location.hostname || window.location.host || window.location.href || "Current Domain";
        setAuthErrorDomain(currentDomain);
      } else if (errorCode === 'auth/configuration-not-found') {
        alert("CONFIG ERROR: Google Sign-In is not enabled.\nGo to Firebase Console -> Authentication -> Sign-in method -> Enable Google.");
      } else if (errorCode === 'auth/popup-closed-by-user') {
        // User closed window, ignore
      } else {
        alert(`Login Failed: ${errorMessage}`);
      }
    }
  };

  const handleCreateGuest = (username: string) => {
    const newUser = UserService.createGuestUser(username);
    setUser(newUser);
    setIsNewUser(false);
    if (!apiKey) setShowKeyModal(true);
  };

  const handleLogout = async () => {
    if (user?.isGuest) {
      UserService.logout();
      setUser(null);
      setIsNewUser(true);
    } else {
      await FirebaseService.logout();
      // onAuthStateChanged will set user to null or guest
    }
  };

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

  const handleSessionExit = () => {
    setActiveScenario(null);
  };

  if (isLoadingAuth) {
    return <div className="h-full w-full bg-black flex items-center justify-center text-white">Loading...</div>;
  }

  // --- VIEW: ONBOARDING ---
  if (isNewUser) {
    return (
      <>
        <OnboardingView onCreateGuest={handleCreateGuest} onGoogleLogin={handleGoogleLogin} />
        {/* Force render if string exists, ensures 'false' string doesn't hide it */}
        {authErrorDomain && (
          <AuthErrorModal domain={authErrorDomain} onClose={() => setAuthErrorDomain(null)} />
        )}
      </>
    );
  }

  // --- VIEW: LIVE SESSION ---
  if (activeScenario && apiKey && user) {
    return (
      <LiveSession 
        scenario={activeScenario} 
        mode={teachingMode} 
        apiKey={apiKey}
        onExit={handleSessionExit} 
      />
    );
  }

  // --- VIEW: DASHBOARD ---
  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto md:max-w-full md:flex-row md:items-center md:justify-center relative">
      
      {/* Mobile Ambient Background */}
      <div className="ambient-glow"></div>
      
      {/* Orange Glow Spot (Top Left) */}
      <div className="fixed top-[-10%] left-[-20%] w-[300px] h-[300px] bg-orange-500/20 rounded-full blur-[100px] pointer-events-none md:w-[500px] md:h-[500px]"></div>

      {/* Main App Container */}
      <main className="flex-1 flex flex-col h-full w-full max-w-[480px] mx-auto p-6 md:h-[800px] md:max-h-[90vh] md:border md:border-white/5 md:rounded-[40px] md:bg-black/20 md:backdrop-blur-3xl md:shadow-2xl overflow-hidden relative">
        
        {/* Header Section with User Stats */}
        <header className="flex justify-between items-start mb-8 pt-4">
           <div>
             <h2 className="text-slate-400 text-xs font-medium tracking-wide mb-1 uppercase">Welcome back</h2>
             <h1 className="text-3xl font-bold text-white tracking-tight">{user?.username}</h1>
             
             {/* Gamification Badge */}
             <div className="flex items-center gap-3 mt-3">
               <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_#f97316]"></div>
                 <span className="text-[10px] font-bold text-orange-400 tracking-wider">LVL {user?.level}</span>
               </div>
               {/* XP Bar */}
               <div className="h-1.5 w-24 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-purple-500" 
                    style={{ width: `${(user ? (user.currentXp / user.nextLevelXp) * 100 : 0)}%` }}
                  ></div>
               </div>
             </div>
           </div>
           
           {/* Profile / Logout */}
           <div className="flex gap-3">
             <button 
                onClick={() => setShowKeyModal(true)}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white"
             >
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
             </button>
             
             <button 
                onClick={handleLogout}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity"
             >
               {user?.photoURL ? (
                 <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
               )}
             </button>
           </div>
        </header>

        {/* Mode Selector (Segmented Control) */}
        <div className="bg-white/5 p-1 rounded-full flex relative mb-8 backdrop-blur-md border border-white/5">
           <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white/10 rounded-full transition-all duration-300 ease-out shadow-sm ${
             teachingMode === TeachingMode.FLUENCY ? 'left-[calc(50%+2px)]' : 'left-1'
           }`}></div>

           <button 
             onClick={() => setTeachingMode(TeachingMode.TEACHER)}
             className={`flex-1 relative z-10 py-3 text-xs font-medium text-center transition-colors uppercase tracking-wider ${
               teachingMode === TeachingMode.TEACHER ? 'text-white' : 'text-slate-500'
             }`}
           >
             Teacher Mode
           </button>
           <button 
             onClick={() => setTeachingMode(TeachingMode.FLUENCY)}
             className={`flex-1 relative z-10 py-3 text-xs font-medium text-center transition-colors uppercase tracking-wider ${
               teachingMode === TeachingMode.FLUENCY ? 'text-white' : 'text-slate-500'
             }`}
           >
             Fluency Mode
           </button>
        </div>

        {/* Scenarios List */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
           <div className="flex justify-between items-end mb-4 px-1">
             <h3 className="text-xl font-semibold text-white">Select Scenario</h3>
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
               </button>
             ))}
           </div>
        </div>
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
      
      {/* Auth Error Modal for Domain Issues */}
      {authErrorDomain && (
        <AuthErrorModal domain={authErrorDomain} onClose={() => setAuthErrorDomain(null)} />
      )}
    </div>
  );
};

// --- SUB-COMPONENT: AUTH ERROR MODAL ---
const AuthErrorModal: React.FC<{ domain: string, onClose: () => void }> = ({ domain, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
       <div className="w-full max-w-sm bg-[#1a0505] border border-red-500/30 p-8 rounded-[32px] shadow-[0_0_50px_rgba(239,68,68,0.2)] text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-red-400/50 hover:text-red-400">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6 text-red-500 animate-pulse">
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>

          <h2 className="text-xl font-bold text-red-400 mb-2">Access Denied</h2>
          <p className="text-red-200/60 text-xs mb-6 leading-relaxed">
            Firebase blocked the login because this website domain is not in your authorized list.
          </p>

          <div className="bg-black/40 border border-red-900/50 rounded-xl p-4 mb-6 relative group">
             <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">You must authorize this domain:</p>
             <code className="block text-red-200 font-mono text-sm break-all select-all">{domain}</code>
             {/* Simple Copy Hint */}
             <div className="absolute right-2 bottom-2 text-[10px] text-slate-600 opacity-50">Select to copy</div>
          </div>

          <p className="text-[10px] text-slate-500 leading-tight mb-6">
            Go to Firebase Console &rarr; Authentication &rarr; Settings &rarr; Authorized Domains &rarr; Add Domain
          </p>

          <button 
            onClick={onClose}
            className="w-full py-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 font-bold text-sm hover:bg-red-500/20 transition-all"
          >
            I Understand
          </button>
       </div>
    </div>
  );
};

// --- SUB-COMPONENT: ONBOARDING VIEW ---
const OnboardingView: React.FC<{ onCreateGuest: (name: string) => void, onGoogleLogin: () => void }> = ({ onCreateGuest, onGoogleLogin }) => {
  const [name, setName] = useState('');
  const [isManual, setIsManual] = useState(false);

  return (
    <div className="h-full w-full flex items-center justify-center bg-[#050505] p-6 relative overflow-hidden">
       {/* Ambient Blobs */}
       <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] animate-pulse"></div>
       <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-orange-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

       <div className="w-full max-w-sm relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-orange-900/30 mb-8 rotate-3 hover:rotate-6 transition-transform duration-500">
             <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2 text-center tracking-tight">LinguaFlow</h1>
          <p className="text-slate-400 text-sm text-center mb-10 max-w-[200px] leading-relaxed">
             AI-Powered Fluency.
          </p>

          {/* Google Button */}
          <button 
             onClick={onGoogleLogin}
             className="w-full py-4 bg-white rounded-xl text-black font-bold tracking-wide hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 mb-4"
          >
             <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
             </svg>
             Continue with Google
          </button>

          {!isManual ? (
            <button onClick={() => setIsManual(true)} className="text-slate-500 text-xs hover:text-white transition-colors">
              Continue as Guest
            </button>
          ) : (
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="w-full glass-panel p-1 rounded-2xl flex items-center mb-4">
                <input 
                  type="text" 
                  placeholder="Guest Name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent border-none text-white text-center py-3 placeholder:text-slate-600 focus:ring-0 focus:outline-none"
                />
              </div>
              <button 
                onClick={() => onCreateGuest(name)}
                disabled={!name.trim()}
                className="w-full py-3 bg-white/10 rounded-xl text-white font-semibold border border-white/10 hover:bg-white/20 transition-all disabled:opacity-50"
              >
                Start as Guest
              </button>
            </div>
          )}
       </div>
    </div>
  );
};

// --- SUB-COMPONENT: API KEY MODAL ---
const ApiKeyModal: React.FC<{ initialKey: string, onSave: (k: string) => void, onClose: () => void, dismissable: boolean }> = ({ initialKey, onSave, onClose, dismissable }) => {
  const [inputVal, setInputVal] = useState(initialKey);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
       <div className="w-full max-w-sm glass-panel p-8 rounded-[32px] border border-white/10 shadow-2xl relative">
          {dismissable && (
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}

          <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center mb-4 text-orange-400 mx-auto">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
          </div>
          
          <h2 className="text-xl font-bold text-white text-center mb-2">Unlock the AI</h2>
          <p className="text-slate-400 text-xs text-center mb-6 leading-relaxed">
            Enter your Gemini API Key. It's stored securely on your device.
          </p>

          <input 
            type="password" 
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Paste API Key here..."
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500/50 mb-4 transition-colors placeholder:text-slate-600 text-center"
          />

          <button 
            onClick={() => onSave(inputVal)}
            disabled={!inputVal}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-purple-600 rounded-xl text-white font-semibold text-sm shadow-lg shadow-orange-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save & Continue
          </button>
          
          <div className="mt-4 text-center">
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-slate-500 hover:text-white underline underline-offset-2 transition-colors">
              Get a free Gemini API Key
            </a>
          </div>
       </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
