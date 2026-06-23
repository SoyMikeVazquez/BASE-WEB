'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { isDemoMode, disableDemoMode, getDemoCitas, getDemoPersonal, getDemoProducts, getDemoBranches, getDemoUsers, getDemoGeneralConfig } from "@/lib/demoData";
import styles from "./dashboard.module.css";
import Link from "next/link";

interface Cita {
  clienteID: string;
  barberoID: string;
  servicioID: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  sucursal: string;
  estatus: string;
  precioFinal: number;
  NombreCliente?: string;
  sucursal_id?: string;
}

interface Staff {
  userID: string;
  nombre: string;
  TipoPersonal: string;
  sucursal: string;
}

interface Product {
  id: string;
  nombre: string;
  stock: number;
}

interface Branch {
  IDSucursal: string;
  NombreSucursal: string;
}

interface UserRecord {
  IDUser: string;
  isPersonal: boolean;
  isAdmin: boolean;
  isRecepcion: boolean;
  isGestor: boolean;
}

interface CompanyGeneral {
  NombreDeLaEmpresa?: string;
  LogoDeLaEmpresa?: string | null;
  Soporte?: string;
  PoliticaDePrivacidad?: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Database states
  const [citas, setCitas] = useState<Cita[]>([]);
  const [personal, setPersonal] = useState<Staff[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [generalConfig, setGeneralConfig] = useState<CompanyGeneral | null>(null);

  // AI Assistant states
  const [question, setQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [errorAi, setErrorAi] = useState<string | null>(null);
  const [missingKeys, setMissingKeys] = useState(false);

  // Dropdown list of months (e.g. YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [monthOptions, setMonthOptions] = useState<{ value: string; label: string }[]>([]);

  // Selected date (today by default)
  const [todayStr, setTodayStr] = useState<string>("");

  useEffect(() => {
    // Generate Swedish locale format YYYY-MM-DD in user's timezone
    const dateToday = new Date();
    const todayStrLocal = dateToday.toLocaleDateString("sv-SE");
    setTodayStr(todayStrLocal);

    // Generate month options (current month + 5 months prior)
    const options: { value: string; label: string }[] = [];
    const tempDate = new Date();
    for (let i = 0; i < 6; i++) {
      const monthVal = tempDate.toLocaleDateString("sv-SE").substring(0, 7);
      const label = tempDate.toLocaleString("es-ES", { month: "long", year: "numeric" });
      options.push({
        value: monthVal,
        label: label.charAt(0).toUpperCase() + label.slice(1),
      });
      tempDate.setMonth(tempDate.getMonth() - 1);
    }
    setMonthOptions(options);
    setSelectedMonth(options[0]?.value || "");

    loadDashboardData();
  }, []);

  async function handleAskAi(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    setLoadingAi(true);
    setErrorAi(null);
    setAiResponse(null);
    setMissingKeys(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("No se pudo obtener el token de sesión. Por favor inicie sesión nuevamente.");
      }

      const res = await fetch("/api/ask-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ question: question.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.missingKeys) {
          setMissingKeys(true);
        }
        throw new Error(data.error || "Ocurrió un error al consultar a la IA.");
      }

      setAiResponse(data.answer);
      setQuestion("");
    } catch (err: any) {
      console.error("Error asking AI:", err);
      setErrorAi(err.message || "Error al comunicarse con el asistente.");
    } finally {
      setLoadingAi(false);
    }
  }

  async function loadDashboardData() {
    setLoading(true);
    setError(null);
    try {
      // Check if in demo mode
      const demoMode = isDemoMode();

      if (demoMode) {
        // Load demo data
        setCitas(getDemoCitas());
        setPersonal(getDemoPersonal());
        setProducts(getDemoProducts());
        setBranches(getDemoBranches());
        setUsers(getDemoUsers());
        setGeneralConfig(getDemoGeneralConfig());
      } else {
        // 1. Fetch appointments
        const { data: citasData, error: citasErr } = await supabase
          .from("Citas")
          .select("*");
        if (citasErr) throw citasErr;
        setCitas(citasData || []);

        // 2. Fetch Personal
        const { data: staffData, error: staffErr } = await supabase
          .from("Personal")
          .select("userID, nombre, TipoPersonal, sucursal");
        if (staffErr) throw staffErr;
        setPersonal(staffData || []);

        // 3. Fetch Products
        const { data: productsData, error: productsErr } = await supabase
          .from("Productos")
          .select("id, nombre, stock");
        if (productsErr) throw productsErr;
        setProducts(productsData || []);

        // 4. Fetch Branches
        const { data: branchesData, error: branchesErr } = await supabase
          .from("Sucursales")
          .select("IDSucursal, NombreSucursal");
        if (branchesErr) throw branchesErr;
        setBranches(branchesData || []);

        // 5. Fetch Users
        const { data: usersData, error: usersErr } = await supabase
          .from("users")
          .select("IDUser, isPersonal, isAdmin, isRecepcion, isGestor");
        if (usersErr) throw usersErr;
        setUsers(usersData || []);

        // 6. Fetch General Settings
        const { data: generalData, error: generalErr } = await supabase
          .from("General")
          .select("NombreDeLaEmpresa, LogoDeLaEmpresa, Soporte, PoliticaDePrivacidad")
          .limit(1)
          .maybeSingle();
        if (generalErr) throw generalErr;
        setGeneralConfig(generalData);
      }

    } catch (err: any) {
      console.error("Error loading dashboard metrics:", err);
      setError(err.message || "Error al cargar la información del servidor");
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------------------
  // CALCULATED METRICS
  // ----------------------------------------------------

  // Filter appointments for the selected month
  const monthlyCitas = citas.filter(
    (c) => c.fecha && c.fecha.startsWith(selectedMonth) && c.estatus !== "Cancelada"
  );

  // Group monthly appointments into Caja Recepcion vs Caja Personal
  let cajaRecepcion = 0;
  let cajaPersonal = 0;

  monthlyCitas.forEach((c) => {
    // Find staff role
    const staffMember = personal.find((p) => p.userID === c.barberoID);
    const amount = Number(c.precioFinal) || 0;
    if (staffMember && staffMember.TipoPersonal === "Recepcionista") {
      cajaRecepcion += amount;
    } else {
      cajaPersonal += amount;
    }
  });

  // Today's appointments
  const todayCitas = citas.filter(
    (c) => c.fecha === todayStr && c.estatus !== "Cancelada"
  );

  const ingresosHoy = todayCitas.reduce((acc, curr) => acc + (Number(curr.precioFinal) || 0), 0);
  const citasHoyCount = todayCitas.length;

  // Staff Count
  const totalPersonalCount = personal.length;

  // Healthy Inventory Percentage (stock > 5)
  const criticalProducts = products.filter((p) => (p.stock || 0) <= 5);
  const totalProductsCount = products.length;
  const inventoryPercentage =
    totalProductsCount > 0
      ? Math.round(((totalProductsCount - criticalProducts.length) / totalProductsCount) * 100)
      : 100;

  // Weekly income calculation (last 7 days ending today)
  const getWeeklyIncomeData = () => {
    const weeklyData: { dateLabel: string; value: number }[] = [];
    const dateCursor = new Date();
    
    // Generate YYYY-MM-DD for the last 7 days
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      days.unshift(dateCursor.toLocaleDateString("sv-SE"));
      dateCursor.setDate(dateCursor.getDate() - 1);
    }

    days.forEach((day) => {
      const dayTotal = citas
        .filter((c) => c.fecha === day && c.estatus !== "Cancelada")
        .reduce((sum, curr) => sum + (Number(curr.precioFinal) || 0), 0);

      // Short label format (DD/MM)
      const parts = day.split("-");
      const shortLabel = `${parts[2]}/${parts[1]}`;
      
      weeklyData.push({
        dateLabel: shortLabel,
        value: dayTotal,
      });
    });

    return weeklyData;
  };

  const weeklyIncome = getWeeklyIncomeData();
  const maxWeeklyValue = Math.max(...weeklyIncome.map((d) => d.value), 0);
  const totalWeeklySum = weeklyIncome.reduce((acc, curr) => acc + curr.value, 0);

  // App visits calculation based on users table
  const totalUsersCount = users.length;
  const registeredClientsCount = users.filter(
    (u) => !u.isPersonal && !u.isAdmin && !u.isRecepcion && !u.isGestor
  ).length;
  const guestsCount = 0; // Flutter app has no Guest record table so we leave as 0

  // Staff list sorted with today's appointments count
  const activeStaffList = personal.map((p) => {
    const todayCitasForStaff = todayCitas.filter((c) => c.barberoID === p.userID);
    return {
      ...p,
      citasCount: todayCitasForStaff.length,
    };
  }).sort((a, b) => b.citasCount - a.citasCount);

  // Critical inventory items list (up to 4 items)
  const criticalInventoryList = [...criticalProducts]
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 4);

  // Branch stats
  const branchStats = branches.map((b) => {
    const branchCitas = citas.filter(
      (c) => (c.sucursal_id === b.IDSucursal || c.sucursal === b.NombreSucursal) && c.estatus !== "Cancelada"
    );

    let branchTotal = 0;
    let branchRecepcion = 0;
    let branchPersonal = 0;

    branchCitas.forEach((c) => {
      const staffMember = personal.find((p) => p.userID === c.barberoID);
      const amount = Number(c.precioFinal) || 0;
      branchTotal += amount;
      if (staffMember && staffMember.TipoPersonal === "Recepcionista") {
        branchRecepcion += amount;
      } else {
        branchPersonal += amount;
      }
    });

    return {
      id: b.IDSucursal,
      name: b.NombreSucursal,
      total: branchTotal,
      recepcion: branchRecepcion,
      personal: branchPersonal,
    };
  });

  // SVG dimensions for weekly income chart
  const svgWidth = 500;
  const svgHeight = 160;
  const paddingX = 40;
  const paddingY = 20;

  // Generate SVG path coordinates (curved using Cubic Bezier)
  const generateChartPath = () => {
    if (maxWeeklyValue === 0) {
      // Flat line at Y = 0 (bottom)
      return `M ${paddingX} ${svgHeight - paddingY} L ${svgWidth - paddingX} ${svgHeight - paddingY}`;
    }

    const points = weeklyIncome.map((d, index) => {
      const x = paddingX + (index * (svgWidth - 2 * paddingX)) / 6;
      // Calculate Y coordinate from top (0 is top, height is bottom)
      const ratio = d.value / maxWeeklyValue;
      const y = svgHeight - paddingY - ratio * (svgHeight - 2 * paddingY);
      return { x, y };
    });

    let d = `M ${points[0].x} ${points[0].y}`;
    const t = 0.18; // smoothing factor for curves
    
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      
      const cp1x = p1.x + (p2.x - p0.x) * t;
      const cp1y = p1.y + (p2.y - p0.y) * t;
      
      const cp2x = p2.x - (p3.x - p1.x) * t;
      const cp2y = p2.y - (p3.y - p1.y) * t;
      
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const generateChartArea = () => {
    if (maxWeeklyValue === 0) return "";
    const points = weeklyIncome.map((d, index) => {
      const x = paddingX + (index * (svgWidth - 2 * paddingX)) / 6;
      const ratio = d.value / maxWeeklyValue;
      const y = svgHeight - paddingY - ratio * (svgHeight - 2 * paddingY);
      return { x, y };
    });

    let d = `M ${points[0].x} ${svgHeight - paddingY}`;
    d += ` L ${points[0].x} ${points[0].y}`;
    
    const t = 0.18; // smoothing factor
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      
      const cp1x = p1.x + (p2.x - p0.x) * t;
      const cp1y = p1.y + (p2.y - p0.y) * t;
      
      const cp2x = p2.x - (p3.x - p1.x) * t;
      const cp2y = p2.y - (p3.y - p1.y) * t;
      
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    
    d += ` L ${points[points.length - 1].x} ${svgHeight - paddingY} Z`;
    return d;
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>
          {generalConfig?.NombreDeLaEmpresa || "BASE 2.0"}
        </h1>
        {generalConfig?.LogoDeLaEmpresa && (
          <img
            src={generalConfig.LogoDeLaEmpresa}
            alt="Logo Empresa"
            style={{ height: "40px", borderRadius: "0.5rem" }}
          />
        )}
      </div>

      {error && (
        <div style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '0.75rem', marginBottom: '2rem', border: '1px solid #fee2e2' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
          <div style={{ width: "40px", height: "40px", border: "3px solid var(--border)", borderTop: "3px solid #000000", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "1rem" }} />
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Cargando métricas de administración...</p>
        </div>
      ) : (
        <>
          {/* Header Card (Super Admin financial view) */}
          <div className={styles.gradientHeaderCard}>
            <div className={styles.starBadge}>
              <svg className={styles.starIcon} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>Super Admin</span>
            </div>
            <div className={styles.cardMetaLabel}>Vista Financiera General</div>
            <div className={styles.monthTitle}>
              <select
                className={styles.monthSelector}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cajas layout */}
          <div className={styles.cajasRow}>
            {/* Caja Recepción */}
            <div className={styles.cajaCard}>
              <div className={`${styles.cajaIconContainer} ${styles.cajaBlue}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  <path d="M6 6h10" />
                  <path d="M6 10h10" />
                </svg>
              </div>
              <div className={styles.cajaContent}>
                <span className={styles.cajaLabel}>Caja Recepción</span>
                <span className={styles.cajaValue}>${cajaRecepcion.toFixed(2)}</span>
              </div>
            </div>

            {/* Caja Personal */}
            <div className={styles.cajaCard}>
              <div className={`${styles.cajaIconContainer} ${styles.cajaGreen}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className={styles.cajaContent}>
                <span className={styles.cajaLabel}>Caja Personal</span>
                <span className={styles.cajaValue}>${cajaPersonal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 4 Summary Stats */}
          <div className={styles.summaryGrid}>
            {/* Stats 1: Ingresos Hoy */}
            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <div className={styles.summaryIconBg}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <span className={`${styles.percentageChip} ${styles.percentagePositive}`}>+12%</span>
              </div>
              <span className={styles.summaryLabel}>Ingresos Hoy</span>
              <span className={styles.summaryValue}>${ingresosHoy.toFixed(2)}</span>
            </div>

            {/* Stats 2: Citas Hoy */}
            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <div className={styles.summaryIconBg}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <span className={`${styles.percentageChip} ${styles.percentagePositive}`}>+5%</span>
              </div>
              <span className={styles.summaryLabel}>Citas Hoy</span>
              <span className={styles.summaryValue}>{citasHoyCount}</span>
            </div>

            {/* Stats 3: Personal */}
            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <div className={styles.summaryIconBg}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                </div>
                <span className={`${styles.percentageChip} ${styles.percentageNeutral}`}>0%</span>
              </div>
              <span className={styles.summaryLabel}>Personal</span>
              <span className={styles.summaryValue}>{totalPersonalCount}</span>
            </div>

            {/* Stats 4: Inventario */}
            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <div className={styles.summaryIconBg}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </div>
                <span className={`${styles.percentageChip} ${styles.percentageNegative}`}>-3%</span>
              </div>
              <span className={styles.summaryLabel}>Inventario</span>
              <span className={styles.summaryValue}>{inventoryPercentage}%</span>
            </div>
          </div>

          {/* AI Assistant Section */}
          <div className={styles.sectionCard} style={{ background: "linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(243, 244, 246, 0.7) 100%)", border: "1px solid rgba(226, 232, 240, 0.8)" }}>
            <div className={styles.sectionHeader} style={{ marginBottom: "0.75rem" }}>
              <h3 className={styles.sectionTitle}>
                <svg className={styles.sectionTitleIcon} style={{ color: "#8b5cf6" }} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                  <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5 5 3Z" opacity="0.5" />
                  <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5Z" opacity="0.5" />
                </svg>
                Asistente de Inteligencia Artificial (IA)
              </h3>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#8b5cf6", backgroundColor: "rgba(139, 92, 246, 0.08)", padding: "0.15rem 0.5rem", borderRadius: "9999px", textTransform: "uppercase" }}>
                Total Pro AI
              </span>
            </div>

            <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              Pregunta cualquier dato sobre las ventas de este mes, inventario bajo, personal activo o las citas del día.
            </p>

            <form onSubmit={handleAskAi} className={styles.aiForm}>
              <div className={styles.aiTextAreaWrapper}>
                <textarea
                  placeholder="Escribe tu pregunta sobre el negocio aquí... (ej. ¿Cuál es el producto más vendido este mes o cuáles son los ingresos acumulados de hoy?)"
                  className={styles.aiTextArea}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={loadingAi}
                  rows={3}
                />
                <div className={styles.aiActionsRow}>
                  <span className={styles.aiTipText}>
                    La respuesta será analizada usando datos en tiempo real, cuida tus tokens.
                  </span>
                  <button
                    type="submit"
                    className={styles.aiSubmitButton}
                    disabled={loadingAi || !question.trim()}
                  >
                    {loadingAi ? (
                      <>
                        <div className={styles.aiButtonSpinner} />
                        <span>Analizando datos...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}>
                          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                        </svg>
                        <span>Obtener Respuesta</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {errorAi && (
              <div style={{
                color: '#ef4444',
                backgroundColor: '#fef2f2',
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                marginTop: '1rem',
                fontSize: '0.8rem',
                border: '1px solid #fee2e2',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <span style={{ fontWeight: 600 }}>Error: {errorAi}</span>
                {missingKeys && (
                  <Link href="/dashboard/configuracion" style={{
                    color: '#2563eb',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    fontSize: '0.75rem',
                    alignSelf: 'flex-start'
                  }}>
                    Ir a Configuración para guardar claves API &rarr;
                  </Link>
                )}
              </div>
            )}

            {aiResponse && (
              <div className={styles.aiResponseBubble}>
                <div className={styles.aiResponseHeader}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#8b5cf6' }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>Respuesta del Asistente:</span>
                </div>
                <div className={styles.aiResponseText}>
                  {aiResponse}
                </div>
              </div>
            )}
          </div>

          {/* Citas de Hoy Section */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                <svg className={styles.sectionTitleIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Citas de Hoy
              </h3>
              <Link href="/dashboard/agenda" className={styles.sectionLink}>
                Ver agenda completa
              </Link>
            </div>

            {todayCitas.length === 0 ? (
              <div className={styles.emptyState}>
                <svg className={styles.emptyStateIcon} xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span className={styles.emptyStateText}>No hay citas para este día</span>
              </div>
            ) : (
              <div className={styles.appointmentsList}>
                {todayCitas.map((cita, idx) => {
                  const staffName = personal.find((p) => p.userID === cita.barberoID)?.nombre || "Barbero";
                  return (
                    <div key={idx} className={styles.appointmentItem}>
                      <div className={styles.appTime}>
                        {cita.horaInicio.substring(0, 5)} - {cita.horaFin.substring(0, 5)}
                      </div>
                      <div className={styles.appInfo}>
                        <div className={styles.appName}>
                          {cita.NombreCliente || "Cliente Registrado"}
                        </div>
                        <div className={styles.appServiceMeta}>
                          Realizado por {staffName} en {cita.sucursal}
                        </div>
                      </div>
                      <div className={styles.appPrice}>
                        ${Number(cita.precioFinal).toFixed(2)}
                      </div>
                      <div
                        className={styles.appStatus}
                        style={{
                          backgroundColor:
                            cita.estatus === "Activa"
                              ? "rgba(37, 99, 235, 0.08)"
                              : cita.estatus === "Completada"
                              ? "rgba(34, 197, 94, 0.08)"
                              : "rgba(148, 163, 184, 0.08)",
                          color:
                            cita.estatus === "Activa"
                              ? "#2563eb"
                              : cita.estatus === "Completada"
                              ? "#16a34a"
                              : "#64748b",
                        }}
                      >
                        {cita.estatus}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2 Charts Row */}
          <div className={styles.chartsRow}>
            {/* Chart 1: Ingresos de la Semana */}
            <div className={styles.sectionCard} style={{ marginBottom: 0 }}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  <svg className={styles.sectionTitleIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                  Ingresos de la Semana
                </h3>
                <Link href="/dashboard/finanzas" className={styles.sectionLink}>
                  Mostrar finanzas
                </Link>
              </div>

              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem", fontWeight: 700 }}>
                Tendencia de ingresos (7 días)
                <span style={{ float: "right", fontWeight: 500 }}>
                  {weeklyIncome[0]?.dateLabel} &rarr; {weeklyIncome[weeklyIncome.length - 1]?.dateLabel}
                </span>
              </div>

              {totalWeeklySum === 0 ? (
                <div className={styles.chartPlaceholder} style={{ height: "160px" }}>
                  <svg className={styles.chartPlaceholderIcon} xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  <span>Sin datos de ingresos esta semana</span>
                </div>
              ) : (
                <div style={{ width: "100%", overflow: "hidden" }}>
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height={svgHeight}>
                    {/* Grid Lines */}
                    <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3" />
                    <line x1={paddingX} y1={(svgHeight) / 2} x2={svgWidth - paddingX} y2={(svgHeight) / 2} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3" />
                    <line x1={paddingX} y1={svgHeight - paddingY} x2={svgWidth - paddingX} y2={svgHeight - paddingY} stroke="var(--border)" strokeWidth="1" />

                    {/* Area under curve */}
                    <path d={generateChartArea()} fill="url(#gradient-income)" className={styles.chartArea} />

                    {/* Line path */}
                    <path
                      d={generateChartPath()}
                      fill="none"
                      stroke="#000000"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={styles.chartLine}
                    />

                    {/* Nodes and Text */}
                    {weeklyIncome.map((d, index) => {
                      const x = paddingX + (index * (svgWidth - 2 * paddingX)) / 6;
                      const ratio = maxWeeklyValue > 0 ? d.value / maxWeeklyValue : 0;
                      const y = svgHeight - paddingY - ratio * (svgHeight - 2 * paddingY);

                      return (
                        <g key={index}>
                          <circle cx={x} cy={y} r="3.5" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
                          
                          {/* Tooltip on top of node */}
                          {d.value > 0 && (
                            <text x={x} y={y - 8} textAnchor="middle" fontSize="9" fontWeight="800" fill="#000000">
                              ${d.value}
                            </text>
                          )}
                          
                          {/* Bottom X-axis label */}
                          <text x={x} y={svgHeight - 2} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--text-muted)">
                            {d.dateLabel}
                          </text>
                        </g>
                      );
                    })}

                    {/* Gradient Definitions */}
                    <defs>
                      <linearGradient id="gradient-income" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#000000" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#000000" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              )}
            </div>

            {/* Chart 2: Visitas de la App */}
            <div className={styles.sectionCard} style={{ marginBottom: 0 }}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  <svg className={styles.sectionTitleIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  Visitas de la App (7 días)
                </h3>
                <Link href="/dashboard/usuarios" className={styles.sectionLink}>
                  Ver usuarios
                </Link>
              </div>

              {/* Chart area matching screenshot styling */}
              <div className={styles.chartPlaceholder}>
                <svg className={styles.chartPlaceholderIcon} xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                <span className={styles.chartPlaceholderText}>Sin visitas registradas esta semana</span>
              </div>

              <div className={styles.visitasStatsRow}>
                <div className={styles.visitasStatCol}>
                  <span className={styles.visitasStatValue}>{totalUsersCount}</span>
                  <span className={styles.visitasStatLabel}>Total</span>
                </div>
                <div className={styles.visitasStatCol}>
                  <span className={`${styles.visitasStatValue} ${styles.visitasStatRegistrados}`}>{registeredClientsCount}</span>
                  <span className={styles.visitasStatLabel}>Registrados</span>
                </div>
                <div className={styles.visitasStatCol}>
                  <span className={`${styles.visitasStatValue} ${styles.visitasStatInvitados}`}>{guestsCount}</span>
                  <span className={styles.visitasStatLabel}>Invitados</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Split Row: Personal Activo & Inventario Critico */}
          <div className={styles.bottomRow}>
            {/* Column Left: Personal Activo */}
            <div className={styles.sectionCard} style={{ marginBottom: 0 }}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  <svg className={styles.sectionTitleIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                  Personal Activo
                </h3>
                <div className={styles.headerActionWrapper}>
                  <Link href="/dashboard/personal" className={styles.plusButton} title="Administrar Personal">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </Link>
                </div>
              </div>

              {activeStaffList.length === 0 ? (
                <div className={styles.emptyState} style={{ padding: "1.5rem 0" }}>
                  <span className={styles.emptyStateText}>No hay personal registrado</span>
                </div>
              ) : (
                <div className={styles.staffList}>
                  {activeStaffList.map((member) => {
                    const initials = member.nombre
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    return (
                      <div key={member.userID} className={styles.staffItem}>
                        <div className={styles.avatarCircle}>{initials}</div>
                        <div className={styles.staffDetails}>
                          <div className={styles.staffName}>{member.nombre}</div>
                          <div className={styles.staffRole}>{member.TipoPersonal || "Personal"} &bull; {member.sucursal}</div>
                        </div>
                        <span className={styles.citasCountChip}>
                          {member.citasCount} {member.citasCount === 1 ? "cita" : "citas"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Column Right: Inventario Critico */}
            <div className={styles.sectionCard} style={{ marginBottom: 0 }}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  <svg className={styles.sectionTitleIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  Inventario Crítico
                </h3>
                <Link href="/dashboard/productos" className={styles.plusButton} title="Ver Inventario">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                  </svg>
                </Link>
              </div>

              {criticalInventoryList.length === 0 ? (
                <div className={styles.emptyState} style={{ padding: "1.5rem 0" }}>
                  <svg className={styles.emptyStateIcon} xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span className={styles.emptyStateText}>Todo el inventario está en niveles óptimos</span>
                </div>
              ) : (
                <div className={styles.criticalInventoryList}>
                  {criticalInventoryList.map((item) => {
                    // Safe percentage for filling bar (healthy is 20 units)
                    const fillPercentage = Math.min((item.stock / 20) * 100, 100);
                    // Determine color
                    const barColor = item.stock <= 2 ? "#ef4444" : "#f97316";

                    return (
                      <div key={item.id} className={styles.inventoryItem}>
                        <div className={styles.inventoryMeta}>
                          <span className={styles.inventoryName}>{item.nombre}</span>
                          <span className={styles.inventoryQty}>{item.stock} {item.stock === 1 ? "unidad" : "unidades"}</span>
                        </div>
                        <div className={styles.progressBarContainer}>
                          <div
                            className={styles.progressBarFill}
                            style={{
                              width: `${fillPercentage}%`,
                              backgroundColor: barColor,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* KPIs de las Sucursales Section */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                <svg className={styles.sectionTitleIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m2 7 4.41-3.67A2 2 0 0 1 7.7 3h8.6a2 2 0 0 1 1.3.33L22 7" />
                  <path d="M4 12V9" />
                  <path d="M12 12V9" />
                  <path d="M20 12V9" />
                  <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
                  <path d="M9 12v3a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-3" />
                </svg>
                KPIs de las Sucursales
              </h3>
            </div>

            {branchStats.length === 0 ? (
              <div className={styles.emptyState} style={{ padding: "1.5rem 0" }}>
                <span className={styles.emptyStateText}>No hay sucursales registradas</span>
              </div>
            ) : (
              <div className={styles.branchKpiList}>
                {branchStats.map((branch) => (
                  <div key={branch.id} className={styles.branchKpiItem}>
                    <span className={styles.branchName}>{branch.name}</span>
                    <div className={styles.branchBreakdown}>
                      <div className={styles.branchBreakdownCol}>
                        <span className={`${styles.branchKpiDot} ${styles.dotBlue}`} />
                        <span>Recepción:</span>
                        <strong style={{ color: "var(--foreground)" }}>${branch.recepcion.toFixed(2)}</strong>
                      </div>
                      <div className={styles.branchBreakdownCol}>
                        <span className={`${styles.branchKpiDot} ${styles.dotGreen}`} />
                        <span>Personal:</span>
                        <strong style={{ color: "var(--foreground)" }}>${branch.personal.toFixed(2)}</strong>
                      </div>
                      <span className={styles.branchValueTotal}>
                        Total: ${branch.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className={styles.footerActionsRow}>
            <a
              href={generalConfig?.Soporte || "https://www.totalpro.com/soporte"}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerButton}
            >
              Información de soporte, contacto y quejas
            </a>
            <a
              href={generalConfig?.PoliticaDePrivacidad || "https://www.totalpro.com/privacy"}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerButton}
            >
              Políticas de privacidad
            </a>
            <button
              onClick={() => alert("Para eliminar o deshabilitar tu cuenta, por favor contacta al administrador de soporte en soymikevazquez@gmail.com")}
              className={`${styles.footerButton} ${styles.deleteAccountBtn}`}
            >
              Eliminar y deshabilitar cuenta
            </button>
            {isDemoMode() && (
              <button
                onClick={() => {
                  disableDemoMode();
                  window.location.href = "/login";
                }}
                className={`${styles.footerButton} ${styles.demoExitBtn}`}
              >
                ← Salir de Demostración
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
