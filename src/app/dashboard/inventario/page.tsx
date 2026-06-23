'use client';

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./inventario.module.css";

interface ProductDetails {
  categoria: string;
  imagen_url?: string;
}

interface InventoryRecord {
  id: string;
  created_at: string;
  producto_id: string;
  nombre_producto: string;
  stock: number;
  fecha: string;
  asignacion_personal: {
    personal_id: string;
    nombre: string;
    cantidad: number;
  }[];
  Productos?: ProductDetails;
}

interface StaffMember {
  userID: string;
  nombre: string;
}

interface SupplierOrder {
  id: string;
  proveedor: string;
  fecha?: string;
  precio_total_pedid?: number;
  deuda?: number;
  dias_credito?: number;
  meses_sin_intereses?: number;
  metodos_pago?: string;
  completado?: boolean;
  url_factura?: string;
  productos_pedidos?: any;
}

export default function InventarioDiarioPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [editedStocks, setEditedStocks] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Saving states
  const [savingRecordId, setSavingRecordId] = useState<string | null>(null);

  // Latest Supplier Order
  const [latestPedido, setLatestPedido] = useState<SupplierOrder | null>(null);
  const [loadingPedido, setLoadingPedido] = useState(true);

  // Modal: Staff stock assignment
  const [assigningRecord, setAssigningRecord] = useState<InventoryRecord | null>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [qtyToAssign, setQtyToAssign] = useState(1);
  const [assignments, setAssignments] = useState<InventoryRecord['asignacion_personal']>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [isSavingAssignments, setIsSavingAssignments] = useState(false);

  const dateInputRef = useRef<HTMLInputElement>(null);

  // Generate date range of -30 to +30 days
  const generateDates = () => {
    const datesList: Date[] = [];
    const today = new Date();
    for (let i = -30; i <= 30; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      datesList.push(d);
    }
    return datesList;
  };

  const dates = generateDates();

  const formatDateStr = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Scroll to active day capsule
  useEffect(() => {
    const activeEl = document.getElementById("active-day-capsule");
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedDate]);

  // Load daily inventory & latest order
  useEffect(() => {
    const dateStr = formatDateStr(selectedDate);
    fetchDailyInventory(dateStr);
    fetchLatestPedido();
  }, [selectedDate]);

  async function fetchDailyInventory(dateStr: string) {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("InventarioDiario")
        .select("*, Productos(categoria, imagen_url)")
        .eq("fecha", dateStr)
        .order("nombre_producto", { ascending: true });

      if (fetchErr) throw fetchErr;

      const list = (data || []) as InventoryRecord[];

      // Auto-generate if today and empty
      const todayStr = formatDateStr(new Date());
      if (list.length === 0 && dateStr === todayStr) {
        await generateTodayInventory(dateStr);
      } else {
        setRecords(list);
        // Clear modified stock states
        const initialStocks: Record<string, number> = {};
        for (const r of list) {
          initialStocks[r.id] = r.stock || 0;
        }
        setEditedStocks(initialStocks);
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Error loading daily inventory:", err);
      setError(err.message || "Error al cargar el inventario diario");
      setLoading(false);
    }
  }

  async function generateTodayInventory(dateStr: string) {
    try {
      // 1. Fetch active products from catalog
      const { data: products, error: prodErr } = await supabase
        .from("Productos")
        .select("id, nombre, stock");

      if (prodErr) throw prodErr;
      if (!products || products.length === 0) {
        setRecords([]);
        setEditedStocks({});
        setLoading(false);
        return;
      }

      // 2. Fetch the most recent date in InventarioDiario before dateStr
      const { data: latestDateResp, error: dateErr } = await supabase
        .from("InventarioDiario")
        .select("fecha")
        .lt("fecha", dateStr)
        .order("fecha", { ascending: false })
        .limit(1);

      if (dateErr) throw dateErr;

      const previousStockMap: Record<string, number> = {};

      if (latestDateResp && latestDateResp.length > 0) {
        const latestDate = latestDateResp[0].fecha;
        // Fetch stocks for that date
        const { data: prevInventoryResp, error: prevErr } = await supabase
          .from("InventarioDiario")
          .select("producto_id, stock")
          .eq("fecha", latestDate);

        if (prevErr) throw prevErr;

        if (prevInventoryResp) {
          for (const item of prevInventoryResp) {
            previousStockMap[String(item.producto_id)] = item.stock || 0;
          }
        }
      }

      // 3. Map products to today's inserts
      const inserts = products.map((p) => {
        const prodId = String(p.id);
        const startingStock = prodId in previousStockMap ? previousStockMap[prodId] : (p.stock || 0);

        return {
          producto_id: p.id,
          nombre_producto: p.nombre,
          stock: startingStock,
          fecha: dateStr,
        };
      });

      // 4. Perform upsert to prevent unique constraint violations on concurrent load/runs
      const { error: insertErr } = await supabase
        .from("InventarioDiario")
        .upsert(inserts, { onConflict: 'producto_id,fecha' });

      if (insertErr) throw insertErr;

      // Re-fetch records
      await fetchDailyInventory(dateStr);
    } catch (err: any) {
      console.error("Error generating today inventory:", err);
      setError("Error al autogenerar inventario de hoy: " + err.message);
      setLoading(false);
    }
  }

  async function fetchLatestPedido() {
    setLoadingPedido(true);
    try {
      const { data, error } = await supabase
        .from("ProveedoresStock")
        .select("*")
        .not("productos_pedidos", "is", null)
        .neq("productos_pedidos", "[]")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setLatestPedido(data as SupplierOrder || null);
    } catch (err) {
      console.error("Error fetching latest pedido:", err);
    } finally {
      setLoadingPedido(false);
    }
  }

  const handleSaveStock = async (record: InventoryRecord, newStock: number) => {
    setSavingRecordId(record.id);
    try {
      // 1. Update InventarioDiario
      const { error: updateErr } = await supabase
        .from("InventarioDiario")
        .update({ stock: newStock })
        .eq("id", record.id);

      if (updateErr) throw updateErr;

      // 2. If it's today, update Productos catalog
      const todayStr = formatDateStr(new Date());
      const selectedStr = formatDateStr(selectedDate);
      if (selectedStr === todayStr) {
        const { error: prodErr } = await supabase
          .from("Productos")
          .update({ stock: newStock })
          .eq("id", record.producto_id);

        if (prodErr) throw prodErr;
      }

      // Update local state value
      setRecords((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, stock: newStock } : r))
      );
    } catch (err: any) {
      alert("Error al guardar stock: " + err.message);
    } finally {
      setSavingRecordId(null);
    }
  };

  // Staff Stock Assignment Dialog Helper functions
  useEffect(() => {
    if (assigningRecord) {
      const fetchStaff = async () => {
        setLoadingStaff(true);
        try {
          const { data, error } = await supabase
            .from("Personal")
            .select("userID, nombre")
            .order("nombre", { ascending: true });

          if (error) throw error;
          setStaffList((data || []) as StaffMember[]);
        } catch (err) {
          console.error("Error loading staff:", err);
        } finally {
          setLoadingStaff(false);
        }
      };

      fetchStaff();
      setAssignments(assigningRecord.asignacion_personal || []);
      setSelectedStaff(null);
      setQtyToAssign(1);
    }
  }, [assigningRecord]);

  const getRemainingStock = () => {
    if (!assigningRecord) return 0;
    const totalStock = assigningRecord.stock || 0;
    const totalAssigned = assignments.reduce((sum, item) => sum + (item.cantidad || 0), 0);
    return totalStock - totalAssigned;
  };

  const handleStaffChange = (staffId: string) => {
    const staff = staffList.find((s) => s.userID === staffId) || null;
    setSelectedStaff(staff);
    if (staff) {
      const existing = assignments.find((a) => a.personal_id === staffId);
      if (existing) {
        setQtyToAssign(existing.cantidad || 1);
      } else {
        const rem = getRemainingStock();
        setQtyToAssign(rem > 0 ? 1 : 0);
      }
    } else {
      setQtyToAssign(1);
    }
  };

  const handleAddAssignment = () => {
    if (!selectedStaff || !assigningRecord) return;
    const staffId = selectedStaff.userID;
    const name = selectedStaff.nombre;
    const qty = qtyToAssign;

    if (qty <= 0) return;

    setAssignments((prev) => {
      const idx = prev.findIndex((a) => a.personal_id === staffId);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], cantidad: qty };
        return next;
      } else {
        return [...prev, { personal_id: staffId, nombre: name, cantidad: qty }];
      }
    });

    setSelectedStaff(null);
    setQtyToAssign(1);
  };

  const handleUpdateAssignmentQty = (staffId: string, increment: boolean) => {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.personal_id === staffId) {
          const rem = getRemainingStock();
          const newQty = increment ? a.cantidad + 1 : a.cantidad - 1;
          if (newQty < 1) return a;
          if (increment && rem <= 0) return a;

          if (selectedStaff && selectedStaff.userID === staffId) {
            setQtyToAssign(newQty);
          }
          return { ...a, cantidad: newQty };
        }
        return a;
      })
    );
  };

  const handleDeleteAssignment = (staffId: string) => {
    setAssignments((prev) => prev.filter((a) => a.personal_id !== staffId));
  };

  const handleSaveAssignments = async () => {
    if (!assigningRecord) return;
    setIsSavingAssignments(true);
    try {
      const { error } = await supabase
        .from("InventarioDiario")
        .update({ asignacion_personal: assignments })
        .eq("id", assigningRecord.id);

      if (error) throw error;

      setRecords((prev) =>
        prev.map((r) =>
          r.id === assigningRecord.id ? { ...r, asignacion_personal: assignments } : r
        )
      );

      setAssigningRecord(null);
    } catch (err: any) {
      alert("Error al guardar asignaciones: " + err.message);
    } finally {
      setIsSavingAssignments(false);
    }
  };

  const handleDatePickerTrigger = () => {
    if (dateInputRef.current) {
      try {
        dateInputRef.current.showPicker();
      } catch (err) {
        dateInputRef.current.click();
      }
    }
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const parts = e.target.value.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      setSelectedDate(new Date(y, m, d));
    }
  };

  const formatMonthHeader = (date: Date) => {
    const formatter = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
    const formatted = formatter.format(date);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const getDayName = (date: Date) => {
    const formatter = new Intl.DateTimeFormat('es-ES', { weekday: 'short' });
    return formatter.format(date).toUpperCase().slice(0, 3);
  };

  // Filtering records in memory
  const filteredRecords = searchQuery.trim() === ""
    ? records
    : records.filter((r) =>
        r.nombre_producto.toLowerCase().includes(searchQuery.toLowerCase())
      );

  // Dialog selected staff values for controls
  const selectedStaffId = selectedStaff?.userID;
  let currentStaffAssigned = 0;
  if (selectedStaffId) {
    const existing = assignments.find((a) => a.personal_id === selectedStaffId);
    if (existing) currentStaffAssigned = existing.cantidad || 0;
  }
  const remainingStockVal = getRemainingStock();
  const maxAllowed = remainingStockVal + currentStaffAssigned;

  const isTodaySelected = formatDateStr(selectedDate) === formatDateStr(new Date());

  const formatOrderDate = (rawDateStr?: string) => {
    if (!rawDateStr) return "";
    try {
      const parsedDate = new Date(rawDateStr);
      return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(parsedDate);
    } catch (_) {
      return rawDateStr;
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Inventario Diario</h1>
      </div>

      {error && (
        <div style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '0.75rem', marginBottom: '2rem', border: '1px solid #fee2e2' }}>
          {error}
        </div>
      )}

      {/* Horizontal Calendar */}
      <div className={styles.calendarContainer}>
        <div className={styles.calendarHeader}>
          <span className={styles.monthLabel}>{formatMonthHeader(selectedDate)}</span>
          <button className={styles.calendarPickerBtn} onClick={handleDatePickerTrigger} title="Seleccionar fecha">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
          <input
            type="date"
            ref={dateInputRef}
            style={{ display: "none" }}
            max={formatDateStr(new Date())}
            onChange={handleDateInputChange}
            value={formatDateStr(selectedDate)}
          />
        </div>

        <div className={styles.daysWrapper}>
          {dates.map((d, index) => {
            const isSelected = formatDateStr(d) === formatDateStr(selectedDate);
            const isDayCapsuleActive = isSelected ? styles.activeDay : "";
            return (
              <div
                key={index}
                id={isSelected ? "active-day-capsule" : undefined}
                className={`${styles.dayCapsule} ${isDayCapsuleActive}`}
                onClick={() => setSelectedDate(d)}
              >
                <span className={styles.dayName}>{getDayName(d)}</span>
                <span className={styles.dayNum}>{d.getDate()}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search Input */}
      <div className={styles.searchSection}>
        <div className={styles.searchInputWrapper}>
          <svg className={styles.searchIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar producto..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* List section */}
      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Cargando inventario...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className={styles.emptyState}>
          <svg className={styles.emptyStateIcon} xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M21 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
            <path d="M10 13h4a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v0a2 2 0 0 1 2-2z" />
          </svg>
          <h3 className={styles.emptyStateTitle}>
            {isTodaySelected ? "No hay productos en el catálogo" : "Sin inventario registrado"}
          </h3>
          <p className={styles.emptyStateDesc}>
            {isTodaySelected
              ? "Agrega productos a tu catálogo de productos para poder verlos en tu inventario diario."
              : "No se generó el inventario histórico para este día en particular."}
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredRecords.map((record) => {
            const id = record.id;
            const originalStock = record.stock || 0;
            const tempStock = id in editedStocks ? editedStocks[id] : originalStock;
            const isModified = tempStock !== originalStock;
            const isSaving = savingRecordId === id;

            const category = record.Productos?.categoria || "General";
            const imageUrl = record.Productos?.imagen_url;

            const handleIncrement = () => {
              setEditedStocks((prev) => ({ ...prev, [id]: tempStock + 1 }));
            };

            const handleDecrement = () => {
              if (tempStock > 0) {
                setEditedStocks((prev) => ({ ...prev, [id]: tempStock - 1 }));
              }
            };

            return (
              <div key={id} className={styles.card}>
                {/* Thumbnail Image */}
                <div className={styles.imageWrapper}>
                  {imageUrl ? (
                    <img src={imageUrl} alt={record.nombre_producto} className={styles.cardImage} />
                  ) : (
                    <div className={styles.noImagePlaceholder}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M21 9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9" />
                      </svg>
                      <span>Sin foto</span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className={styles.cardContent}>
                  <h3 className={styles.productName}>{record.nombre_producto}</h3>
                  <span className={styles.categoryBadge}>{category}</span>
                </div>

                {/* Controls */}
                <div className={styles.controlsSection}>
                  <button
                    className={`${styles.actionButton} ${styles.assignBtn}`}
                    onClick={() => setAssigningRecord(record)}
                    title="Asignar stock a personal"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <line x1="19" y1="8" x2="19" y2="14" />
                      <line x1="22" y1="11" x2="16" y2="11" />
                    </svg>
                  </button>

                  <div className={styles.counterContainer}>
                    <button
                      className={styles.counterBtn}
                      onClick={handleDecrement}
                      disabled={tempStock <= 0 || isSaving}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                      </svg>
                    </button>
                    <div className={styles.stockBox}>{tempStock}</div>
                    <button
                      className={styles.counterBtn}
                      onClick={handleIncrement}
                      disabled={isSaving}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="16" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                      </svg>
                    </button>
                  </div>

                  <button
                    className={styles.saveBtn}
                    onClick={() => handleSaveStock(record, tempStock)}
                    disabled={!isModified || isSaving}
                  >
                    {isSaving ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '2.5rem 0' }} />

      {/* Latest Provider Order Section */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--foreground)', marginBottom: '1rem' }}>
        Último Pedido a Proveedores
      </h2>

      {loadingPedido ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Cargando pedido...</p>
        </div>
      ) : latestPedido === null ? (
        <div className={styles.emptyProvider}>
          <svg className={styles.emptyProviderIcon} xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span className={styles.emptyProviderTitle}>Sin pedidos registrados</span>
          <span className={styles.emptyProviderDesc}>No se encontró ningún pedido a proveedores en la base de datos.</span>
        </div>
      ) : (
        <div className={styles.providerSection}>
          <div className={styles.providerHeader}>
            <div className={styles.providerMeta}>
              <div className={styles.providerIconBox}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div>
                <div className={styles.providerTag}>Último pedido registrado</div>
                <div className={styles.providerName}>{latestPedido.proveedor}</div>
              </div>
            </div>
            <span className={`${styles.statusBadge} ${latestPedido.completado ? styles.statusPaid : styles.statusPending}`}>
              {latestPedido.completado ? "PAGADO" : "PENDIENTE"}
            </span>
          </div>

          <div className={styles.orderGrid}>
            <div className={styles.infoRow}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <span className={styles.infoLabel}>Total:</span>
              <span className={styles.infoValue}>${latestPedido.precio_total_pedid?.toFixed(2) || "0.00"}</span>
            </div>

            <div className={styles.infoRow}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className={styles.infoLabel}>Deuda:</span>
              <span className={styles.infoValue}>${latestPedido.deuda?.toFixed(2) || "0.00"}</span>
            </div>

            <div className={styles.infoRow}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className={styles.infoLabel}>Plazo:</span>
              <span className={styles.infoValue}>
                {latestPedido.dias_credito && latestPedido.dias_credito > 0
                  ? `${latestPedido.dias_credito} días`
                  : "Inmediato"}
              </span>
            </div>

            <div className={styles.infoRow}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="5" x2="5" y2="19" />
                <circle cx="6.5" cy="6.5" r="2.5" />
                <circle cx="17.5" cy="17.5" r="2.5" />
              </svg>
              <span className={styles.infoLabel}>MSI:</span>
              <span className={styles.infoValue}>
                {latestPedido.meses_sin_intereses && latestPedido.meses_sin_intereses > 0
                  ? `${latestPedido.meses_sin_intereses} MSI`
                  : "Sin MSI"}
              </span>
            </div>

            <div className={`${styles.infoRow} ${styles.fullWidthRow}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              <span className={styles.infoLabel}>Método de pago:</span>
              <span className={styles.infoValue}>{latestPedido.metodos_pago || "No especificado"}</span>
            </div>

            <div className={styles.infoRow}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className={styles.infoLabel}>Fecha pedido:</span>
              <span className={styles.infoValue}>{formatOrderDate(latestPedido.fecha)}</span>
            </div>
          </div>

          {latestPedido.url_factura && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <a
                href={latestPedido.url_factura}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.invoiceBtn}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
                  <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                </svg>
                Ver Factura
              </a>
            </div>
          )}
        </div>
      )}

      {/* Dialog Modal: Assign stock to staff */}
      {assigningRecord && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
              <h3 className={styles.modalTitle}>Asignar Stock: {assigningRecord.nombre_producto}</h3>
            </div>

            {loadingStaff ? (
              <div className={styles.loadingContainer} style={{ minHeight: '120px' }}>
                <div className={styles.spinner} />
                <p style={{ fontSize: '0.85rem' }}>Cargando personal...</p>
              </div>
            ) : (
              <div>
                <label className={styles.label}>Seleccionar Personal</label>
                <div className={styles.selectWrapper}>
                  <select
                    className={styles.select}
                    value={selectedStaffId || ""}
                    onChange={(e) => handleStaffChange(e.target.value)}
                  >
                    <option value="">Selecciona personal</option>
                    {staffList.map((s) => (
                      <option key={s.userID} value={s.userID}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                  <svg className={styles.selectArrow} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                {/* Stock remaining status card */}
                <div className={styles.statusCard}>
                  <div className={styles.statusCardText}>
                    <span className={styles.statusCardTitle}>Stock Restante en Almacén</span>
                    <span className={styles.statusCardDesc}>
                      Disponible: {remainingStockVal} de {assigningRecord.stock || 0} unidades
                    </span>
                  </div>
                  <div className={styles.statusCardBadge}>{remainingStockVal}</div>
                </div>

                {/* Counter and Add Button */}
                <div className={styles.quantityRow}>
                  <div className={styles.quantitySelector}>
                    <button
                      type="button"
                      className={styles.qtyChangeBtn}
                      disabled={qtyToAssign <= 1}
                      onClick={() => setQtyToAssign((prev) => prev - 1)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                    <div className={styles.qtyValBox}>
                      <span className={styles.qtyLabel}>CANTIDAD</span>
                      <span className={styles.qtyVal}>{qtyToAssign}</span>
                    </div>
                    <button
                      type="button"
                      className={styles.qtyChangeBtn}
                      disabled={qtyToAssign >= maxAllowed}
                      onClick={() => setQtyToAssign((prev) => prev + 1)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  </div>

                  <button
                    type="button"
                    className={styles.addAssignBtn}
                    onClick={handleAddAssignment}
                    disabled={!selectedStaff || qtyToAssign <= 0 || qtyToAssign > maxAllowed || maxAllowed <= 0}
                  >
                    Agregar
                  </button>
                </div>

                {/* Current assignments list */}
                <div className={styles.assignmentsList}>
                  <span className={styles.sectionHeading}>Asignaciones Actuales:</span>
                  {assignments.length === 0 ? (
                    <div className={styles.noAssignmentsText}>No hay asignaciones para este día.</div>
                  ) : (
                    assignments.map((a, idx) => (
                      <div key={idx} className={styles.assignmentItem}>
                        <span className={styles.assignmentName}>{a.nombre}</span>
                        <div className={styles.assignmentControls}>
                          <button
                            type="button"
                            className={styles.assignItemBtn}
                            disabled={a.cantidad <= 1}
                            onClick={() => handleUpdateAssignmentQty(a.personal_id, false)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          </button>
                          <span className={styles.assignQtyText}>{a.cantidad}</span>
                          <button
                            type="button"
                            className={styles.assignItemBtn}
                            disabled={remainingStockVal <= 0}
                            onClick={() => handleUpdateAssignmentQty(a.personal_id, true)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className={styles.deleteAssignBtn}
                            onClick={() => handleDeleteAssignment(a.personal_id)}
                            title="Eliminar asignación"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer Modal Actions */}
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() => setAssigningRecord(null)}
                    disabled={isSavingAssignments}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.submitButton}
                    onClick={handleSaveAssignments}
                    disabled={isSavingAssignments}
                  >
                    {isSavingAssignments ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
