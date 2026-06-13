export const adminEmails = [
  "admin@portal.cosmoalmatv.com.br",
  "alexandre.p@portal.cosmoalmatv.com.br",
  "marcos.caram@portal.cosmoalmatv.com.br",
  "carlos.falcon@portal.cosmoalmatv.com.br"
];

/**
 * Checks if a given email is in the administrator list.
 */
export function isEmailAdmin(email?: string): boolean {
  if (!email) return false;
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Checks if an authenticated user object represents an administrator,
 * either by their email address or explicit metadata role.
 */
export function isUserAdmin(user: any): boolean {
  if (!user) return false;
  const email = user.email || "";
  return isEmailAdmin(email) || user.user_metadata?.role === "admin";
}

/**
 * Validates the Authorization header token directly against Supabase auth.
 * Returns the user object if valid, or null otherwise.
 */
export async function getAuthenticatedUser(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase credentials missing during token validation.");
    return null;
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return null;
    }

    const user = await response.json();
    return user;
  } catch (err) {
    console.error("Token verification failed in getAuthenticatedUser:", err);
    return null;
  }
}
