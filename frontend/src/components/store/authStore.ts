import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthUser } from "@/types";

interface UserReputation {
  totalProjects: number;
  completedProjects: number;
  totalEarned: number;
  averageRating: number;
  totalRatings: number;
  nftCount: number;
  successRate: number;
  hasNFT: boolean;
  badges: string[];
}

interface UserProfile {
  bio?: string;
  skills?: string[];
  hourlyRate?: number;
  availability?: 'available' | 'busy' | 'unavailable';
  location?: string;
  website?: string;
  github?: string;
  linkedin?: string;
  avatar?: string;
  timezone?: string;
  portfolio?: Array<{
    title: string;
    description: string;
    url: string;
    image: string;
  }>;
}

interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user: AuthUser, token: string) => {
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (updates: Partial<AuthUser>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } });
        }
      },
      checkAuth: () => {
        const token = get().token;
        const user = get().user;

        const isValid = Boolean(token && user); // can expand this logic later
        set({ isAuthenticated: isValid });
        console.log("Checked auth. Authenticated:", isValid);
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
