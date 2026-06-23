'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./recepcion.module.css";

interface Client {
  nombre: string;
  telefono?: string;
  correo?: string;
}

interface Service {
  id?: string;
  nameService?: string;
  Price?: number;
}

interface Personal {
  userID: string;
  nombre: string;
  TipoPersonal?: string;
}

interface Appointment {
  id: string;
  fecha: string;
  horaInicio: string;
  precioCobrado?: number;
  precioFinal?: number;
  MontoACobrar?: number;
  completada?: boolean;
  estatus?: string;
  NombreCliente?: string;
  Servicios?: string;
  clientes?: Client;
  Services?: Service;
  Personal?: Personal | string;
}

interface InventoryItem {
  nombre_producto: string;
  stock: number;
  asignacion_personal: any;
}

interface AssignedInventory {
  name: string;
  qty: number;
}

interface FinanceRecord {
  id: string;
  fecha: string;
  total: number;
  Gasto?: string;
  QuienRegistro?: string;
  sucursal?: string;
  formadepago?: string;
  suma_servicios?: number;
  montos_extras?: number;
  descripcion_extras?: string;
  servicios_detalle?: any[];
  productos_detalle?: any[];
  suma_productos?: number;
  personal_id?: string;
  personalID?: string;
}

export default function RecepcionPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState("Recepción");

  // Summary Metrics
  const [finanzasGralHoy, setFinanzasGralHoy] = useState(0);
  const [finanzasProdHoy, setFinanzasProdHoy] = useState(0);

  // Appointments (Tus citas)
  const [dayOffset, setDayOffset] = useState(0); // 0 = Hoy, 1 = Mañana, 2 = Pasado
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);

  // Assigned Inventory
  const [assignedInventory, setAssignedInventory] = useState<AssignedInventory[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Recent Finance Logs
  const [recentLogs, setRecentLogs] = useState<FinanceRecord[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Active Detail Modals
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<FinanceRecord | null>(null);

  // "Ver finanzas completas" Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPeriod, setDrawerPeriod] = useState<"today" | "week" | "month" | "custom">("week");
  const [drawerTab, setDrawerTab] = useState<"servicios" | "productos">("servicios");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [drawerRecords, setDrawerRecords] = useState<FinanceRecord[]>([]);
  const [loadingDrawer, setLoadingDrawer] = useState(false);

  // "Subir registro" Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form Fields
  const [formaPago, setFormaPago] = useState("En efectivo");
  const [formPersonalId, setFormPersonalId] = useState("");
  const [formSucursal, setFormSucursal] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  
  // Switches
  const [showServices, setShowServices] = useState(true);
  const [showProducts, setShowProducts] = useState(false);
  const [isExpense, setIsExpense] = useState(false);

  // Catalog data loaded for form
  const [catalogStaff, setCatalogStaff] = useState<Personal[]>([]);
  const [catalogBranches, setCatalogBranches] = useState<string[]>([]);
  const [catalogServices, setCatalogServices] = useState<any[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  
  // Form service/product selections
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [extraAmount, setExtraAmount] = useState("");
  const [extraDesc, setExtraDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseConcept, setExpenseConcept] = useState("");

  // Optional client contact for ticket
  const [formClientEmail, setFormClientEmail] = useState("");
  const [formClientPhone, setFormClientPhone] = useState("");
  const [ticketStatus, setTicketStatus] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<{ [id: string]: number }>({});

  // "Escanear QR" Modal State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrQuery, setQrQuery] = useState("");
  const [qrClientResult, setQrClientResult] = useState<any | null>(null);
  const [qrMessage, setQrMessage] = useState("");

  useEffect(() => {
    setMounted(true);
    initDashboard();
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchAppointmentsForOffset();
    }
  }, [dayOffset, mounted]);

  async function initDashboard() {
    setLoading(true);
    try {
      // 1. Get Session user
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setStaffId(session.user.id);
        // Look up name
        const { data: personalData } = await supabase
          .from("Personal")
          .select("nombre")
          .eq("userID", session.user.id)
          .maybeSingle();

        if (personalData?.nombre) {
          setStaffName(personalData.nombre);
        }
      }

      await Promise.all([
        fetchSummaryStats(),
        fetchAppointmentsForOffset(),
        fetchInventory(session?.user?.id),
        fetchRecentLogs(),
        loadCatalogData()
      ]);
    } catch (e) {
      console.error("Error initializing dashboard:", e);
    } finally {
      setLoading(false);
    }
  }

  // Reload catalogs
  async function loadCatalogData() {
    try {
      // Fetch Staff
      const { data: staffData } = await supabase
        .from("Personal")
        .select("userID, nombre, TipoPersonal")
        .order("nombre", { ascending: true });
      
      const filteredStaff = (staffData || []).filter(p => {
        const tipo = (p.TipoPersonal || "").toLowerCase();
        return tipo === "" || tipo === "barbero" || tipo === "estilista" || tipo === "personal";
      });
      setCatalogStaff(filteredStaff);
      if (filteredStaff.length > 0) {
        setFormPersonalId(filteredStaff[0].userID);
      }

      // Fetch Branches
      const { data: branchData } = await supabase
        .from("Sucursales")
        .select("NombreSucursal")
        .order("NombreSucursal");
      const branchNames = (branchData || []).map(b => b.NombreSucursal);
      setCatalogBranches(branchNames);
      if (branchNames.length > 0) {
        setFormSucursal(branchNames[0]);
      }

      // Fetch Services
      const { data: servs } = await supabase
        .from("Services")
        .select("id, nameService, Price")
        .order("nameService");
      setCatalogServices(servs || []);

      // Fetch Products
      const { data: prods } = await supabase
        .from("Productos")
        .select("id, nombre, precio, stock")
        .order("nombre");
      setCatalogProducts(prods || []);
    } catch (e) {
      console.error("Error loading catalogs:", e);
    }
  }

  // Fetch summary metrics for today
  async function fetchSummaryStats() {
    try {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

      // General finance registered by recepcion
      const { data: finanzasData } = await supabase
        .from("FinanzasPersonal")
        .select("total")
        .eq("QuienRegistro", "recepcion")
        .gte("fecha", startOfToday)
        .lte("fecha", endOfToday);

      const sumGral = (finanzasData || []).reduce((acc, row) => acc + (parseFloat(row.total) || 0), 0);
      setFinanzasGralHoy(sumGral);

      // Product sales registered by recepcion
      const { data: productData } = await supabase
        .from("OrdenesProductos")
        .select("suma_productos")
        .eq("QuienRegistro", "recepcion")
        .gte("fecha", startOfToday)
        .lte("fecha", endOfToday);

      const sumProd = (productData || []).reduce((acc, row) => acc + (parseFloat(row.suma_productos) || 0), 0);
      setFinanzasProdHoy(sumProd);
    } catch (e) {
      console.error("Error fetching stats:", e);
    }
  }

  // Fetch appointments for offset day
  async function fetchAppointmentsForOffset() {
    setLoadingAppts(true);
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + dayOffset);
      const dateStr = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD

      const { data, error } = await supabase
        .from("Citas")
        .select(`
          *,
          clientes (nombre, telefono, correo),
          Services (nameService, Price),
          Personal (nombre)
        `)
        .eq("fecha", dateStr)
        .order("horaInicio", { ascending: true });

      if (error) throw error;
      setAppointments((data || []) as Appointment[]);
    } catch (e) {
      console.error("Error fetching appointments:", e);
    } finally {
      setLoadingAppts(false);
    }
  }

  // Fetch assigned inventory
  async function fetchInventory(userId: string | null | undefined) {
    if (!userId) return;
    setLoadingInventory(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("InventarioDiario")
        .select("nombre_producto, stock, asignacion_personal")
        .eq("fecha", todayStr);

      const list = (data || []) as InventoryItem[];
      const temp: AssignedInventory[] = [];

      for (const item of list) {
        const asignaciones = item.asignacion_personal;
        if (Array.isArray(asignaciones)) {
          for (const a of asignaciones) {
            if (a && typeof a === "object" && a.personal_id === userId) {
              const qty = parseInt(a.cantidad) || 0;
              temp.push({
                name: item.nombre_producto || "Producto",
                qty: qty
              });
            }
          }
        }
      }
      setAssignedInventory(temp);
    } catch (e) {
      console.error("Error fetching inventory:", e);
    } finally {
      setLoadingInventory(false);
    }
  }

  // Fetch recent logs registered by recepcion today
  async function fetchRecentLogs() {
    setLoadingLogs(true);
    try {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

      const { data } = await supabase
        .from("FinanzasPersonal")
        .select("*")
        .eq("QuienRegistro", "recepcion")
        .gte("fecha", startOfToday)
        .lte("fecha", endOfToday)
        .order("fecha", { ascending: false })
        .limit(8);

      setRecentLogs((data || []) as FinanceRecord[]);
    } catch (e) {
      console.error("Error fetching recent logs:", e);
    } finally {
      setLoadingLogs(false);
    }
  }

  // Load Historical Records in Drawer
  async function loadDrawerRecords() {
    setLoadingDrawer(true);
    try {
      const now = new Date();
      let startStr = "";
      let endStr = now.toISOString();

      if (drawerPeriod === "today") {
        startStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      } else if (drawerPeriod === "week") {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        startStr = start.toISOString();
      } else if (drawerPeriod === "month") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        startStr = start.toISOString();
      } else if (drawerPeriod === "custom") {
        startStr = customStart ? new Date(customStart).toISOString() : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
        endStr = customEnd ? new Date(customEnd + "T23:59:59").toISOString() : now.toISOString();
      }

      const table = drawerTab === "servicios" ? "FinanzasPersonal" : "OrdenesProductos";

      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("QuienRegistro", "recepcion")
        .gte("fecha", startStr)
        .lte("fecha", endStr)
        .order("fecha", { ascending: false });

      if (error) throw error;
      setDrawerRecords((data || []) as FinanceRecord[]);
    } catch (e) {
      console.error("Error loading drawer historical data:", e);
    } finally {
      setLoadingDrawer(false);
    }
  }

  useEffect(() => {
    if (drawerOpen && mounted) {
      loadDrawerRecords();
    }
  }, [drawerOpen, drawerPeriod, drawerTab, customStart, customEnd, mounted]);

  // SVG Line Chart computation
  function renderChart() {
    if (drawerRecords.length === 0) {
      return (
        <div className={styles.emptyState} style={{ height: "160px", color: "#9ca3af" }}>
          No hay ingresos para trazar la tendencia
        </div>
      );
    }

    // Sort ascending for plotting
    const sorted = [...drawerRecords].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    // Aggregate by date depending on count
    const map = new Map<string, number>();
    for (const r of sorted) {
      const dateLabel = new Date(r.fecha).toLocaleDateString("es-ES", { month: "numeric", day: "numeric" });
      const amt = drawerTab === "servicios" ? r.total : (r.suma_productos || 0);
      map.set(dateLabel, (map.get(dateLabel) || 0) + amt);
    }

    const labels = Array.from(map.keys());
    const values = Array.from(map.values());

    if (values.length < 2) {
      // Pad with single point
      labels.unshift("");
      values.unshift(0);
    }

    const maxVal = Math.max(...values, 100);
    const height = 120;
    const width = 450;
    const padding = 20;

    const points = values.map((val, idx) => {
      const x = padding + (idx / (values.length - 1)) * (width - padding * 2);
      const y = height - padding - (val / maxVal) * (height - padding * 2);
      return { x, y };
    });

    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX = (prev.x + curr.x) / 2;
      pathD += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    let fillD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.chartSvg} style={{ width: "100%", height: "100%" }}>
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        
        {/* Fill Area */}
        <path d={fillD} fill="url(#chartGradient)" />

        {/* Chart Line */}
        <path d={pathD} fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Nodes */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" opacity="0.3" />
            <circle cx={p.x} cy={p.y} r="3" fill="#ffffff" />
          </g>
        ))}

        {/* Labels */}
        <text x={padding} y={height - 2} fill="#9ca3af" fontSize="10" fontWeight="500">
          {labels[0]}
        </text>
        <text x={width - padding} y={height - 2} fill="#9ca3af" fontSize="10" fontWeight="500" textAnchor="end">
          {labels[labels.length - 1]}
        </text>
      </svg>
    );
  }

  // Handle Form Submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formPersonalId) {
      alert("Por favor, selecciona un miembro del personal.");
      return;
    }

    if (isExpense) {
      const amt = parseFloat(expenseAmount);
      if (!expenseAmount.trim() || isNaN(amt) || amt <= 0) {
        alert("Por favor, ingresa un monto válido de gasto.");
        return;
      }
    } else {
      if (!showServices && !showProducts) {
        alert("Activa al menos una sección (Servicios o Productos).");
        return;
      }
      if (showServices && selectedServices.length === 0 && !extraAmount.trim()) {
        alert("Por favor, selecciona al menos un servicio o agrega un monto extra.");
        return;
      }
      if (showProducts && Object.keys(selectedProducts).length === 0) {
        alert("Por favor, selecciona al menos un producto para la orden.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const quienRegistro = "recepcion";
      const fecha = formDate && formTime ? new Date(`${formDate}T${formTime}`) : new Date();

      // Find branch ID if needed
      let branchId = null;
      if (formSucursal) {
        const { data: sucs } = await supabase
          .from("Sucursales")
          .select("IDSucursal")
          .eq("NombreSucursal", formSucursal)
          .maybeSingle();
        if (sucs) {
          branchId = sucs.IDSucursal;
        }
      }

      if (isExpense) {
        const data = {
          personalID: formPersonalId,
          servicios_ids: [],
          servicios_detalle: [],
          suma_servicios: 0,
          montos_extras: 0,
          descripcion_extras: expenseConcept.trim() || "Gasto registrado",
          formadepago: formaPago,
          fecha: fecha.toISOString(),
          sucursal: formSucursal,
          sucursal_id: branchId,
          total: parseFloat(expenseAmount) || 0,
          Gasto: expenseAmount.trim(),
          QuienRegistro: quienRegistro
        };

        const { error } = await supabase.from("FinanzasPersonal").insert([data]);
        if (error) throw error;
      } else {
        // 1. Save Services if enabled
        if (showServices) {
          const servsDetalle = selectedServices.map(id => {
            const s = catalogServices.find(e => e.id.toString() === id);
            return {
              id: id,
              name: s?.nameService || "Servicio",
              price: parseFloat(s?.Price) || 0
            };
          });

          const sumServ = servsDetalle.reduce((acc, s) => acc + s.price, 0);
          const ext = parseFloat(extraAmount) || 0;
          const total = sumServ + ext;

          const data = {
            personalID: formPersonalId,
            servicios_ids: selectedServices,
            servicios_detalle: servsDetalle,
            suma_servicios: sumServ,
            montos_extras: ext,
            descripcion_extras: extraDesc.trim(),
            formadepago: formaPago,
            fecha: fecha.toISOString(),
            sucursal: formSucursal,
            sucursal_id: branchId,
            total: total,
            Gasto: null,
            QuienRegistro: quienRegistro
          };

          const { error } = await supabase.from("FinanzasPersonal").insert([data]);
          if (error) throw error;
        }

        // 2. Save Products if enabled
        if (showProducts) {
          const prodsDetalle = Object.entries(selectedProducts).map(([id, qty]) => {
            const p = catalogProducts.find(item => item.id.toString() === id);
            const price = parseFloat(p?.precio) || 0;
            return {
              id: id,
              nombre: p?.nombre || "Producto",
              precio_unitario: price,
              cantidad: qty,
              subtotal: price * qty
            };
          });

          const sumProds = prodsDetalle.reduce((acc, p) => acc + p.subtotal, 0);

          const orderData = {
            personal_id: formPersonalId,
            productos_detalle: prodsDetalle,
            suma_productos: sumProds,
            formadepago: formaPago,
            fecha: fecha.toISOString(),
            sucursal: formSucursal,
            sucursal_id: branchId,
            QuienRegistro: quienRegistro
          };

          const { error } = await supabase.from("OrdenesProductos").insert([orderData]);
          if (error) throw error;

          // Update product stocks
          for (const item of prodsDetalle) {
            const p = catalogProducts.find(prod => prod.id.toString() === item.id);
            const currentStock = p?.stock || 0;
            await supabase
              .from("Productos")
              .update({ stock: Math.max(0, currentStock - item.cantidad) })
              .eq("id", item.id);
          }
        }
      }

      // After successful save, try to send ticket if email or phone provided
      const hasEmail = formClientEmail.trim().length > 0;
      const hasPhone = formClientPhone.trim().length > 0;

      if (hasEmail || hasPhone) {
        try {
          // Build ticket data
          const staffMember = catalogStaff.find(s => s.userID === formPersonalId);
          const servNames = selectedServices.map(id => {
            const s = catalogServices.find((e: any) => e.id.toString() === id);
            return s?.nameService || "Servicio";
          }).join(", ");

          const totalServs = selectedServices.reduce((acc, id) => {
            const s = catalogServices.find((e: any) => e.id.toString() === id);
            return acc + (parseFloat(s?.Price) || 0);
          }, 0) + (parseFloat(extraAmount) || 0);

          const totalProds = Object.entries(selectedProducts).reduce((acc, [id, qty]) => {
            const p = catalogProducts.find((item: any) => item.id.toString() === id);
            return acc + ((parseFloat(p?.precio) || 0) * qty);
          }, 0);

          const ticketPayload = {
            appointmentId: "recepcion-" + Date.now(),
            clientName: staffMember?.nombre || "Cliente",
            clientEmail: hasEmail ? formClientEmail.trim() : undefined,
            clientPhone: hasPhone ? formClientPhone.trim() : undefined,
            serviceName: showServices ? (servNames || "Servicio General") : "Venta de Productos",
            date: formDate || new Date().toISOString().split("T")[0],
            time: formTime || new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
            price: isExpense ? expenseAmount : ((showServices ? totalServs : 0) + (showProducts ? totalProds : 0)).toFixed(2),
            branch: formSucursal,
          };

          const ticketRes = await fetch("/api/send-ticket", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(ticketPayload),
          });

          const ticketData = await ticketRes.json();
          if (ticketRes.ok && ticketData.success) {
            alert(`✓ Registro insertado y ticket enviado por ${ticketData.method === "email" ? "correo electrónico" : "WhatsApp"}.`);
          } else {
            alert(`✓ Registro insertado. No se pudo enviar el ticket: ${ticketData.error || "Error desconocido"}`);
          }
        } catch (ticketErr: any) {
          alert(`✓ Registro insertado. Error al enviar ticket: ${ticketErr.message}`);
        }
      } else {
        alert("✓ Registro insertado exitosamente.");
      }
      
      // Reset form
      setSelectedServices([]);
      setExtraAmount("");
      setExtraDesc("");
      setExpenseAmount("");
      setExpenseConcept("");
      setSelectedProducts({});
      setFormClientEmail("");
      setFormClientPhone("");
      setModalOpen(false);

      // Reload data
      initDashboard();
    } catch (err: any) {
      alert("Error al guardar: " + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  }

  // Simulate scanning QR Code
  async function simulateQrScan() {
    if (!qrQuery.trim()) {
      alert("Por favor, ingresa el código/nombre del cliente.");
      return;
    }

    setQrMessage("Buscando cliente...");
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .ilike("nombre", `%${qrQuery.trim()}%`)
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const client = data[0];
        
        // Find if they have appointments today
        const todayStr = new Date().toISOString().split("T")[0];
        const { data: appts } = await supabase
          .from("citas")
          .select("*, Services(nameService), Personal(nombre)")
          .eq("cliente_id", client.id)
          .eq("fecha", todayStr);

        setQrClientResult({
          client,
          appointments: appts || []
        });
        setQrMessage("✓ Cliente escaneado exitosamente");
      } else {
        setQrClientResult(null);
        setQrMessage("✕ Cliente no encontrado en la base de datos");
      }
    } catch (e: any) {
      setQrMessage("Error: " + e.message);
    }
  }

  if (!mounted || loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <div style={{ width: "40px", height: "40px", border: "3px solid var(--border)", borderTop: "3px solid #000000", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "1rem" }} />
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Cargando panel de recepción...</p>
        <style jsx global>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Hero Header */}
      <div className={styles.heroCard}>
        <div className={styles.staffBadge}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.25rem' }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          {staffName}
        </div>
        <div className={styles.greeting}>
          {new Date().getHours() < 12 ? "Buenos días" : new Date().getHours() < 18 ? "Buenas tardes" : "Buenas noches"}
        </div>
        <h1 className={styles.title}>Tus registros del día de hoy</h1>
        
        <div className={styles.divider} />
        
        <div className={styles.totalsRow}>
          <div className={styles.totalBlock}>
            <span className={styles.totalLabel}>Finanzas General</span>
            <span className={styles.totalValue}>${finanzasGralHoy.toFixed(2)}</span>
          </div>
          <div className={styles.verticalDivider} />
          <div className={styles.totalBlock} style={{ alignItems: 'flex-end', textAlign: 'right' }}>
            <span className={styles.totalLabel}>Venta Productos</span>
            <span className={styles.totalValue}>${finanzasProdHoy.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className={styles.dashboardGrid}>
        
        {/* Left Column: Appointments and Inventory */}
        <div>
          {/* Citas Card */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Tus citas
              </h2>
              <span className={styles.sectionLink} onClick={() => setDrawerOpen(true)}>
                Ver agenda completa
              </span>
            </div>

            {/* Day Selector Tabs */}
            <div className={styles.tabsRow}>
              <button onClick={() => setDayOffset(0)} className={`${styles.tabBtn} ${dayOffset === 0 ? styles.tabActive : ""}`}>
                Hoy
              </button>
              <button onClick={() => setDayOffset(1)} className={`${styles.tabBtn} ${dayOffset === 1 ? styles.tabActive : ""}`}>
                Mañana
              </button>
              <button onClick={() => setDayOffset(2)} className={`${styles.tabBtn} ${dayOffset === 2 ? styles.tabActive : ""}`}>
                Pasado
              </button>
            </div>

            {/* Appointments Loading or Lists */}
            {loadingAppts ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando citas...</div>
            ) : appointments.length === 0 ? (
              <div className={styles.emptyState}>
                <svg className={styles.emptyIcon} width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>No hay citas para este día</span>
              </div>
            ) : (
              <div className={styles.citasList}>
                {appointments.map(appt => {
                  const clientName = appt.clientes?.nombre || appt.NombreCliente || "Cliente Desconocido";
                  const serviceName = appt.Services?.nameService || appt.Servicios || "Servicio";
                  const barberName = typeof appt.Personal === "object" ? appt.Personal?.nombre : "Sin asignar";
                  const isCompleted = appt.completada === true || appt.estatus?.toLowerCase() === "completada";
                  const price = appt.precioCobrado || appt.precioFinal || appt.MontoACobrar || 0;

                  return (
                    <div 
                      key={appt.id} 
                      className={`${styles.appointmentCard} ${isCompleted ? styles.completedCard : styles.pendingCard}`}
                      onClick={() => setSelectedAppt(appt)}
                    >
                      <div className={styles.timeCol}>
                        {appt.horaInicio ? appt.horaInicio.substring(0, 5) : "--:--"}
                      </div>
                      <div className={styles.appointmentDivider} />
                      <div className={styles.detailsCol}>
                        <span className={styles.clientName}>{clientName}</span>
                        <span className={styles.serviceName}>{serviceName}</span>
                        <span className={styles.assignedTo}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                          Asignado: {barberName}
                        </span>
                      </div>
                      <div className={styles.priceCol}>
                        <span className={styles.priceValue}>${price}</span>
                        <span className={`${styles.statusBadge} ${isCompleted ? styles.completedBadge : styles.pendingBadge}`}>
                          {isCompleted ? "Completada" : "Pendiente"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Inventario Asignado Card */}
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle} style={{ marginBottom: '1.25rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M21 9H3" />
                <path d="M21 15H3" />
                <path d="M12 3v18" />
              </svg>
              Inventario Asignado
            </h2>
            {loadingInventory ? (
              <div>Cargando inventario...</div>
            ) : assignedInventory.length === 0 ? (
              <div className={styles.emptyState}>
                <span>No tienes inventario asignado para hoy.</span>
              </div>
            ) : (
              <div className={styles.inventoryList}>
                {assignedInventory.map((item, idx) => (
                  <div key={idx} className={styles.inventoryItem}>
                    <span className={styles.inventoryName}>{item.name}</span>
                    <span className={styles.inventoryStock}>Cantidad: {item.qty}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Finances */}
        <div>
          <div className={styles.sectionCard} style={{ minHeight: '350px' }}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                Tus finanzas de hoy
              </h2>
              <span className={styles.sectionLink} onClick={() => setDrawerOpen(true)}>
                Ver finanzas completas
              </span>
            </div>

            {loadingLogs ? (
              <div>Cargando finanzas...</div>
            ) : recentLogs.length === 0 ? (
              <div className={styles.emptyState}>
                <span>No hay registros recientes</span>
              </div>
            ) : (
              <div className={styles.historyList}>
                {recentLogs.map(log => {
                  const isGasto = log.Gasto !== null && (log.Gasto || "").trim().length > 0;
                  const amt = isGasto ? parseFloat(log.Gasto || "0") : log.total;
                  const formattedAmt = amt % 1 === 0 ? amt.toFixed(0) : amt.toFixed(2);
                  const time = new Date(log.fecha).toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={log.id} className={styles.historyRow} onClick={() => setSelectedRecord(log)}>
                      <div className={styles.historyInfo}>
                        <span className={styles.historyDate}>{time} - {log.sucursal}</span>
                        {isGasto ? (
                          <span className={styles.historyMeta}>
                            <span className={styles.historyGastoText}>• Gasto: </span> {log.descripcion_extras || "Egreso"}
                          </span>
                        ) : (
                          <span className={styles.historyMeta}>{log.formadepago || "Efectivo"}</span>
                        )}
                      </div>
                      <span className={`${styles.historyAmt} ${isGasto ? styles.historyGastoAmt : ""}`}>
                        {isGasto ? `-$${formattedAmt}` : `$${formattedAmt}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Floating Bottom Dock Action Bar */}
      <div className={styles.dockContainer}>
        <button onClick={() => setQrModalOpen(true)} className={`${styles.dockBtn} ${styles.dockBtnSecondary}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          Escanear QR de cliente
        </button>
        <button onClick={() => setModalOpen(true)} className={`${styles.dockBtn} ${styles.dockBtnPrimary}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Subir registro
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────── */}
      {/* 1. Modal: Detalle de Cita */}
      {/* ──────────────────────────────────────────────────────── */}
      {selectedAppt && (
        <div className={styles.overlay} onClick={() => setSelectedAppt(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <span className={styles.closeBtn} onClick={() => setSelectedAppt(null)}>✕</span>
            <h3 className={styles.modalTitle}>Detalles de Cita</h3>
            
            <div className={styles.detailGrid}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Cliente</span>
                <span className={styles.detailVal}>
                  {selectedAppt.clientes?.nombre || selectedAppt.NombreCliente || "Cliente"}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Teléfono</span>
                <span className={styles.detailVal}>{selectedAppt.clientes?.telefono || "No especificado"}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Email</span>
                <span className={styles.detailVal}>{selectedAppt.clientes?.correo || "No especificado"}</span>
              </div>
              
              <div className={styles.divider} style={{ margin: '0.5rem 0' }} />
              
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Servicio</span>
                <span className={styles.detailVal}>{selectedAppt.Services?.nameService || selectedAppt.Servicios || "Servicio"}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Especialista</span>
                <span className={styles.detailVal}>
                  {typeof selectedAppt.Personal === "object" ? selectedAppt.Personal?.nombre : "Sin asignar"}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Fecha & Hora</span>
                <span className={styles.detailVal}>{selectedAppt.fecha} • {selectedAppt.horaInicio ? selectedAppt.horaInicio.substring(0,5) : ""}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Monto</span>
                <span className={styles.detailVal} style={{ fontWeight: 800 }}>
                  ${selectedAppt.precioCobrado || selectedAppt.precioFinal || selectedAppt.MontoACobrar || 0}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Estatus</span>
                <span className={`${styles.statusBadge} ${selectedAppt.completada === true ? styles.completedBadge : styles.pendingBadge}`}>
                  {selectedAppt.completada === true ? "Completada" : "Pendiente"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 2. Modal: Detalle de Registro de Finanzas */}
      {/* ──────────────────────────────────────────────────────── */}
      {selectedRecord && (
        <div className={styles.overlay} onClick={() => setSelectedRecord(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <span className={styles.closeBtn} onClick={() => setSelectedRecord(null)}>✕</span>
            <h3 className={styles.modalTitle}>Detalle de Transacción</h3>
            
            <div className={styles.detailGrid}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Fecha y Hora</span>
                <span className={styles.detailVal}>{new Date(selectedRecord.fecha).toLocaleString()}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Sucursal</span>
                <span className={styles.detailVal}>{selectedRecord.sucursal || "General"}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Forma de pago</span>
                <span className={styles.detailVal}>{selectedRecord.formadepago || "No registrada"}</span>
              </div>

              {selectedRecord.Gasto ? (
                <>
                  <div className={styles.divider} style={{ margin: '0.5rem 0' }} />
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel} style={{ color: '#ef4444' }}>Tipo de registro</span>
                    <span className={styles.detailVal} style={{ color: '#ef4444', fontWeight: 700 }}>Gasto (Egreso)</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Concepto</span>
                    <span className={styles.detailVal}>{selectedRecord.descripcion_extras || "Concepto de gasto"}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Monto del gasto</span>
                    <span className={styles.detailVal} style={{ color: '#ef4444', fontWeight: 800 }}>-${parseFloat(selectedRecord.Gasto).toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.divider} style={{ margin: '0.5rem 0' }} />
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Suma de servicios</span>
                    <span className={styles.detailVal}>${selectedRecord.suma_servicios || 0}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Montos extras</span>
                    <span className={styles.detailVal}>${selectedRecord.montos_extras || 0}</span>
                  </div>
                  {selectedRecord.descripcion_extras && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Detalle extras</span>
                      <span className={styles.detailVal}>{selectedRecord.descripcion_extras}</span>
                    </div>
                  )}
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Total de transacción</span>
                    <span className={styles.detailVal} style={{ fontWeight: 800 }}>${selectedRecord.total || 0}</span>
                  </div>

                  {/* Servicios list */}
                  {selectedRecord.servicios_detalle && selectedRecord.servicios_detalle.length > 0 && (
                    <>
                      <h4 className={styles.detailHeading}>Servicios Realizados</h4>
                      {selectedRecord.servicios_detalle.map((s: any, idx: number) => (
                        <div key={idx} className={styles.detailListItem}>
                          <span>{s.name}</span>
                          <span style={{ fontWeight: 600 }}>${s.price}</span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Productos list */}
                  {selectedRecord.productos_detalle && selectedRecord.productos_detalle.length > 0 && (
                    <>
                      <h4 className={styles.detailHeading}>Productos Vendidos</h4>
                      {selectedRecord.productos_detalle.map((p: any, idx: number) => (
                        <div key={idx} className={styles.detailListItem}>
                          <span>{p.nombre} (x{p.cantidad})</span>
                          <span style={{ fontWeight: 600 }}>${p.subtotal}</span>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 3. Drawer: Ver Finanzas Completas (Histórico) */}
      {/* ──────────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div className={styles.overlay} onClick={() => setDrawerOpen(false)}>
          <div className={styles.drawerContent} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h3 className={styles.sectionTitle} style={{ fontSize: '1.25rem' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18"></path>
                  <path d="m19 9-5 5-4-4-3 3"></path>
                </svg>
                Tendencias e Histórico
              </h3>
              <span className={styles.closeBtn} onClick={() => setDrawerOpen(false)} style={{ position: 'static' }}>✕</span>
            </div>

            <div className={styles.drawerBody}>
              {/* Tab Selector (Servicios / Productos) */}
              <div className={styles.tabsRow} style={{ marginBottom: '1.5rem' }}>
                <button onClick={() => setDrawerTab("servicios")} className={`${styles.tabBtn} ${drawerTab === "servicios" ? styles.tabActive : ""}`}>
                  Servicios
                </button>
                <button onClick={() => setDrawerTab("productos")} className={`${styles.tabBtn} ${drawerTab === "productos" ? styles.tabActive : ""}`}>
                  Productos
                </button>
              </div>

              {/* Period Select Pills */}
              <div className={styles.tabsRow} style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button onClick={() => setDrawerPeriod("today")} className={`${styles.tabBtn} ${drawerPeriod === "today" ? styles.tabActive : ""}`}>
                  Hoy
                </button>
                <button onClick={() => setDrawerPeriod("week")} className={`${styles.tabBtn} ${drawerPeriod === "week" ? styles.tabActive : ""}`}>
                  7 días
                </button>
                <button onClick={() => setDrawerPeriod("month")} className={`${styles.tabBtn} ${drawerPeriod === "month" ? styles.tabActive : ""}`}>
                  Mes
                </button>
                <button onClick={() => setDrawerPeriod("custom")} className={`${styles.tabBtn} ${drawerPeriod === "custom" ? styles.tabActive : ""}`}>
                  Rango
                </button>
              </div>

              {/* Custom Range picker inputs */}
              {drawerPeriod === "custom" && (
                <div className={styles.sectionCard} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem', marginBottom: '1.5rem' }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Fecha Inicio</label>
                    <input type="date" className={styles.formInput} value={customStart} onChange={e => setCustomStart(e.target.value)} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Fecha Fin</label>
                    <input type="date" className={styles.formInput} value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Trend Chart Card */}
              <div className={styles.chartContainer}>
                <div className={styles.chartHeader}>
                  <span className={styles.chartTitle}>Tendencia de ingresos</span>
                  <span className={styles.chartBadge}>
                    {drawerPeriod === "today" ? "Hoy" : drawerPeriod === "week" ? "Semanal" : drawerPeriod === "month" ? "Mensual" : "Personalizado"}
                  </span>
                </div>
                <div className={styles.chartSvgWrapper}>
                  {loadingDrawer ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#9ca3af' }}>Cargando datos...</div>
                  ) : (
                    renderChart()
                  )}
                </div>
              </div>

              {/* Historical Records List */}
              <h4 className={styles.sectionTitle} style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
                Detalle de Registros ({drawerRecords.length})
              </h4>

              {loadingDrawer ? (
                <div>Cargando listado...</div>
              ) : drawerRecords.length === 0 ? (
                <div className={styles.emptyState}>No hay registros para este rango.</div>
              ) : (
                <div className={styles.historyList}>
                  {drawerRecords.map(log => {
                    const isGasto = log.Gasto !== null && (log.Gasto || "").trim().length > 0;
                    const amt = drawerTab === "servicios" ? (isGasto ? parseFloat(log.Gasto || "0") : log.total) : (log.suma_productos || 0);
                    const formattedAmt = amt % 1 === 0 ? amt.toFixed(0) : amt.toFixed(2);
                    const date = new Date(log.fecha).toLocaleDateString("es-ES", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                    return (
                      <div key={log.id} className={styles.historyRow} onClick={() => setSelectedRecord(log)}>
                        <div className={styles.historyInfo}>
                          <span className={styles.historyDate}>{date} - {log.sucursal}</span>
                          <span className={styles.historyMeta}>
                            {isGasto ? (
                              <span className={styles.historyGastoText}>Gasto: {log.descripcion_extras}</span>
                            ) : (
                              log.formadepago || "Efectivo"
                            )}
                          </span>
                        </div>
                        <span className={`${styles.historyAmt} ${isGasto ? styles.historyGastoAmt : ""}`}>
                          {isGasto ? `-$${formattedAmt}` : `$${formattedAmt}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 4. Modal: Subir Registro (Formulario completo) */}
      {/* ──────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className={styles.overlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modalContent} style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <span className={styles.closeBtn} onClick={() => setModalOpen(false)}>✕</span>
            <h3 className={styles.modalTitle}>Nuevo Registro</h3>

            <form onSubmit={handleSubmit} className={styles.form}>
              
              {/* If NOT an expense, payment selector is shown */}
              {!isExpense && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
                      <line x1="2" y1="10" x2="22" y2="10"></line>
                    </svg>
                    Forma de pago
                  </label>
                  <div className={styles.tabsRow}>
                    {["En efectivo", "Tarjeta", "Transferencia"].map(mode => (
                      <button type="button" key={mode} onClick={() => setFormaPago(mode)} className={`${styles.tabBtn} ${formaPago === mode ? styles.tabActive : ""}`}>
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Specialist selection */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Personal que atiende
                </label>
                <select className={styles.formSelect} value={formPersonalId} onChange={e => setFormPersonalId(e.target.value)}>
                  {catalogStaff.map(p => (
                    <option key={p.userID} value={p.userID}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Branch Selection */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m2 7 4.41-3.67A2 2 0 0 1 7.7 3h8.6a2 2 0 0 1 1.3.33L22 7"></path>
                    <path d="M4 12V9"></path>
                    <path d="M12 12V9"></path>
                    <path d="M20 12V9"></path>
                    <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"></path>
                  </svg>
                  Sucursal
                </label>
                <select className={styles.formSelect} value={formSucursal} onChange={e => setFormSucursal(e.target.value)}>
                  {catalogBranches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Date and Time Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Fecha</label>
                  <input type="date" className={styles.formInput} value={formDate} onChange={e => setFormDate(e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Hora</label>
                  <input type="time" className={styles.formInput} value={formTime} onChange={e => setFormTime(e.target.value)} />
                </div>
              </div>

              {/* Optional client contact for ticket sending */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  Correo del cliente <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem' }}>(opcional)</span>
                </label>
                <input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  className={styles.formInput}
                  value={formClientEmail}
                  onChange={e => setFormClientEmail(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  Teléfono del cliente <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem' }}>(opcional)</span>
                </label>
                <input
                  type="tel"
                  placeholder="10 dígitos para envío por WhatsApp"
                  className={styles.formInput}
                  value={formClientPhone}
                  onChange={e => setFormClientPhone(e.target.value)}
                />
              </div>

              {(formClientEmail.trim() || formClientPhone.trim()) && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.75rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.03)',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  {formClientEmail.trim()
                    ? "Se enviará un ticket de compra al correo vía Resend."
                    : "Se enviará un ticket de compra por WhatsApp al número proporcionado."
                  }
                </div>
              )}

              {/* If NOT expense, display Services and Products toggles */}
              {!isExpense && (
                <>
                  {/* Switch Services */}
                  <div className={styles.switchRow}>
                    <div className={styles.switchText}>
                      <span className={styles.switchTitle}>Registrar servicios</span>
                      <span className={styles.switchSub}>Añadir servicios de barbería</span>
                    </div>
                    <label className={styles.switchWrapper}>
                      <input type="checkbox" checked={showServices} onChange={e => setShowServices(e.target.checked)} />
                      <span className={styles.slider} />
                    </label>
                  </div>

                  {showServices && (
                    <div className={styles.formGroup} style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--border)' }}>
                      <label className={styles.formLabel}>Servicios Realizados</label>
                      <div className={styles.chipsGrid}>
                        {catalogServices.map(s => {
                          const isActive = selectedServices.includes(s.id.toString());
                          return (
                            <button
                              key={s.id}
                              type="button"
                              className={`${styles.chip} ${isActive ? styles.chipActive : ""}`}
                              onClick={() => {
                                if (isActive) {
                                  setSelectedServices(prev => prev.filter(id => id !== s.id.toString()));
                                } else {
                                  setSelectedServices(prev => [...prev, s.id.toString()]);
                                }
                              }}
                            >
                              {s.nameService} (${s.Price})
                            </button>
                          );
                        })}
                      </div>

                      {/* Extra Amount */}
                      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <input 
                          type="number" 
                          placeholder="Monto Extra" 
                          className={styles.formInput} 
                          value={extraAmount} 
                          onChange={e => setExtraAmount(e.target.value)} 
                          min="0"
                        />
                        <input 
                          type="text" 
                          placeholder="Concepto del extra (ej. propina, parche)" 
                          className={styles.formInput} 
                          value={extraDesc} 
                          onChange={e => setExtraDesc(e.target.value)} 
                        />
                      </div>
                    </div>
                  )}

                  {/* Switch Products */}
                  <div className={styles.switchRow}>
                    <div className={styles.switchText}>
                      <span className={styles.switchTitle}>Subir orden de productos</span>
                      <span className={styles.switchSub}>Venta directa al cliente</span>
                    </div>
                    <label className={styles.switchWrapper}>
                      <input type="checkbox" checked={showProducts} onChange={e => setShowProducts(e.target.checked)} />
                      <span className={styles.slider} />
                    </label>
                  </div>

                  {showProducts && (
                    <div className={styles.formGroup} style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--border)' }}>
                      <label className={styles.formLabel}>Seleccionar Productos</label>
                      <div className={styles.productFormGrid}>
                        {catalogProducts.map(p => {
                          const qty = selectedProducts[p.id.toString()] || 0;
                          return (
                            <div key={p.id} className={styles.productFormRow}>
                              <div className={styles.prodFormDetails}>
                                <span className={styles.prodFormName}>{p.nombre}</span>
                                <span className={styles.prodFormMeta}>${p.precio} • Stock: {p.stock}</span>
                              </div>
                              <div className={styles.qtySelector}>
                                <button
                                  type="button"
                                  className={styles.qtyBtn}
                                  disabled={qty === 0}
                                  onClick={() => {
                                    setSelectedProducts(prev => {
                                      const newMap = { ...prev };
                                      if (qty > 1) {
                                        newMap[p.id.toString()] = qty - 1;
                                      } else {
                                        delete newMap[p.id.toString()];
                                      }
                                      return newMap;
                                    });
                                  }}
                                >
                                  -
                                </button>
                                <span className={styles.qtyVal}>{qty}</span>
                                <button
                                  type="button"
                                  className={styles.qtyBtn}
                                  disabled={qty >= p.stock}
                                  onClick={() => {
                                    setSelectedProducts(prev => ({
                                      ...prev,
                                      [p.id.toString()]: qty + 1
                                    }));
                                  }}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Switch Expense (Egreso) */}
              <div className={styles.switchRow} style={{ marginTop: '0.5rem' }}>
                <div className={styles.switchText}>
                  <span className={styles.switchTitle} style={{ color: isExpense ? '#ef4444' : 'inherit' }}>Registrar Gasto (Egreso)</span>
                  <span className={styles.switchSub}>Salida de dinero de caja chica</span>
                </div>
                <label className={styles.switchWrapper}>
                  <input type="checkbox" checked={isExpense} onChange={e => setIsExpense(e.target.checked)} />
                  <span className={styles.slider} style={{ backgroundColor: isExpense ? '#ef4444' : '' }} />
                </label>
              </div>

              {isExpense && (
                <div className={styles.formGroup} style={{ paddingLeft: '1rem', borderLeft: '2px solid #ef4444' }}>
                  <label className={styles.formLabel} style={{ color: '#ef4444' }}>Detalle de Gasto</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <input 
                      type="number" 
                      placeholder="Monto $" 
                      className={styles.formInput} 
                      value={expenseAmount} 
                      onChange={e => setExpenseAmount(e.target.value)} 
                      min="0"
                      step="0.01"
                      required
                    />
                    <input 
                      type="text" 
                      placeholder="Concepto/Descripción del egreso" 
                      className={styles.formInput} 
                      value={expenseConcept} 
                      onChange={e => setExpenseConcept(e.target.value)} 
                      required
                    />
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className={styles.formActions}>
                <button type="button" className={styles.btnCancel} onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnSubmit} disabled={submitting}>
                  {submitting ? "Registrando..." : "Guardar Registro"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 5. Modal: Escanear Código QR (Simulación) */}
      {/* ──────────────────────────────────────────────────────── */}
      {qrModalOpen && (
        <div className={styles.overlay} onClick={() => setQrModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <span className={styles.closeBtn} onClick={() => setQrModalOpen(false)}>✕</span>
            <h3 className={styles.modalTitle}>Escáner de Cliente</h3>
            
            <div className={styles.qrContent}>
              <div className={styles.qrScannerBox}>
                <div className={styles.qrScannerLine} />
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#e5e7eb" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
              </div>

              <div className={styles.formGroup} style={{ width: '100%' }}>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  placeholder="ID de cliente o Nombre..." 
                  value={qrQuery} 
                  onChange={e => setQrQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && simulateQrScan()}
                />
              </div>

              <button type="button" className={styles.qrSimulateBtn} onClick={simulateQrScan}>
                Simular Escaneo / Buscar
              </button>

              {qrMessage && (
                <div style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  borderRadius: '0.5rem', 
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  backgroundColor: qrMessage.startsWith('✕') ? '#fef2f2' : qrMessage.startsWith('✓') ? '#ecfdf5' : '#f3f4f6',
                  color: qrMessage.startsWith('✕') ? '#991b1b' : qrMessage.startsWith('✓') ? '#065f46' : '#374151'
                }}>
                  {qrMessage}
                </div>
              )}

              {qrClientResult && (
                <div className={styles.sectionCard} style={{ width: '100%', textAlign: 'left', padding: '1rem', marginTop: '0.5rem' }}>
                  <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Ficha del Cliente</h4>
                  <div style={{ fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div><strong>Nombre:</strong> {qrClientResult.client.nombre}</div>
                    <div><strong>Teléfono:</strong> {qrClientResult.client.telefono || "Sin registrar"}</div>
                    <div><strong>Email:</strong> {qrClientResult.client.correo || "Sin registrar"}</div>
                  </div>

                  <h5 style={{ fontWeight: 700, fontSize: '0.8rem', marginTop: '1rem', marginBottom: '0.5rem', textTransform: 'uppercase', color: '#64748b' }}>
                    Citas Agendadas para Hoy
                  </h5>
                  {qrClientResult.appointments.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Sin citas el día de hoy</div>
                  ) : (
                    qrClientResult.appointments.map((appt: any) => (
                      <div key={appt.id} style={{ 
                        fontSize: '0.8rem', 
                        padding: '0.5rem', 
                        borderRadius: '0.35rem', 
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        marginTop: '0.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <strong>{appt.horaInicio.substring(0, 5)}</strong> - {appt.Services?.nameService || appt.Servicios}
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Especialista: {appt.Personal?.nombre}</div>
                        </div>
                        <span className={`${styles.statusBadge} ${appt.completada ? styles.completedBadge : styles.pendingBadge}`}>
                          {appt.completada ? "Completada" : "Pendiente"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
