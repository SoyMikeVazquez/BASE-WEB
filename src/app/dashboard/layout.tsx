'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { isDemoMode } from "@/lib/demoData";
import Sidebar from "@/components/Sidebar";
import styles from "./layout.module.css";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        // Check if in demo mode first
        if (isDemoMode()) {
          if (mounted) {
            setAuthorized(true);
            setLoading(false);
          }
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          if (mounted) {
            router.push("/login");
          }
          return;
        }

        // Validar que el usuario tenga rol de personal
        const { data: userData, error } = await supabase
          .from("users")
          .select("*")
          .eq("IDUser", session.user.id)
          .maybeSingle();

        if (error || !userData) {
          if (mounted) {
            await supabase.auth.signOut();
            router.push("/login?error=no-permissions");
          }
          return;
        }

        const hasAccess =
          userData.isAdmin === true ||
          userData.isPersonal === true ||
          userData.isRecepcion === true ||
          userData.isGestor === true;

        if (!hasAccess) {
          if (mounted) {
            await supabase.auth.signOut();
            router.push("/login?error=no-permissions");
          }
          return;
        }

        if (mounted) {
          setAuthorized(true);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error checking session:", err);
        if (mounted) {
          router.push("/login");
        }
      }
    }

    checkSession();

    // Listener para cambios de autenticación (solo si no está en modo demo)
    if (!isDemoMode()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT") {
          if (mounted) {
            setAuthorized(false);
            router.push("/login");
          }
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading || !authorized) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        fontFamily: "inherit"
      }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "3px solid var(--border)",
          borderTop: "3px solid var(--primary)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          marginBottom: "1rem"
        }} />
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Cargando panel...</p>
        <style jsx global>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      <Sidebar />
      <main className={styles.mainContent}>
        {/* Dynamic Mesh Gradient Background */}
        <div className={styles.gradientCanvas}>
          <div className={styles.orbA} />
          <div className={styles.orbB} />
          <div className={styles.orbC} />
          <div className={styles.orbD} />
          <div className={styles.orbE} />
        </div>
        <div className={styles.mainChildren}>
          {children}
        </div>
      </main>
    </div>
  );
}

