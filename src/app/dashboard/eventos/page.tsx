'use client';

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./eventos.module.css";

interface Event {
  id: string; // Database PK
  IDdeEvento?: string; // 5-digit random ID
  TituloDeEvento: string;
  DescripcionDelEvento?: string;
  imagenDeEvento?: string;
  FechaDeEvento?: string;
  FechaEnQueFinalizà?: string; // Grave accent at the end
  FechaYaNoVerNuevoEvento?: string;
  created_at?: string;
  updated_at?: string;
}

export default function EventosPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Date states (stored as YYYY-MM-DD local input strings)
  const [fechaEvento, setFechaEvento] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [fechaOcultar, setFechaOcultar] = useState("");

  const [saving, setSaving] = useState(false);

  // Delete State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("Eventos")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchErr) throw fetchErr;
      setEvents(data || []);
    } catch (err: any) {
      console.error("Error fetching events:", err);
      setError(err.message || "Error al cargar los eventos");
    } finally {
      setLoading(false);
    }
  }

  const handleClearForm = () => {
    setEditingEvent(null);
    setTitle("");
    setDescription("");
    setImageUrl(null);
    setSelectedFile(null);
    setImagePreview(null);
    setFechaEvento("");
    setFechaFin("");
    setFechaOcultar("");
  };

  const formatDateForInput = (isoStr?: string) => {
    if (!isoStr) return "";
    return isoStr.substring(0, 10);
  };

  const handleOpenEdit = (event: Event) => {
    setEditingEvent(event);
    setTitle(event.TituloDeEvento || "");
    setDescription(event.DescripcionDelEvento || "");
    setImageUrl(event.imagenDeEvento || null);
    setSelectedFile(null);
    setImagePreview(event.imagenDeEvento || null);
    setFechaEvento(formatDateForInput(event.FechaDeEvento));
    setFechaFin(formatDateForInput(event.FechaEnQueFinalizà));
    setFechaOcultar(formatDateForInput(event.FechaYaNoVerNuevoEvento));
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

  const generateRandomID = () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      let finalImageUrl = imageUrl;

      // Upload image if a new file is chosen
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `events/${fileName}`;

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

      const isoDate = (dateStr: string) => {
        if (!dateStr) return null;
        // Convert local date string YYYY-MM-DD to ISO String
        return new Date(`${dateStr}T12:00:00`).toISOString();
      };

      const eventData: Partial<Event> = {
        TituloDeEvento: title.trim(),
        DescripcionDelEvento: description.trim(),
        imagenDeEvento: finalImageUrl || undefined,
        FechaDeEvento: isoDate(fechaEvento) || undefined,
        FechaEnQueFinalizà: isoDate(fechaFin) || undefined,
        FechaYaNoVerNuevoEvento: isoDate(fechaOcultar) || undefined,
        updated_at: new Date().toISOString(),
      };

      if (editingEvent) {
        const { error: updateErr } = await supabase
          .from("Eventos")
          .update(eventData)
          .eq("id", editingEvent.id);

        if (updateErr) throw updateErr;
      } else {
        eventData.IDdeEvento = generateRandomID();
        const { error: insertErr } = await supabase
          .from("Eventos")
          .insert([eventData]);

        if (insertErr) throw insertErr;
      }

      handleClearForm();
      fetchEvents();
    } catch (err: any) {
      alert("Error al guardar el evento: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteConfirm = (id: string) => {
    setEventToDelete(id);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!eventToDelete) return;

    try {
      const { error: deleteErr } = await supabase
        .from("Eventos")
        .delete()
        .eq("id", eventToDelete);

      if (deleteErr) throw deleteErr;

      setConfirmOpen(false);
      setEventToDelete(null);
      fetchEvents();
    } catch (err: any) {
      alert("Error al eliminar el evento: " + err.message);
    }
  };

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return "No seleccionada";
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Gestión de Eventos</h1>
      <p className={styles.subtitle} style={{ marginBottom: '2rem' }}>Anuncios y promociones principales</p>

      {error && (
        <div style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '0.75rem', marginBottom: '2rem', border: '1px solid #fee2e2' }}>
          {error}
        </div>
      )}

      <div className={styles.dashboardLayout}>
        {/* Left Column: Form Column */}
        <div className={styles.formColumn}>
          <h2 className={styles.formTitle}>
            {editingEvent ? "Editar Evento" : "Nuevo Evento"}
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
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sin foto</span>
                    <span className={styles.uploadInfoText}>
                      Presiona para subir tu imagen de portada
                    </span>
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
                {imagePreview ? "Cambiar foto" : "Subir foto"}
              </button>
            </div>

            {/* Title field */}
            <div className={styles.inputGroup}>
              <div className={styles.inputIconWrapper}>
                <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 7 4 4 20 4 20 7" />
                  <line x1="9" y1="20" x2="15" y2="20" />
                  <line x1="12" y1="4" x2="12" y2="20" />
                </svg>
                <input
                  type="text"
                  placeholder="Título del Evento"
                  className={styles.input}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
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
                  style={{ minHeight: '80px', paddingLeft: '2.75rem' }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Date pickers mimicking custom tiles */}
            <div className={styles.dateSection}>
              <span className={styles.sectionLabel}>Fechas Importantes</span>
              
              <div className={styles.dateGrid}>
                {/* Fecha del Evento */}
                <div className={styles.dateTile}>
                  <div className={styles.dateInfo}>
                    <span className={styles.dateLabel}>Fecha del Evento</span>
                    {fechaEvento ? (
                      <span className={styles.dateValue}>{formatDateDisplay(fechaEvento)}</span>
                    ) : (
                      <span className={styles.dateValueEmpty}>No seleccionada</span>
                    )}
                  </div>
                  <svg className={styles.calendarIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <input
                    type="date"
                    className={styles.hiddenDateInput}
                    value={fechaEvento}
                    onChange={(e) => setFechaEvento(e.target.value)}
                  />
                </div>

                {/* Fecha que Finaliza */}
                <div className={styles.dateTile}>
                  <div className={styles.dateInfo}>
                    <span className={styles.dateLabel}>Fecha que Finaliza</span>
                    {fechaFin ? (
                      <span className={styles.dateValue}>{formatDateDisplay(fechaFin)}</span>
                    ) : (
                      <span className={styles.dateValueEmpty}>No seleccionada</span>
                    )}
                  </div>
                  <svg className={styles.calendarIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <input
                    type="date"
                    className={styles.hiddenDateInput}
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                  />
                </div>

                {/* Dejar de Mostrar */}
                <div className={styles.dateTile}>
                  <div className={styles.dateInfo}>
                    <span className={styles.dateLabel}>Dejar de Mostrar</span>
                    {fechaOcultar ? (
                      <span className={styles.dateValue}>{formatDateDisplay(fechaOcultar)}</span>
                    ) : (
                      <span className={styles.dateValueEmpty}>No seleccionada</span>
                    )}
                  </div>
                  <svg className={styles.calendarIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <input
                    type="date"
                    className={styles.hiddenDateInput}
                    value={fechaOcultar}
                    onChange={(e) => setFechaOcultar(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Submit / Cancel Buttons */}
            <div className={styles.modalActions}>
              {editingEvent && (
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
                {saving ? "Guardando..." : (editingEvent ? "Guardar Cambios" : "Crear Evento")}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Listing Column */}
        <div className={styles.listColumn}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner} />
              <p>Cargando eventos...</p>
            </div>
          ) : events.length === 0 ? (
            <div className={styles.emptyState}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <p>No hay eventos registrados.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {events.map((event) => (
                <div key={event.id} className={styles.card}>
                  <div className={styles.imageWrapper}>
                    {event.imagenDeEvento ? (
                      <img
                        src={event.imagenDeEvento}
                        alt={event.TituloDeEvento}
                        className={styles.cardImage}
                      />
                    ) : (
                      <div className={styles.noImagePlaceholder}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <span style={{ fontSize: '0.85rem' }}>Sin foto</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.cardContent}>
                    <div className={styles.infoSection}>
                      <h3 className={styles.eventTitle}>{event.TituloDeEvento}</h3>
                      <p className={styles.eventDescription}>
                        {event.DescripcionDelEvento || "Sin descripción proporcionada."}
                      </p>
                      <span className={styles.eventId}>ID: {event.IDdeEvento || "---"}</span>
                    </div>

                    <div className={styles.actionsSection}>
                      <button
                        className={`${styles.actionButton} ${styles.editBtn}`}
                        onClick={() => handleOpenEdit(event)}
                        title="Editar evento"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                      <button
                        className={`${styles.actionButton} ${styles.deleteBtn}`}
                        onClick={() => handleOpenDeleteConfirm(event.id)}
                        title="Eliminar evento"
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

      {/* Delete Confirmation Dialog */}
      {confirmOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ width: '400px' }}>
            <h3 className={styles.confirmTitle}>Eliminar Evento</h3>
            <p className={styles.confirmMessage}>
              ¿Estás seguro de que deseas eliminar este evento? Esta acción no se puede deshacer y borrará permanentemente la información en la base de datos.
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
