import {
  accessToken,
  cloudConfigured,
  finishSignIn,
  sessionManager,
} from "@/lib/cloud-session";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import type { User } from "oidc-client-ts";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
interface AuthValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: { message: string } | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  signin: () => Promise<void>;
  signout: () => Promise<void>;
  fetchAccessToken: () => Promise<string | null>;
}
const unavailable = async () => {
  throw new Error("Cuenta remota sin configurar");
};
const AuthContext = createContext<AuthValue>({
  isAuthenticated: false,
  isLoading: false,
  user: null,
  error: null,
  signIn: unavailable,
  signOut: unavailable,
  signin: unavailable,
  signout: unavailable,
  fetchAccessToken: accessToken,
});
export const useSession = () => useContext(AuthContext);
const convex = cloudConfigured
  ? new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)
  : null;
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [busy, setBusy] = useState(cloudConfigured),
    [error, setError] = useState<{ message: string } | null>(null);
  useEffect(() => {
    if (!cloudConfigured) return;
    const manager = sessionManager(),
      change = (u: User) => setUser(u),
      clear = () => setUser(null);
    manager.events.addUserLoaded(change);
    manager.events.addUserUnloaded(clear);
    manager.events.addAccessTokenExpired(clear);
    const load =
      location.pathname === "/auth/callback"
        ? finishSignIn()
        : manager.getUser();
    load
      .then((u) => {
        setUser(u && !u.expired ? u : null);
        if (location.pathname === "/auth/callback")
          history.replaceState(null, "", "/collaboration");
      })
      .catch(() =>
        setError({
          message: "No se pudo validar la sesión. Vuelve a iniciar sesión.",
        }),
      )
      .finally(() => setBusy(false));
    return () => {
      manager.events.removeUserLoaded(change);
      manager.events.removeUserUnloaded(clear);
      manager.events.removeAccessTokenExpired(clear);
    };
  }, []);
  const value = useMemo<AuthValue>(() => {
    const signIn = async () => {
      setError(null);
      await sessionManager().signinRedirect();
    };
    const signOut = async () => {
      await sessionManager().removeUser();
      setUser(null);
    };
    return {
      isAuthenticated: !!user && !user.expired,
      isLoading: busy,
      user,
      error,
      signIn,
      signOut,
      signin: signIn,
      signout: signOut,
      fetchAccessToken: accessToken,
    };
  }, [user, busy, error]);
  return (
    <AuthContext.Provider value={value}>
      {convex ? (
        <ConvexProviderWithAuth client={convex} useAuth={useSession}>
          {children}
        </ConvexProviderWithAuth>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
