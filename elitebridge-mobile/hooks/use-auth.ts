import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

type UseAuthOptions = {
  autoFetch?: boolean;
};

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Login function
  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      // Mock login - will be replaced with API call in Phase 2
      const mockUser: Auth.User = {
        id: Math.floor(Math.random() * 10000),
        openId: `user_${Date.now()}`,
        name: email.split("@")[0],
        email,
        loginMethod: "email",
        lastSignedIn: new Date(),
        role: email.includes("admin") ? "admin" : "user",
      };

      // Save user info and token
      const token = `token_${Date.now()}`;
      await Auth.setSessionToken(token);
      const userWithRole = { ...mockUser, role: mockUser.role };
      await Auth.setUserInfo(userWithRole);

      setUser(userWithRole);
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Login failed");
      setError(error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Signup function
  const signup = useCallback(
    async (email: string, password: string, name: string, role: "user" | "admin") => {
      try {
        setLoading(true);
        setError(null);

        // Mock signup - will be replaced with API call in Phase 2
        const mockUser: Auth.User = {
          id: Math.floor(Math.random() * 10000),
          openId: `user_${Date.now()}`,
          name,
          email,
          loginMethod: "email",
          lastSignedIn: new Date(),
          role,
        };

        // Save user info and token
        const token = `token_${Date.now()}`;
        await Auth.setSessionToken(token);
        const userWithRole = { ...mockUser, role };
        await Auth.setUserInfo(userWithRole);

        setUser(userWithRole);
        return { success: true };
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Signup failed");
        setError(error);
        return { success: false, error: error.message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchUser = useCallback(async () => {
    console.log("[useAuth] fetchUser called");
    try {
      setLoading(true);
      setError(null);

      // Web platform: use cookie-based auth, fetch user from API
      if (Platform.OS === "web") {
        console.log("[useAuth] Web platform: fetching user from API...");
        const apiUser = await Api.getMe();
        console.log("[useAuth] API user response:", apiUser);

        if (apiUser) {
          const userInfo: Auth.User = {
            id: apiUser.id,
            openId: apiUser.openId,
            name: apiUser.name,
            email: apiUser.email,
            loginMethod: apiUser.loginMethod,
            lastSignedIn: new Date(apiUser.lastSignedIn),
          };
          setUser(userInfo);
          // Cache user info in localStorage for faster subsequent loads
          await Auth.setUserInfo(userInfo);
          console.log("[useAuth] Web user set from API:", userInfo);
        } else {
          console.log("[useAuth] Web: No authenticated user from API, checking localStorage...");
          const cachedUser = await Auth.getUserInfo();
          if (cachedUser) {
            console.log("[useAuth] Web: Using cached user from localStorage:", cachedUser);
            setUser(cachedUser);
          } else {
            console.log("[useAuth] Web: No authenticated user from API or localStorage");
            setUser(null);
          }
        }
        return;
      }

      // Native platform: use token-based auth
      console.log("[useAuth] Native platform: checking for session token...");
      const sessionToken = await Auth.getSessionToken();
      console.log(
        "[useAuth] Session token:",
        sessionToken ? `present (${sessionToken.substring(0, 20)}...)` : "missing",
      );
      if (!sessionToken) {
        console.log("[useAuth] No session token, setting user to null");
        setUser(null);
        return;
      }

      // Use cached user info for native (token validates the session)
      const cachedUser = await Auth.getUserInfo();
      console.log("[useAuth] Cached user:", cachedUser);
      if (cachedUser) {
        console.log("[useAuth] Using cached user info");
        setUser(cachedUser);
      } else {
        console.log("[useAuth] No cached user, setting user to null");
        setUser(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch user");
      console.error("[useAuth] fetchUser error:", error);
      setError(error);
      setUser(null);
    } finally {
      setLoading(false);
      console.log("[useAuth] fetchUser completed, loading:", false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await Api.logout();
    } catch (err) {
      console.error("[Auth] Logout API call failed:", err);
      // Continue with logout even if API call fails
    } finally {
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      setUser(null);
      setError(null);
    }
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  useEffect(() => {
    console.log("[useAuth] useEffect triggered, autoFetch:", autoFetch, "platform:", Platform.OS);
    if (autoFetch) {
      if (Platform.OS === "web") {
        // Web: fetch user from API directly (user will login manually if needed)
        console.log("[useAuth] Web: fetching user from API...");
        fetchUser();
      } else {
        // Native: check for cached user info first for faster initial load
        Auth.getUserInfo().then((cachedUser) => {
          console.log("[useAuth] Native cached user check:", cachedUser);
          if (cachedUser) {
            console.log("[useAuth] Native: setting cached user immediately");
            setUser(cachedUser);
            setLoading(false);
          } else {
            // No cached user, check session token
            fetchUser();
          }
        });
      }
    } else {
      console.log("[useAuth] autoFetch disabled, setting loading to false");
      setLoading(false);
    }
  }, [autoFetch, fetchUser]);

  useEffect(() => {
    console.log("[useAuth] State updated:", {
      hasUser: !!user,
      loading,
      isAuthenticated,
      error: error?.message,
    });
  }, [user, loading, isAuthenticated, error]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    refresh: fetchUser,
    login,
    signup,
    logout,
  };
}
