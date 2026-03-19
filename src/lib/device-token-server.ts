import { cookies } from "next/headers";

const DEVICE_TOKEN_COOKIE = "split-weiss-device-token";

export async function getDeviceTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(DEVICE_TOKEN_COOKIE)?.value ?? null;
}

export async function setDeviceTokenCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(DEVICE_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

