'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { enableDemoMode } from "@/lib/demoData";
import styles from "./login.module.css";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'white' | 'black'>('white');
  const [gifStyle, setGifStyle] = useState<React.CSSProperties>({});
  const [checkingSession, setCheckingSession] = useState(true);

  const randomizePosition = () => {
    if (typeof window === "undefined") return;
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      setGifStyle({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
    } else {
      const isLeft = Math.random() > 0.5;
      const leftVal = isLeft 
        ? `${Math.floor(Math.random() * 20) + 5}%`   // 5% to 25%
        : `${Math.floor(Math.random() * 20) + 75}%`;  // 75% to 95%
      const topVal = `${Math.floor(Math.random() * 50) + 25}%`; // 25% to 75%
      
      setGifStyle({
        top: topVal,
        left: leftVal,
        transform: 'translate(-50%, -50%)',
      });
    }
  };

  useEffect(() => {
    let mounted = true;
    randomizePosition();
    
    if (mounted) {
      setTheme(Math.random() > 0.5 ? 'white' : 'black');
    }
    
    const handleResize = () => randomizePosition();
    window.addEventListener("resize", handleResize);
    
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error") === "no-permissions") {
        setError("No tienes los permisos requeridos para acceder al panel administrativo.");
      }
    }

    async function checkExistingSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && mounted) {
          // Validar permisos del usuario en la tabla 'users'
          const { data: userData, error: dbError } = await supabase
            .from("users")
            .select("*")
            .eq("IDUser", session.user.id)
            .maybeSingle();

          if (dbError) {
            throw dbError;
          }

          if (userData) {
            const hasAccess = 
              userData.isAdmin === true || 
              userData.isPersonal === true || 
              userData.isRecepcion === true || 
              userData.isGestor === true;

            if (hasAccess) {
              router.replace("/dashboard");
              return; // Keep checkingSession true so we don't flash the form
            }
          }

          // Si tiene sesión activa pero sin permisos, cerramos sesión de inmediato
          await supabase.auth.signOut();
        }
      } catch (err) {
        console.error("Error al comprobar la sesión existente:", err);
      } finally {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    }

    checkExistingSession();

    return () => {
      mounted = false;
      window.removeEventListener("resize", handleResize);
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      if (!data.user) {
        throw new Error("No se pudo obtener la información del usuario.");
      }

      // Validar permisos del usuario en la tabla 'users'
      const { data: userData, error: dbError } = await supabase
        .from("users")
        .select("*")
        .eq("IDUser", data.user.id)
        .maybeSingle();

      if (dbError) {
        throw dbError;
      }

      if (!userData) {
        await supabase.auth.signOut();
        throw new Error("Usuario no registrado en la base de datos de personal.");
      }

      const hasAccess =
        userData.isAdmin === true ||
        userData.isPersonal === true ||
        userData.isRecepcion === true ||
        userData.isGestor === true;

      if (!hasAccess) {
        await supabase.auth.signOut();
        throw new Error("No tienes los permisos requeridos para acceder al panel administrativo.");
      }

      // Redirigir al dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = () => {
    enableDemoMode();
    router.push("/dashboard");
  };

  return (
    <div className={`${styles.loginContainer} ${theme === 'white' ? styles.themeWhite : styles.themeBlack}`}>
      {/* Dynamic Background Mesh Gradients */}
      <div className={styles.gradientOrb1} />
      <div className={styles.gradientOrb2} />
      <div className={styles.gradientOrb3} />

      {/* Background GIF */}
      <div 
        className={`${styles.gifBackground} ${styles.gifVisible}`}
        style={{
          ...gifStyle,
          backgroundImage: theme === 'white' ? "url('/para-fondo-blanco.gif')" : "url('/para-fondo-negro.gif')"
        }}
      />

      {checkingSession ? (
        <div className={styles.loginCard} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Verificando sesión...</p>
        </div>
      ) : (
        <div className={styles.loginCard}>
          <h1 className={styles.title}>Iniciar Sesión</h1>
          <p className={styles.subtitle}>Accede al panel administrativo</p>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <label htmlFor="email">Correo electrónico</label>
              <input
                type="email"
                id="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="password">Contraseña</label>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? "Iniciando sesión..." : "Entrar"}
            </button>
          </form>

          <div className={styles.demoSection}>
            <p className={styles.divider}>o</p>
            <button
              type="button"
              className={styles.demoButton}
              onClick={handleDemoMode}
              disabled={loading}
            >
              <svg
                className={styles.buttonIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span>Ver Demostración</span>
            </button>
            <button
              type="button"
              className={styles.faqButton}
              onClick={() => router.push("/faq")}
              disabled={loading}
            >
              <svg
                className={styles.buttonIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>Preguntas frecuentes</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

