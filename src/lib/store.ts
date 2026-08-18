import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  xp: number;
  level: number;
  streak: number;
  addXP: (amount: number) => void;
  incrementStreak: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      xp: 2450,
      level: 12,
      streak: 12,
      addXP: (amount) => set((state) => {
        const newXp = state.xp + amount;
        const newLevel = Math.floor(newXp / 1000) + 10; // Simple level curve
        return { xp: newXp, level: newLevel };
      }),
      incrementStreak: () => set((state) => ({ streak: state.streak + 1 })),
    }),
    {
      name: 'skyld-user-storage',
    }
  )
);
