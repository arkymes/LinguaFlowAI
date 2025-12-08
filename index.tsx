
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import LiveSession from './components/LiveSession';
import { SCENARIOS, LECTURE_INSTRUCTIONS, EXAM_INSTRUCTIONS, ICON_PRESETS } from './constants';
import { Scenario, TeachingMode, DailyMission, SessionEvaluation, Lesson, DifficultyLevel } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const MainContent: React.FC = () => {
  const { user, loading, error, apiKey, setApiKey, signInWithGoogle, logout, createGuest, addXp, completeMission, completeLesson, createScenario } = useAuth();

  // App State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'school' | 'missions'>('dashboard');
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [teachingMode, setTeachingMode] = useState<TeachingMode>(TeachingMode.TEACHER);
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showCompletedLessons, setShowCompletedLessons] = useState(false);

  // Error State for Firebase Domain Issues
  const [authErrorDomain, setAuthErrorDomain] = useState<string | null>(null);

  // Show key modal if needed when user is ready
  useEffect(() => {
    if (!loading && user && !apiKey) {
      setShowKeyModal(true);
    }
  }, [loading, user, apiKey]);

  const handleGoogleLogin = async () => {
    try {
      setAuthErrorDomain(null);
      await signInWithGoogle();
    } catch (e: any) {
      console.error("Login Error Caught in UI:", e);
      // Robust check for unauthorized domain
      if (e.code === 'auth/unauthorized-domain' || e.message?.includes('unauthorized-domain')) {
        const currentDomain = window.location.hostname || window.location.host || window.location.href || "Current URL";
        setAuthErrorDomain(currentDomain);
      }
    }
  };

  const handleCreateGuest = (username: string) => {
    createGuest(username);
  };

  const handleSaveKey = (key: string) => {
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

  const handleStartMission = (mission: DailyMission) => {
    if (!apiKey) {
      setShowKeyModal(true);
      return;
    }

    const missionScenario: Scenario = {
      id: `mission-${mission.id}`,
      title: mission.title,
      description: mission.description,
      iconPath: "M13 10V3L4 14h7v7l9-11h-7z", // Lightning icon
      systemPromptContext: `
        This is a DAILY MISSION.
        CONTEXT: ${mission.description}
        OBJECTIVES: ${mission.objectives.join(', ')}.
        You must help the user achieve these objectives.
      `,
      initialMessage: `Mission Start: ${mission.description} Ready?`,
      difficulty: 'ADEPT' 
    };

    setActiveScenario(missionScenario);
  };

  const handleStartLesson = (lesson: Lesson, type: 'LECTURE' | 'EXAM') => {
    if (!apiKey) {
      setShowKeyModal(true);
      return;
    }

    const isExam = type === 'EXAM';
    const isBeginner = lesson.levelRequired <= 2;

    // --- DYNAMIC LANGUAGE INSTRUCTION ---
    // For Levels 1 & 2: Teacher speaks Portuguese to explain.
    // For Levels 3+: Teacher speaks English (Immersive).
    const languageInstruction = !isExam && isBeginner 
      ? `
        *** STRICT LANGUAGE OVERRIDE ***
        You are a generic Portuguese-speaking teacher teaching English to a Brazilian student.
        1. EXPLAIN concepts in **PORTUGUESE** (Brazil).
        2. Give examples in **ENGLISH**.
        3. Ask the user to repeat or practice in **ENGLISH**.
        4. If the user struggles, explain again in Portuguese.
        5. DO NOT speak full English paragraphs. Keep it bilingual.
      ` 
      : `
        You are an advanced English Professor. 
        Speak primarily in English to encourage immersion. 
        Only use Portuguese if the user is completely stuck or asks for a translation.
      `;

    const instructions = isExam ? EXAM_INSTRUCTIONS : LECTURE_INSTRUCTIONS;
    
    const initial = isExam 
      ? `Exam time. I am your examiner. We are testing your knowledge on: ${lesson.topic}. Ready for your first question?`
      : isBeginner 
        ? `Olá! Hoje vamos aprender sobre: ${lesson.topic}. Vamos começar?` // Portuguese intro for beginners
        : `Welcome to class. Today we are discussing: ${lesson.topic}. Let's begin.`;

    const lessonScenario: Scenario = {
      id: `${type.toLowerCase()}-${lesson.id}`,
      title: `${isExam ? 'Exam' : 'Lecture'}: ${lesson.title}`,
      description: isExam ? 'Prove your knowledge.' : lesson.description,
      iconPath: isExam ? "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" : "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
      systemPromptContext: `
        ${instructions}
        ${languageInstruction}
        TOPIC: ${lesson.topic}
        TARGET LEVEL: ${lesson.levelRequired}
      `,
      initialMessage: initial,
      difficulty: isExam ? 'ELITE' : 'ROOKIE'
    };

    setActiveScenario(lessonScenario);
  };

  const handleCreateScenario = (data: Scenario) => {
      createScenario(data);
      setShowCreateModal(false);
  };

  const handleSessionExit = (stats?: { turns: number, evaluation?: SessionEvaluation }) => {
    if (stats) {
      // Award XP based on turns
      if (stats.turns > 0) {
        const xpEarned = stats.turns * 10;
        addXp(xpEarned);
      }

      // Check Mission Completion
      if (stats.evaluation && activeScenario?.id.startsWith('mission-')) {
        if (stats.evaluation.score >= 7) {
          const missionId = activeScenario.id.replace('mission-', '');
          completeMission(missionId, stats.evaluation.score);
        }
      }

      // Check Lesson Completion
      if (activeScenario && (activeScenario.id.startsWith('lecture-') || activeScenario.id.startsWith('exam-'))) {
          const isExam = activeScenario.id.startsWith('exam-');
          const lessonId = activeScenario.id.replace(isExam ? 'exam-' : 'lecture-', '');
          
          if (isExam) {
              if (stats.evaluation && stats.evaluation.score >= 7) {
                 completeLesson(lessonId, isExam, stats.evaluation.score);
              }
          } else {
              completeLesson(lessonId, isExam, 10);
          }
      }
    }
    setActiveScenario(null);
  };

  // Merge built-in scenarios with user custom scenarios
  const allScenarios = [...(user?.customScenarios || []), ...SCENARIOS];

  if (loading) {
    return <div className="h-full w-full bg-black flex items-center justify-center text-white">Loading...</div>;
  }

  // --- VIEW: ONBOARDING ---
  if (!user) {
    return (
      <>
        <OnboardingView onCreateGuest={handleCreateGuest} onGoogleLogin={handleGoogleLogin} />
        {authErrorDomain && (
          <AuthErrorModal domain={authErrorDomain} onClose={() => setAuthErrorDomain(null)} />
        )}
        {error && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-red-500/90 text-white px-6 py-3 rounded-full shadow-lg backdrop-blur-md border border-red-400/50 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        )}
      </>
    );
  }

  // --- VIEW: LIVE SESSION ---
  if (activeScenario && apiKey) {
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
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto md:max-w-full md:flex-row md:items-center md:justify-center relative">

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
            <h1 className="text-3xl font-bold text-white tracking-tight">{user.username}</h1>

            {/* Gamification Badge */}
            <div className="flex items-center gap-3 mt-3">
              <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_#f97316]"></div>
                <span className="text-[10px] font-bold text-orange-400 tracking-wider">LVL {user.level}</span>
              </div>
              {/* XP Bar */}
              <div className="h-1.5 w-24 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-purple-500"
                  style={{ width: `${(user.currentXp / user.nextLevelXp) * 100}%` }}
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
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>

            <button
              onClick={logout}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              )}
            </button>
          </div>
        </header>

        {/* Mode Selector (Segmented Control) */}
        {activeTab === 'dashboard' && (
          <div className="bg-white/5 p-1 rounded-full flex relative mb-8 backdrop-blur-md border border-white/5">
            <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white/10 rounded-full transition-all duration-300 ease-out shadow-sm ${teachingMode === TeachingMode.FLUENCY ? 'left-[calc(50%+2px)]' : 'left-1'
              }`}></div>

            <button
              onClick={() => setTeachingMode(TeachingMode.TEACHER)}
              className={`flex-1 relative z-10 py-3 text-xs font-medium text-center transition-colors uppercase tracking-wider ${teachingMode === TeachingMode.TEACHER ? 'text-white' : 'text-slate-500'
                }`}
            >
              Teacher Mode
            </button>
            <button
              onClick={() => setTeachingMode(TeachingMode.FLUENCY)}
              className={`flex-1 relative z-10 py-3 text-xs font-medium text-center transition-colors uppercase tracking-wider ${teachingMode === TeachingMode.FLUENCY ? 'text-white' : 'text-slate-500'
                }`}
            >
              Fluency Mode
            </button>
          </div>
        )}

        {/* Tabs Content */}
        {activeTab === 'dashboard' ? (
          <>
            {/* Scenarios List */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-40">
              <div className="flex justify-between items-end mb-4 px-1">
                <div className="flex items-center gap-3">
                   <h3 className="text-xl font-semibold text-white">Select Scenario</h3>
                   <button 
                     onClick={() => setShowCreateModal(true)}
                     className="w-8 h-8 rounded-full border border-emerald-500/50 bg-emerald-500/10 flex items-center justify-center text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-900/20"
                     title="Create Custom Scenario"
                   >
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                     </svg>
                   </button>
                </div>
              </div>

              <div className="space-y-4">
                {allScenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => handleScenarioSelect(scenario)}
                    className={`w-full text-left p-4 rounded-[28px] glass-button flex items-center gap-5 group hover:bg-white/10 ${scenario.isCustom ? 'border-emerald-500/30' : ''}`}
                  >
                    {/* Icon Container */}
                    <div className={`w-16 h-16 rounded-[20px] flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 shadow-lg ${scenario.difficulty === 'ROOKIE' ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-400 shadow-emerald-900/20' :
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
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${scenario.difficulty === 'ROOKIE' ? 'bg-emerald-500/10 text-emerald-400' :
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
          </>
        ) : activeTab === 'school' ? (
           /* School Tab */
           <div className="flex-1 overflow-y-auto no-scrollbar pb-40">
              <div className="flex justify-between items-end mb-4 px-1">
                <h3 className="text-xl font-semibold text-white">Current Curriculum</h3>
              </div>
              
              <div className="space-y-4 mb-8">
                 {/* To Do Lessons */}
                 {user.lessons?.filter(l => l.status !== 'COMPLETED').map(lesson => (
                    <div key={lesson.id} className={`relative overflow-hidden rounded-[28px] p-6 border ${lesson.status === 'LOCKED' ? 'border-white/5 bg-white/5 opacity-60' : 'border-indigo-500/30 bg-indigo-900/10'}`}>
                        {lesson.status === 'LOCKED' && (
                           <div className="absolute top-4 right-4 text-slate-500">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                           </div>
                        )}
                        <h4 className="font-bold text-lg mb-1 text-white">{lesson.title}</h4>
                        <div className="flex items-center gap-2 mb-2">
                           <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Level {lesson.levelRequired}</span>
                           {lesson.status === 'EXAM_READY' && <span className="text-[10px] uppercase font-bold text-pink-400 tracking-wider animate-pulse">Exam Ready</span>}
                        </div>
                        <p className="text-slate-400 text-xs mb-6 leading-relaxed">{lesson.description}</p>
                        
                        {lesson.status === 'LOCKED' ? (
                             <div className="w-full py-3 bg-white/5 rounded-xl font-bold text-slate-500 text-sm text-center border border-white/5">
                                 Unlock at Level {lesson.levelRequired}
                             </div>
                        ) : lesson.status === 'READY' ? (
                             <button onClick={() => handleStartLesson(lesson, 'LECTURE')} className="w-full py-3 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-xl font-bold text-white text-sm shadow-lg shadow-indigo-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                 Start Lecture
                             </button>
                        ) : (
                             <button onClick={() => handleStartLesson(lesson, 'EXAM')} className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl font-bold text-white text-sm shadow-lg shadow-pink-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                 Take Exam
                             </button>
                        )}
                    </div>
                 ))}
              </div>

              {/* Completed Lessons Accordion */}
              <div className="mb-4">
                  <button onClick={() => setShowCompletedLessons(!showCompletedLessons)} className="flex items-center justify-between w-full p-2 text-slate-500 hover:text-white transition-colors group">
                      <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider group-hover:text-indigo-400 transition-colors">Completed Studies</span>
                          <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{user.lessons?.filter(l => l.status === 'COMPLETED').length || 0}</span>
                      </div>
                      <svg className={`w-4 h-4 transition-transform duration-300 ${showCompletedLessons ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  
                  {showCompletedLessons && (
                      <div className="space-y-3 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                          {user.lessons?.filter(l => l.status === 'COMPLETED').map(lesson => (
                              <div key={lesson.id} className="p-4 rounded-[20px] bg-white/5 border border-white/10 relative group hover:bg-white/10 transition-colors">
                                  <div className="flex justify-between items-start mb-3">
                                      <div>
                                          <h5 className="text-sm font-bold text-slate-200">{lesson.title}</h5>
                                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{lesson.topic}</p>
                                      </div>
                                      <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                                          <span className="text-emerald-400 font-bold text-xs">{lesson.score}/10</span>
                                      </div>
                                  </div>
                                  
                                  {/* Retake Buttons */}
                                  <div className="flex gap-2">
                                      <button 
                                        onClick={() => handleStartLesson(lesson, 'LECTURE')}
                                        className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-300 text-[10px] font-bold text-slate-400 uppercase tracking-wide border border-white/5 transition-all"
                                      >
                                          Review Lecture
                                      </button>
                                      <button 
                                        onClick={() => handleStartLesson(lesson, 'EXAM')}
                                        className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-pink-500/20 hover:text-pink-300 text-[10px] font-bold text-slate-400 uppercase tracking-wide border border-white/5 transition-all"
                                      >
                                          Retake Exam
                                      </button>
                                  </div>
                              </div>
                          ))}
                          {(!user.lessons || !user.lessons.some(l => l.status === 'COMPLETED')) && (
                              <div className="text-center text-xs text-slate-600 py-6 border border-dashed border-white/10 rounded-xl">
                                  No completed lessons yet. <br/> Complete a lesson to see it here.
                              </div>
                          )}
                      </div>
                  )}
              </div>
           </div>
        ) : (
          /* Missions Tab */
          <div className="flex-1 overflow-y-auto no-scrollbar pb-40">
            <div className="flex justify-between items-end mb-4 px-1">
              <h3 className="text-xl font-semibold text-white">Daily Operations</h3>
               <div className="flex items-center gap-2">
                   <button onClick={user?.dailyMissions ? () => {/* Regenerate logic handled by effect on empty/date mismatch, manual refresh could be added here */ } : undefined} className="text-slate-500 hover:text-white">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                   </button>
                  <span className="text-xs text-slate-400">{new Date().toLocaleDateString()}</span>
               </div>
            </div>

            <div className="space-y-4">
              {user.dailyMissions?.map((mission) => (
                <div key={mission.id} className={`relative overflow-hidden rounded-[28px] p-6 group border ${mission.isCompleted ? 'border-emerald-500/30 bg-emerald-900/10' : 'border-white/5 bg-white/5'}`}>
                  {mission.isCompleted && (
                    <div className="absolute top-4 right-4 text-emerald-400">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}

                  <h4 className={`font-bold text-lg mb-2 ${mission.isCompleted ? 'text-emerald-400' : 'text-white'}`}>{mission.title}</h4>
                  <p className="text-slate-400 text-xs mb-4 leading-relaxed">{mission.description}</p>

                  <div className="space-y-2 mb-6">
                    {mission.objectives.map((obj, i) => (
                      <div key={i} className="flex items-center gap-2 text-slate-300 text-xs">
                        <div className={`w-1.5 h-1.5 rounded-full ${mission.isCompleted ? 'bg-emerald-500' : 'bg-white/30'}`}></div>
                        {obj}
                      </div>
                    ))}
                  </div>

                  {!mission.isCompleted ? (
                    <button
                      onClick={() => handleStartMission(mission)}
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-bold text-white text-sm shadow-lg shadow-orange-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Start Mission
                    </button>
                  ) : (
                    <div className="w-full py-3 bg-emerald-500/10 rounded-xl font-bold text-emerald-400 text-sm text-center border border-emerald-500/20">
                      Completed (+{50 + (mission.score || 0) * 5} XP)
                    </div>
                  )}
                </div>
              ))}

              {(!user.dailyMissions || user.dailyMissions.length === 0) && (
                <div className="text-center py-10 text-slate-500 text-sm">
                  Generating missions...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="absolute bottom-6 left-6 right-6 h-16 bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-around px-2 z-20 shadow-2xl">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center w-16 h-full transition-all ${activeTab === 'dashboard' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
            </svg>
            <span className="text-[9px] font-bold uppercase tracking-wider">Home</span>
          </button>

          <button
            onClick={() => setActiveTab('school')}
            className={`flex flex-col items-center justify-center w-16 h-full transition-all ${activeTab === 'school' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-[9px] font-bold uppercase tracking-wider">School</span>
          </button>

          <button
            onClick={() => setActiveTab('missions')}
            className={`flex flex-col items-center justify-center w-16 h-full transition-all ${activeTab === 'missions' ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <div className="relative">
              <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {user.dailyMissions?.some(m => !m.isCompleted) && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-[#1a1a1a]"></div>
              )}
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider">Missions</span>
          </button>
        </div>
      </main>

      {/* API Key Modal */}
      {showKeyModal && (
        <ApiKeyModal
          initialKey={apiKey}
          onSave={handleSaveKey}
          onClose={() => apiKey ? setShowKeyModal(false) : null}
          dismissable={!!apiKey}
        />
      )}

      {/* Create Scenario Modal */}
      {showCreateModal && (
        <CreateScenarioModal onClose={() => setShowCreateModal(false)} onSave={handleCreateScenario} />
      )}

      {/* Auth Error Modal for Domain Issues */}
      {authErrorDomain && (
        <AuthErrorModal domain={authErrorDomain} onClose={() => setAuthErrorDomain(null)} />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
};

// --- SUB-COMPONENT: CREATE SCENARIO MODAL ---
const CreateScenarioModal: React.FC<{ onClose: () => void, onSave: (s: Scenario) => void }> = ({ onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [diff, setDiff] = useState<DifficultyLevel>('ROOKIE');
    const [icon, setIcon] = useState(ICON_PRESETS[0]);
    const [context, setContext] = useState('');
    const [intro, setIntro] = useState('');
    const [hiddenContext, setHiddenContext] = useState(''); // New hidden field
    const [step, setStep] = useState(1);

    const handleSubmit = () => {
        // Append hidden context to main context
        const fullContext = hiddenContext 
            ? `${context}\n\nADDITIONAL CONTEXT (HIDDEN FROM USER CARD):\n${hiddenContext}` 
            : context;

        const newScenario: Scenario = {
            id: `custom-${Date.now()}`,
            title,
            description: desc,
            difficulty: diff,
            iconPath: icon.path,
            systemPromptContext: fullContext,
            initialMessage: intro,
            isCustom: true
        };
        onSave(newScenario);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-[32px] p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Create Scenario</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-5">
                    {/* Step 1: Basics */}
                    {step === 1 && (
                        <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
                            <div>
                                <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1 block">Title</label>
                                <input 
                                    type="text" 
                                    value={title} 
                                    onChange={e => setTitle(e.target.value)} 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 placeholder:text-slate-700"
                                    placeholder="e.g. Job Interview at Google"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1 block">Description (Visible)</label>
                                <input 
                                    type="text" 
                                    value={desc} 
                                    onChange={e => setDesc(e.target.value)} 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 placeholder:text-slate-700"
                                    placeholder="Short description for the card"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1 block">Difficulty</label>
                                <div className="flex gap-2">
                                    {(['ROOKIE', 'ADEPT', 'ELITE'] as const).map(d => (
                                        <button 
                                            key={d}
                                            onClick={() => setDiff(d)}
                                            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${diff === d ? 'bg-white text-black border-white' : 'bg-transparent text-slate-500 border-white/10 hover:border-white/30'}`}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-2 block">Choose Icon</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {ICON_PRESETS.map((ic, idx) => (
                                        <button 
                                            key={idx} 
                                            onClick={() => setIcon(ic)}
                                            className={`aspect-square rounded-xl flex items-center justify-center border transition-all ${icon.name === ic.name ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}
                                            title={ic.name}
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ic.path} />
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: AI Config */}
                    {step === 2 && (
                        <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
                             <div>
                                <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1 block">AI Persona (Short)</label>
                                <textarea 
                                    value={context} 
                                    onChange={e => setContext(e.target.value)} 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 placeholder:text-slate-700 h-24 resize-none"
                                    placeholder="e.g. You are a hiring manager. You are strict."
                                />
                            </div>

                            {/* HIDDEN CONTEXT FIELD */}
                            <div>
                                <label className="text-[10px] uppercase text-amber-500 font-bold tracking-wider mb-1 block flex items-center gap-2">
                                    Additional Context (Hidden)
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                </label>
                                <textarea 
                                    value={hiddenContext} 
                                    onChange={e => setHiddenContext(e.target.value)} 
                                    className="w-full bg-black/40 border border-amber-500/20 rounded-xl px-4 py-3 text-slate-300 text-xs focus:outline-none focus:border-amber-500/50 placeholder:text-slate-700 h-32 resize-none font-mono"
                                    placeholder="Paste full job description, specific details, or secret instructions here. The user won't see this on the card."
                                />
                            </div>

                            <div>
                                <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1 block">Initial Message</label>
                                <input 
                                    type="text" 
                                    value={intro} 
                                    onChange={e => setIntro(e.target.value)} 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 placeholder:text-slate-700"
                                    placeholder="e.g. Hello, take a seat. Tell me about yourself."
                                />
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="mt-6 flex gap-3">
                    {step === 2 && (
                        <button onClick={() => setStep(1)} className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-white text-sm transition-all">
                            Back
                        </button>
                    )}
                    <button 
                        onClick={() => step === 1 ? setStep(2) : handleSubmit()}
                        disabled={step === 1 ? (!title || !desc) : (!context || !intro)}
                        className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl font-bold text-white text-sm shadow-lg shadow-emerald-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {step === 1 ? 'Next' : 'Create Scenario'}
                    </button>
                </div>
            </div>
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
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
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
  const [pasteError, setPasteError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePaste = async () => {
    try {
      setPasteError(false);
      // Check if clipboard API is available
      if (!navigator.clipboard || !navigator.clipboard.readText) {
          throw new Error("Clipboard API not supported or blocked");
      }
      const text = await navigator.clipboard.readText();
      if (text) setInputVal(text);
    } catch (err) {
      // Log as warn to avoid scary error in console for expected permission blocks
      console.warn('Clipboard access failed (likely blocked by browser policy):', err);
      setPasteError(true);
      // Automatically focus the input to allow manual paste (Ctrl+V / Long Press)
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

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

        <div className="relative w-full mb-4">
          <input
            ref={inputRef}
            type="password"
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              if (pasteError) setPasteError(false);
            }}
            placeholder="Paste API Key here..."
            className={`w-full bg-black/40 border ${pasteError ? 'border-red-500/50' : 'border-white/10'} rounded-xl pl-4 pr-12 py-3 text-white text-sm focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-slate-600 text-center`}
          />
          <button 
            onClick={handlePaste}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Paste from Clipboard"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
        </div>
        
        {pasteError && (
            <div className="text-[10px] text-red-400 text-center mb-4 -mt-2 animate-pulse">
                Clipboard access blocked. Please paste manually.
            </div>
        )}

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
