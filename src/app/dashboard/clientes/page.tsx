'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./clientes.module.css";

interface Cliente {
  IDCliente: string;
  nombre: string;
  telefono: string;
  correo: string;
  notas: string | null;
  created_at: string;
  updated_at: string;
  sucursal_preferida: string | null;
  puntos: number;
  puntos_meta: number;
  puntos_apertura: string;
  ultimo_canjeo: string | null;
  qr_token: string | null;
}

type SortOption = 'name' | 'points' | 'date';

export default function ClientesPage() {
  const [clients, setClients] = useState<Cliente[]>([]);
  const [filteredClients, setFilteredClients] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentSort, setCurrentSort] = useState<SortOption>('name');
  const [globalPointsMeta, setGlobalPointsMeta] = useState<number>(6);

  // Modal State
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'info' | 'history'>('info');
  const [currentNotes, setCurrentNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Appointments History State
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [sendingTicketId, setSendingTicketId] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    applyFiltersAndSorting();
  }, [clients, searchQuery, currentSort]);

  async function fetchClients() {
    setLoading(true);
    try {
      // Fetch global points meta from General table
      const { data: generalData } = await supabase
        .from("General")
        .select("PUNTOSALCOMPLETAR")
        .limit(1)
        .maybeSingle();

      if (generalData && generalData.PUNTOSALCOMPLETAR !== undefined) {
        setGlobalPointsMeta(Number(generalData.PUNTOSALCOMPLETAR));
      }

      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("nombre", { ascending: true });

      if (error) throw error;
      setClients((data || []) as Cliente[]);
    } catch (err: any) {
      console.error("Error fetching clients:", err);
      alert("Error al cargar la lista de clientes: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  }

  const applyFiltersAndSorting = () => {
    let temp = [...clients];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      temp = temp.filter(c => {
        const name = (c.nombre || "").toLowerCase();
        const phone = (c.telefono || "").toLowerCase();
        const email = (c.correo || "").toLowerCase();
        const branch = (c.sucursal_preferida || "").toLowerCase();
        return name.includes(query) || phone.includes(query) || email.includes(query) || branch.includes(query);
      });
    }

    // Sorting
    switch (currentSort) {
      case 'name':
        temp.sort((a, b) => {
          const nameA = (a.nombre || "").toLowerCase();
          const nameB = (b.nombre || "").toLowerCase();
          return nameA.localeCompare(nameB);
        });
        break;
      case 'points':
        temp.sort((a, b) => (b.puntos || 0) - (a.puntos || 0)); // Descending points
        break;
      case 'date':
        temp.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA; // Newer first
        });
        break;
    }

    setFilteredClients(temp);
  };

  // Fetch appointments for the selected client
  async function fetchClientAppointments(client: Cliente) {
    setLoadingAppointments(true);
    setAppointments([]);
    try {
      let orFilter = "";
      if (client.IDCliente) {
        orFilter += `clienteID.eq.${client.IDCliente}`;
      }
      if (client.telefono) {
        if (orFilter) orFilter += ",";
        orFilter += `NumeroTelefonoCliente.eq.${client.telefono},NumeroTelefonoC.eq.${client.telefono}`;
      }

      if (!orFilter) {
        setAppointments([]);
        setLoadingAppointments(false);
        return;
      }

      const { data, error } = await supabase
        .from("Citas")
        .select("*")
        .or(orFilter)
        .order("fecha", { ascending: false });

      if (error) throw error;

      // Fetch all services to map names
      const { data: servicesData } = await supabase
        .from("Services")
        .select("id, nameService");

      const servicesMap: Record<string, string> = {};
      if (servicesData) {
        servicesData.forEach((s: any) => {
          servicesMap[s.id] = s.nameService;
        });
      }

      const mappedAppts = (data || []).map((appt: any) => ({
        ...appt,
        serviceName: servicesMap[appt.servicioID] || "Servicio General"
      }));

      setAppointments(mappedAppts);
    } catch (err) {
      console.error("Error fetching client appointments:", err);
    } finally {
      setLoadingAppointments(false);
    }
  }

  // Helper Stats
  const totalPoints = clients.reduce((sum, c) => sum + (c.puntos || 0), 0);
  const redeemedCount = clients.filter(c => c.ultimo_canjeo !== null).length;

  // Black to grey gradients for avatars (branding rule)
  const getRandomGradient = (id: string) => {
    const hash = Array.from(id || "").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradients = [
      'linear-gradient(135deg, #000000 0%, #4b5563 100%)', // Black to dark grey
      'linear-gradient(135deg, #1f2937 0%, #6b7280 100%)', // Charcoal to grey
      'linear-gradient(135deg, #374151 0%, #9ca3af 100%)', // Dark grey to light grey
      'linear-gradient(135deg, #111827 0%, #374151 100%)', // Deep black to charcoal
      'linear-gradient(135deg, #4b5563 0%, #d1d5db 100%)'  // Grey to silver
    ];
    return gradients[Math.abs(hash) % gradients.length];
  };

  const getInitials = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return "?";
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  const formatFullDate = (dateStr: string) => {
    if (!dateStr) return "No disponible";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }) + " hs";
    } catch {
      return dateStr;
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    alert(`✓ ${label} copiado al portapapeles`);
  };

  const openClientDetails = (client: Cliente) => {
    setSelectedClient(client);
    setCurrentNotes(client.notas || "");
    setActiveModalTab('info');
    fetchClientAppointments(client);
  };

  const handleSaveNotes = async () => {
    if (!selectedClient) return;
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from("clientes")
        .update({ notas: currentNotes.trim() || null })
        .eq("IDCliente", selectedClient.IDCliente);

      if (error) throw error;

      const updatedNotesVal = currentNotes.trim() || null;
      setClients(prev => prev.map(c => c.IDCliente === selectedClient.IDCliente ? { ...c, notas: updatedNotesVal } : c));
      setSelectedClient(prev => prev ? { ...prev, notas: updatedNotesVal } : null);
      alert("✓ Notas guardadas exitosamente.");
    } catch (err: any) {
      console.error("Error saving client notes:", err);
      alert("Error al guardar notas: " + (err.message || err));
    } finally {
      setSavingNotes(false);
    }
  };

  // Send Ticket handler
  const handleSendTicket = async (appt: any) => {
    if (!selectedClient) return;
    
    const ticketId = appt.created_at || `${appt.fecha}-${appt.horaInicio}`;
    setSendingTicketId(ticketId);

    try {
      const response = await fetch("/api/send-ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          appointmentId: ticketId,
          clientName: selectedClient.nombre,
          clientEmail: selectedClient.correo,
          clientPhone: selectedClient.telefono,
          serviceName: appt.serviceName,
          date: appt.fecha,
          time: appt.horaInicio,
          price: appt.precioFinal || appt.MontoACobrar,
          branch: appt.sucursal || appt.Sucursal
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Ocurrió un error al enviar el ticket.");
      }

      alert(`✓ ${resData.details}`);
    } catch (err: any) {
      console.error("Error sending ticket:", err);
      alert(`Error al enviar ticket: ${err.message || err}`);
    } finally {
      setSendingTicketId(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Gestión de Clientes</h1>
        <p className={styles.subtitle}>Consulta información de tus clientes registrados, puntos totales y canjes.</p>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Cargando información de clientes...</p>
        </div>
      ) : (
        <>
          {/* Stats Section */}
          <div className={styles.statsRow}>
            {/* Clientes Card */}
            <div className={styles.statCard}>
              <div className={styles.statIconCircle} style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)', color: '#000000' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <span className={styles.statValue}>{clients.length}</span>
              <span className={styles.statLabel}>Clientes</span>
            </div>

            {/* Puntos Totales Card */}
            <div className={styles.statCard}>
              <div className={styles.statIconCircle} style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)', color: '#000000' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <span className={styles.statValue}>{totalPoints}</span>
              <span className={styles.statLabel}>Puntos Totales</span>
            </div>

            {/* Canjes Realizados Card */}
            <div className={styles.statCard}>
              <div className={styles.statIconCircle} style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)', color: '#000000' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <span className={styles.statValue}>{redeemedCount}</span>
              <span className={styles.statLabel}>Canjes Realizados</span>
            </div>
          </div>

          {/* Search and Sort controls */}
          <div className={styles.controlsCard}>
            <div className={styles.searchWrapper}>
              <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Buscar por nombre, teléfono, sucursal..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={styles.sortRow}>
              <span className={styles.sortLabel}>Ordenar por:</span>
              <button
                type="button"
                className={`${styles.sortChip} ${currentSort === 'name' ? styles.sortChipActive : ''}`}
                onClick={() => setCurrentSort('name')}
              >
                Nombre
              </button>
              <button
                type="button"
                className={`${styles.sortChip} ${currentSort === 'points' ? styles.sortChipActive : ''}`}
                onClick={() => setCurrentSort('points')}
              >
                Puntos
              </button>
              <button
                type="button"
                className={`${styles.sortChip} ${currentSort === 'date' ? styles.sortChipActive : ''}`}
                onClick={() => setCurrentSort('date')}
              >
                Inscripción
              </button>
            </div>
          </div>

          {/* List Section */}
          {filteredClients.length === 0 ? (
            <div className={styles.emptyState}>
              <svg className={styles.emptyIcon} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span className={styles.emptyTitle}>No se encontraron clientes</span>
              <span className={styles.emptySubtitle}>Intenta ajustar los términos de búsqueda.</span>
            </div>
          ) : (
            <div className={styles.clientsList}>
              {filteredClients.map(client => {
                const points = client.puntos || 0;
                const meta = client.puntos_meta || globalPointsMeta;
                const progressPercent = meta > 0 ? Math.min(100, (points / meta) * 100) : 0;

                return (
                  <div
                    key={client.IDCliente}
                    className={styles.clientCard}
                    onClick={() => openClientDetails(client)}
                  >
                    {/* Circle initials avatar with black/grey gradient */}
                    <div
                      className={styles.avatar}
                      style={{ background: getRandomGradient(client.IDCliente) }}
                    >
                      {getInitials(client.nombre)}
                    </div>

                    <div className={styles.cardContent}>
                      <div className={styles.cardHeader}>
                        <span className={styles.clientName}>{client.nombre || "Sin Nombre"}</span>
                        <span className={styles.regDate}>{formatShortDate(client.created_at)}</span>
                      </div>

                      <div className={styles.cardDetails}>
                        {client.telefono && (
                          <span className={styles.contactDetail}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.1rem' }}>
                              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                              <line x1="12" y1="18" x2="12.01" y2="18"></line>
                            </svg>
                            {client.telefono}
                          </span>
                        )}

                        {client.sucursal_preferida && (
                          <span className={`${styles.badge} ${styles.badgeBranch}`}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.05rem' }}>
                              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                              <polyline points="9 22 9 12 15 12 15 22"></polyline>
                            </svg>
                            {client.sucursal_preferida}
                          </span>
                        )}

                        <span className={`${styles.badge} ${styles.badgePoints}`}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.05rem' }}>
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                          </svg>
                          {points} / {meta} pts
                        </span>
                      </div>

                      {/* Points progress bar */}
                      <div className={styles.progressContainer}>
                        <div className={styles.progressBar} style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal / Detail view */}
          {selectedClient && (
            <div className={styles.overlay} onClick={() => setSelectedClient(null)}>
              <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={() => setSelectedClient(null)}
                  aria-label="Cerrar Detalle"
                >
                  ✕
                </button>

                <div className={styles.modalHeader}>
                  <div
                    className={styles.avatar}
                    style={{ background: getRandomGradient(selectedClient.IDCliente), width: '4rem', height: '4rem', fontSize: '1.5rem' }}
                  >
                    {getInitials(selectedClient.nombre)}
                  </div>
                  <div className={styles.modalTitleSection}>
                    <h3 className={styles.modalName}>{selectedClient.nombre || "Sin Nombre"}</h3>
                    {selectedClient.sucursal_preferida ? (
                      <span className={`${styles.badge} ${styles.badgeBranch}`} style={{ alignSelf: 'flex-start' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                          <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                        {selectedClient.sucursal_preferida}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Sin sucursal preferida</span>
                    )}
                  </div>
                </div>

                {/* Modal Tabs Selector */}
                <div className={styles.modalTabs}>
                  <button
                    type="button"
                    className={`${styles.modalTabBtn} ${activeModalTab === 'info' ? styles.modalTabBtnActive : ''}`}
                    onClick={() => setActiveModalTab('info')}
                  >
                    Perfil y Notas
                  </button>
                  <button
                    type="button"
                    className={`${styles.modalTabBtn} ${activeModalTab === 'history' ? styles.modalTabBtnActive : ''}`}
                    onClick={() => setActiveModalTab('history')}
                  >
                    Servicios y Citas
                  </button>
                </div>

                {activeModalTab === 'info' ? (
                  <>
                    {/* Contact Section */}
                    <div className={styles.modalSection}>
                      <span className={styles.sectionHeading}>Información de Contacto</span>
                      
                      {/* Phone Row */}
                      <div className={styles.contactRow}>
                        <div className={styles.contactValWrapper}>
                          <svg className={styles.contactIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                            <line x1="12" y1="18" x2="12.01" y2="18"></line>
                          </svg>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className={styles.contactLabelText}>Teléfono</span>
                            <span className={selectedClient.telefono ? styles.contactValueText : styles.contactValueTextEmpty}>
                              {selectedClient.telefono || "No registrado"}
                            </span>
                          </div>
                        </div>
                        {selectedClient.telefono && (
                          <button
                            type="button"
                            className={styles.btnCopy}
                            onClick={() => copyToClipboard(selectedClient.telefono, "Teléfono")}
                            title="Copiar Teléfono"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Email Row */}
                      <div className={styles.contactRow}>
                        <div className={styles.contactValWrapper}>
                          <svg className={styles.contactIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                          </svg>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className={styles.contactLabelText}>Correo</span>
                            <span className={selectedClient.correo ? styles.contactValueText : styles.contactValueTextEmpty}>
                              {selectedClient.correo || "No registrado"}
                            </span>
                          </div>
                        </div>
                        {selectedClient.correo && (
                          <button
                            type="button"
                            className={styles.btnCopy}
                            onClick={() => copyToClipboard(selectedClient.correo, "Correo")}
                            title="Copiar Correo"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className={styles.divider} />

                    {/* Fidelity Section */}
                    <div className={styles.modalSection}>
                      <span className={styles.sectionHeading}>Programa de Fidelidad</span>
                      
                      <div className={styles.fidelityRow}>
                        <span className={styles.fidelityLabel}>Puntos acumulados:</span>
                        <span className={styles.fidelityVal}>{selectedClient.puntos || 0} / {selectedClient.puntos_meta || globalPointsMeta} puntos</span>
                      </div>

                      <div className={styles.progressContainer} style={{ height: '10px' }}>
                        <div
                          className={styles.progressBar}
                          style={{ width: `${(selectedClient.puntos_meta || globalPointsMeta) > 0 ? Math.min(100, ((selectedClient.puntos || 0) / (selectedClient.puntos_meta || globalPointsMeta)) * 100) : 0}%` }}
                        />
                      </div>

                      {selectedClient.puntos >= (selectedClient.puntos_meta || globalPointsMeta) && (
                        <div className={styles.alertBox}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                          </svg>
                          <span>¡Cliente listo para canjeo de premio!</span>
                        </div>
                      )}

                      <div className={styles.fidelityRow} style={{ marginTop: '0.75rem' }}>
                        <span className={styles.fidelityLabel} style={{ fontSize: '0.8rem' }}>Último canje:</span>
                        <span className={styles.fidelityVal} style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          {selectedClient.ultimo_canjeo ? formatShortDate(selectedClient.ultimo_canjeo) : "Sin canjeos registrados"}
                        </span>
                      </div>
                    </div>

                    <div className={styles.divider} />

                    {/* Notes & Registration Date Section (Restored!) */}
                    <div className={styles.modalSection}>
                      <span className={styles.sectionHeading}>Registro y Notas</span>

                      <div className={styles.fidelityRow} style={{ marginBottom: '0.5rem' }}>
                        <span className={styles.fidelityLabel} style={{ fontSize: '0.8rem' }}>Fecha de inscripción:</span>
                        <span className={styles.fidelityVal} style={{ fontSize: '0.8rem', fontWeight: 600 }}>{formatFullDate(selectedClient.created_at)}</span>
                      </div>

                      <span className={styles.fidelityLabel} style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Notas internas:</span>
                      <textarea
                        placeholder="Escribe notas internas sobre el cliente..."
                        className={styles.notesTextarea}
                        value={currentNotes}
                        onChange={(e) => setCurrentNotes(e.target.value)}
                      />
                      <button
                        type="button"
                        className={styles.btnSaveNotes}
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                      >
                        {savingNotes ? "Guardando..." : "Guardar Notas"}
                      </button>
                    </div>
                  </>
                ) : (
                  /* Tab 2: Appointments & Services History */
                  <div className={styles.modalSection} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <span className={styles.sectionHeading}>Historial de Servicios</span>
                    
                    {loadingAppointments ? (
                      <div className={styles.loadingText}>Cargando historial...</div>
                    ) : appointments.length === 0 ? (
                      <div className={styles.noApptsText}>No se encontraron citas o servicios registrados.</div>
                    ) : (
                      <div className={styles.appointmentsList}>
                        {appointments.map((appt, index) => {
                          const ticketId = appt.created_at || `${appt.fecha}-${appt.horaInicio}`;
                          const isSending = sendingTicketId === ticketId;
                          const hasContactInfo = !!(selectedClient.correo || selectedClient.telefono);

                          return (
                            <div key={appt.created_at || index} className={styles.appointmentItem}>
                              <div className={styles.apptHeader}>
                                <span className={styles.apptService}>{appt.serviceName}</span>
                                <span className={styles.apptPrice}>${appt.precioFinal || appt.MontoACobrar || 0}</span>
                              </div>
                              <div className={styles.apptMetaRow}>
                                <span>{formatShortDate(appt.fecha)} - {appt.horaInicio ? appt.horaInicio.substring(0, 5) : ""} hs</span>
                                <span style={{ 
                                  fontWeight: 600, 
                                  color: appt.estatus === "Completada" ? "#16a34a" : "#2563eb" 
                                }}>
                                  {appt.estatus || "Activa"}
                                </span>
                              </div>
                              <div className={styles.apptMetaRow} style={{ marginTop: '0.1rem' }}>
                                <span>Sucursal: {appt.sucursal || "Principal"}</span>
                              </div>
                              
                              {/* Send Ticket receipt action row */}
                              <div className={styles.apptActionRow}>
                                <button
                                  type="button"
                                  className={styles.btnSendTicket}
                                  onClick={() => handleSendTicket(appt)}
                                  disabled={isSending || !hasContactInfo}
                                  title={!hasContactInfo ? "Falta correo o teléfono para enviar el ticket" : "Enviar ticket por Email o WhatsApp"}
                                >
                                  {isSending ? "Enviando..." : "Enviar Ticket"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    className={styles.btnCloseModal}
                    onClick={() => setSelectedClient(null)}
                  >
                    Cerrar Detalle
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
