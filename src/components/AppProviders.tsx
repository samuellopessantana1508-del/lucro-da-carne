"use client";

import { type ReactNode } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import TrackPageView from "@/components/TrackPageView";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TrackPageView />
      {children}
    </AuthProvider>
  );
}
