import {
  InMemoryWebStorage,
  UserManager,
  WebStorageStateStore,
  type User,
} from "oidc-client-ts";
const issuer = import.meta.env.VITE_OIDC_ISSUER as string | undefined,
  clientId = import.meta.env.VITE_OIDC_CLIENT_ID as string | undefined;
export const cloudConfigured = !!(
  issuer?.startsWith("https://") &&
  clientId &&
  /^https:\/\//.test(import.meta.env.VITE_CONVEX_URL ?? "")
);
let manager: UserManager | undefined;
export function sessionManager() {
  if (!cloudConfigured)
    throw new Error(
      "La conexión de cuentas aún no está configurada en esta instalación.",
    );
  if (!issuer?.startsWith("https://"))
    throw new Error("El proveedor de identidad debe usar HTTPS.");
  return (manager ??= new UserManager({
    authority: issuer,
    client_id: clientId!,
    redirect_uri: `${location.origin}/auth/callback`,
    post_logout_redirect_uri: location.origin,
    response_type: "code",
    scope: "openid profile email",
    automaticSilentRenew: false,
    loadUserInfo: false,
    extraQueryParams: import.meta.env.VITE_OIDC_AUDIENCE
      ? { audience: import.meta.env.VITE_OIDC_AUDIENCE }
      : {},
    userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
    stateStore: new WebStorageStateStore({ store: sessionStorage }),
  }));
}
let callback: Promise<User> | undefined;
export function finishSignIn() {
  return (callback ??= sessionManager().signinRedirectCallback());
}
export async function accessToken() {
  if (!cloudConfigured) return null;
  const u = await sessionManager().getUser();
  return u && !u.expired ? u.access_token : null;
}
