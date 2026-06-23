'use client';

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./cursos.module.css";

interface Curso {
  id: string; // Database PK (UUID)
  NombreDelCurso: string;
  DescripcionCorta?: string;
  DescripcionLarga?: string;
  ImagenPortada?: string;
  PrecioFinal?: number;
  Anticipo?: number;
  Descuento?: number;
  FechaDelInicio?: string;
  isDisponible?: boolean;
  DatosDePago?: string;
  created_at?: string;
  updated_at?: string;
}

export default function CursosPage() {
  const [courses, setCourses] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [editingCourse, setEditingCourse] = useState<Curso | null>(null);
  const [nombreDelCurso, setNombreDelCurso] = useState("");
  const [descripcionCorta, setDescripcionCorta] = useState("");
  const [descripcionLarga, setDescripcionLarga] = useState("");
  const [precioFinal, setPrecioFinal] = useState("");
  const [anticipo, setAnticipo] = useState("");
  const [descuento, setDescuento] = useState("");
  const [fechaDelInicio, setFechaDelInicio] = useState("");
  const [isDisponible, setIsDisponible] = useState(true);
  const [datosDePago, setDatosDePago] = useState("");

  // Image Upload State
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  async function fetchCourses() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("Cursos")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchErr) throw fetchErr;
      setCourses(data || []);
    } catch (err: any) {
      console.error("Error loading courses:", err);
      setError(err.message || "Error al cargar los cursos");
    } finally {
      setLoading(false);
    }
  }

  const handleClearForm = () => {
    setEditingCourse(null);
    setNombreDelCurso("");
    setDescripcionCorta("");
    setDescripcionLarga("");
    setPrecioFinal("");
    setAnticipo("");
    setDescuento("");
    setFechaDelInicio("");
    setIsDisponible(true);
    setDatosDePago("");
    setImageUrl(null);
    setSelectedFile(null);
    setImagePreview(null);
  };

  const handleOpenEdit = (course: Curso) => {
    setEditingCourse(course);
    setNombreDelCurso(course.NombreDelCurso || "");
    setDescripcionCorta(course.DescripcionCorta || "");
    setDescripcionLarga(course.DescripcionLarga || "");
    setPrecioFinal(course.PrecioFinal !== undefined ? course.PrecioFinal.toString() : "");
    setAnticipo(course.Anticipo !== undefined ? course.Anticipo.toString() : "");
    setDescuento(course.Descuento !== undefined ? course.Descuento.toString() : "");
    
    // Format date value for HTML input (YYYY-MM-DD)
    if (course.FechaDelInicio) {
      try {
        const dateObj = new Date(course.FechaDelInicio);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        setFechaDelInicio(`${yyyy}-${mm}-${dd}`);
      } catch (e) {
        setFechaDelInicio("");
      }
    } else {
      setFechaDelInicio("");
    }

    setIsDisponible(course.isDisponible !== false);
    setDatosDePago(course.DatosDePago || "");
    setImageUrl(course.ImagenPortada || null);
    setSelectedFile(null);
    setImagePreview(course.ImagenPortada || null);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreDelCurso.trim()) return;

    setSaving(true);
    try {
      const isNew = editingCourse === null;
      const courseId = isNew
        ? Date.now().toString()
        : editingCourse.id.toString();

      let finalImageUrl = imageUrl;

      // Handle file upload if any
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${courseId}-${Date.now()}.${fileExt}`;
        const filePath = `courses/${fileName}`;

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

      const courseData: Partial<Curso> = {
        NombreDelCurso: nombreDelCurso.trim(),
        DescripcionCorta: descripcionCorta.trim(),
        DescripcionLarga: descripcionLarga.trim(),
        PrecioFinal: parseNum(precioFinal),
        Anticipo: parseNum(anticipo),
        Descuento: parseNum(descuento),
        isDisponible: isDisponible,
        DatosDePago: datosDePago.trim(),
        updated_at: new Date().toISOString(),
      };

      if (finalImageUrl) {
        courseData.ImagenPortada = finalImageUrl;
      }

      if (fechaDelInicio) {
        // Parse date in local time to avoid timezone offset shifts
        const [year, month, day] = fechaDelInicio.split('-').map(Number);
        const localDate = new Date(year, month - 1, day);
        courseData.FechaDelInicio = localDate.toISOString();
      } else {
        courseData.FechaDelInicio = undefined;
      }

      if (isNew) {
        courseData.created_at = new Date().toISOString();

        const { error: insertErr } = await supabase
          .from("Cursos")
          .insert([courseData]);

        if (insertErr) throw insertErr;
      } else {
        const { error: updateErr } = await supabase
          .from("Cursos")
          .update(courseData)
          .eq("id", editingCourse.id);

        if (updateErr) throw updateErr;
      }

      handleClearForm();
      fetchCourses();
    } catch (err: any) {
      alert("Error al guardar el curso: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteConfirm = (id: string) => {
    setCourseToDelete(id);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!courseToDelete) return;

    try {
      const { error: deleteErr } = await supabase
        .from("Cursos")
        .delete()
        .eq("id", courseToDelete);

      if (deleteErr) throw deleteErr;

      if (editingCourse && editingCourse.id === courseToDelete) {
        handleClearForm();
      }

      setConfirmOpen(false);
      setCourseToDelete(null);
      fetchCourses();
    } catch (err: any) {
      alert("Error al eliminar el curso: " + err.message);
    }
  };

  const formatDateLabel = (dateStr?: string) => {
    if (!dateStr) return "Sin fecha de inicio";
    try {
      // Split to avoid timezone shift
      const dateOnly = dateStr.split('T')[0];
      const parts = dateOnly.split('-');
      if (parts.length === 3) {
        const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
      }
      return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return "Fecha inválida";
    }
  };

  return (
    <div className={styles.container}>
      {/* Header Row */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Gestión de Cursos</h1>
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
            {editingCourse ? "Editar Curso" : "Nuevo Curso"}
          </h2>

          <form onSubmit={handleSave} className={styles.form}>
            {/* Portada Upload Area */}
            <div className={styles.imageUploadContainer}>
              <div className={styles.imagePreviewBox}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Portada" className={styles.previewImage} />
                ) : (
                  <div className={styles.uploadPlaceholder} onClick={handleTriggerFileInput}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Imagen de Portada</span>
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
                {imagePreview ? "Cambiar portada" : "Subir portada"}
              </button>
            </div>

            {/* Course Name field */}
            <div className={styles.inputGroup}>
              <div className={styles.inputIconWrapper}>
                <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  <path d="M6 6h10" />
                  <path d="M6 10h10" />
                </svg>
                <input
                  type="text"
                  placeholder="Nombre del Curso"
                  className={styles.input}
                  value={nombreDelCurso}
                  onChange={(e) => setNombreDelCurso(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Short Description field */}
            <div className={styles.inputGroup}>
              <div className={styles.inputIconWrapper}>
                <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="21" y1="6" x2="3" y2="6" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                  <line x1="17" y1="18" x2="3" y2="18" />
                </svg>
                <input
                  type="text"
                  placeholder="Resumen Corto"
                  className={styles.input}
                  value={descripcionCorta}
                  onChange={(e) => setDescripcionCorta(e.target.value)}
                />
              </div>
            </div>

            {/* Long Description field */}
            <div className={styles.inputGroup}>
              <div className={styles.inputIconWrapper}>
                <svg className={styles.inputIcon} style={{ top: '1.2rem' }} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <textarea
                  placeholder="Descripción Detallada"
                  className={`${styles.input} ${styles.textarea}`}
                  style={{ minHeight: '80px', paddingLeft: '2.75rem' }}
                  value={descripcionLarga}
                  onChange={(e) => setDescripcionLarga(e.target.value)}
                />
              </div>
            </div>

            {/* Side-by-side Price & Anticipo */}
            <div className={styles.inputRow}>
              {/* Precio Final */}
              <div className={styles.inputGroup}>
                <div className={styles.inputIconWrapper}>
                  <span className={styles.inputIcon} style={{ fontSize: '1rem', fontWeight: 600 }}>$</span>
                  <input
                    type="number"
                    placeholder="Precio Final"
                    className={styles.input}
                    value={precioFinal}
                    onChange={(e) => setPrecioFinal(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Anticipo */}
              <div className={styles.inputGroup}>
                <div className={styles.inputIconWrapper}>
                  <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <line x1="12" y1="10" x2="12" y2="14" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  <input
                    type="number"
                    placeholder="Anticipo"
                    className={styles.input}
                    value={anticipo}
                    onChange={(e) => setAnticipo(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            {/* Descuento */}
            <div className={styles.inputGroup}>
              <div className={styles.inputIconWrapper}>
                <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="5" x2="5" y2="19" />
                  <circle cx="6.5" cy="6.5" r="2.5" />
                  <circle cx="17.5" cy="17.5" r="2.5" />
                </svg>
                <input
                  type="number"
                  placeholder="Descuento (%)"
                  className={styles.input}
                  value={descuento}
                  onChange={(e) => setDescuento(e.target.value)}
                  min="0"
                  max="100"
                  step="1"
                />
              </div>
            </div>

            {/* Fecha del Inicio */}
            <div className={styles.inputGroup}>
              <div className={styles.inputIconWrapper}>
                <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <input
                  type="date"
                  placeholder="Fecha de Inicio"
                  className={styles.input}
                  style={{ color: fechaDelInicio ? "inherit" : "var(--text-muted)" }}
                  value={fechaDelInicio}
                  onChange={(e) => setFechaDelInicio(e.target.value)}
                />
              </div>
            </div>

            {/* Datos de Pago */}
            <div className={styles.inputGroup}>
              <div className={styles.inputIconWrapper}>
                <svg className={styles.inputIcon} style={{ top: '1.2rem' }} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <textarea
                  placeholder="Instrucciones de Pago / Datos Bancarios"
                  className={`${styles.input} ${styles.textarea}`}
                  style={{ minHeight: '60px', paddingLeft: '2.75rem' }}
                  value={datosDePago}
                  onChange={(e) => setDatosDePago(e.target.value)}
                />
              </div>
            </div>

            {/* Availability switch */}
            <div className={styles.switchRow}>
              <span className={styles.switchLabel}>Curso Disponible</span>
              <label className={styles.switchWrapper}>
                <input
                  type="checkbox"
                  checked={isDisponible}
                  onChange={(e) => setIsDisponible(e.target.checked)}
                />
                <span className={styles.slider} />
              </label>
            </div>

            {/* Form Actions */}
            <div className={styles.modalActions}>
              {editingCourse && (
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleClearForm}
                  disabled={saving}
                >
                  Cancelar
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
              <p>Cargando cursos...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className={styles.emptyState}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                <path d="M6 6h10" />
                <path d="M6 10h10" />
              </svg>
              <p>No hay cursos registrados.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {courses.map((course) => {
                const discountVal = course.Descuento || 0;
                return (
                  <div key={course.id} className={styles.card}>
                    {/* Thumbnail on left */}
                    <div className={styles.imageWrapper}>
                      {course.ImagenPortada ? (
                        <img
                          src={course.ImagenPortada}
                          alt={course.NombreDelCurso}
                          className={styles.cardImage}
                        />
                      ) : (
                        <div className={styles.noImagePlaceholder}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                          </svg>
                          <span style={{ fontSize: '0.75rem' }}>Sin foto</span>
                        </div>
                      )}
                    </div>

                    {/* Main Content middle */}
                    <div className={styles.cardContent}>
                      <div className={styles.infoSection}>
                        <div>
                          <h3 className={styles.courseName}>{course.NombreDelCurso}</h3>
                          <p className={styles.courseDescription}>
                            {course.DescripcionCorta || "Sin resumen proporcionado."}
                          </p>
                        </div>
                        
                        {/* Badges row */}
                        <div className={styles.badgeRow}>
                          {course.PrecioFinal !== undefined && (
                            <span className={`${styles.badge} ${styles.priceBadge}`}>
                              ${course.PrecioFinal}
                            </span>
                          )}
                          {course.Anticipo !== undefined && course.Anticipo > 0 && (
                            <span className={styles.badge}>
                              Anticipo: ${course.Anticipo}
                            </span>
                          )}
                          {discountVal > 0 && (
                            <span className={styles.badge} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                              -{discountVal}%
                            </span>
                          )}
                          <span className={`${styles.badge} ${course.isDisponible !== false ? styles.availableBadge : styles.unavailableBadge}`}>
                            {course.isDisponible !== false ? "Disponible" : "Privado"}
                          </span>
                        </div>

                        {/* Extra Info */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span className={`${styles.badge} ${styles.dateBadge}`} style={{ width: 'fit-content', padding: '0.15rem 0.45rem', fontSize: '0.7rem' }}>
                            🗓️ {formatDateLabel(course.FechaDelInicio)}
                          </span>
                          {course.DatosDePago && (
                            <span className={styles.paymentText}>
                              Pago: {course.DatosDePago}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions column on right */}
                      <div className={styles.actionsSection}>
                        <button
                          className={`${styles.actionButton} ${styles.editBtn}`}
                          onClick={() => handleOpenEdit(course)}
                          title="Editar curso"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </button>
                        <button
                          className={`${styles.actionButton} ${styles.deleteBtn}`}
                          onClick={() => handleOpenDeleteConfirm(course.id)}
                          title="Eliminar curso"
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
          <div className={styles.modalContent}>
            <h3 className={styles.confirmTitle}>Eliminar Curso</h3>
            <p className={styles.confirmMessage}>
              ¿Estás seguro de que deseas eliminar este curso? Esta acción no se puede deshacer y borrará permanentemente la información en la base de datos.
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
