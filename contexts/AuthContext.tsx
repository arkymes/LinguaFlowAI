
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { UserService } from '../services/userService';
import { FirebaseService } from '../services/firebaseService';
import { AIService } from '../services/aiService';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    apiKey: string;
    setApiKey: (key: string) => void;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    createGuest: (username: string) => void;
    addXp: (amount: number) => Promise<void>;
    refreshMission: () => Promise<void>;
    completeMission: (missionId: string, score: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [apiKey, setApiKeyState] = useState<string>('');

    // Load API Key
    useEffect(() => {
        const storedKey = localStorage.getItem('gemini_api_key');
        if (storedKey) setApiKeyState(storedKey);
    }, []);

    const setApiKey = (key: string) => {
        setApiKeyState(key);
        localStorage.setItem('gemini_api_key', key);
    };

    // Check Daily Mission
    useEffect(() => {
        const checkMission = async () => {
            if (user && apiKey && !user.isGuest) {
                const today = new Date().toISOString().split('T')[0];
                // Check if missions exist and are from today
                if (!user.dailyMissions || user.dailyMissions.length === 0 || user.dailyMissions[0].date !== today) {
                    try {
                        console.log("Generating Daily Missions...");
                        const missions = await AIService.generateDailyMissions(apiKey, user.level);
                        const updatedUser = { ...user, dailyMissions: missions };
                        setUser(updatedUser);
                        // Save to DB (optional, but good for persistence)
                        // await FirebaseService.saveUserProgress(updatedUser); 
                    } catch (e) {
                        console.error("Failed to generate missions", e);
                    }
                }
            }
        };
        checkMission();
    }, [user?.id, apiKey]);

    useEffect(() => {
        // Check for local guest user first
        const localUser = UserService.getLocalUser();
        if (localUser) {
            setUser(localUser);
            setLoading(false);
        }

        // Listen for Firebase Auth changes
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            if (fbUser) {
                // User is signed in with Firebase
                try {
                    const { user: syncedUser } = await FirebaseService.syncUser(fbUser);
                    setUser(syncedUser);
                    setError(null);
                } catch (error: any) {
                    console.error("Failed to sync user", error);
                    setError(`Sync Error: ${error.message || 'Unknown error'}`);
                    // Force logout if sync fails to avoid stuck state
                    await FirebaseService.logout();
                    setUser(null);
                }
            } else {
                // User is signed out of Firebase
                if (!localUser) {
                    setUser(null);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        try {
            setError(null);
            const { user: newUser } = await FirebaseService.loginWithGoogle();
            setUser(newUser);
            localStorage.removeItem('linguaflow_user_v1');
        } catch (error: any) {
            console.error("Login failed", error);
            setError(`Login Failed: ${error.message || 'Unknown error'}`);
            throw error; // RETHROW so UI can catch specific codes like authorized-domain
        }
    };

    const logout = async () => {
        await FirebaseService.logout();
        UserService.logout(); // Clears local storage
        setUser(null);
        setError(null);
    };

    const createGuest = (username: string) => {
        const guest = UserService.createGuestUser(username);
        setUser(guest);
        setError(null);
    };

    const addXp = async (amount: number) => {
        if (!user) return;
        const { updatedUser, leveledUp } = await UserService.addXp(user, amount);
        setUser(updatedUser);
        if (leveledUp) {
            console.log("Level Up!", updatedUser.level);
        }
    };

    const refreshMission = async () => {
        if (user && apiKey) {
            const missions = await AIService.generateDailyMissions(apiKey, user.level);
            setUser({ ...user, dailyMissions: missions });
        }
    };

    const completeMission = async (missionId: string, score: number) => {
        if (!user || !user.dailyMissions) return;

        const updatedMissions = user.dailyMissions.map(m =>
            m.id === missionId ? { ...m, isCompleted: true, score } : m
        );

        const xpBonus = 50 + (score * 5); // Base 50 + 5 per score point

        const { updatedUser, leveledUp } = await UserService.addXp(user, xpBonus);

        const finalUser = { ...updatedUser, dailyMissions: updatedMissions };
        setUser(finalUser);

        await FirebaseService.saveUserProgress(finalUser);
        console.log(`Mission ${missionId} Completed! Score: ${score}, XP Bonus: ${xpBonus}`);
    };

    return (
        <AuthContext.Provider value={{ user, loading, error, apiKey, setApiKey, signInWithGoogle, logout, createGuest, addXp, refreshMission, completeMission }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
