"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

export function RefreshLogout() {
  useEffect(() => {
    // Check if the current navigation is a page reload (refresh / F5)
    const entries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    
    if (entries.length > 0 && entries[0].type === "reload") {
      // If it's a reload, force sign out and redirect to login
      signOut({ callbackUrl: '/login' });
    }
  }, []);

  return null;
}
