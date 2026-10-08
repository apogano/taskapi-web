import type { components } from "./schema";

type AccessToken = components["schemas"]["AccessToken"]

export type LoginResult = { ok: true } | { ok: false; status: number}

let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;
const expiredListeners = new Set<() => void>();

//Tells others tabs about a logout, so they drop their in-memory token
//immediately instead of waiting for it to expire
const channel = new BroadcastChannel("taskapi-auth");
channel.onmessage = (event) => {
    if (event.data == "logout") endSession();
};

export function getAccessToken():string | null {
    return accessToken;
}

export function onSessionExpired(listener: () => void):()=>void{
    expiredListeners.add(listener);
    return () => expiredListeners.delete(listener)
}

function endSession():void{
    accessToken = null;
    expiredListeners.forEach((listener) => listener());
}

export async function login(email: string, password: string): Promise<LoginResult>{
    const response = await fetch("/api/auth/web/login",{
        method: "POST",
        //the backend expects on OAuth2 password form,not JSON
        body: new URLSearchParams({ username: email,password}),
    });
    if (!response.ok){
        return { ok:false, status:response.status};
    }
    const body: AccessToken = await response.json();
    accessToken = body.access_token;
    return {ok: true};
}

export function refreshAccessToken(): Promise<boolean>{
    //Within this tab, concurrent callers (several 401s at once, StrictMode
    //running an effect twice) share one refresh instead of each sending the cookie.
    refreshInFlight ??= doRefresh().finally(()=>{
        refreshInFlight = null;
    });
    return refreshInFlight;
}

async function doRefresh(): Promise<boolean> {
  // Across tabs, refreshes run one at a time. All tabs share one cookie, and
  // two requests carrying the same cookie would look like token theft to the
  // backend. Inside the lock the browser sends whichever cookie is current,
  // i.e. the one the previous tab just rotated in.
  return navigator.locks.request("taskapi-refresh", async () => {
    const response = await fetch("/api/auth/web/refresh", { method: "POST" });
    if (!response.ok) {
      endSession();
      return false;
    }
    const body: AccessToken = await response.json();
    accessToken = body.access_token;
    return true;
  });
}

export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/web/logout", { method: "POST" });
  } finally {
    channel.postMessage("logout");
    endSession();
  }
}