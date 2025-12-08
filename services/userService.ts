
import { User } from '../types';
import { FirebaseService } from './firebaseService';
import { CURRICULUM } from '../constants';

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
      // Ensure lessons exist for legacy local users, merging new curriculum
      if (!parsed.lessons || parsed.lessons.length < CURRICULUM.length) {
          const existingIds = new Set(parsed.lessons ? parsed.lessons.map((l:any) => l.id) : []);
          const newLessons = CURRICULUM.filter(l => !existingIds.has(l.id));
          parsed.lessons = [...(parsed.lessons || []), ...newLessons];
      }
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        isGuest: true,
        customScenarios: parsed.customScenarios || []
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
      nextLevelXp: 500, // Harder start
      totalConversations: 0,
      streakDays: 1,
      isGuest: true,
      lessons: CURRICULUM, // Initialize Full Curriculum
      customScenarios: []
    };
    
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    return newUser;
  },

  /**
   * Save full user object locally (for guests)
   */
  saveLocalUser(user: User): void {
    if (user.isGuest) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }
  },

  /**
   * Adds XP and handles saving to either LocalStorage or Cloud depending on user type
   * Uses EXPONENTIAL leveling curve.
   */
  async addXp(user: User, amount: number): Promise<{ updatedUser: User, leveledUp: boolean }> {
    let newXp = user.currentXp + amount;
    let newLevel = user.level;
    let nextXp = user.nextLevelXp;
    let leveledUp = false;

    // Harder Level Up Logic: 500 * level^2
    // Lvl 1 -> 2: 500 XP
    // Lvl 2 -> 3: 2000 XP
    // Lvl 3 -> 4: 4500 XP
    // Lvl 5 -> 6: 12500 XP
    while (newXp >= nextXp) {
      newXp -= nextXp;
      newLevel++;
      nextXp = 500 * Math.pow(newLevel, 2);
      leveledUp = true;
    }

    const updatedUser = {
      ...user,
      currentXp: newXp,
      level: newLevel,
      nextLevelXp: nextXp,
      totalConversations: user.totalConversations + 1
    };
    
    // Unlock new lessons based on level
    if (updatedUser.lessons) {
       updatedUser.lessons = updatedUser.lessons.map(l => {
         // Unlock logic: If locked AND user level is high enough
         if (l.status === 'LOCKED' && updatedUser.level >= l.levelRequired) {
             return { ...l, status: 'READY' };
         }
         return l;
       });
    }

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
