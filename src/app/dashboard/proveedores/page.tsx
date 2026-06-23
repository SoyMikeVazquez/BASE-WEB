'use client';

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./proveedores.module.css";

interface Supplier {
  id: string;
  nombre: string;
  contacto?: string;
  categoria?: string;
  metodos_pago?: string;
  dias_credito?: number;
  lapso_pedido_dias?: number;
  created_at?: string;
}

interface Product {
  id: string;
  nombre: string;
  stock?: number;
}

interface SupplierOrderItem {
  id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
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
  productos_pedidos?: SupplierOrderItem[] | string;
  created_at?: string;
}

export default function ProveedoresPage() {
  const [activeTab, setActiveTab] = useState<"pedidos" | "directorio">("pedidos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Directory and Products state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);

  // Search queries
  const [searchSupplierQuery, setSearchSupplierQuery] = useState("");
  const [searchOrderQuery, setSearchOrderQuery] = useState("");

  // ----------------------------------------------------
  // Form State: Tab 1 (Pedidos)
  // ----------------------------------------------------
  const [editingOrder, setEditingOrder] = useState<SupplierOrder | null>(null);
  const [orderSupplier, setOrderSupplier] = useState<string>("");
  const [orderDate, setOrderDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  // Add item fields
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [itemQty, setItemQty] = useState<string>("");
  const [itemPrice, setItemPrice] = useState<string>("");
  const [orderItems, setOrderItems] = useState<SupplierOrderItem[]>([]);

  // Order meta fields
  const [orderTotal, setOrderTotal] = useState<string>("");
  const [orderCreditDays, setOrderCreditDays] = useState<string>("");
  const [orderDebt, setOrderDebt] = useState<string>("");
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<string>("Efectivo");
  const [orderMsi, setOrderMsi] = useState<number>(0);
  const [orderCompleted, setOrderCompleted] = useState<boolean>(false);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [existingUrlFactura, setExistingUrlFactura] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ----------------------------------------------------
  // Form State: Tab 2 (Directorio)
  // ----------------------------------------------------
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supNombre, setSupNombre] = useState("");
  const [supContacto, setSupContacto] = useState("");
  const [supCategoria, setSupCategoria] = useState("Otros");
  const [supMetodosPago, setSupMetodosPago] = useState("Efectivo");
  const [supDiasCredito, setSupDiasCredito] = useState("");
  const [supLapsoPedido, setSupLapsoPedido] = useState("");
  const [savingSupplier, setSavingSupplier] = useState(false);

  // ----------------------------------------------------
  // Delete Modal State
  // ----------------------------------------------------
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<"pedido" | "proveedor" | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string | null>(null);

  // Constant options
  const categoriesList = [
    "Tintes & Decolorantes",
    "Shampoos & Acondicionadores",
    "Tratamientos Capilares",
    "Productos de Peinado (Ceras, Geles)",
    "Barbería (Aceites, Bálsamos)",
    "Herramientas (Tijeras, Máquinas, Secadores)",
    "Cosméticos & Maquillaje",
    "Cuidado de la Piel & Faciales",
    "Desechables & Artículos de Higiene",
    "Mobiliario & Equipamiento de Salón",
    "Otros",
  ];

  const paymentMethodsOptions = [
    "Efectivo",
    "Transferencia",
    "Tarjeta",
    "Crédito Proveedor",
    "Cheque",
  ];

  const msiOptions = [0, 3, 6, 9, 12, 18];

  // Fetch initial data
  useEffect(() => {
    loadAllData();
  }, []);

  // Update order items total on change
  const recalculateOrderTotal = (items: SupplierOrderItem[]) => {
    let sum = 0;
    for (const item of items) {
      sum += item.cantidad * item.precio_unitario;
    }
    setOrderTotal(sum.toFixed(2));
    if (!orderCompleted) {
      setOrderDebt(sum.toFixed(2));
    }
  };

  async function loadAllData() {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Suppliers
      const { data: sups, error: supErr } = await supabase
        .from("Proveedores")
        .select("*")
        .order("nombre", { ascending: true });

      if (supErr) throw supErr;
      setSuppliers(sups || []);

      // 2. Fetch Products
      const { data: prods, error: prodErr } = await supabase
        .from("Productos")
        .select("id, nombre, stock")
        .order("nombre", { ascending: true });

      if (prodErr) throw prodErr;
      setProducts(prods || []);

      // 3. Fetch Orders (Pedidos)
      const { data: ords, error: ordErr } = await supabase
        .from("ProveedoresStock")
        .select("*")
        .order("fecha", { ascending: false });

      if (ordErr) throw ordErr;

      // Filter to only display records with products
      const validOrders = (ords || []).filter((o) => {
        const raw = o.productos_pedidos;
        if (Array.isArray(raw) && raw.length > 0) return true;
        if (typeof raw === "string") {
          try {
            const decoded = JSON.parse(raw);
            return Array.isArray(decoded) && decoded.length > 0;
          } catch (_) {}
        }
        return false;
      }) as SupplierOrder[];

      setOrders(validOrders);
    } catch (err: any) {
      console.error("Error loading suppliers/stock data:", err);
      setError(err.message || "Error al cargar la información");
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------------------
  // Pedidos (Orders) Actions
  // ----------------------------------------------------
  const handleClearOrderForm = () => {
    setEditingOrder(null);
    setOrderSupplier("");
    setOrderDate(new Date().toISOString().split("T")[0]);
    setSelectedProduct(null);
    setItemQty("");
    setItemPrice("");
    setOrderItems([]);
    setOrderTotal("");
    setOrderCreditDays("");
    setOrderDebt("");
    setOrderPaymentMethod("Efectivo");
    setOrderMsi(0);
    setOrderCompleted(false);
    setSelectedFile(null);
    setAttachedFileName(null);
    setExistingUrlFactura(null);
  };

  const handleOpenEditOrder = (order: SupplierOrder) => {
    setEditingOrder(order);
    setOrderSupplier(order.proveedor || "");
    setOrderDate(order.fecha || new Date().toISOString().split("T")[0]);
    setOrderTotal(order.precio_total_pedid?.toString() || "");
    setOrderCreditDays(order.dias_credito?.toString() || "");
    setOrderDebt(order.deuda?.toString() || "");
    setOrderPaymentMethod(order.metodos_pago || "Efectivo");
    setOrderMsi(order.meses_sin_intereses || 0);
    setOrderCompleted(order.completado || false);

    setExistingUrlFactura(order.url_factura || null);
    if (order.url_factura) {
      setAttachedFileName("Factura cargada");
    } else {
      setAttachedFileName(null);
    }
    setSelectedFile(null);

    // Parse items
    let parsedItems: SupplierOrderItem[] = [];
    if (Array.isArray(order.productos_pedidos)) {
      parsedItems = order.productos_pedidos as SupplierOrderItem[];
    } else if (typeof order.productos_pedidos === "string") {
      try {
        parsedItems = JSON.parse(order.productos_pedidos) as SupplierOrderItem[];
      } catch (_) {}
    }
    setOrderItems(parsedItems);
  };

  const handleAddProductToOrder = () => {
    if (!selectedProduct) return;
    const qty = parseInt(itemQty.trim(), 10);
    const price = parseFloat(itemPrice.trim());

    if (isNaN(qty) || qty <= 0) {
      alert("Por favor, ingresa una cantidad válida mayor a 0.");
      return;
    }
    if (isNaN(price) || price < 0) {
      alert("Por favor, ingresa un precio unitario válido.");
      return;
    }

    const nextItems = [...orderItems];
    const existingIdx = nextItems.findIndex((x) => x.id === selectedProduct.id);

    if (existingIdx !== -1) {
      nextItems[existingIdx].cantidad += qty;
      nextItems[existingIdx].precio_unitario = price;
    } else {
      nextItems.push({
        id: selectedProduct.id,
        nombre: selectedProduct.nombre,
        cantidad: qty,
        precio_unitario: price,
      });
    }

    setOrderItems(nextItems);
    recalculateOrderTotal(nextItems);

    // Reset item selectors
    setSelectedProduct(null);
    setItemQty("");
    setItemPrice("");
  };

  const handleDeleteItemFromOrder = (prodId: string) => {
    const nextItems = orderItems.filter((x) => x.id !== prodId);
    setOrderItems(nextItems);
    recalculateOrderTotal(nextItems);
  };

  const handleOrderFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setAttachedFileName(file.name);
    }
  };

  const handleTriggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveAttachedFile = () => {
    setSelectedFile(null);
    setAttachedFileName(null);
    setExistingUrlFactura(null);
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const isNew = editingOrder === null;
    const supplierName = isNew ? orderSupplier : editingOrder.proveedor;

    if (!supplierName) {
      alert("Por favor, selecciona un proveedor.");
      return;
    }
    if (orderItems.length === 0) {
      alert("Debes agregar al menos un producto al pedido.");
      return;
    }
    const total = parseFloat(orderTotal.trim());
    if (isNaN(total) || total <= 0) {
      alert("Por favor, ingresa un total válido mayor a 0.");
      return;
    }

    setSavingOrder(true);
    try {
      let finalInvoiceUrl = existingUrlFactura;

      // Upload file if any
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${Date.now()}_invoice.${fileExt}`;
        const filePath = `facturas_pedidos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("general")
          .upload(filePath, selectedFile, {
            contentType: `application/${fileExt}`,
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("general")
          .getPublicUrl(filePath);

        finalInvoiceUrl = publicUrl;
      }

      const orderData: Partial<SupplierOrder> = {
        fecha: orderDate,
        precio_total_pedid: total,
        dias_credito: parseInt(orderCreditDays, 10) || 0,
        deuda: orderCompleted ? 0 : parseFloat(orderDebt) || 0,
        metodos_pago: orderPaymentMethod,
        meses_sin_intereses: orderMsi,
        completado: orderCompleted,
        url_factura: finalInvoiceUrl || "",
        productos_pedidos: orderItems,
      };

      if (isNew) {
        orderData.proveedor = supplierName;
        // 1. Insert order record
        const { error: insertErr } = await supabase
          .from("ProveedoresStock")
          .insert([orderData]);

        if (insertErr) throw insertErr;

        // 2. Increment stock in Productos catalog
        const futures = orderItems.map(async (item) => {
          const { data: prodData } = await supabase
            .from("Productos")
            .select("stock")
            .eq("id", item.id)
            .maybeSingle();

          const currentStock = prodData?.stock || 0;
          await supabase
            .from("Productos")
            .update({ stock: currentStock + item.cantidad })
            .eq("id", item.id);
        });
        await Promise.all(futures);
      } else {
        const { error: updateErr } = await supabase
          .from("ProveedoresStock")
          .update(orderData)
          .eq("id", editingOrder.id);

        if (updateErr) throw updateErr;
      }

      handleClearOrderForm();
      loadAllData();
    } catch (err: any) {
      alert("Error al guardar el pedido: " + err.message);
    } finally {
      setSavingOrder(false);
    }
  };

  // ----------------------------------------------------
  // Directorio (Suppliers) Actions
  // ----------------------------------------------------
  const handleClearSupplierForm = () => {
    setEditingSupplier(null);
    setSupNombre("");
    setSupContacto("");
    setSupCategoria("Otros");
    setSupMetodosPago("Efectivo");
    setSupDiasCredito("");
    setSupLapsoPedido("");
  };

  const handleOpenEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupNombre(supplier.nombre || "");
    setSupContacto(supplier.contacto || "");
    setSupCategoria(supplier.categoria || "Otros");
    setSupMetodosPago(supplier.metodos_pago || "Efectivo");
    setSupDiasCredito(
      supplier.dias_credito && supplier.dias_credito > 0
        ? supplier.dias_credito.toString()
        : ""
    );
    setSupLapsoPedido(
      supplier.lapso_pedido_dias && supplier.lapso_pedido_dias > 0
        ? supplier.lapso_pedido_dias.toString()
        : ""
    );
  };

  const handleSupplierPaymentToggle = (opt: string) => {
    let current = supMetodosPago
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (current.includes(opt)) {
      current = current.filter((x) => x !== opt);
    } else {
      current.push(opt);
    }
    setSupMetodosPago(current.join(", "));
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = supNombre.trim();
    if (!name) {
      alert("Por favor, ingresa el nombre del proveedor.");
      return;
    }
    const contact = supContacto.trim();

    setSavingSupplier(true);
    try {
      const isNew = editingSupplier === null;
      const supplierData: Partial<Supplier> = {
        nombre: name,
        contacto: contact,
        categoria: supCategoria,
        metodos_pago: supMetodosPago.trim(),
        dias_credito: parseInt(supDiasCredito, 10) || 0,
        lapso_pedido_dias: parseInt(supLapsoPedido, 10) || 0,
      };

      if (isNew) {
        const { error: insertErr } = await supabase
          .from("Proveedores")
          .insert([supplierData]);

        if (insertErr) throw insertErr;
      } else {
        const { error: updateErr } = await supabase
          .from("Proveedores")
          .update(supplierData)
          .eq("id", editingSupplier.id);

        if (updateErr) throw updateErr;
      }

      handleClearSupplierForm();
      loadAllData();
    } catch (err: any) {
      alert("Error al guardar proveedor: " + err.message);
    } finally {
      setSavingSupplier(false);
    }
  };

  // ----------------------------------------------------
  // Delete handlers
  // ----------------------------------------------------
  const handleOpenDeleteConfirm = (
    type: "pedido" | "proveedor",
    id: string,
    name: string
  ) => {
    setDeleteType(type);
    setDeleteId(id);
    setDeleteName(name);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId || !deleteType) return;
    try {
      if (deleteType === "pedido") {
        const { error: deleteErr } = await supabase
          .from("ProveedoresStock")
          .delete()
          .eq("id", deleteId);

        if (deleteErr) throw deleteErr;

        if (editingOrder && editingOrder.id === deleteId) {
          handleClearOrderForm();
        }
      } else {
        const { error: deleteErr } = await supabase
          .from("Proveedores")
          .delete()
          .eq("id", deleteId);

        if (deleteErr) throw deleteErr;

        if (editingSupplier && editingSupplier.id === deleteId) {
          handleClearSupplierForm();
        }
      }

      setConfirmOpen(false);
      setDeleteId(null);
      setDeleteType(null);
      setDeleteName(null);
      loadAllData();
    } catch (err: any) {
      alert("Error al eliminar registro: " + err.message);
    }
  };

  // ----------------------------------------------------
  // Parsing and Filtering list items
  // ----------------------------------------------------
  const getOrderItemsList = (order: SupplierOrder): SupplierOrderItem[] => {
    if (Array.isArray(order.productos_pedidos)) {
      return order.productos_pedidos as SupplierOrderItem[];
    } else if (typeof order.productos_pedidos === "string") {
      try {
        return JSON.parse(order.productos_pedidos) as SupplierOrderItem[];
      } catch (_) {}
    }
    return [];
  };

  const filteredSuppliers = (searchQuery: string) => {
    if (!searchQuery.trim()) return suppliers;
    const q = searchQuery.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.nombre.toLowerCase().includes(q) ||
        (s.contacto && s.contacto.toLowerCase().includes(q))
    );
  };

  const filteredOrders = () => {
    if (!searchOrderQuery.trim()) return orders;
    const q = searchOrderQuery.toLowerCase();
    return orders.filter(
      (o) =>
        o.proveedor.toLowerCase().includes(q) ||
        (o.metodos_pago && o.metodos_pago.toLowerCase().includes(q))
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Stock y Proveedores</h1>
      </div>

      {error && (
        <div style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '0.75rem', marginBottom: '2rem', border: '1px solid #fee2e2' }}>
          {error}
        </div>
      )}

      {/* Tabs navigation */}
      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tabButton} ${activeTab === "pedidos" ? styles.activeTab : ""}`}
          onClick={() => {
            setActiveTab("pedidos");
            handleClearOrderForm();
          }}
        >
          Pedidos
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === "directorio" ? styles.activeTab : ""}`}
          onClick={() => {
            setActiveTab("directorio");
            handleClearSupplierForm();
          }}
        >
          Directorio
        </button>
      </div>

      {activeTab === "pedidos" ? (
        <div className={styles.dashboardLayout}>
          {/* Left Column: Register Order */}
          <div className={styles.formColumn}>
            <h2 className={styles.formTitle}>
              {editingOrder ? "Editar Pedido" : "Nuevo Pedido"}
            </h2>

            <form onSubmit={handleSaveOrder} className={styles.form}>
              {/* Supplier selector */}
              {editingOrder === null ? (
                <div className={styles.inputGroup}>
                  <span className={styles.chipsLabel}>Proveedor</span>
                  <div className={styles.selectWrapper}>
                    <select
                      className={styles.select}
                      value={orderSupplier}
                      onChange={(e) => setOrderSupplier(e.target.value)}
                      required
                    >
                      <option value="">Selecciona un proveedor</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.nombre}>
                          {s.nombre}
                        </option>
                      ))}
                    </select>
                    <svg className={styles.selectArrow} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              ) : (
                <div className={styles.inputGroup} style={{ marginBottom: '0.25rem' }}>
                  <span className={styles.chipsLabel}>Proveedor</span>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', padding: '0.5rem 0' }}>
                    {editingOrder.proveedor}
                  </div>
                </div>
              )}

              {/* Order Date */}
              <div className={styles.inputGroup}>
                <span className={styles.chipsLabel}>Fecha del Pedido</span>
                <div className={styles.inputIconWrapper}>
                  <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <input
                    type="date"
                    className={styles.input}
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Add product section */}
              <hr className={styles.orderSectionDivider} />
              <span className={styles.orderSectionTitle}>Agregar Productos al Pedido</span>

              <div className={styles.inputGroup}>
                <div className={styles.selectWrapper}>
                  <select
                    className={styles.select}
                    value={selectedProduct?.id || ""}
                    onChange={(e) => {
                      const p = products.find((x) => x.id === e.target.value) || null;
                      setSelectedProduct(p);
                    }}
                  >
                    <option value="">Selecciona un producto</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                  <svg className={styles.selectArrow} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              <div className={styles.inputRow}>
                <div className={styles.inputGroup}>
                  <div className={styles.inputIconWrapper}>
                    <span className={styles.inputIcon} style={{ fontWeight: 700, fontSize: '0.85rem' }}>qty</span>
                    <input
                      type="number"
                      placeholder="Cant"
                      className={styles.input}
                      value={itemQty}
                      onChange={(e) => setItemQty(e.target.value)}
                      min="1"
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <div className={styles.inputIconWrapper}>
                    <span className={styles.inputIcon} style={{ fontWeight: 700, fontSize: '1rem' }}>$</span>
                    <input
                      type="number"
                      placeholder="Precio Unit"
                      className={styles.input}
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={styles.addBtn}
                onClick={handleAddProductToOrder}
                disabled={!selectedProduct}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Agregar Producto
              </button>

              <hr className={styles.orderSectionDivider} />

              {/* Added products list */}
              <span className={styles.chipsLabel}>Productos Agregados:</span>
              <div className={styles.addedProductsContainer}>
                {orderItems.length === 0 ? (
                  <div style={{ fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem 0' }}>
                    Ningún producto agregado aún.
                  </div>
                ) : (
                  orderItems.map((item) => (
                    <div key={item.id} className={styles.addedProductCard}>
                      <div className={styles.addedProdInfo}>
                        <div className={styles.addedProdName}>{item.nombre}</div>
                        <div className={styles.addedProdMeta}>
                          {item.cantidad} uds x ${item.precio_unitario.toFixed(2)}
                        </div>
                      </div>
                      <div className={styles.addedProdTotal}>
                        ${(item.cantidad * item.precio_unitario).toFixed(2)}
                      </div>
                      <button
                        type="button"
                        className={styles.deleteItemBtn}
                        onClick={() => handleDeleteItemFromOrder(item.id)}
                        title="Eliminar artículo"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Total & Credit Terms */}
              <div className={styles.inputRow}>
                <div className={styles.inputGroup}>
                  <span className={styles.chipsLabel}>Total ($)</span>
                  <div className={styles.inputIconWrapper}>
                    <span className={styles.inputIcon} style={{ fontWeight: 700, fontSize: '1rem' }}>$</span>
                    <input
                      type="number"
                      placeholder="Total"
                      className={styles.input}
                      value={orderTotal}
                      onChange={(e) => setOrderTotal(e.target.value)}
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <span className={styles.chipsLabel}>Plazo (días)</span>
                  <div className={styles.inputIconWrapper}>
                    <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <input
                      type="number"
                      placeholder="Crédito"
                      className={styles.input}
                      value={orderCreditDays}
                      onChange={(e) => setOrderCreditDays(e.target.value)}
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Debt & Paid status */}
              <div className={styles.inputRow}>
                <div className={styles.inputGroup}>
                  <span className={styles.chipsLabel}>Deuda Restante ($)</span>
                  <div className={styles.inputIconWrapper}>
                    <span className={styles.inputIcon} style={{ fontWeight: 700, fontSize: '1rem' }}>$</span>
                    <input
                      type="number"
                      placeholder="Deuda"
                      className={styles.input}
                      value={orderCompleted ? "0" : orderDebt}
                      onChange={(e) => setOrderDebt(e.target.value)}
                      disabled={orderCompleted}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className={styles.switchRow} style={{ marginTop: '1.25rem' }}>
                  <span className={styles.switchLabel}>¿Pagado?</span>
                  <label className={styles.switchWrapper}>
                    <input
                      type="checkbox"
                      checked={orderCompleted}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setOrderCompleted(checked);
                        if (checked) {
                          setOrderDebt("0");
                        } else {
                          setOrderDebt(orderTotal);
                        }
                      }}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>
              </div>

              {/* Payment Method dropdown & MSI selector */}
              <div className={styles.inputRow}>
                <div className={styles.inputGroup}>
                  <span className={styles.chipsLabel}>Método Pago</span>
                  <div className={styles.selectWrapper}>
                    <select
                      className={styles.select}
                      value={orderPaymentMethod}
                      onChange={(e) => setOrderPaymentMethod(e.target.value)}
                    >
                      {paymentMethodsOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <svg className={styles.selectArrow} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <span className={styles.chipsLabel}>MSI</span>
                  <div className={styles.selectWrapper}>
                    <select
                      className={styles.select}
                      value={orderMsi}
                      onChange={(e) => setOrderMsi(parseInt(e.target.value, 10))}
                    >
                      {msiOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt > 0 ? `${opt} MSI` : "Sin MSI"}
                        </option>
                      ))}
                    </select>
                    <svg className={styles.selectArrow} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* File Attachment field */}
              <div className={styles.inputGroup}>
                <span className={styles.chipsLabel}>Factura / Comprobante</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,image/*"
                  onChange={handleOrderFileChange}
                  style={{ display: "none" }}
                />

                <div className={styles.attachmentRow}>
                  {attachedFileName ? (
                    <div className={styles.fileDetails}>
                      <span className={styles.fileName}>{attachedFileName}</span>
                      <button
                        type="button"
                        className={styles.removeFileBtn}
                        onClick={handleRemoveAttachedFile}
                        title="Eliminar archivo"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={styles.attachmentButton}
                      onClick={handleTriggerFileInput}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
                        <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                      </svg>
                      Adjuntar Factura (PDF/Foto)
                    </button>
                  )}
                </div>
              </div>

              {/* Form actions */}
              <div className={styles.formActions}>
                {editingOrder !== null && (
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={handleClearOrderForm}
                    disabled={savingOrder}
                  >
                    Cancelar Edición
                  </button>
                )}
                <button
                  type="submit"
                  className={styles.saveBtn}
                  disabled={savingOrder}
                >
                  {savingOrder ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Orders List */}
          <div className={styles.listColumn}>
            {/* Search filter */}
            <div className={styles.searchSection}>
              <div className={styles.searchInputWrapper}>
                <svg className={styles.searchIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar pedido por proveedor..."
                  className={styles.searchInput}
                  value={searchOrderQuery}
                  onChange={(e) => setSearchOrderQuery(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.spinner} />
                <p>Cargando pedidos...</p>
              </div>
            ) : filteredOrders().length === 0 ? (
              <div className={styles.emptyState}>
                <svg className={styles.emptyStateIcon} xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <h3 className={styles.emptyStateTitle}>Sin registros de pedidos</h3>
                <p className={styles.emptyStateDesc}>
                  {searchOrderQuery.trim() !== "" ? "Sin resultados para la búsqueda." : "Lleva el registro y control de tus facturas y pedidos por volumen en esta sección."}
                </p>
              </div>
            ) : (
              <div className={styles.grid}>
                {filteredOrders().map((order) => {
                  const items = getOrderItemsList(order);
                  const formattedDate = formatOrderDate(order.fecha);

                  return (
                    <div key={order.id} className={styles.card}>
                      <div className={styles.cardHeader}>
                        <div className={styles.avatar}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="1" y="3" width="15" height="13" />
                            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                            <circle cx="5.5" cy="18.5" r="2.5" />
                            <circle cx="18.5" cy="18.5" r="2.5" />
                          </svg>
                        </div>
                        <div className={styles.headerInfo}>
                          <div className={styles.cardTitle}>{order.proveedor}</div>
                          <div className={styles.cardSubtitle}>{formattedDate}</div>
                        </div>

                        <span className={`${styles.statusTag} ${order.completado ? styles.statusPaid : styles.statusPending}`}>
                          {order.completado ? "PAGADO" : "PENDIENTE"}
                        </span>

                        <div className={styles.headerActions}>
                          <button
                            className={`${styles.actionBtn} ${styles.editBtn}`}
                            onClick={() => handleOpenEditOrder(order)}
                            title="Editar pedido"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                            onClick={() => handleOpenDeleteConfirm("pedido", order.id, `pedido de ${order.proveedor}`)}
                            title="Eliminar pedido"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Items List inside Pedido card */}
                      {items.length > 0 && (
                        <div className={styles.productsBox}>
                          <div className={styles.boxHeadingRow}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <path d="M21 9H3" />
                              <path d="M21 15H3" />
                              <path d="M12 3v18" />
                            </svg>
                            <span>Productos Solicitados</span>
                          </div>
                          <div className={styles.productsList}>
                            {items.map((item, idx) => (
                              <div key={idx} className={styles.productRow}>
                                <span className={styles.prodNameText}>
                                  {item.nombre} &times; {item.cantidad}
                                </span>
                                <span className={styles.prodPriceText}>
                                  ${(item.cantidad * item.precio_unitario).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Order Info details */}
                      <div className={styles.detailsBox}>
                        <div className={styles.detailsRow}>
                          <div className={styles.detailItem}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="1" x2="12" y2="23" />
                              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                            <span className={styles.detailLabel}>Total:</span>
                            <span className={styles.detailValue}>${order.precio_total_pedid?.toFixed(2) || "0.00"}</span>
                          </div>

                          <div className={styles.detailItem}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <span className={styles.detailLabel}>Deuda:</span>
                            <span className={styles.detailValue}>${order.deuda?.toFixed(2) || "0.00"}</span>
                          </div>
                        </div>

                        <div className={styles.detailsRow}>
                          <div className={styles.detailItem}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <span className={styles.detailLabel}>Crédito:</span>
                            <span className={styles.detailValue}>
                              {order.dias_credito && order.dias_credito > 0 ? `${order.dias_credito} días` : "Inmediato"}
                            </span>
                          </div>

                          <div className={styles.detailItem}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="19" y1="5" x2="5" y2="19" />
                              <circle cx="6.5" cy="6.5" r="2.5" />
                              <circle cx="17.5" cy="17.5" r="2.5" />
                            </svg>
                            <span className={styles.detailLabel}>MSI:</span>
                            <span className={styles.detailValue}>
                              {order.meses_sin_intereses && order.meses_sin_intereses > 0 ? `${order.meses_sin_intereses} MSI` : "Sin MSI"}
                            </span>
                          </div>
                        </div>

                        {order.metodos_pago && (
                          <div className={`${styles.detailItem} ${styles.detailFullRow}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="5" width="20" height="14" rx="2" />
                              <line x1="2" y1="10" x2="22" y2="10" />
                            </svg>
                            <span className={styles.detailLabel}>Método de pago:</span>
                            <span className={styles.detailValue}>{order.metodos_pago}</span>
                          </div>
                        )}
                      </div>

                      {/* Factura link */}
                      {order.url_factura && (
                        <div className={styles.cardFooter}>
                          <a
                            href={order.url_factura}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.viewInvoiceBtn}
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
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.dashboardLayout}>
          {/* Left Column: Register Supplier */}
          <div className={styles.formColumn}>
            <h2 className={styles.formTitle}>
              {editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
            </h2>

            <form onSubmit={handleSaveSupplier} className={styles.form}>
              <div className={styles.inputGroup}>
                <span className={styles.chipsLabel}>Nombre del Proveedor</span>
                <div className={styles.inputIconWrapper}>
                  <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Nombre"
                    className={styles.input}
                    value={supNombre}
                    onChange={(e) => setSupNombre(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <span className={styles.chipsLabel}>Contacto (Tel/Email/Dirección)</span>
                <div className={styles.inputIconWrapper}>
                  <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Contacto"
                    className={styles.input}
                    value={supContacto}
                    onChange={(e) => setSupContacto(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <span className={styles.chipsLabel}>Clasificación por categoría</span>
                <div className={styles.selectWrapper}>
                  <select
                    className={styles.select}
                    value={supCategoria}
                    onChange={(e) => setSupCategoria(e.target.value)}
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <svg className={styles.selectArrow} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              {/* Toggle Payment Methods Pills */}
              <div className={styles.chipsContainer}>
                <span className={styles.chipsLabel}>Métodos de pago aceptados</span>
                <div className={styles.chipsRow}>
                  {paymentMethodsOptions.map((opt) => {
                    const isActive = supMetodosPago.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        className={`${styles.chipButton} ${isActive ? styles.chipButtonActive : ""}`}
                        onClick={() => handleSupplierPaymentToggle(opt)}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Credit Terms and Visited Frequency */}
              <div className={styles.inputRow}>
                <div className={styles.inputGroup}>
                  <span className={styles.chipsLabel}>Días de crédito</span>
                  <div className={styles.inputIconWrapper}>
                    <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <input
                      type="number"
                      placeholder="Días crédito"
                      className={styles.input}
                      value={supDiasCredito}
                      onChange={(e) => setSupDiasCredito(e.target.value)}
                      min="0"
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <span className={styles.chipsLabel}>Frecuencia (días)</span>
                  <div className={styles.inputIconWrapper}>
                    <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <polyline points="1 20 1 14 7 14" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                    <input
                      type="number"
                      placeholder="Frecuencia"
                      className={styles.input}
                      value={supLapsoPedido}
                      onChange={(e) => setSupLapsoPedido(e.target.value)}
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Form actions */}
              <div className={styles.formActions}>
                {editingSupplier !== null && (
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={handleClearSupplierForm}
                    disabled={savingSupplier}
                  >
                    Cancelar Edición
                  </button>
                )}
                <button
                  type="submit"
                  className={styles.saveBtn}
                  disabled={savingSupplier}
                >
                  {savingSupplier ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Suppliers List */}
          <div className={styles.listColumn}>
            {/* Search filter */}
            <div className={styles.searchSection}>
              <div className={styles.searchInputWrapper}>
                <svg className={styles.searchIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar proveedor por nombre..."
                  className={styles.searchInput}
                  value={searchSupplierQuery}
                  onChange={(e) => setSearchSupplierQuery(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.spinner} />
                <p>Cargando proveedores...</p>
              </div>
            ) : filteredSuppliers(searchSupplierQuery).length === 0 ? (
              <div className={styles.emptyState}>
                <svg className={styles.emptyStateIcon} xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                <h3 className={styles.emptyStateTitle}>Directorio vacío</h3>
                <p className={styles.emptyStateDesc}>
                  {searchSupplierQuery.trim() !== "" ? "Sin resultados para la búsqueda." : "Agrega tus proveedores al directorio y asóciales sus categorías en esta sección."}
                </p>
              </div>
            ) : (
              <div className={styles.grid}>
                {filteredSuppliers(searchSupplierQuery).map((supplier) => (
                  <div key={supplier.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div className={styles.avatar}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="1" y="3" width="15" height="13" />
                          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                          <circle cx="5.5" cy="18.5" r="2.5" />
                          <circle cx="18.5" cy="18.5" r="2.5" />
                        </svg>
                      </div>
                      <div className={styles.headerInfo}>
                        <div className={styles.cardTitle}>
                          {supplier.nombre}
                          {supplier.categoria && (
                            <span className={styles.badge}>{supplier.categoria}</span>
                          )}
                        </div>
                        <div className={styles.cardSubtitle}>{supplier.contacto || "Sin contacto registrado"}</div>
                      </div>

                      <div className={styles.headerActions}>
                        <button
                          className={`${styles.actionBtn} ${styles.editBtn}`}
                          onClick={() => handleOpenEditSupplier(supplier)}
                          title="Editar proveedor"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => handleOpenDeleteConfirm("proveedor", supplier.id, supplier.nombre)}
                          title="Eliminar proveedor"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Detailed info box */}
                    <div className={styles.detailsBox}>
                      <div className={styles.detailsRow}>
                        <div className={styles.detailItem}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span className={styles.detailLabel}>Frecuencia:</span>
                          <span className={styles.detailValue}>
                            {supplier.lapso_pedido_dias && supplier.lapso_pedido_dias > 0
                              ? `Cada ${supplier.lapso_pedido_dias} días`
                              : "No especificada"}
                          </span>
                        </div>

                        <div className={styles.detailItem}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          <span className={styles.detailLabel}>Crédito:</span>
                          <span className={styles.detailValue}>
                            {supplier.dias_credito && supplier.dias_credito > 0
                              ? `${supplier.dias_credito} días`
                              : "Sin crédito"}
                          </span>
                        </div>
                      </div>

                      {supplier.metodos_pago && (
                        <div className={`${styles.detailItem} ${styles.detailFullRow}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="5" width="20" height="14" rx="2" />
                            <line x1="2" y1="10" x2="22" y2="10" />
                          </svg>
                          <span className={styles.detailLabel}>Métodos pago:</span>
                          <span className={styles.detailValue}>{supplier.metodos_pago}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.confirmTitle}>
              Eliminar {deleteType === "pedido" ? "Pedido" : "Proveedor"}
            </h3>
            <p className={styles.confirmMessage}>
              ¿Estás seguro de que deseas eliminar permanentemente a {deleteName}? Esta acción no se puede deshacer y borrará la información en la base de datos de manera definitiva.
            </p>
            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setConfirmOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
                onClick={handleDelete}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Date formatter helper function
const formatOrderDate = (rawDateStr?: string) => {
  if (!rawDateStr) return "Sin fecha";
  try {
    const parsedDate = new Date(rawDateStr);
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(parsedDate);
  } catch (_) {
    return rawDateStr;
  }
};
