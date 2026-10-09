"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

export function RefreshLogout() {
  useEffect(() => {
    const justLoggedIn = sessionStorage.getItem("just_logged_in");
    
    if (justLoggedIn) {
      sessionStorage.removeItem("just_logged_in");
    } else {
      signOut({ callbackUrl: '/login' });
    }
  }, []);

  return null;
}
