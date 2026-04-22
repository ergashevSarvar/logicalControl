import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";

import { currentUserRequest, loginRequest, persistToken, readPersistedToken } from "@/lib/api";
import { normalizeLocaleCode, type LoginResponse, type UserProfile } from "@/lib/types";

type AuthContextValue = {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (username: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(() => readPersistedToken());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(Boolean(readPersistedToken()));

  function normalizeProfile(profile: UserProfile): UserProfile {
    return {
      ...profile,
      locale: normalizeLocaleCode(profile.locale),
    };
  }

  useEffect(() => {
    if (!token) {
      setIsBootstrapping(false);
      return;
    }

    currentUserRequest()
      .then((profile) => {
        setUser(normalizeProfile(profile));
      })
      .catch(() => {
        persistToken(null);
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setIsBootstrapping(false);
      });
  }, [token]);

  async function login(username: string, password: string) {
    const response = await loginRequest(username, password);
    persistToken(response.accessToken);
    setToken(response.accessToken);
    const normalizedUser = normalizeProfile(response.user);
    setUser(normalizedUser);
    return {
      ...response,
      user: normalizedUser,
    };
  }

  function logout() {
    persistToken(null);
    setToken(null);
    setUser(null);
  }

  async function refreshProfile() {
    const profile = await currentUserRequest();
    setUser(normalizeProfile(profile));
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isBootstrapping,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
