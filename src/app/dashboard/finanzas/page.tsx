'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import styles from "./finanzas.module.css";

interface UserProfile {
  IDUser: string;
  nombre: string;
  correo: string;
  isAdmin: boolean;
  isPersonal: boolean;
  isRecepcion: boolean;
  isGestor: boolean;
}

interface PersonalMember {
  userID: string;
  nombre: string;
}

interface Sucursal {
  IDSucursal: string;
  NombreSucursal: string;
}

interface FinanzaRecord {
  id?: string;
  personalID: string;
  fecha: string;
  servicios_ids?: string[];
  servicios_detalle?: any[];
  suma_servicios: number;
  montos_extras: number;
  descripcion_extras?: string;
  total: number;
  created_at?: string;
  formadepago: string;
  sucursal: string;
  QuienRegistro: string;
  Gasto?: string | number;
  sucursal_id?: string;
  cliente_nombre?: string;
  cliente_email?: string;
  cliente_telefono?: string;
}

interface OrdenRecord {
  id: string;
  personal_id: string;
  productos_detalle?: any[];
  suma_productos: number;
  formadepago: string;
  sucursal: string;
  fecha: string;
  created_at?: string;
  QuienRegistro?: string;
  sucursal_id?: string;
  cliente_nombre?: string;
  cliente_email?: string;
  cliente_telefono?: string;
}

export default function FinanzasPage() {
  // Session & Profiles
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [personalList, setPersonalList] = useState<PersonalMember[]>([]);
  const [branches, setBranches] = useState<Sucursal[]>([]);

  // Filter & UI States
  const [activePeriod, setActivePeriod] = useState<"today" | "week" | "month" | "custom">("week");
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedStaff, setSelectedStaff] = useState("all");
  const [cajaFilter, setCajaFilter] = useState<"recepcion" | "personal" | "all">("all");
  const [activeTab, setActiveTab] = useState<0 | 1>(0); // 0 = Servicios/Gastos, 1 = Productos

  // Data States
  const [finanzasRecords, setFinanzasRecords] = useState<FinanzaRecord[]>([]);
  const [ordenesRecords, setOrdenesRecords] = useState<OrdenRecord[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Detail Modal
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Initial load
  useEffect(() => {
    loadProfileAndConfiguration();
  }, []);

  // Reload data when filters change
  useEffect(() => {
    if (profile) {
      fetchFinancesData();
    }
  }, [profile, activePeriod, startDateInput, endDateInput, selectedBranch, selectedStaff, cajaFilter, activeTab]);

  async function loadProfileAndConfiguration() {
    setLoadingProfile(true);
    try {
      // Get auth user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/login";
        return;
      }

      // Fetch user profile
      const { data: userData, error: userErr } = await supabase
        .from("users")
        .select("*")
        .eq("IDUser", session.user.id)
        .maybeSingle();

      if (userErr || !userData) {
        throw new Error("No tienes los permisos requeridos para ver este panel.");
      }

      const userProfile: UserProfile = userData;
      setProfile(userProfile);

      // Default role filters
      if (userProfile.isRecepcion && !userProfile.isAdmin) {
        setCajaFilter("recepcion");
      } else if (userProfile.isPersonal && !userProfile.isAdmin) {
        setCajaFilter("personal");
        setSelectedStaff(userProfile.IDUser);
      } else {
        setCajaFilter("all");
      }

      // Fetch personal list for dropdown
      const { data: staff } = await supabase
        .from("Personal")
        .select("userID, nombre")
        .order("nombre", { ascending: true });
      setPersonalList(staff || []);

      // Fetch branches list for dropdown
      const { data: sucursales } = await supabase
        .from("Sucursales")
        .select("IDSucursal, NombreSucursal")
        .order("NombreSucursal", { ascending: true });
      setBranches(sucursales || []);

      // Setup default dates
      const today = new Date();
      const lastWeek = new Date();
      lastWeek.setDate(today.getDate() - 6);
      
      setStartDateInput(lastWeek.toISOString().split("T")[0]);
      setEndDateInput(today.toISOString().split("T")[0]);

    } catch (err: any) {
      console.error("Error setting up finance page:", err);
      setError(err.message || "Error al autenticar usuario");
    } finally {
      setLoadingProfile(false);
    }
  }

  // Generate date ranges
  const getDateRange = () => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (activePeriod) {
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case "week":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case "month":
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case "custom":
        if (startDateInput) {
          const [sYr, sMn, sDy] = startDateInput.split("-").map(Number);
          start = new Date(sYr, sMn - 1, sDy, 0, 0, 0);
        }
        if (endDateInput) {
          const [eYr, eMn, eDy] = endDateInput.split("-").map(Number);
          end = new Date(eYr, eMn - 1, eDy, 23, 59, 59);
        }
        break;
    }
    return { start: start.toISOString(), end: end.toISOString() };
  };

  async function fetchFinancesData() {
    if (!profile) return;
    setLoadingData(true);
    setError(null);
    try {
      const { start, end } = getDateRange();

      // Determine Caja filter logic
      let filterCajaVal = cajaFilter;
      if (profile.isRecepcion && !profile.isAdmin) {
        filterCajaVal = "recepcion";
      } else if (profile.isPersonal && !profile.isAdmin) {
        filterCajaVal = "personal";
      }

      // Query FinanzasPersonal (Servicios / Gastos)
      let finQuery = supabase
        .from("FinanzasPersonal")
        .select("*")
        .gte("fecha", start)
        .lte("fecha", end)
        .order("fecha", { ascending: false });

      if (filterCajaVal === "recepcion") {
        finQuery = finQuery.ilike("QuienRegistro", "recepcion");
      } else if (filterCajaVal === "personal") {
        finQuery = finQuery.ilike("QuienRegistro", "personal");
      }

      // Filter by Branch (Sucursal)
      if (selectedBranch !== "all") {
        finQuery = finQuery.or(`sucursal_id.eq.${selectedBranch},sucursal.eq.${selectedBranch}`);
      }

      // Filter by Staff
      if (profile.isPersonal && !profile.isAdmin) {
        finQuery = finQuery.eq("personalID", profile.IDUser);
      } else if (selectedStaff !== "all") {
        finQuery = finQuery.eq("personalID", selectedStaff);
      }

      // Query OrdenesProductos (Productos)
      let ordQuery = supabase
        .from("OrdenesProductos")
        .select("*")
        .gte("fecha", start)
        .lte("fecha", end)
        .order("fecha", { ascending: false });

      if (filterCajaVal === "recepcion") {
        ordQuery = ordQuery.ilike("QuienRegistro", "recepcion");
      } else if (filterCajaVal === "personal") {
        ordQuery = ordQuery.or("QuienRegistro.ilike.personal,QuienRegistro.is.null");
      }

      // Filter by Branch (Sucursal)
      if (selectedBranch !== "all") {
        ordQuery = ordQuery.or(`sucursal_id.eq.${selectedBranch},sucursal.eq.${selectedBranch}`);
      }

      // Filter by Staff
      if (profile.isPersonal && !profile.isAdmin) {
        ordQuery = ordQuery.eq("personal_id", profile.IDUser);
      } else if (selectedStaff !== "all") {
        ordQuery = ordQuery.eq("personal_id", selectedStaff);
      }

      const [finRes, ordRes] = await Promise.all([finQuery, ordQuery]);

      if (finRes.error) throw finRes.error;
      if (ordRes.error) throw ordRes.error;

      setFinanzasRecords(finRes.data || []);
      setOrdenesRecords(ordRes.data || []);

    } catch (err: any) {
      console.error("Error loading finances:", err);
      setError(err.message || "Error al cargar la información de finanzas");
    } finally {
      setLoadingData(false);
    }
  }

  // ----------------------------------------------------
  // COMPUTED CALCULATIONS
  // ----------------------------------------------------
  
  // Total Services (sum of suma_servicios where Gasto is null/empty)
  const totalServices = finanzasRecords
    .filter(r => !r.Gasto || String(r.Gasto).trim() === "")
    .reduce((sum, curr) => sum + (Number(curr.suma_servicios) || 0), 0);

  // Total Extras (sum of montos_extras in FinanzasPersonal)
  const totalExtras = finanzasRecords
    .filter(r => !r.Gasto || String(r.Gasto).trim() === "")
    .reduce((sum, curr) => sum + (Number(curr.montos_extras) || 0), 0);

  // Total Expenses (Gastos) (sum of Gasto in FinanzasPersonal)
  const totalExpenses = finanzasRecords
    .filter(r => r.Gasto && String(r.Gasto).trim() !== "")
    .reduce((sum, curr) => sum + (Number(curr.Gasto) || 0), 0);

  // Total Products (sum of suma_productos in OrdenesProductos)
  const totalProducts = ordenesRecords
    .reduce((sum, curr) => sum + (Number(curr.suma_productos) || 0), 0);

  // Net Income
  const netIncome = totalServices + totalExtras + totalProducts - totalExpenses;

  // Active records table based on selected tab
  const getActiveRecords = () => {
    if (activeTab === 0) {
      return finanzasRecords;
    } else {
      return ordenesRecords;
    }
  };

  // ----------------------------------------------------
  // BEZIER LINE CHART LOGIC
  // ----------------------------------------------------
  const svgWidth = 500;
  const svgHeight = 160;
  const paddingX = 40;
  const paddingY = 20;

  // Group data points for chart based on selected date range
  const getChartPoints = () => {
    const activeRecs = getActiveRecords();
    const { start, end } = getDateRange();
    const startDate = new Date(start);
    const endDate = new Date(end);

    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    
    // Group Daily (for ranges <= 30 days)
    if (diffDays <= 31) {
      const daysList: string[] = [];
      const tempDate = new Date(startDate);
      while (tempDate <= endDate) {
        daysList.push(tempDate.toLocaleDateString("sv-SE"));
        tempDate.setDate(tempDate.getDate() + 1);
      }

      const chartData = daysList.map((day) => {
        const parts = day.split("-");
        const shortLabel = `${parts[2]}/${parts[1]}`;
        
        let sumTotal = 0;
        activeRecs.forEach((r) => {
          const recDay = r.fecha.split("T")[0];
          if (recDay === day) {
            if (activeTab === 0) {
              const fr = r as FinanzaRecord;
              // If Gasto, count it as negative (or ignore for income trend - let's treat it as net services income)
              if (fr.Gasto && String(fr.Gasto).trim() !== "") {
                sumTotal -= Number(fr.Gasto) || 0;
              } else {
                sumTotal += Number(fr.total) || 0;
              }
            } else {
              const or = r as OrdenRecord;
              sumTotal += Number(or.suma_productos) || 0;
            }
          }
        });

        return { label: shortLabel, value: sumTotal };
      });

      return chartData;
    } 
    // Group Monthly (for larger ranges)
    else {
      const monthsList: { year: number; month: number }[] = [];
      const tempDate = new Date(startDate);
      while (tempDate <= endDate) {
        const year = tempDate.getFullYear();
        const month = tempDate.getMonth();
        const exists = monthsList.some(m => m.year === year && m.month === month);
        if (!exists) {
          monthsList.push({ year, month });
        }
        tempDate.setDate(tempDate.getDate() + 1);
      }

      const chartData = monthsList.map((m) => {
        const label = new Date(m.year, m.month).toLocaleString("es-ES", { month: "short", year: "2-digit" });
        
        let sumTotal = 0;
        activeRecs.forEach((r) => {
          const recDate = new Date(r.fecha);
          if (recDate.getFullYear() === m.year && recDate.getMonth() === m.month) {
            if (activeTab === 0) {
              const fr = r as FinanzaRecord;
              if (fr.Gasto && String(fr.Gasto).trim() !== "") {
                sumTotal -= Number(fr.Gasto) || 0;
              } else {
                sumTotal += Number(fr.total) || 0;
              }
            } else {
              const or = r as OrdenRecord;
              sumTotal += Number(or.suma_productos) || 0;
            }
          }
        });

        return { label, value: sumTotal };
      });

      return chartData;
    }
  };

  const chartData = getChartPoints();
  const maxChartValue = Math.max(...chartData.map(d => d.value), 0);
  const minChartValue = Math.min(...chartData.map(d => d.value), 0);
  // Math difference for height scaling
  const chartHeightRange = maxChartValue - minChartValue;

  const getSVGCoordinates = () => {
    return chartData.map((d, index) => {
      const x = paddingX + (index * (svgWidth - 2 * paddingX)) / (chartData.length - 1 || 1);
      
      let y = svgHeight - paddingY;
      if (chartHeightRange > 0) {
        const ratio = (d.value - minChartValue) / chartHeightRange;
        y = svgHeight - paddingY - ratio * (svgHeight - 2 * paddingY);
      } else if (maxChartValue > 0) {
        // Flat line not at bottom if positive
        y = svgHeight / 2;
      }
      return { x, y };
    });
  };

  const generateChartPath = () => {
    const points = getSVGCoordinates();
    if (points.length === 0) return "";
    
    let d = `M ${points[0].x} ${points[0].y}`;
    const t = 0.18; // Bezier smoothing factor
    
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
    const points = getSVGCoordinates();
    if (points.length === 0) return "";

    let d = `M ${points[0].x} ${svgHeight - paddingY}`;
    d += ` L ${points[0].x} ${points[0].y}`;
    
    const t = 0.18; // Bezier smoothing factor
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

  // Format dates for record rows
  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return "Fecha inválida";
    }
  };

  const handleOpenDetail = (record: any) => {
    setSelectedRecord(record);
    setDetailModalOpen(true);
  };

  if (loadingProfile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "var(--background)", color: "var(--foreground)" }}>
        <div style={{ width: "40px", height: "40px", border: "3px solid var(--border)", borderTop: "3px solid #000000", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "1rem" }} />
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Cargando información del usuario...</p>
      </div>
    );
  }

  const isAdmin = profile?.isAdmin === true;
  const isRecepcion = profile?.isRecepcion === true;
  const isPersonal = profile?.isPersonal === true;

  // Title depending on role
  let dashboardTitle = "Control de Finanzas";
  if (isAdmin) dashboardTitle = "Panel de Finanzas (Admin)";
  else if (isRecepcion) dashboardTitle = "Mis Finanzas (Recepción)";
  else if (isPersonal) dashboardTitle = "Mis Finanzas (Personal)";

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <h1 className={styles.title}>{dashboardTitle}</h1>
        {profile && (
          <div className={styles.roleChip}>
            <svg className={styles.roleChipIcon} width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" />
            </svg>
            <span>{isAdmin ? "SuperAdministrador" : isRecepcion ? "Recepción" : "Personal / Barbero"}</span>
          </div>
        )}
      </div>

      {error && (
        <div style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '0.75rem', marginBottom: '2rem', border: '1px solid #fee2e2' }}>
          {error}
        </div>
      )}

      {/* FILTER CONTROL CARD */}
      <div className={styles.filterCard}>
        <div className={styles.filterRow}>
          {/* Period presets */}
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Período de tiempo</span>
            <div className={styles.presets}>
              <button
                type="button"
                className={`${styles.presetButton} ${activePeriod === "today" ? styles.presetButtonActive : ""}`}
                onClick={() => setActivePeriod("today")}
              >
                Hoy
              </button>
              <button
                type="button"
                className={`${styles.presetButton} ${activePeriod === "week" ? styles.presetButtonActive : ""}`}
                onClick={() => setActivePeriod("week")}
              >
                7 Días
              </button>
              <button
                type="button"
                className={`${styles.presetButton} ${activePeriod === "month" ? styles.presetButtonActive : ""}`}
                onClick={() => setActivePeriod("month")}
              >
                Mes
              </button>
              <button
                type="button"
                className={`${styles.presetButton} ${activePeriod === "custom" ? styles.presetButtonActive : ""}`}
                onClick={() => setActivePeriod("custom")}
              >
                Personalizado
              </button>
            </div>
          </div>

          {/* Custom Date Pickers */}
          {activePeriod === "custom" && (
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Rango de fechas</span>
              <div className={styles.dateInputs}>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={startDateInput}
                  onChange={(e) => setStartDateInput(e.target.value)}
                />
                <span style={{ color: 'var(--text-muted)' }}>a</span>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={endDateInput}
                  onChange={(e) => setEndDateInput(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Branch Filter (Admins only) */}
          {isAdmin && (
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Sucursal</span>
              <select
                className={styles.select}
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
              >
                <option value="all">Todas las Sucursales</option>
                {branches.map((b) => (
                  <option key={b.IDSucursal} value={b.NombreSucursal}>
                    {b.NombreSucursal}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Staff Filter (Admins / Recepcion) */}
          {(isAdmin || isRecepcion) && (
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Personal</span>
              <select
                className={styles.select}
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
              >
                <option value="all">Todo el Personal</option>
                {personalList.map((p) => (
                  <option key={p.userID} value={p.userID}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* METRICS DASHBOARD GRID */}
      <div className={styles.metricsGrid}>
        {/* Total General (Net Income) */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconWrapper} ${styles.iconGreen}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Total Neto</span>
            <span className={styles.metricValue}>${netIncome.toFixed(2)}</span>
          </div>
        </div>

        {/* Total Services */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconWrapper} ${styles.iconBlue}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Servicios</span>
            <span className={styles.metricValue}>${totalServices.toFixed(2)}</span>
          </div>
        </div>

        {/* Total Products */}
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconWrapper} ${styles.iconOrange}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Venta Productos</span>
            <span className={styles.metricValue}>${totalProducts.toFixed(2)}</span>
          </div>
        </div>

        {/* Extras / Commissions */}
        {totalExtras > 0 && (
          <div className={styles.metricCard}>
            <div className={`${styles.metricIconWrapper} ${styles.iconGreen}`} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <div className={styles.metricContent}>
              <span className={styles.metricLabel}>Montos Extras</span>
              <span className={styles.metricValue}>${totalExtras.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Gastos (Expenses) */}
        {totalExpenses > 0 && (
          <div className={styles.metricCard}>
            <div className={`${styles.metricIconWrapper} ${styles.iconRed}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <div className={styles.metricContent}>
              <span className={styles.metricLabel}>Gastos</span>
              <span className={styles.metricValue}>${totalExpenses.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* CHART SECTION CARD */}
      {chartData.length > 0 && maxChartValue > 0 && (
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <span className={styles.chartTitle}>Tendencia Financiera</span>
            <span className={styles.chartMeta}>
              {chartData[0]?.label} &rarr; {chartData[chartData.length - 1]?.label}
            </span>
          </div>

          <div style={{ width: "100%", overflow: "hidden" }}>
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height={svgHeight}>
              {/* Grid Lines */}
              <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3" />
              <line x1={paddingX} y1={svgHeight / 2} x2={svgWidth - paddingX} y2={svgHeight / 2} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3" />
              <line x1={paddingX} y1={svgHeight - paddingY} x2={svgWidth - paddingX} y2={svgHeight - paddingY} stroke="var(--border)" strokeWidth="1" />

              {/* Area under curve */}
              <path d={generateChartArea()} fill="url(#gradient-finances)" className={styles.chartArea} />

              {/* Curve path */}
              <path
                d={generateChartPath()}
                fill="none"
                stroke="#000000"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={styles.chartLine}
              />

              {/* Nodes and Tooltips */}
              {chartData.map((d, index) => {
                const points = getSVGCoordinates();
                const p = points[index];
                if (!p) return null;

                return (
                  <g key={index}>
                    <circle cx={p.x} cy={p.y} r="3.5" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
                    
                    {/* Tooltip value */}
                    {d.value !== 0 && (
                      <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fontWeight="800" fill="#000000">
                        ${Math.round(d.value)}
                      </text>
                    )}
                    
                    {/* X-Axis date tag */}
                    {(index === 0 || index === chartData.length - 1 || chartData.length <= 7) && (
                      <text x={p.x} y={svgHeight - 2} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--text-muted)">
                        {d.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Gradient defs */}
              <defs>
                <linearGradient id="gradient-finances" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#000000" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0.0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      )}

      {/* TOGGLE ROW & LIST VIEW CARD */}
      <div className={styles.tableCard}>
        <div className={styles.toggleRow}>
          {/* Box Toggle (SuperAdmin only) */}
          {isAdmin && (
            <div className={styles.cajaToggle}>
              <button
                type="button"
                className={`${styles.tabButton} ${cajaFilter === "all" ? styles.tabButtonActive : ""}`}
                onClick={() => setCajaFilter("all")}
              >
                Todo
              </button>
              <button
                type="button"
                className={`${styles.tabButton} ${cajaFilter === "recepcion" ? styles.tabButtonActive : ""}`}
                onClick={() => setCajaFilter("recepcion")}
              >
                Caja Recepción
              </button>
              <button
                type="button"
                className={`${styles.tabButton} ${cajaFilter === "personal" ? styles.tabButtonActive : ""}`}
                onClick={() => setCajaFilter("personal")}
              >
                Caja Personal
              </button>
            </div>
          )}

          {/* Services vs Products tab switcher */}
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tabButton} ${activeTab === 0 ? styles.tabButtonActive : ""}`}
              onClick={() => setActiveTab(0)}
            >
              Servicios / Gastos
            </button>
            <button
              type="button"
              className={`${styles.tabButton} ${activeTab === 1 ? styles.tabButtonActive : ""}`}
              onClick={() => setActiveTab(1)}
            >
              Productos
            </button>
          </div>
        </div>

        {/* LOADING DATA STATE */}
        {loadingData ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p>Cargando registros financieros...</p>
          </div>
        ) : getActiveRecords().length === 0 ? (
          <div className={styles.emptyState}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>No se encontraron registros en este período.</p>
          </div>
        ) : (
          <div className={styles.recordsList}>
            {getActiveRecords().map((rec: any, idx) => {
              const isServiceTab = activeTab === 0;
              const isGasto = isServiceTab && rec.Gasto && String(rec.Gasto).trim() !== "" && Number(rec.Gasto) > 0;
              
              let amountText = "";
              let titleText = "";
              let subtitleText = "";

              if (isServiceTab) {
                if (isGasto) {
                  amountText = `-$${Number(rec.Gasto).toFixed(2)}`;
                  titleText = rec.descripcion_extras || "Gasto general";
                  subtitleText = `Gasto en ${rec.sucursal} registrado por ${rec.QuienRegistro || 'Personal'}`;
                } else {
                  amountText = `+$${Number(rec.total).toFixed(2)}`;
                  titleText = `Servicios de ${rec.cliente_nombre || 'Cliente'}`;
                  const servicesList = rec.servicios_detalle || [];
                  const sNames = servicesList.map((s: any) => s.name || s.nombre).join(", ");
                  subtitleText = sNames ? `Servicios: ${sNames}` : `Suma servicios: $${rec.suma_servicios}`;
                }
              } else {
                amountText = `+$${Number(rec.suma_productos).toFixed(2)}`;
                titleText = `Venta de productos - ${rec.cliente_nombre || 'Público'}`;
                const productsList = rec.productos_detalle || [];
                const pNames = productsList.map((p: any) => `${p.nombre} (x{p.cantidad})`).join(", ");
                subtitleText = pNames ? `Productos: ${pNames}` : `Artículos: ${productsList.length}`;
              }

              return (
                <div
                  key={rec.id || idx}
                  className={styles.recordItem}
                  onClick={() => handleOpenDetail(rec)}
                >
                  <div className={`${styles.recordIconBox} ${isGasto ? styles.bgRed : styles.bgBlack}`}>
                    {isGasto ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                    )}
                  </div>

                  <div className={styles.recordMeta}>
                    <span className={styles.recordTitle}>{titleText}</span>
                    <span className={styles.recordSub}>
                      {formatDateTime(rec.fecha)} &bull; {subtitleText}
                    </span>
                  </div>

                  <div className={styles.recordActionArea}>
                    <span className={styles.paymentBadge}>{rec.formadepago || "Efectivo"}</span>
                    <span className={`${styles.amount} ${isGasto ? styles.amountGasto : ""}`}>
                      {amountText}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAIL OVERLAY MODAL */}
      {detailModalOpen && selectedRecord && (
        <div className={styles.modalOverlay} onClick={() => setDetailModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={`${styles.modalHeaderIcon} ${selectedRecord.Gasto ? styles.bgRed : styles.bgBlack}`}>
                {selectedRecord.Gasto ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                )}
              </div>

              <div className={styles.modalTitleArea}>
                <span className={styles.modalTitle}>
                  {selectedRecord.Gasto ? "Detalle de Gasto" : activeTab === 0 ? "Detalle de Servicios" : "Detalle de Orden"}
                </span>
                <span className={styles.modalSub}>{formatDateTime(selectedRecord.fecha)}</span>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setDetailModalOpen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* General Info */}
            <div className={styles.detailSection}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Sucursal</span>
                <span className={styles.detailValue}>{selectedRecord.sucursal || "General"}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Forma de Pago</span>
                <span className={styles.detailValue}>{selectedRecord.formadepago || "Efectivo"}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Registrado por</span>
                <span className={styles.detailValue}>{selectedRecord.QuienRegistro || "Sistema"}</span>
              </div>
              {selectedRecord.cliente_nombre && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Cliente</span>
                  <span className={styles.detailValue}>{selectedRecord.cliente_nombre}</span>
                </div>
              )}
            </div>

            {/* Itemized Lists */}
            {selectedRecord.Gasto ? (
              <div>
                <h4 className={styles.sectionHeading}>Desglose del Gasto</h4>
                <div className={styles.detailItemsList}>
                  <div className={styles.detailItemRow}>
                    <span className={styles.dot} style={{ backgroundColor: '#ef4444' }} />
                    <span className={styles.detailItemName}>{selectedRecord.descripcion_extras || "Gasto operativo"}</span>
                    <span className={styles.detailItemPriceRed}>-${Number(selectedRecord.Gasto).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : activeTab === 0 ? (
              // Services detailed list
              <div>
                <h4 className={styles.sectionHeading}>Desglose de Servicios</h4>
                <div className={styles.detailItemsList}>
                  {(selectedRecord.servicios_detalle || []).length === 0 ? (
                    <div className={styles.detailItemRow}>
                      <span className={styles.dot} />
                      <span className={styles.detailItemName}>Suma base de servicios</span>
                      <span className={styles.detailItemPrice}>${Number(selectedRecord.suma_servicios || 0).toFixed(2)}</span>
                    </div>
                  ) : (
                    selectedRecord.servicios_detalle.map((s: any, i: number) => (
                      <div key={i} className={styles.detailItemRow}>
                        <span className={styles.dot} />
                        <span className={styles.detailItemName}>{s.name || s.nombre || "Servicio"}</span>
                        <span className={styles.detailItemPrice}>${Number(s.price || s.precio || 0).toFixed(2)}</span>
                      </div>
                    ))
                  )}

                  {Number(selectedRecord.montos_extras || 0) > 0 && (
                    <div className={styles.detailItemRow} style={{ marginTop: '0.25rem', paddingTop: '0.25rem', borderTop: '1px dashed var(--border)' }}>
                      <span className={styles.dot} style={{ backgroundColor: '#10b981' }} />
                      <span className={styles.detailItemName}>Montos Extras ({selectedRecord.descripcion_extras || "Adicional"})</span>
                      <span className={styles.detailItemPrice} style={{ color: '#10b981' }}>+${Number(selectedRecord.montos_extras).toFixed(2)}</span>
                    </div>
                  )}

                  <div className={styles.detailItemRow} style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)', fontWeight: 800 }}>
                    <span className={styles.detailItemName}>Total de la Ficha</span>
                    <span className={styles.detailItemPrice}>${Number(selectedRecord.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : (
              // Products detailed list
              <div>
                <h4 className={styles.sectionHeading}>Artículos Vendidos</h4>
                <div className={styles.detailItemsList}>
                  {(selectedRecord.productos_detalle || []).map((p: any, i: number) => (
                    <div key={i} className={styles.detailItemRow}>
                      <span className={styles.dot} />
                      <span className={styles.detailItemName}>{p.nombre} (x{p.cantidad})</span>
                      <span className={styles.detailItemPrice}>${Number(p.subtotal || (p.precio_unitario * p.cantidad) || 0).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className={styles.detailItemRow} style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)', fontWeight: 800 }}>
                    <span className={styles.detailItemName}>Total de Productos</span>
                    <span className={styles.detailItemPrice}>${Number(selectedRecord.suma_productos || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
