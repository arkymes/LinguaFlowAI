
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore/lite';
import { User } from '../types';
import { auth, db } from '../firebaseConfig';
import { CURRICULUM } from '../constants';

export const FirebaseService = {
  auth,
  db,

  /**
   * SignIn with Google Popup
   */
  async loginWithGoogle(): Promise<{ user: User, isNew: boolean }> {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;

      // Sync with Firestore to get XP/Level
      return await this.syncUser(fbUser);
    } catch (error) {
      console.error("Google Login Error:", error);
      throw error;
    }
  },

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await firebaseSignOut(auth);
  },

  /**
   * Syncs Firebase Auth user with Firestore Database
   * If user doesn't exist in DB, creates them.
   */
  async syncUser(fbUser: FirebaseUser): Promise<{ user: User, isNew: boolean }> {
    const userRef = doc(db, 'users', fbUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      // Existing User: Return data
      const data = userSnap.data();
      
      // Ensure lessons array exists for older users
      let lessons = data.lessons || CURRICULUM;
      
      return {
        user: {
          id: fbUser.uid,
          username: data.username || fbUser.displayName || 'User',
          email: fbUser.email || undefined,
          photoURL: fbUser.photoURL || undefined,
          createdAt: data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date(),
          level: data.level || 1,
          currentXp: data.currentXp || 0,
          nextLevelXp: data.nextLevelXp || 500,
          totalConversations: data.totalConversations || 0,
          streakDays: data.streakDays || 1,
          dailyMissions: data.dailyMissions || [], 
          lessons: lessons,
          customScenarios: data.customScenarios || [],
          isGuest: false
        },
        isNew: false
      };
    } else {
      // New User: Create record
      const newUser: User = {
        id: fbUser.uid,
        username: fbUser.displayName || 'Traveler',
        email: fbUser.email || undefined,
        photoURL: fbUser.photoURL || undefined,
        createdAt: new Date(),
        level: 1,
        currentXp: 0,
        nextLevelXp: 500, // Harder start
        totalConversations: 0,
        streakDays: 1,
        isGuest: false,
        lessons: CURRICULUM,
        customScenarios: []
      };

      // Save to Firestore
      await setDoc(userRef, {
        ...newUser,
        createdAt: newUser.createdAt
      });

      return { user: newUser, isNew: true };
    }
  },

  /**
   * Save progress to Firestore
   */
  async saveUserProgress(user: User): Promise<void> {
    if (user.isGuest) return; // Don't save guest to cloud

    try {
      const userRef = doc(db, 'users', user.id);
      const payload: any = {
        level: user.level,
        currentXp: user.currentXp,
        nextLevelXp: user.nextLevelXp,
        totalConversations: user.totalConversations,
        streakDays: user.streakDays
      };
      
      // Persist missions if they exist
      if (user.dailyMissions) {
          payload.dailyMissions = user.dailyMissions;
      }
      
      // Persist lessons
      if (user.lessons) {
          payload.lessons = user.lessons;
      }

      // Persist custom scenarios
      if (user.customScenarios) {
          payload.customScenarios = user.customScenarios;
      }

      await setDoc(userRef, payload, { merge: true });
    } catch (e) {
      console.error("Failed to save progress to cloud", e);
    }
  }
};
