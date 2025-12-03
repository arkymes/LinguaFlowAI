
import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export const UserProfile: React.FC = () => {
    const { user, logout, signInWithGoogle } = useAuth();

    if (!user) {
        return (
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-white">
                <h3 className="text-lg font-bold mb-2">Profile</h3>
                <p className="text-sm text-gray-300 mb-4">Sign in to save your progress and level up!</p>
                <button
                    onClick={signInWithGoogle}
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Sign in with Google
                </button>
            </div>
        );
    }

    const xpPercentage = Math.min(100, (user.currentXp / user.nextLevelXp) * 100);

    return (
        <div className="p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-white w-full max-w-sm">
            <div className="flex items-center gap-4 mb-4">
                {user.photoURL ? (
                    <img src={user.photoURL} alt={user.username} className="w-12 h-12 rounded-full border-2 border-blue-400" />
                ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-xl font-bold">
                        {user.username.charAt(0).toUpperCase()}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold truncate">{user.username}</h3>
                    <div className="text-xs text-blue-300 font-medium">Level {user.level} Scholar</div>
                </div>
            </div>

            <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300">XP Progress</span>
                    <span className="text-blue-300">{user.currentXp} / {user.nextLevelXp} XP</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${xpPercentage}%` }}
                    ></div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-xl font-bold text-yellow-400">{user.streakDays} 🔥</div>
                    <div className="text-xs text-gray-400">Day Streak</div>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-xl font-bold text-green-400">{user.totalConversations} 💬</div>
                    <div className="text-xs text-gray-400">Conversations</div>
                </div>
            </div>

            <button
                onClick={logout}
                className="w-full py-2 px-4 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg text-sm font-medium transition-colors"
            >
                Sign Out
            </button>
        </div>
    );
};
    