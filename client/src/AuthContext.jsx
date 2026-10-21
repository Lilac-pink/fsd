import { createContext, useContext, useState } from 'react';
import { socket } from './socket';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });

  // login response: { token, user: { id, name, email, role } }
  const saveLogin = ({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    socket.disconnect();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, saveLogin, logout }}>{children}</AuthContext.Provider>;
}
