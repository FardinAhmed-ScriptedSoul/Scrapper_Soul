import { useContext } from 'react';
import { AuthContext } from './authContext.js';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be nested within an AuthProvider.');
  }
  return context;
}
