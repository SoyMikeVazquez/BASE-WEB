'use client';

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./productos.module.css";

interface Product {
  id: string; // Database PK (UUID)
  nombre: string;
  descripcion?: string;
  precio?: number;
  stock?: number;
  categoria?: string;
  imagen_url?: string;
  marca?: string;
  en_oferta?: boolean;
  descuento_porcentual?: number;
  IDProductos?: string;
  cupones_aplicables?: string[];
  contacto_proveedor?: string;
  disponible_venta?: boolean;
  porcentaje_venta_personal?: number;
  created_at?: string;
  updated_at?: string;
}

interface Coupon {
  IDCupon: string;
}

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescription] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
  const [categoria, setCategoria] = useState("Cabello");
  const [disponibleVenta, setDisponibleVenta] = useState(true);
  const [contactoProveed, setContactoProveed] = useState("");
  const [porcentajeVentaPersonal, setPorcentajeVentaPersonal] = useState("");
  const [selectedCoupons, setSelectedCoupons] = useState<string[]>([]);
  
  // Image Upload State
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const categories = ["Cabello", "Barba", "Facial", "Cuidado", "Cuerpo", "Otros"];

  useEffect(() => {
    fetchProductsAndCoupons();
  }, []);

  async function fetchProductsAndCoupons() {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Products
      const { data: prodData, error: prodErr } = await supabase
        .from("Productos")
        .select("*")
        .order("nombre", { ascending: true });

      if (prodErr) throw prodErr;
      setProducts(prodData || []);

      // 2. Fetch Coupons
      const { data: coupData, error: coupErr } = await supabase
        .from("Cupones")
        .select("IDCupon")
        .order("IDCupon", { ascending: true });

      if (coupErr) {
        console.warn("Could not fetch coupons:", coupErr);
      } else {
        setCoupons((coupData || []).map((c: Coupon) => c.IDCupon));
      }
    } catch (err: any) {
      console.error("Error loading products/coupons:", err);
      setError(err.message || "Error al cargar la información");
    } finally {
      setLoading(false);
    }
  }

  const handleClearForm = () => {
    setEditingProduct(null);
    setNombre("");
    setDescription("");
    setPrecio("");
    setStock("");
    setCategoria("Cabello");
    setDisponibleVenta(true);
    setContactoProveed("");
    setPorcentajeVentaPersonal("");
    setSelectedCoupons([]);
    setImageUrl(null);
    setSelectedFile(null);
    setImagePreview(null);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setNombre(product.nombre || "");
    setDescription(product.descripcion || "");
    setPrecio(product.precio !== undefined ? product.precio.toString() : "");
    setStock(product.stock !== undefined ? product.stock.toString() : "");
    
    const cat = product.categoria || "Cabello";
    setCategoria(categories.includes(cat) ? cat : "Otros");
    
    setDisponibleVenta(product.disponible_venta !== false);
    setContactoProveed(product.contacto_proveedor || "");
    setPorcentajeVentaPersonal(product.porcentaje_venta_personal !== undefined ? product.porcentaje_venta_personal.toString() : "");
    
    // Parse coupons
    let parsedCoupons: string[] = [];
    if (Array.isArray(product.cupones_aplicables)) {
      parsedCoupons = product.cupones_aplicables;
    }
    setSelectedCoupons(parsedCoupons);

    setImageUrl(product.imagen_url || null);
    setSelectedFile(null);
    setImagePreview(product.imagen_url || null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleTriggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleCouponToggle = (coupon: string) => {
    setSelectedCoupons(prev =>
      prev.includes(coupon)
        ? prev.filter(c => c !== coupon)
        : [...prev, coupon]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setSaving(true);
    try {
      const isNew = editingProduct === null;
      const productId = isNew
        ? Date.now().toString()
        : editingProduct.id.toString();

      let finalImageUrl = imageUrl;

      // Handle file upload if any
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${productId}-${Date.now()}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("general")
          .upload(filePath, selectedFile, {
            contentType: `image/${fileExt}`,
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("general")
          .getPublicUrl(filePath);

        finalImageUrl = publicUrl;
      }

      const parseNum = (val: string) => {
        const trimmed = val.trim();
        return trimmed === "" ? 0 : parseFloat(trimmed);
      };

      const parseIntVal = (val: string) => {
        const trimmed = val.trim();
        return trimmed === "" ? 0 : parseInt(trimmed, 10);
      };

      const productData: Partial<Product> = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        precio: parseNum(precio),
        stock: parseIntVal(stock),
        categoria: categoria,
        contacto_proveedor: contactoProveed.trim(),
        porcentaje_venta_personal: parseNum(porcentajeVentaPersonal),
        cupones_aplicables: selectedCoupons,
        disponible_venta: disponibleVenta,
        updated_at: new Date().toISOString(),
      };

      if (finalImageUrl) {
        productData.imagen_url = finalImageUrl;
      }

      if (isNew) {
        // Upper case hex string of timestamp to match ID style
        productData.IDProductos = Date.now().toString(16).toUpperCase();
        productData.created_at = new Date().toISOString();
        productData.en_oferta = false;
        productData.descuento_porcentual = 0;
        productData.marca = "TotalPRO";

        const { error: insertErr } = await supabase
          .from("Productos")
          .insert([productData]);

        if (insertErr) throw insertErr;
      } else {
        const { error: updateErr } = await supabase
          .from("Productos")
          .update(productData)
          .eq("id", editingProduct.id);

        if (updateErr) throw updateErr;
      }

      handleClearForm();
      fetchProductsAndCoupons();
    } catch (err: any) {
      alert("Error al guardar el producto: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteConfirm = (id: string) => {
    setProductToDelete(id);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!productToDelete) return;

    try {
      const { error: deleteErr } = await supabase
        .from("Productos")
        .delete()
        .eq("id", productToDelete);

      if (deleteErr) throw deleteErr;

      if (editingProduct && editingProduct.id === productToDelete) {
        handleClearForm();
      }

      setConfirmOpen(false);
      setProductToDelete(null);
      fetchProductsAndCoupons();
    } catch (err: any) {
      alert("Error al eliminar el producto: " + err.message);
    }
  };

  const getCouponsList = (product: Product) => {
    if (Array.isArray(product.cupones_aplicables)) {
      return product.cupones_aplicables;
    }
    return [];
  };

  return (
    <div className={styles.container}>
      {/* Header Row */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Catálogo de Productos</h1>
        </div>
      </div>

      {error && (
        <div style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '0.75rem', marginBottom: '2rem', border: '1px solid #fee2e2' }}>
          {error}
        </div>
      )}

      <div className={styles.dashboardLayout}>
        {/* Left Column: Form Column */}
        <div className={styles.formColumn}>
          <h2 className={styles.formTitle}>
            {editingProduct ? "Editar Producto" : "Nuevo Producto"}
          </h2>

          <form onSubmit={handleSave} className={styles.form}>
            {/* Photo Area */}
            <div className={styles.imageUploadContainer}>
              <div className={styles.imagePreviewBox}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className={styles.previewImage} />
                ) : (
                  <div className={styles.uploadPlaceholder} onClick={handleTriggerFileInput}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Sin imagen</span>
                  </div>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />

              <button
                type="button"
                className={styles.uploadButton}
                onClick={handleTriggerFileInput}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {imagePreview ? "Cambiar imagen" : "Subir imagen"}
              </button>
            </div>

            {/* Product Name field */}
            <div className={styles.inputGroup}>
              <div className={styles.inputIconWrapper}>
                <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                <input
                  type="text"
                  placeholder="Nombre del Producto"
                  className={styles.input}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Description field */}
            <div className={styles.inputGroup}>
              <div className={styles.inputIconWrapper}>
                <svg className={styles.inputIcon} style={{ top: '1.2rem' }} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <textarea
                  placeholder="Descripción"
                  className={`${styles.input} ${styles.textarea}`}
                  style={{ minHeight: '65px', paddingLeft: '2.75rem' }}
                  value={descripcion}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Side-by-side Price & Stock */}
            <div className={styles.inputRow}>
              {/* Price */}
              <div className={styles.inputGroup}>
                <div className={styles.inputIconWrapper}>
                  <span className={styles.inputIcon} style={{ fontSize: '1rem', fontWeight: 600 }}>$</span>
                  <input
                    type="number"
                    placeholder="Precio"
                    className={styles.input}
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Stock */}
              <div className={styles.inputGroup}>
                <div className={styles.inputIconWrapper}>
                  <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M21 9H3" />
                    <path d="M21 15H3" />
                    <path d="M12 3v18" />
                  </svg>
                  <input
                    type="number"
                    placeholder="Stock"
                    className={styles.input}
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Category selector */}
            <div className={styles.inputGroup}>
              <span className={styles.chipsLabel}>Categoría</span>
              <div className={styles.selectWrapper}>
                <select
                  className={styles.select}
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                >
                  {categories.map((cat) => (
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

            {/* Public availability toggle */}
            <div className={styles.switchRow}>
              <span className={styles.switchLabel}>Apto para Venta al Público</span>
              <label className={styles.switchWrapper}>
                <input
                  type="checkbox"
                  checked={disponibleVenta}
                  onChange={(e) => setDisponibleVenta(e.target.checked)}
                />
                <span className={styles.slider} />
              </label>
            </div>

            {/* Supplier field */}
            <div className={styles.inputGroup}>
              <div className={styles.inputIconWrapper}>
                <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <input
                  type="text"
                  placeholder="Contacto del Proveedor"
                  className={styles.input}
                  value={contactoProveed}
                  onChange={(e) => setContactoProveed(e.target.value)}
                />
              </div>
            </div>

            {/* Commission field */}
            <div className={styles.inputGroup}>
              <div className={styles.inputIconWrapper}>
                <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="5" x2="5" y2="19" />
                  <circle cx="6.5" cy="6.5" r="2.5" />
                  <circle cx="17.5" cy="17.5" r="2.5" />
                </svg>
                <input
                  type="number"
                  placeholder="Porcentaje por venta del personal (%)"
                  className={styles.input}
                  value={porcentajeVentaPersonal}
                  onChange={(e) => setPorcentajeVentaPersonal(e.target.value)}
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
            </div>

            {/* Coupon Chips Selection */}
            {coupons.length > 0 && (
              <div className={styles.chipsContainer}>
                <span className={styles.chipsLabel}>Cupones Aplicables</span>
                <div className={styles.chipsRow}>
                  {coupons.map((code) => {
                    const isActive = selectedCoupons.includes(code);
                    return (
                      <button
                        key={code}
                        type="button"
                        className={`${styles.chipButton} ${isActive ? styles.chipButtonActive : ""}`}
                        onClick={() => handleCouponToggle(code)}
                      >
                        {code}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className={styles.modalActions}>
              {editingProduct && (
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleClearForm}
                  disabled={saving}
                >
                  Cancelar Edición
                </button>
              )}
              <button
                type="submit"
                className={styles.saveButton}
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: List Column */}
        <div className={styles.listColumn}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner} />
              <p>Cargando productos...</p>
            </div>
          ) : products.length === 0 ? (
            <div className={styles.emptyState}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <p>No hay productos registrados.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {products.map((product) => {
                const productCoupons = getCouponsList(product);
                return (
                  <div key={product.id} className={styles.card}>
                    {/* Thumbnail on left */}
                    <div className={styles.imageWrapper}>
                      {product.imagen_url ? (
                        <img
                          src={product.imagen_url}
                          alt={product.nombre}
                          className={styles.cardImage}
                        />
                      ) : (
                        <div className={styles.noImagePlaceholder}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <path d="M16 10a4 4 0 0 1-8 0" />
                          </svg>
                          <span style={{ fontSize: '0.75rem' }}>Sin foto</span>
                        </div>
                      )}
                    </div>

                    {/* Main Content middle */}
                    <div className={styles.cardContent}>
                      <div className={styles.infoSection}>
                        <h3 className={styles.productName}>{product.nombre}</h3>
                        <p className={styles.productDescription}>
                          {product.descripcion || "Sin descripción proporcionada."}
                        </p>
                        
                        {/* Badges row */}
                        <div className={styles.badgeRow}>
                          {product.precio !== undefined && (
                            <span className={styles.badge}>
                              ${product.precio}
                            </span>
                          )}
                          {product.stock !== undefined && (
                            <span className={styles.badge}>
                              Stock: {product.stock}
                            </span>
                          )}
                          {product.categoria && (
                            <span className={styles.badge}>
                              {product.categoria}
                            </span>
                          )}
                          <span className={styles.badge}>
                            {product.disponible_venta !== false ? "Venta al público" : "Insumo interno"}
                          </span>
                          {product.porcentaje_venta_personal !== undefined && product.porcentaje_venta_personal > 0 && (
                            <span className={styles.badge} style={{ borderColor: 'rgba(0, 0, 0, 0.15)', color: 'rgba(0,0,0,0.85)', fontWeight: 700 }}>
                              Comisión: {product.porcentaje_venta_personal}%
                            </span>
                          )}
                        </div>

                        {/* Extra Info */}
                        {product.contacto_proveedor && (
                          <span className={styles.supplierText}>
                            Proveedor: {product.contacto_proveedor}
                          </span>
                        )}

                        {productCoupons.length > 0 && (
                          <span className={styles.couponsText}>
                            Cupones: {productCoupons.join(", ")}
                          </span>
                        )}
                      </div>

                      {/* Actions column on right */}
                      <div className={styles.actionsSection}>
                        <button
                          className={`${styles.actionButton} ${styles.editBtn}`}
                          onClick={() => handleOpenEdit(product)}
                          title="Editar producto"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </button>
                        <button
                          className={`${styles.actionButton} ${styles.deleteBtn}`}
                          onClick={() => handleOpenDeleteConfirm(product.id)}
                          title="Eliminar producto"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ width: '400px' }}>
            <h3 className={styles.confirmTitle}>Eliminar Producto</h3>
            <p className={styles.confirmMessage}>
              ¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer y borrará permanentemente la información en la base de datos.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setConfirmOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.saveButton}
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
