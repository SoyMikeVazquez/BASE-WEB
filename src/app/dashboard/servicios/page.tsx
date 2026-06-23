'use client';

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./servicios.module.css";

interface Service {
  id: string; // Database PK (UUID)
  IDServices?: string; // String ID
  nameService: string;
  descriptionService?: string;
  ImageService?: string;
  Price?: number;
  Prince2?: number; // DB has Prince2 with 'n'
  Price3?: number;
  PrecioPremium?: number; // DB has PrecioPremium as well
  tiempo_servicio?: number;
  created_at?: string;
  updated_at?: string;
}

export default function ServiciosPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceStd, setPriceStd] = useState("");
  const [priceElevado, setPriceElevado] = useState("");
  const [pricePremium, setPricePremium] = useState("");
  const [duration, setDuration] = useState(30); // in minutes
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("Services")
        .select("*")
        .order("nameService", { ascending: true });

      if (fetchErr) throw fetchErr;
      setServices(data || []);
    } catch (err: any) {
      console.error("Error fetching services:", err);
      setError(err.message || "Error al cargar los servicios");
    } finally {
      setLoading(false);
    }
  }

  const handleClearForm = () => {
    setEditingService(null);
    setName("");
    setDescription("");
    setPriceStd("");
    setPriceElevado("");
    setPricePremium("");
    setDuration(30);
    setSelectedFile(null);
    setImagePreview(null);
  };

  const handleOpenEdit = (service: Service) => {
    setEditingService(service);
    setName(service.nameService || "");
    setDescription(service.descriptionService || "");
    setPriceStd(service.Price !== undefined ? service.Price.toString() : "");
    setPriceElevado(service.Prince2 !== undefined ? service.Prince2.toString() : "");
    setPricePremium(service.Price3 !== undefined ? service.Price3.toString() : (service.PrecioPremium !== undefined ? service.PrecioPremium.toString() : ""));
    setDuration(service.tiempo_servicio || 30);
    setSelectedFile(null);
    setImagePreview(service.ImageService || null);
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

  const handleIncrementDuration = () => {
    setDuration(prev => prev + 5);
  };

  const handleDecrementDuration = () => {
    setDuration(prev => (prev > 5 ? prev - 5 : 5));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const serviceId = editingService
        ? editingService.IDServices || editingService.id
        : Date.now().toString();

      let finalImageUrl = editingService?.ImageService || null;

      // Handle image upload if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${serviceId}-${Date.now()}.${fileExt}`;
        const filePath = `services/${fileName}`;

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

      const serviceData: Partial<Service> = {
        nameService: name.trim(),
        descriptionService: description.trim(),
        Price: parseNum(priceStd),
        Prince2: parseNum(priceElevado),
        Price3: parseNum(pricePremium),
        PrecioPremium: parseNum(pricePremium),
        tiempo_servicio: duration,
        updated_at: new Date().toISOString(),
      };

      if (finalImageUrl) {
        serviceData.ImageService = finalImageUrl;
      }

      if (editingService) {
        const { error: updateErr } = await supabase
          .from("Services")
          .update(serviceData)
          .eq("id", editingService.id);

        if (updateErr) throw updateErr;
      } else {
        serviceData.IDServices = serviceId;
        const { error: insertErr } = await supabase
          .from("Services")
          .insert([serviceData]);

        if (insertErr) throw insertErr;
      }

      handleClearForm();
      fetchServices();
    } catch (err: any) {
      alert("Error al guardar el servicio: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteConfirm = (id: string) => {
    setServiceToDelete(id);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!serviceToDelete) return;

    try {
      const { error: deleteErr } = await supabase
        .from("Services")
        .delete()
        .eq("id", serviceToDelete);

      if (deleteErr) throw deleteErr;

      setConfirmOpen(false);
      setServiceToDelete(null);
      fetchServices();
    } catch (err: any) {
      alert("Error al eliminar el servicio: " + err.message);
    }
  };

  const formatDuration = (minutes?: number) => {
    if (minutes === undefined || minutes === null) return "N/A";
    if (minutes < 60) return `${minutes}min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}min`;
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title} style={{ marginBottom: '2rem' }}>Administrar Servicios</h1>

      {error && (
        <div style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '0.75rem', marginBottom: '2rem', border: '1px solid #fee2e2' }}>
          {error}
        </div>
      )}

      <div className={styles.dashboardLayout}>
        {/* Left Column: Form Column */}
        <div className={styles.formColumn}>
          <h2 className={styles.formTitle}>
            {editingService ? "Editar Servicio" : "Nuevo Servicio"}
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
                {imagePreview ? "Cambiar imagen" : "Subir imagen principal"}
              </button>
            </div>

            {/* Service Name field */}
            <div className={styles.inputGroup}>
              <div className={styles.inputIconWrapper}>
                <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                  <path d="M12 6a6 6 0 0 1 6 6c0 3.314-2.686 6-6 6a6 6 0 0 1-6-6c0-3.314 2.686-6 6-6z" />
                </svg>
                <input
                  type="text"
                  placeholder="Nombre del Servicio"
                  className={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                  className={`${styles.input} styles.textarea`}
                  style={{ minHeight: '60px', paddingLeft: '2.75rem' }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Duration picker widget with counter */}
            <div className={styles.durationContainer}>
              <span className={styles.durationLabel}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Duración
              </span>
              
              <div className={styles.durationControls}>
                <button
                  type="button"
                  className={styles.counterButton}
                  onClick={handleDecrementDuration}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                
                <span className={styles.durationText}>
                  {formatDuration(duration)}
                </span>
                
                <button
                  type="button"
                  className={styles.counterButton}
                  onClick={handleIncrementDuration}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Pricing Section */}
            <div className={styles.pricingSection}>
              <span className={styles.sectionTitle}>Precios</span>
              <span className={styles.sectionSubtitle}>
                Asigna a cada sucursal un nivel (1-2-3) para determinar qué precio se aplica.
              </span>
              
              <div className={styles.pricingInputsGrid}>
                {/* Estándar / Nivel 1 */}
                <div className={styles.inputGroup}>
                  <div className={styles.inputIconWrapper}>
                    <span className={styles.inputIcon} style={{ fontSize: '1rem', fontWeight: 600 }}>$</span>
                    <input
                      type="number"
                      placeholder="Precio Estándar (Nivel 1)"
                      className={styles.input}
                      value={priceStd}
                      onChange={(e) => setPriceStd(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Elevado / Nivel 2 */}
                <div className={styles.inputGroup}>
                  <div className={styles.inputIconWrapper}>
                    <span className={styles.inputIcon} style={{ fontSize: '1rem', fontWeight: 600 }}>$</span>
                    <input
                      type="number"
                      placeholder="Precio Elevado (Nivel 2)"
                      className={styles.input}
                      value={priceElevado}
                      onChange={(e) => setPriceElevado(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Premium / Nivel 3 */}
                <div className={styles.inputGroup}>
                  <div className={styles.inputIconWrapper}>
                    <span className={styles.inputIcon} style={{ fontSize: '1rem', fontWeight: 600 }}>$</span>
                    <input
                      type="number"
                      placeholder="Precio Premium (Nivel 3)"
                      className={styles.input}
                      value={pricePremium}
                      onChange={(e) => setPricePremium(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className={styles.modalActions}>
              {editingService && (
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
              <p>Cargando servicios...</p>
            </div>
          ) : services.length === 0 ? (
            <div className={styles.emptyState}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="M12 6a6 6 0 0 1 6 6c0 3.314-2.686 6-6 6a6 6 0 0 1-6-6c0-3.314 2.686-6 6-6z" />
              </svg>
              <p>No hay servicios registrados.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {services.map((service) => (
                <div key={service.id} className={styles.card}>
                  {/* Thumbnail image on left */}
                  <div className={styles.imageWrapper}>
                    {service.ImageService ? (
                      <img
                        src={service.ImageService}
                        alt={service.nameService}
                        className={styles.cardImage}
                      />
                    ) : (
                      <div className={styles.noImagePlaceholder}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12s4.477-10 10-10z" />
                          <path d="M12 6a6 6 0 0 1 6 6c0 3.314-2.686 6-6 6a6 6 0 0 1-6-6c0-3.314 2.686-6 6-6z" />
                        </svg>
                        <span style={{ fontSize: '0.75rem' }}>Sin foto</span>
                      </div>
                    )}
                  </div>

                  {/* Main Content middle */}
                  <div className={styles.cardContent}>
                    <div className={styles.infoSection}>
                      <h3 className={styles.serviceName}>{service.nameService}</h3>
                      <p className={styles.serviceDescription}>
                        {service.descriptionService || "Sin descripción proporcionada."}
                      </p>
                      
                      {/* Badges row */}
                      <div className={styles.badgeRow}>
                        {service.Price !== undefined && (
                          <span className={styles.badge}>
                            ${service.Price}
                          </span>
                        )}
                        {(service.Price3 !== undefined || service.PrecioPremium !== undefined) && (
                          <span className={`${styles.badge} ${styles.badgePremium}`}>
                            ${service.Price3 !== undefined ? service.Price3 : service.PrecioPremium} ✦
                          </span>
                        )}
                        {service.tiempo_servicio !== undefined && (
                          <span className={styles.badge}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '2px' }}>
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {formatDuration(service.tiempo_servicio)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons on right */}
                    <div className={styles.actionsSection}>
                      <button
                        className={`${styles.actionButton} ${styles.editBtn}`}
                        onClick={() => handleOpenEdit(service)}
                        title="Editar servicio"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                      <button
                        className={`${styles.actionButton} ${styles.deleteBtn}`}
                        onClick={() => handleOpenDeleteConfirm(service.id)}
                        title="Eliminar servicio"
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
            <h3 className={styles.confirmTitle}>Eliminar Servicio</h3>
            <p className={styles.confirmMessage}>
              ¿Estás seguro de que deseas eliminar este servicio? Esta acción no se puede deshacer y borrará permanentemente la información en la base de datos.
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
