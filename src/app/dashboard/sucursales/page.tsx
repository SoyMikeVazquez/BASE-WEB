'use client';

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./sucursales.module.css";

interface Branch {
  IDSucursal: string;
  created_at?: string;
  IDGeneral: string;
  NombreSucursal: string;
  Ubicación?: string;
  FotoSucucrsal?: string;
  UbicaciónLink?: string;
  NivelDePrecio?: number;
  pricePremium?: boolean;
  Submarca?: string;
  IDSucursales?: string;
}

export default function SucursalesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Form Fields State
  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [linkMaps, setLinkMaps] = useState("");
  const [submarca, setSubmarca] = useState("");
  const [nivelPrecio, setNivelPrecio] = useState(1); // 1 = Estándar, 2 = Elevado, 3 = Premium
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBranches();
  }, []);

  async function fetchBranches() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("Sucursales")
        .select("*")
        .order("NombreSucursal", { ascending: true });

      if (fetchErr) throw fetchErr;
      setBranches(data || []);
    } catch (err: any) {
      console.error("Error fetching branches:", err);
      setError(err.message || "Error al cargar las sucursales");
    } finally {
      setLoading(false);
    }
  }

  const handleClearForm = () => {
    setEditingBranch(null);
    setNombre("");
    setUbicacion("");
    setLinkMaps("");
    setSubmarca("");
    setNivelPrecio(1);
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleOpenEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setNombre(branch.NombreSucursal || "");
    setUbicacion(branch.Ubicación || "");
    setLinkMaps(branch.UbicaciónLink || "");
    setSubmarca(branch.Submarca || "");
    setNivelPrecio(branch.NivelDePrecio || 1);
    setSelectedImage(null);
    setImagePreview(branch.FotoSucucrsal || null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleTriggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setSaving(true);
    try {
      let photoUrl = editingBranch?.FotoSucucrsal || null;

      // Handle image upload if a new one is selected
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `locations/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("sucursales")
          .upload(filePath, selectedImage, {
            contentType: `image/${fileExt}`,
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("sucursales")
          .getPublicUrl(filePath);

        photoUrl = publicUrl;
      }

      const branchData: Partial<Branch> = {
        NombreSucursal: nombre.trim(),
        Ubicación: ubicacion.trim(),
        UbicaciónLink: linkMaps.trim(),
        Submarca: submarca.trim(),
        NivelDePrecio: nivelPrecio,
        pricePremium: nivelPrecio === 3,
      };

      if (photoUrl) {
        branchData.FotoSucucrsal = photoUrl;
      }

      if (editingBranch) {
        // Update Branch
        const { error: updateErr } = await supabase
          .from("Sucursales")
          .update(branchData)
          .eq("IDSucursal", editingBranch.IDSucursal);

        if (updateErr) throw updateErr;
      } else {
        // Create New Branch
        const newId = Date.now().toString();
        const newBranch: Branch = {
          IDSucursal: newId,
          IDGeneral: "GENERAL",
          NombreSucursal: nombre.trim(),
          Ubicación: ubicacion.trim(),
          UbicaciónLink: linkMaps.trim(),
          Submarca: submarca.trim(),
          NivelDePrecio: nivelPrecio,
          pricePremium: nivelPrecio === 3,
          IDSucursales: newId,
          FotoSucucrsal: photoUrl || undefined
        };

        const { error: insertErr } = await supabase
          .from("Sucursales")
          .insert([newBranch]);

        if (insertErr) throw insertErr;
      }

      handleClearForm();
      fetchBranches();
    } catch (err: any) {
      alert("Error al guardar la sucursal: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteConfirm = (id: string) => {
    setBranchToDelete(id);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!branchToDelete) return;

    try {
      const { error: deleteErr } = await supabase
        .from("Sucursales")
        .delete()
        .eq("IDSucursal", branchToDelete);

      if (deleteErr) throw deleteErr;

      setConfirmOpen(false);
      setBranchToDelete(null);
      fetchBranches();
    } catch (err: any) {
      alert("Error al eliminar la sucursal: " + err.message);
    }
  };

  const getPriceTierName = (level?: number) => {
    if (level === 2) return "Elevado";
    if (level === 3) return "Premium";
    return "Estándar";
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title} style={{ marginBottom: '2rem' }}>Administrar Sucursales</h1>

      {error && (
        <div style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '0.75rem', marginBottom: '2rem', border: '1px solid #fee2e2' }}>
          {error}
        </div>
      )}

      <div className={styles.dashboardLayout}>
        {/* Left Column: Form Column */}
        <div className={styles.formColumn}>
          <h2 className={styles.formTitle}>
            {editingBranch ? "Editar Sucursal" : "Nueva Sucursal"}
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
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Sin foto</span>
                  </div>
                )}
              </div>
              
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageChange}
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
                {imagePreview ? "Cambiar foto" : "Subir foto"}
              </button>
            </div>

            {/* Name field */}
            <div className={styles.inputGroup}>
              <div className={styles.inputIconWrapper}>
                <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m2 7 4.41-3.67A2 2 0 0 1 7.7 3h8.6a2 2 0 0 1 1.3.33L22 7" />
                  <path d="M4 12V9" />
                  <path d="M12 12V9" />
                  <path d="M20 12V9" />
                  <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
                  <path d="M9 12v3a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-3" />
                </svg>
                <input
                  type="text"
                  placeholder="Nombre de la Sucursal"
                  className={styles.input}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Address field */}
            <div className={styles.inputGroup}>
              <div className={styles.inputIconWrapper}>
                <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <input
                  type="text"
                  placeholder="Ubicación / Dirección"
                  className={styles.input}
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                />
              </div>
            </div>

            {/* Maps Link field */}
            <div className={styles.inputGroup}>
              <div className={styles.inputIconWrapper}>
                <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18" />
                  <path d="M15 3v18" />
                  <path d="M3 9h18" />
                  <path d="M3 15h18" />
                </svg>
                <input
                  type="url"
                  placeholder="Link de Google Maps"
                  className={styles.input}
                  value={linkMaps}
                  onChange={(e) => setLinkMaps(e.target.value)}
                />
              </div>
            </div>

            {/* Subbrand field */}
            <div className={styles.inputGroup}>
              <div className={styles.inputIconWrapper}>
                <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                <input
                  type="text"
                  placeholder="Submarca (opcional)"
                  className={styles.input}
                  value={submarca}
                  onChange={(e) => setSubmarca(e.target.value)}
                />
              </div>
            </div>

            {/* Price Tier Select buttons */}
            <div className={styles.priceTierSection}>
              <span className={styles.priceTierLabel}>Nivel de Precio del Servicio:</span>
              <span className={styles.priceTierSub}>Determina qué columna de precio se usará al agendar en esta sucursal.</span>
              <div className={styles.priceTierRow}>
                <button
                  type="button"
                  className={`${styles.tierButton} ${nivelPrecio === 1 ? styles.tierButtonActive : ""}`}
                  onClick={() => setNivelPrecio(1)}
                >
                  Estándar
                </button>
                <button
                  type="button"
                  className={`${styles.tierButton} ${nivelPrecio === 2 ? styles.tierButtonActive : ""}`}
                  onClick={() => setNivelPrecio(2)}
                >
                  Elevado
                </button>
                <button
                  type="button"
                  className={`${styles.tierButton} ${nivelPrecio === 3 ? styles.tierButtonActive : ""}`}
                  onClick={() => setNivelPrecio(3)}
                >
                  Premium ✦
                </button>
              </div>
            </div>

            {/* Form Actions */}
            <div className={styles.modalActions}>
              {editingBranch && (
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
                {saving ? "Guardando..." : (editingBranch ? "Guardar Cambios" : "Crear Sucursal")}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: List Column */}
        <div className={styles.listColumn}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner} />
              <p>Cargando sucursales...</p>
            </div>
          ) : branches.length === 0 ? (
            <div className={styles.emptyState}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m2 7 4.41-3.67A2 2 0 0 1 7.7 3h8.6a2 2 0 0 1 1.3.33L22 7" />
                <path d="M4 12V9" />
                <path d="M12 12V9" />
                <path d="M20 12V9" />
                <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
                <path d="M9 12v3a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-3" />
              </svg>
              <p>No hay sucursales registradas.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {branches.map((branch) => (
                <div key={branch.IDSucursal} className={styles.card}>
                  {/* Card Image */}
                  <div className={styles.imageWrapper}>
                    {branch.FotoSucucrsal ? (
                      <img
                        src={branch.FotoSucucrsal}
                        alt={branch.NombreSucursal}
                        className={styles.cardImage}
                      />
                    ) : (
                      <div className={styles.noImagePlaceholder}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m2 7 4.41-3.67A2 2 0 0 1 7.7 3h8.6a2 2 0 0 1 1.3.33L22 7" />
                          <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
                        </svg>
                        <span style={{ fontSize: '0.85rem' }}>Sin foto</span>
                      </div>
                    )}
                  </div>

                  {/* Card Content & Action Buttons */}
                  <div className={styles.cardContent}>
                    <div className={styles.infoSection}>
                      <h3 className={styles.branchName}>{branch.NombreSucursal}</h3>
                      <div className={styles.branchAddress}>
                        {branch.UbicaciónLink ? (
                          <a href={branch.UbicaciónLink} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', gap: '0.35rem', color: 'inherit' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            {branch.Ubicación || "Sin dirección física registrada"}
                          </a>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            {branch.Ubicación || "Sin dirección física registrada"}
                          </>
                        )}
                      </div>
                      
                      {/* Badges */}
                      <div className={styles.badgeRow}>
                        <span className={`${styles.badge} ${branch.NivelDePrecio === 3 ? styles.badgePremium : ""}`}>
                          {getPriceTierName(branch.NivelDePrecio)}
                        </span>
                        {branch.Submarca && (
                          <span className={styles.badge}>
                            {branch.Submarca}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={styles.actionsSection}>
                      <button
                        className={`${styles.actionButton} ${styles.editBtn}`}
                        onClick={() => handleOpenEdit(branch)}
                        title="Editar sucursal"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                      <button
                        className={`${styles.actionButton} ${styles.deleteBtn}`}
                        onClick={() => handleOpenDeleteConfirm(branch.IDSucursal)}
                        title="Eliminar sucursal"
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
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ width: '400px' }}>
            <h3 className={styles.confirmTitle}>Eliminar Sucursal</h3>
            <p className={styles.confirmMessage}>
              ¿Estás seguro de que deseas eliminar esta sucursal? Esta acción no se puede deshacer y borrará permanentemente la información en la base de datos.
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
