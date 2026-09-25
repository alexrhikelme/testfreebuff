import { Navigate, Outlet, useLocation } from "react-router-dom";
import React, { createContext, useContext, useState, type ReactNode } from "react";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
};

type ReturnToState = {
  path: string;
  from: { pathname: string; search: string; hash: string };
};

export function AuthShell({ children }: { children?: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [returnTo, setReturnTo] = useState<ReturnToState | null>(null);

  const signIn = (next: string) => {
    setUser({
      id: "user-1",
      name: "Ana Costa",
      email: "ana@lab.local",
      role: "admin",
    });
    setReturnTo({ path: next, from: { pathname: next, search: "", hash: "" } });
  };

  const signOut = () => {
    setUser(null);
    setReturnTo(null);
  };

  const value: AuthContextValue = {
    user,
    signIn,
    signOut,
    returnTo,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

type AuthContextValue = {
  user: AuthUser | null;
  signIn: (next: string) => void;
  signOut: () => void;
  returnTo: ReturnToState | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthShell");
  }
  return ctx;
};

export const RequireAuth: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export const PublicOnly: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
};
