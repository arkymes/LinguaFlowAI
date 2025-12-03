
import { User } from '../types';
import { FirebaseService } from './firebaseService';

const USER_STORAGE_KEY = 'linguaflow_user_v1';

export const UserService = {
  /**
   * Checks if a guest user exists in local storage
   */
  getLocalUser(): User | null {
    const data = localStorage.getItem(USER_STORAGE_KEY);
    if (!data) return null;
    try {
      const parsed = JSON.parse(data);
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        isGuest: true
      };
    } catch (e) {
      return null;
    }
  },

  /**
   * Creates a local guest user
   */
  createGuestUser(username: string): User {
    const newUser: User = {
      id: crypto.randomUUID(),
      username: username.trim() || 'Guest',
      createdAt: new Date(),
      level: 1,
      currentXp: 0,
      nextLevelXp: 100,
      totalConversations: 0,
      streakDays: 1,
      isGuest: true
    };
    
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    return newUser;
  },

  /**
   * Adds XP and handles saving to either LocalStorage or Cloud depending on user type
   */
  async addXp(user: User, amount: number): Promise<{ updatedUser: User, leveledUp: boolean }> {
    let newXp = user.currentXp + amount;
    let newLevel = user.level;
    let nextXp = user.nextLevelXp;
    let leveledUp = false;

    // Level Up Logic
    while (newXp >= nextXp) {
      newXp -= nextXp;
      newLevel++;
      nextXp = Math.floor(nextXp * 1.5); 
      leveledUp = true;
    }

    const updatedUser = {
      ...user,
      currentXp: newXp,
      level: newLevel,
      nextLevelXp: nextXp,
      totalConversations: user.totalConversations + 1
    };

    // Save Strategy
    if (user.isGuest) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    } else {
      // Save to Cloud
      await FirebaseService.saveUserProgress(updatedUser);
    }

    return { updatedUser, leveledUp };
  },
  
  logout() {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
};
    