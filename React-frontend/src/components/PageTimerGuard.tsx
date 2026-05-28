import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import { clearAuthStorage, redirectToLogin } from "../lib/api";

export default function PageTimerGuard() {
  const location = useLocation();
  const [secondsLeft, setSecondsLeft] = useState(1800); // 30 minutes = 1800 seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if current page is public auth page
  const isAuthPage = ["/login", "/client-login", "/"].includes(location.pathname);

  // Reset timer helper
  const resetTimer = () => {
    setSecondsLeft(1800);
  };

  // Reset timer on route change or user activity
  useEffect(() => {
    if (isAuthPage) return;

    resetTimer();

    // Listen to user activity to extend the session
    const activityEvents = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    const handleActivity = () => {
      resetTimer();
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [location.pathname, isAuthPage]);

  // Handle countdown logic
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (isAuthPage || !token) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAuthPage, location.pathname]);

  // Notify user with a toast warning when 30 seconds are left
  useEffect(() => {
    if (isAuthPage) return;
    if (secondsLeft === 30) {
      toast.error("Your session will automatically expire in 30 seconds due to inactivity!", {
        duration: 5000,
        position: "top-center",
        id: "timeout-warning-toast",
        style: {
          background: "#1E1B4B",
          color: "#F43F5E",
          border: "1px solid rgba(244, 63, 94, 0.2)",
          borderRadius: "12px",
          fontFamily: "Gantari, sans-serif",
          fontSize: "14px",
          fontWeight: 500,
          boxShadow: "0 10px 25px -5px rgba(244, 63, 94, 0.15)",
        },
      });
    }
  }, [secondsLeft, isAuthPage]);

  const handleTimeout = () => {
    // Clear user tokens/details to securely end their session
    clearAuthStorage();

    // Redirect immediately to the login page
    redirectToLogin();
  };

  return null;
}

