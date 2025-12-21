import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { authenticateWithWallet, disconnectWallet, type WalletProvider } from "@/lib/wallet";
import { useToast } from "@/hooks/use-toast";

export interface User {
  id: string;
  username: string;
  email: string | null;
  walletAddress: string | null;
  role: string;
  avatarUrl: string | null;
  bio: string | null;
  holdingsVisible: boolean;
  createdAt: string;
  passwordChanged?: boolean;
  selectedIconId?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isFounder: boolean;
  requiresPasswordChange: boolean;
  loginWithWallet: (provider: WalletProvider) => Promise<boolean>;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, username: string) => Promise<boolean>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  resetPassword: (token: string, password: string) => Promise<boolean>;
  forceChangePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userData, isLoading, refetch } = useQuery<{ user: User } | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (userData?.user) {
      setUser(userData.user);
    } else {
      setUser(null);
    }
  }, [userData]);

  const loginWithWallet = useCallback(async (provider: WalletProvider): Promise<boolean> => {
    try {
      const result = await authenticateWithWallet(provider);
      if (result?.user) {
        setUser(result.user);
        await refetch();
        toast({ title: "Connected!", description: `Welcome, ${result.user.username}` });
        return true;
      }
      toast({ title: "Connection failed", description: "Could not authenticate with wallet", variant: "destructive" });
      return false;
    } catch (error) {
      toast({ title: "Error", description: "Wallet authentication failed", variant: "destructive" });
      return false;
    }
  }, [refetch, toast]);

  const loginWithEmail = useCallback(async (identifier: string, password: string): Promise<boolean> => {
    try {
      const res = await apiRequest("POST", "/api/auth/login", { identifier, password });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        await refetch();
        toast({ title: "Welcome back!", description: `Logged in as ${data.user.username}` });
        return true;
      }
      const error = await res.json();
      toast({ title: "Login failed", description: error.error || "Invalid credentials", variant: "destructive" });
      return false;
    } catch (error) {
      toast({ title: "Error", description: "Login failed", variant: "destructive" });
      return false;
    }
  }, [refetch, toast]);

  const register = useCallback(async (email: string, password: string, username: string): Promise<boolean> => {
    try {
      const res = await apiRequest("POST", "/api/auth/register", { email, password, username });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        await refetch();
        toast({ title: "Account created!", description: `Welcome to Normie Nation, ${data.user.username}` });
        return true;
      }
      const error = await res.json();
      toast({ 
        title: "Registration failed", 
        description: error.error || error.errors?.[0]?.msg || "Could not create account", 
        variant: "destructive" 
      });
      return false;
    } catch (error) {
      toast({ title: "Error", description: "Registration failed", variant: "destructive" });
      return false;
    }
  }, [refetch, toast]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
      if (user?.walletAddress) {
        await disconnectWallet("phantom");
        await disconnectWallet("solflare");
      }
      setUser(null);
      queryClient.clear();
      toast({ title: "Logged out", description: "See you soon, normie!" });
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [user, queryClient, toast]);

  const requestPasswordReset = useCallback(async (email: string): Promise<boolean> => {
    try {
      const res = await apiRequest("POST", "/api/auth/request-reset", { email });
      if (res.ok) {
        toast({ title: "Check your email", description: "Password reset instructions sent" });
        return true;
      }
      return false;
    } catch (error) {
      toast({ title: "Error", description: "Could not send reset email", variant: "destructive" });
      return false;
    }
  }, [toast]);

  const resetPassword = useCallback(async (token: string, password: string): Promise<boolean> => {
    try {
      const res = await apiRequest("POST", "/api/auth/reset-password", { token, password });
      if (res.ok) {
        toast({ title: "Password reset!", description: "You can now log in with your new password" });
        return true;
      }
      const error = await res.json();
      toast({ title: "Reset failed", description: error.error || "Invalid or expired token", variant: "destructive" });
      return false;
    } catch (error) {
      toast({ title: "Error", description: "Password reset failed", variant: "destructive" });
      return false;
    }
  }, [toast]);

  const forceChangePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      const res = await apiRequest("POST", "/api/auth/force-change-password", { currentPassword, newPassword });
      if (res.ok) {
        await refetch();
        toast({ title: "Password changed!", description: "Your password has been updated successfully" });
        return true;
      }
      const error = await res.json();
      toast({ title: "Password change failed", description: error.error || error.errors?.[0]?.msg || "Could not change password", variant: "destructive" });
      return false;
    } catch (error) {
      toast({ title: "Error", description: "Password change failed", variant: "destructive" });
      return false;
    }
  }, [refetch, toast]);

  const requiresPasswordChange = !!(user && user.passwordChanged === false);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin" || user?.role === "founder",
    isFounder: user?.role === "founder",
    requiresPasswordChange,
    loginWithWallet,
    loginWithEmail,
    register,
    logout,
    requestPasswordReset,
    resetPassword,
    forceChangePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
