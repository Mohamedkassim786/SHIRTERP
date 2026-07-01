import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: any;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: Cookies.get('token') || null,
      setAuth: (user, token) => {
        Cookies.set('token', token, { expires: 1 });
        set({ user, token });
      },
      logout: () => {
        Cookies.remove('token');
        set({ user: null, token: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token })
    }
  )
);
