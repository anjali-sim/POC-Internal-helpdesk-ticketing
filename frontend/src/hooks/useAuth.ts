import { createContext, useContext } from 'react';
import type { LoginInput, RegisterInput } from '@/api/auth';
import type { User } from '@/types/ticket';

export interface AuthContextValue {
  user: User | null;
  /** True only on the very first session check, before we know either way. */
  isLoading: boolean;
  login: (input: LoginInput) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
}

// Kept apart from the provider so fast refresh keeps working.
export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
}
