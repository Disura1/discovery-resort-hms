import axios from "axios";

export const guestApi = axios.create({
  baseURL: "/api",
  withCredentials: true // sends the guest httpOnly refresh-token cookie
});

let guestAccessToken: string | null = null;
let onGuestUnauthorized: (() => void) | null = null;

export function setGuestAccessToken(token: string | null) {
  guestAccessToken = token;
}

export function setGuestUnauthorizedHandler(handler: () => void) {
  onGuestUnauthorized = handler;
}

guestApi.interceptors.request.use((config) => {
  if (guestAccessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${guestAccessToken}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshGuestAccessToken(): Promise<string | null> {
  try {
    const { data } = await guestApi.post("/guest-auth/refresh");
    setGuestAccessToken(data.accessToken);
    return data.accessToken;
  } catch {
    setGuestAccessToken(null);
    return null;
  }
}

guestApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && !original.url.includes("/guest-auth/")) {
      original._retry = true;
      refreshPromise = refreshPromise ?? refreshGuestAccessToken();
      const newToken = await refreshPromise;
      refreshPromise = null;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return guestApi(original);
      }
      onGuestUnauthorized?.();
    }
    return Promise.reject(error);
  }
);
