// Auth shims — SoundMap is fully local. No authentication required.
// Kept for structural compatibility with legacy pages (Index.tsx, SignInButton).

export function useUser() {
  return { user: null, isLoading: false };
}

export function useAuth() {
  return {
    isAuthenticated: false,
    isLoading: false,
    error: null as null | { message: string },
    user: null as null,
    signIn: async () => {},
    signOut: async () => {},
    // legacy aliases used in signin.tsx
    signin: async () => {},
    signout: async () => {},
  };
}
