'use client';

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./configuracion.module.css";

interface GeneralConfig {
  id: string;
  NombreDeLaEmpresa?: string;
  Giro?: string;
  LogoDeLaEmpresa?: string;
  imagePortada?: string;
  urlVideo?: string;
  PUNTOSALCOMPLETAR?: number;
  RecompensaTituloPuntos?: string;
  RecompensaDescripcionPuntos?: string;
  verPreciosServicios?: boolean;
  verPreciosProductos?: boolean;
  correoNotificacionesGeneral?: string;
  Soporte?: string;
  PoliticaDePrivacidad?: string;
  ElimCuenta?: boolean;
}

export default function ConfiguacionPage() {
  const [configId, setConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tab State & Database Alerts
  const [activeTab, setActiveTab] = useState<'general' | 'apis'>('general');
  const [secretsTableMissing, setSecretsTableMissing] = useState(false);

  // Form Fields State
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [giro, setGiro] = useState("");
  const [starsToComplete, setStarsToComplete] = useState<number>(6);
  const [recompensaTitulo, setRecompensaTitulo] = useState("");
  const [recompensaDesc, setRecompensaDesc] = useState("");
  const [correoNotificaciones, setCorreoNotificaciones] = useState("");
  const [linkSoporte, setLinkSoporte] = useState("");
  const [politicaPrivacidad, setPoliticaPrivacidad] = useState("");

  // Toggles State
  const [verPreciosServicios, setVerPreciosServicios] = useState(false);
  const [verPreciosProductos, setVerPreciosProductos] = useState(false);
  const [allowDeleteAccount, setAllowDeleteAccount] = useState(false);

  // API Keys States
  const [mpTestAccessToken, setMpTestAccessToken] = useState("");
  const [mpTestPublicKey, setMpTestPublicKey] = useState("");
  const [mpProdAccessToken, setMpProdAccessToken] = useState("");
  const [mpProdPublicKey, setMpProdPublicKey] = useState("");
  
  const [stripeTestSecretKey, setStripeTestSecretKey] = useState("");
  const [stripeTestPublishableKey, setStripeTestPublishableKey] = useState("");
  const [stripeProdSecretKey, setStripeProdSecretKey] = useState("");
  const [stripeProdPublishableKey, setStripeProdPublishableKey] = useState("");
  
  const [waToken, setWaToken] = useState("");
  const [waPhoneNumberId, setWaPhoneNumberId] = useState("");
  const [waBusinessAccountId, setWaBusinessAccountId] = useState("");
  
  const [resendApiKey, setResendApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [chatgptApiKey, setChatgptApiKey] = useState("");

  // Pre-established API toggles (defaults to true)
  const [useDefaultWhatsApp, setUseDefaultWhatsApp] = useState(true);
  const [useDefaultResend, setUseDefaultResend] = useState(true);

  // Visible key toggles (to show/hide password inputs)
  const [showMpTestToken, setShowMpTestToken] = useState(false);
  const [showMpProdToken, setShowMpProdToken] = useState(false);
  const [showStripeTestSecret, setShowStripeTestSecret] = useState(false);
  const [showStripeProdSecret, setShowStripeProdSecret] = useState(false);
  const [showWaToken, setShowWaToken] = useState(false);
  const [showResendKey, setShowResendKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showChatgptKey, setShowChatgptKey] = useState(false);

  // File Upload State
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoDeleted, setLogoDeleted] = useState(false);

  const [portadaUrl, setPortadaUrl] = useState<string | null>(null);
  const [selectedPortada, setSelectedPortada] = useState<File | null>(null);
  const [portadaPreview, setPortadaPreview] = useState<string | null>(null);
  const [portadaDeleted, setPortadaDeleted] = useState(false);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoMetaText, setVideoMetaText] = useState("");
  const [videoDeleted, setVideoDeleted] = useState(false);

  // File input refs
  const logoInputRef = useRef<HTMLInputElement>(null);
  const portadaInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadAllData() {
      setLoading(true);
      await Promise.all([
        fetchGeneralConfig(),
        fetchSecrets()
      ]);
      setLoading(false);
    }
    loadAllData();
  }, []);

  async function fetchSecrets() {
    try {
      const { data, error: secretsErr } = await supabase
        .from("Secrets")
        .select("*");

      if (secretsErr) {
        if (secretsErr.code === '42P01') {
          console.warn("La tabla Secrets no existe en la base de datos.");
          setSecretsTableMissing(true);
        } else {
          throw secretsErr;
        }
        return;
      }

      if (data) {
        setSecretsTableMissing(false);
        data.forEach((item: { key: string, value: string }) => {
          switch (item.key) {
            case 'mercadopago_test_access_token':
            case 'mp_test_access_token': setMpTestAccessToken(item.value || ""); break;
            
            case 'mercadopago_test_public_key':
            case 'mp_test_public_key': setMpTestPublicKey(item.value || ""); break;
            
            case 'mercadopago_prod_access_token':
            case 'mp_prod_access_token': setMpProdAccessToken(item.value || ""); break;
            
            case 'mercadopago_prod_public_key':
            case 'mp_prod_public_key': setMpProdPublicKey(item.value || ""); break;
            
            case 'stripe_test_secret_key': setStripeTestSecretKey(item.value || ""); break;
            case 'stripe_test_publishable_key': setStripeTestPublishableKey(item.value || ""); break;
            case 'stripe_prod_secret_key': setStripeProdSecretKey(item.value || ""); break;
            case 'stripe_prod_publishable_key': setStripeProdPublishableKey(item.value || ""); break;
            
            case 'whatsapp_use_default': setUseDefaultWhatsApp(item.value === 'true'); break;
            case 'whatsapp_token':
            case 'whatsapp_api_token': setWaToken(item.value || ""); break;
            case 'whatsapp_phone_number_id': setWaPhoneNumberId(item.value || ""); break;
            case 'whatsapp_waba_id':
            case 'whatsapp_business_account_id': setWaBusinessAccountId(item.value || ""); break;
            
            case 'resend_use_default': setUseDefaultResend(item.value === 'true'); break;
            case 'resend_api_key': setResendApiKey(item.value || ""); break;
            
            case 'gemini_api_key': setGeminiApiKey(item.value || ""); break;
            case 'chatgpt_api_key': setChatgptApiKey(item.value || ""); break;
          }
        });
      }
    } catch (err: any) {
      console.error("Error loading secrets:", err);
    }
  }

  async function fetchGeneralConfig() {
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("General")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      if (data) {
        setConfigId(data.id);
        setNombreEmpresa(data.NombreDeLaEmpresa || "");
        setGiro(data.Giro || "");
        setStarsToComplete(data.PUNTOSALCOMPLETAR !== undefined ? Number(data.PUNTOSALCOMPLETAR) : 6);
        setRecompensaTitulo(data.RecompensaTituloPuntos || "");
        setRecompensaDesc(data.RecompensaDescripcionPuntos || "");
        setCorreoNotificaciones(data.correoNotificacionesGeneral || "");
        setLinkSoporte(data.Soporte || "");
        setPoliticaPrivacidad(data.PoliticaDePrivacidad || "");

        setVerPreciosServicios(data.verPreciosServicios || false);
        setVerPreciosProductos(data.verPreciosProductos || false);
        setAllowDeleteAccount(data.ElimCuenta || false);

        setLogoUrl(data.LogoDeLaEmpresa || null);
        setLogoPreview(data.LogoDeLaEmpresa || null);
        setLogoDeleted(false);

        setPortadaUrl(data.imagePortada || null);
        setPortadaPreview(data.imagePortada || null);
        setPortadaDeleted(false);

        setVideoUrl(data.urlVideo || null);
        setVideoDeleted(false);
        setVideoMetaText(data.urlVideo ? "Video horizontal activo en el servidor" : "Subir un video corto y horizontal");
      }
    } catch (err: any) {
      console.error("Error loading general configuration:", err);
      setError(err.message || "Error al cargar la configuración general");
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedLogo(file);
      setLogoPreview(URL.createObjectURL(file));
      setLogoDeleted(false);
    }
  };

  const handlePortadaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedPortada(file);
      setPortadaPreview(URL.createObjectURL(file));
      setPortadaDeleted(false);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const sizeInMB = file.size / (1024 * 1024);

      if (sizeInMB > 250) {
        alert(`Error: El video seleccionado pesa ${sizeInMB.toFixed(1)}MB. El peso máximo permitido es de 250MB.`);
        return;
      }

      // Check orientation
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        if (video.videoWidth <= video.videoHeight) {
          alert(`Error: El formato de video vertical/cuadrado (${video.videoWidth}x${video.videoHeight}) no está permitido. El video debe ser estrictamente horizontal.`);
        } else {
          setSelectedVideo(file);
          setVideoDeleted(false);
          setVideoMetaText(`Nuevo video horizontal: ${sizeInMB.toFixed(1)}MB`);
        }
      };
      video.src = URL.createObjectURL(file);
    }
  };

  const handleDeleteLogo = () => {
    setSelectedLogo(null);
    setLogoPreview(null);
    setLogoUrl(null);
    setLogoDeleted(true);
  };

  const handleDeletePortada = () => {
    setSelectedPortada(null);
    setPortadaPreview(null);
    setPortadaUrl(null);
    setPortadaDeleted(true);
  };

  const handleDeleteVideo = () => {
    setSelectedVideo(null);
    setVideoUrl(null);
    setVideoDeleted(true);
    setVideoMetaText("Subir un video corto y horizontal");
  };

  const uploadFileToStorage = async (file: File, folder: string) => {
    const ext = file.name.split('.').pop();
    const path = `${folder}/${folder}-${Date.now()}.${ext}`;

    let contentType = 'application/octet-stream';
    if (folder === 'logo' || folder === 'portada') {
      contentType = `image/${ext}`;
    } else if (folder === 'videos') {
      contentType = `video/${ext}`;
    }

    const { error: uploadErr } = await supabase.storage
      .from("general")
      .upload(path, file, {
        contentType,
        upsert: true
      });

    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = supabase.storage
      .from("general")
      .getPublicUrl(path);

    return publicUrl;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configId) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // 1. Upload Logo
      let finalLogoUrl = logoUrl;
      if (logoDeleted) {
        finalLogoUrl = null;
      } else if (selectedLogo) {
        finalLogoUrl = await uploadFileToStorage(selectedLogo, "logo");
      }

      // 2. Upload Portada
      let finalPortadaUrl = portadaUrl;
      if (portadaDeleted) {
        finalPortadaUrl = null;
      } else if (selectedPortada) {
        finalPortadaUrl = await uploadFileToStorage(selectedPortada, "portada");
      }

      // 3. Upload Video
      let finalVideoUrl = videoUrl;
      if (videoDeleted) {
        finalVideoUrl = null;
      } else if (selectedVideo) {
        finalVideoUrl = await uploadFileToStorage(selectedVideo, "videos");
      }

      const updateData: Partial<GeneralConfig> = {
        NombreDeLaEmpresa: nombreEmpresa.trim(),
        Giro: giro.trim(),
        LogoDeLaEmpresa: finalLogoUrl || undefined,
        imagePortada: finalPortadaUrl || undefined,
        urlVideo: finalVideoUrl || undefined,
        PUNTOSALCOMPLETAR: Number(starsToComplete),
        RecompensaTituloPuntos: recompensaTitulo.trim(),
        RecompensaDescripcionPuntos: recompensaDesc.trim(),
        Soporte: linkSoporte.trim() || undefined,
        PoliticaDePrivacidad: politicaPrivacidad.trim() || undefined,
        correoNotificacionesGeneral: correoNotificaciones.trim() || undefined,
        verPreciosServicios: verPreciosServicios,
        verPreciosProductos: verPreciosProductos,
        ElimCuenta: allowDeleteAccount,
      };

      // Since PostgREST validates database keys strictly, we explicitly clear null values or set them to null/empty as accepted
      if (finalLogoUrl === null) updateData.LogoDeLaEmpresa = undefined;
      if (finalPortadaUrl === null) updateData.imagePortada = undefined;
      if (finalVideoUrl === null) updateData.urlVideo = undefined;
      if (!linkSoporte.trim()) updateData.Soporte = undefined;
      if (!politicaPrivacidad.trim()) updateData.PoliticaDePrivacidad = undefined;
      if (!correoNotificaciones.trim()) updateData.correoNotificacionesGeneral = undefined;

      const { error: updateErr } = await supabase
        .from("General")
        .update(updateData)
        .eq("id", configId);

      if (updateErr) throw updateErr;

      setSuccessMsg("Configuración guardada exitosamente.");
      // Reload config
      fetchGeneralConfig();
      // Scroll to top to see success msg
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error("Error saving general configuration:", err);
      setError(err.message || "Ocurrió un error al guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecrets = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const secretsToSave = [
        { key: 'mercadopago_test_access_token', value: mpTestAccessToken.trim(), description: 'Mercado Pago - Access Token (Pruebas)' },
        { key: 'mercadopago_test_public_key', value: mpTestPublicKey.trim(), description: 'Mercado Pago - Public Key (Pruebas)' },
        { key: 'mercadopago_prod_access_token', value: mpProdAccessToken.trim(), description: 'Mercado Pago - Access Token (Producción)' },
        { key: 'mercadopago_prod_public_key', value: mpProdPublicKey.trim(), description: 'Mercado Pago - Public Key (Producción)' },
        { key: 'stripe_test_secret_key', value: stripeTestSecretKey.trim(), description: 'Stripe - Secret Key (Pruebas)' },
        { key: 'stripe_test_publishable_key', value: stripeTestPublishableKey.trim(), description: 'Stripe - Publishable Key (Pruebas)' },
        { key: 'stripe_prod_secret_key', value: stripeProdSecretKey.trim(), description: 'Stripe - Secret Key (Producción)' },
        { key: 'stripe_prod_publishable_key', value: stripeProdPublishableKey.trim(), description: 'Stripe - Publishable Key (Producción)' },
        
        { key: 'whatsapp_use_default', value: useDefaultWhatsApp ? 'true' : 'false', description: 'WhatsApp API - Usar preestablecida de la plataforma' },
        { key: 'whatsapp_token', value: waToken.trim(), description: 'WhatsApp API - Access Token' },
        { key: 'whatsapp_phone_number_id', value: waPhoneNumberId.trim(), description: 'WhatsApp API - Phone Number ID' },
        { key: 'whatsapp_waba_id', value: waBusinessAccountId.trim(), description: 'WhatsApp API - WhatsApp Business Account ID' },
        
        { key: 'resend_use_default', value: useDefaultResend ? 'true' : 'false', description: 'Resend - Usar preestablecida de la plataforma' },
        { key: 'resend_api_key', value: resendApiKey.trim(), description: 'Resend - API Key' },
        
        { key: 'gemini_api_key', value: geminiApiKey.trim(), description: 'Gemini - API Key' },
        { key: 'chatgpt_api_key', value: chatgptApiKey.trim(), description: 'ChatGPT - API Key' }
      ];

      const { error: saveErr } = await supabase
        .from("Secrets")
        .upsert(secretsToSave, { onConflict: 'key' });

      if (saveErr) throw saveErr;

      setSuccessMsg("Claves de API e Integraciones guardadas exitosamente.");
      await fetchSecrets();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error("Error saving secrets config:", err);
      setError(err.message || "Ocurrió un error al guardar las claves secretas");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Configuración</h1>
        <p className={styles.subtitle}>Personaliza las reglas de tu negocio, fidelización, imágenes e integraciones de API.</p>
      </div>

      <div className={styles.tabsContainer}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'general' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          General
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'apis' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('apis')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
            <line x1="6" y1="6" x2="6.01" y2="6" />
            <line x1="6" y1="18" x2="6.01" y2="18" />
          </svg>
          APIs e Integraciones
        </button>
      </div>

      {successMsg && (
        <div style={{ color: '#15803d', backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '0.75rem', marginBottom: '2.5rem', border: '1px solid #bbf7d0', fontWeight: 600 }}>
          {successMsg}
        </div>
      )}

      {error && (
        <div style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '0.75rem', marginBottom: '2.5rem', border: '1px solid #fee2e2' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Cargando configuración...</p>
        </div>
      ) : activeTab === 'general' ? (
        <form onSubmit={handleSave} className={styles.form}>
          
          {/* Identidad del Negocio */}
          <div className={styles.cardSection}>
            <div className={styles.sectionHeader}>
              <svg className={styles.sectionIcon} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m2 7 4.41-3.67A2 2 0 0 1 7.7 3h8.6a2 2 0 0 1 1.3.33L22 7" />
                <path d="M4 12V9" />
                <path d="M12 12V9" />
                <path d="M20 12V9" />
                <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
                <path d="M9 12v3a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-3" />
              </svg>
              <h2 className={styles.sectionTitle}>Identidad del Negocio</h2>
            </div>

            <div className={styles.form} style={{ gap: '1.25rem' }}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Nombre de la Empresa</label>
                <div className={styles.inputIconWrapper}>
                  <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Nombre de la Empresa"
                    className={styles.input}
                    value={nombreEmpresa}
                    onChange={(e) => setNombreEmpresa(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Giro del Negocio</label>
                <div className={styles.inputIconWrapper}>
                  <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="22" y1="12" x2="18" y2="12" />
                    <line x1="6" y1="12" x2="2" y2="12" />
                    <line x1="12" y1="6" x2="12" y2="2" />
                    <line x1="12" y1="22" x2="12" y2="18" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Giro del Negocio"
                    className={styles.input}
                    value={giro}
                    onChange={(e) => setGiro(e.target.value)}
                  />
                </div>
              </div>

              {/* Logo de la Empresa */}
              <div className={styles.inputGroup} style={{ marginTop: '0.5rem' }}>
                <label className={styles.inputLabel} style={{ marginBottom: '0.25rem' }}>Logo de la Empresa</label>
                <div className={styles.logoRow}>
                  <div className={styles.logoPreview}>
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview" className={styles.previewImg} />
                    ) : (
                      <div className={styles.noImagePlaceholder}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div>
                    <input
                      type="file"
                      ref={logoInputRef}
                      accept="image/*"
                      onChange={handleLogoChange}
                      style={{ display: "none" }}
                    />
                    <button
                      type="button"
                      className={`${styles.btnAction} ${styles.btnUpload}`}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      Subir Logo
                    </button>
                    {(logoPreview || logoUrl) && (
                      <button
                        type="button"
                        className={`${styles.btnAction} ${styles.btnDelete}`}
                        onClick={handleDeleteLogo}
                        style={{ marginLeft: '0.5rem' }}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Imagen de Portada */}
              <div className={styles.inputGroup} style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label className={styles.inputLabel}>Imagen de Portada</label>
                  <div className={styles.uploadActionsRow} style={{ margin: 0 }}>
                    <input
                      type="file"
                      ref={portadaInputRef}
                      accept="image/*"
                      onChange={handlePortadaChange}
                      style={{ display: "none" }}
                    />
                    <button
                      type="button"
                      className={`${styles.btnAction} ${styles.btnUpload}`}
                      onClick={() => portadaInputRef.current?.click()}
                    >
                      Subir Portada
                    </button>
                    {(portadaPreview || portadaUrl) && (
                      <button
                        type="button"
                        className={`${styles.btnAction} ${styles.btnDelete}`}
                        onClick={handleDeletePortada}
                      >
                        Eliminar Portada
                      </button>
                    )}
                  </div>
                </div>

                <div className={styles.imagePreview}>
                  {portadaPreview ? (
                    <img src={portadaPreview} alt="Portada preview" className={styles.previewImg} />
                  ) : (
                    <div className={styles.noImagePlaceholder}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <span>Sin imagen de portada</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Video de Inicio */}
              <div className={styles.inputGroup} style={{ marginTop: '0.5rem' }}>
                <label className={styles.inputLabel}>Video de Inicio (Obligatorio Horizontal)</label>
                <span className={styles.switchSubtitle} style={{ marginTop: '-0.25rem', marginBottom: '0.25rem' }}>
                  El video debe ser forzosamente horizontal (ej. 1920x1080). Máximo: 250MB.
                </span>

                <div className={styles.videoInfoBox}>
                  <div className={styles.videoIconCircle}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                  <div className={styles.videoDetails}>
                    <span className={styles.videoTitle}>
                      {selectedVideo || videoUrl ? "Video seleccionado" : "Sin video cargado"}
                    </span>
                    <span className={styles.videoMeta}>{videoMetaText}</span>
                  </div>
                  {(selectedVideo || videoUrl) && (
                    <button
                      type="button"
                      className={styles.videoDeleteButton}
                      onClick={handleDeleteVideo}
                      title="Eliminar video"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={videoInputRef}
                  accept="video/*"
                  onChange={handleVideoChange}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  className={`${styles.btnAction} ${styles.btnUpload}`}
                  onClick={() => videoInputRef.current?.click()}
                  style={{ alignSelf: 'flex-start' }}
                >
                  Seleccionar Video Horizontal
                </button>
              </div>

            </div>
          </div>

          {/* Tarjeta de Fidelidad & Recompensas */}
          <div className={styles.cardSection}>
            <div className={styles.sectionHeader}>
              <svg className={styles.sectionIcon} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <h2 className={styles.sectionTitle}>Tarjeta de Fidelidad & Recompensas</h2>
            </div>

            <div className={styles.form}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Número de Estrellas a Completar</label>
                <div className={styles.inputIconWrapper}>
                  <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <input
                    type="number"
                    placeholder="Número de Estrellas a Completar"
                    className={styles.input}
                    value={starsToComplete}
                    onChange={(e) => setStarsToComplete(Number(e.target.value))}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Título del Premio</label>
                <div className={styles.inputIconWrapper}>
                  <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="14" rx="2" ry="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Título del Premio"
                    className={styles.input}
                    value={recompensaTitulo}
                    onChange={(e) => setRecompensaTitulo(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Descripción del Premio</label>
                <div className={styles.inputIconWrapper}>
                  <svg className={styles.inputIcon} style={{ top: '1.2rem' }} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <textarea
                    placeholder="Descripción del Premio"
                    className={`${styles.input} styles.textarea`}
                    style={{ minHeight: '60px', paddingLeft: '2.75rem' }}
                    value={recompensaDesc}
                    onChange={(e) => setRecompensaDesc(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Visibilidad de Precios */}
          <div className={styles.cardSection}>
            <div className={styles.sectionHeader}>
              <svg className={styles.sectionIcon} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <h2 className={styles.sectionTitle}>Visibilidad de Precios (Clientes)</h2>
            </div>

            <p className={styles.switchSubtitle} style={{ marginBottom: '1rem', marginTop: '-0.5rem' }}>
              Personaliza qué precios son visibles para tus clientes en la aplicación principal y en la reserva de citas.
            </p>

            <div className={styles.switchTile}>
              <div className={styles.switchInfo}>
                <span className={styles.switchTitle}>Mostrar Precios de Servicios</span>
                <span className={styles.switchSubtitle}>Permite a los clientes ver los precios de los servicios</span>
              </div>
              <label className={styles.switchWrapper}>
                <input
                  type="checkbox"
                  checked={verPreciosServicios}
                  onChange={(e) => setVerPreciosServicios(e.target.checked)}
                />
                <span className={styles.slider} />
              </label>
            </div>

            <div className={styles.divider} />

            <div className={styles.switchTile}>
              <div className={styles.switchInfo}>
                <span className={styles.switchTitle}>Mostrar Precios de Productos</span>
                <span className={styles.switchSubtitle}>Permite a los clientes ver los precios de los productos</span>
              </div>
              <label className={styles.switchWrapper}>
                <input
                  type="checkbox"
                  checked={verPreciosProductos}
                  onChange={(e) => setVerPreciosProductos(e.target.checked)}
                />
                <span className={styles.slider} />
              </label>
            </div>
          </div>

          {/* Soporte, Políticas y Alertas */}
          <div className={styles.cardSection}>
            <div className={styles.sectionHeader}>
              <svg className={styles.sectionIcon} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <h2 className={styles.sectionTitle}>Soporte, Políticas y Alertas</h2>
            </div>

            <div className={styles.form}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Correo de Notificaciones General (Todas las citas)</label>
                <div className={styles.inputIconWrapper}>
                  <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    className={styles.input}
                    value={correoNotificaciones}
                    onChange={(e) => setCorreoNotificaciones(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Enlace / Contacto de Soporte</label>
                <div className={styles.inputIconWrapper}>
                  <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="https://soporte.com"
                    className={styles.input}
                    value={linkSoporte}
                    onChange={(e) => setLinkSoporte(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Política de Privacidad (Contenido o URL)</label>
                <div className={styles.inputIconWrapper}>
                  <svg className={styles.inputIcon} style={{ top: '1.2rem' }} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <textarea
                    placeholder="URL o texto de políticas de privacidad"
                    className={`${styles.input} styles.textarea`}
                    style={{ minHeight: '60px', paddingLeft: '2.75rem' }}
                    value={politicaPrivacidad}
                    onChange={(e) => setPoliticaPrivacidad(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Controles del Sistema */}
          <div className={styles.cardSection}>
            <div className={styles.sectionHeader}>
              <svg className={styles.sectionIcon} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <h2 className={styles.sectionTitle}>Controles del Sistema</h2>
            </div>

            <div className={styles.switchTile}>
              <div className={styles.switchInfo}>
                <span className={styles.switchTitle}>Permitir Eliminar Cuenta</span>
                <span className={styles.switchSubtitle}>Muestra a los clientes la opción para borrar su cuenta</span>
              </div>
              <label className={styles.switchWrapper}>
                <input
                  type="checkbox"
                  checked={allowDeleteAccount}
                  onChange={(e) => setAllowDeleteAccount(e.target.checked)}
                />
                <span className={styles.slider} />
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className={styles.actionButtons}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar Configuración"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSaveSecrets} className={styles.form}>
          {secretsTableMissing && (
            <div style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fef3c7',
              borderRadius: '1rem',
              padding: '1.5rem',
              marginBottom: '2rem',
              color: '#92400e'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>⚠️</span> Tabla de Secretos No Detectada
              </h3>
              <p style={{ fontSize: '0.875rem', marginBottom: '1rem', lineHeight: '1.4' }}>
                Para poder guardar las claves de API de forma segura en Supabase, debes crear la tabla <strong>"Secrets"</strong>. 
                Copia el siguiente código SQL y ejecútalo en el <strong>SQL Editor</strong> de tu panel de Supabase:
              </p>
              <pre style={{
                backgroundColor: '#fef3c7',
                padding: '1rem',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                overflowX: 'auto',
                fontFamily: 'monospace',
                border: '1px solid #fde68a',
                color: '#78350f',
                marginBottom: '1rem'
              }}>
{`CREATE TABLE public."Secrets" (
    key text PRIMARY KEY,
    value text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public."Secrets" ENABLE ROW LEVEL SECURITY;

-- Ver políticas RLS detalladas en sql/create_secrets_table.sql`}
              </pre>
              <p style={{ fontSize: '0.85rem' }}>
                Una vez ejecutada la sentencia SQL en Supabase, recarga esta pestaña para poder configurar las claves secretas.
              </p>
            </div>
          )}

          {/* Mercado Pago */}
          <div className={styles.cardSection}>
            <div className={styles.sectionHeader}>
              <svg className={styles.sectionIcon} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="12" y1="4" x2="12" y2="20" />
              </svg>
              <h2 className={styles.sectionTitle}>Mercado Pago</h2>
            </div>
            
            <div className={styles.form}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--foreground)' }}>Modo Sandbox (Pruebas)</h3>
              <div className={styles.apiGrid}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Access Token (Pruebas)</label>
                  <div className={styles.inputIconWrapper}>
                    <input
                      type={showMpTestToken ? "text" : "password"}
                      placeholder="TEST-xxxx-xxxx-xxxx"
                      className={styles.input}
                      style={{ paddingLeft: '1rem', paddingRight: '2.5rem' }}
                      value={mpTestAccessToken}
                      onChange={(e) => setMpTestAccessToken(e.target.value)}
                      disabled={secretsTableMissing || saving}
                    />
                    <button
                      type="button"
                      onClick={() => setShowMpTestToken(!showMpTestToken)}
                      style={{ position: 'absolute', right: '1rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {showMpTestToken ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Public Key (Pruebas)</label>
                  <div className={styles.inputIconWrapper}>
                    <input
                      type="text"
                      placeholder="TEST-xxxx-xxxx"
                      className={styles.input}
                      style={{ paddingLeft: '1rem' }}
                      value={mpTestPublicKey}
                      onChange={(e) => setMpTestPublicKey(e.target.value)}
                      disabled={secretsTableMissing || saving}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.divider} />

              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--foreground)' }}>Modo Producción</h3>
              <div className={styles.apiGrid}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Access Token (Producción)</label>
                  <div className={styles.inputIconWrapper}>
                    <input
                      type={showMpProdToken ? "text" : "password"}
                      placeholder="APP_USR-xxxx-xxxx"
                      className={styles.input}
                      style={{ paddingLeft: '1rem', paddingRight: '2.5rem' }}
                      value={mpProdAccessToken}
                      onChange={(e) => setMpProdAccessToken(e.target.value)}
                      disabled={secretsTableMissing || saving}
                    />
                    <button
                      type="button"
                      onClick={() => setShowMpProdToken(!showMpProdToken)}
                      style={{ position: 'absolute', right: '1rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {showMpProdToken ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Public Key (Producción)</label>
                  <div className={styles.inputIconWrapper}>
                    <input
                      type="text"
                      placeholder="APP_USR-xxxx-xxxx"
                      className={styles.input}
                      style={{ paddingLeft: '1rem' }}
                      value={mpProdPublicKey}
                      onChange={(e) => setMpProdPublicKey(e.target.value)}
                      disabled={secretsTableMissing || saving}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stripe */}
          <div className={styles.cardSection}>
            <div className={styles.sectionHeader}>
              <svg className={styles.sectionIcon} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="12" y1="4" x2="12" y2="20" />
              </svg>
              <h2 className={styles.sectionTitle}>Stripe</h2>
            </div>

            <div className={styles.form}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--foreground)' }}>Modo Pruebas (Test)</h3>
              <div className={styles.apiGrid}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Secret Key (Test)</label>
                  <div className={styles.inputIconWrapper}>
                    <input
                      type={showStripeTestSecret ? "text" : "password"}
                      placeholder="sk_test_••••••••"
                      className={styles.input}
                      style={{ paddingLeft: '1rem', paddingRight: '2.5rem' }}
                      value={stripeTestSecretKey}
                      onChange={(e) => setStripeTestSecretKey(e.target.value)}
                      disabled={secretsTableMissing || saving}
                    />
                    <button
                      type="button"
                      onClick={() => setShowStripeTestSecret(!showStripeTestSecret)}
                      style={{ position: 'absolute', right: '1rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {showStripeTestSecret ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Publishable Key (Test)</label>
                  <div className={styles.inputIconWrapper}>
                    <input
                      type="text"
                      placeholder="pk_test_••••••••"
                      className={styles.input}
                      style={{ paddingLeft: '1rem' }}
                      value={stripeTestPublishableKey}
                      onChange={(e) => setStripeTestPublishableKey(e.target.value)}
                      disabled={secretsTableMissing || saving}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.divider} />

              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--foreground)' }}>Modo Producción</h3>
              <div className={styles.apiGrid}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Secret Key (Producción)</label>
                  <div className={styles.inputIconWrapper}>
                    <input
                      type={showStripeProdSecret ? "text" : "password"}
                      placeholder="sk_live_••••••••"
                      className={styles.input}
                      style={{ paddingLeft: '1rem', paddingRight: '2.5rem' }}
                      value={stripeProdSecretKey}
                      onChange={(e) => setStripeProdSecretKey(e.target.value)}
                      disabled={secretsTableMissing || saving}
                    />
                    <button
                      type="button"
                      onClick={() => setShowStripeProdSecret(!showStripeProdSecret)}
                      style={{ position: 'absolute', right: '1rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {showStripeProdSecret ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Publishable Key (Producción)</label>
                  <div className={styles.inputIconWrapper}>
                    <input
                      type="text"
                      placeholder="pk_live_••••••••"
                      className={styles.input}
                      style={{ paddingLeft: '1rem' }}
                      value={stripeProdPublishableKey}
                      onChange={(e) => setStripeProdPublishableKey(e.target.value)}
                      disabled={secretsTableMissing || saving}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* WhatsApp API */}
          <div className={styles.cardSection}>
            <div className={styles.sectionHeader}>
              <svg className={styles.sectionIcon} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              <h2 className={styles.sectionTitle}>WhatsApp Cloud API</h2>
            </div>

            <div className={styles.form}>
              <div className={styles.switchTile} style={{ padding: '0 0 1rem 0' }}>
                <div className={styles.switchInfo}>
                  <span className={styles.switchTitle}>Usar API Preestablecida</span>
                  <span className={styles.switchSubtitle}>Utilizar el número oficial y configuración por defecto de la plataforma</span>
                </div>
                <label className={styles.switchWrapper}>
                  <input
                    type="checkbox"
                    checked={useDefaultWhatsApp}
                    onChange={(e) => setUseDefaultWhatsApp(e.target.checked)}
                    disabled={secretsTableMissing || saving}
                  />
                  <span className={styles.slider} />
                </label>
              </div>

              {useDefaultWhatsApp ? (
                <div style={{
                  backgroundColor: 'rgba(0,0,0,0.03)',
                  border: '1px dashed var(--border)',
                  borderRadius: '0.75rem',
                  padding: '1.25rem',
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '0.5rem',
                  lineHeight: '1.4'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>Utilizando la configuración y número oficial preestablecido de la plataforma para enviar notificaciones de tickets por WhatsApp.</span>
                </div>
              ) : (
                <>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Token de Acceso Permanente</label>
                    <div className={styles.inputIconWrapper}>
                      <input
                        type={showWaToken ? "text" : "password"}
                        placeholder="EAAGxxxxx..."
                        className={styles.input}
                        style={{ paddingLeft: '1rem', paddingRight: '2.5rem' }}
                        value={waToken}
                        onChange={(e) => setWaToken(e.target.value)}
                        disabled={secretsTableMissing || saving}
                      />
                      <button
                        type="button"
                        onClick={() => setShowWaToken(!showWaToken)}
                        style={{ position: 'absolute', right: '1rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        {showWaToken ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>
                  </div>

                  <div className={styles.apiGrid}>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>ID de Teléfono (Phone Number ID)</label>
                      <div className={styles.inputIconWrapper}>
                        <input
                          type="text"
                          placeholder="1098xxxxxxxxxxx"
                          className={styles.input}
                          style={{ paddingLeft: '1rem' }}
                          value={waPhoneNumberId}
                          onChange={(e) => setWaPhoneNumberId(e.target.value)}
                          disabled={secretsTableMissing || saving}
                        />
                      </div>
                    </div>

                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>ID de Cuenta de Negocios (Business Account ID)</label>
                      <div className={styles.inputIconWrapper}>
                        <input
                          type="text"
                          placeholder="1009xxxxxxxxxxx"
                          className={styles.input}
                          style={{ paddingLeft: '1rem' }}
                          value={waBusinessAccountId}
                          onChange={(e) => setWaBusinessAccountId(e.target.value)}
                          disabled={secretsTableMissing || saving}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Resend Email API */}
          <div className={styles.cardSection}>
            <div className={styles.sectionHeader}>
              <svg className={styles.sectionIcon} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <h2 className={styles.sectionTitle}>Resend (Envío de Correos)</h2>
            </div>

            <div className={styles.form}>
              <div className={styles.switchTile} style={{ padding: '0 0 1rem 0' }}>
                <div className={styles.switchInfo}>
                  <span className={styles.switchTitle}>Usar API Preestablecida</span>
                  <span className={styles.switchSubtitle}>Utilizar el correo y dominio oficial preestablecido de la plataforma</span>
                </div>
                <label className={styles.switchWrapper}>
                  <input
                    type="checkbox"
                    checked={useDefaultResend}
                    onChange={(e) => setUseDefaultResend(e.target.checked)}
                    disabled={secretsTableMissing || saving}
                  />
                  <span className={styles.slider} />
                </label>
              </div>

              {useDefaultResend ? (
                <div style={{
                  backgroundColor: 'rgba(0,0,0,0.03)',
                  border: '1px dashed var(--border)',
                  borderRadius: '0.75rem',
                  padding: '1.25rem',
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '0.5rem',
                  lineHeight: '1.4'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>Utilizando el dominio y remitente oficial preestablecido de la plataforma para enviar correos electrónicos y tickets.</span>
                </div>
              ) : (
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Resend API Key</label>
                  <div className={styles.inputIconWrapper}>
                    <input
                      type={showResendKey ? "text" : "password"}
                      placeholder="re_xxxxxxxxxxxxxxxxx"
                      className={styles.input}
                      style={{ paddingLeft: '1rem', paddingRight: '2.5rem' }}
                      value={resendApiKey}
                      onChange={(e) => setResendApiKey(e.target.value)}
                      disabled={secretsTableMissing || saving}
                    />
                    <button
                      type="button"
                      onClick={() => setShowResendKey(!showResendKey)}
                      style={{ position: 'absolute', right: '1rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {showResendKey ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Inteligencia Artificial (AI) */}
          <div className={styles.cardSection}>
            <div className={styles.sectionHeader}>
              <svg className={styles.sectionIcon} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
              <h2 className={styles.sectionTitle}>Motores de Inteligencia Artificial (IA)</h2>
            </div>

            <div className={styles.form}>
              <div className={styles.apiGrid}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Gemini API Key (Google AI)</label>
                  <div className={styles.inputIconWrapper}>
                    <input
                      type={showGeminiKey ? "text" : "password"}
                      placeholder="AIzaSyxxxxxxxxxxxxx"
                      className={styles.input}
                      style={{ paddingLeft: '1rem', paddingRight: '2.5rem' }}
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      disabled={secretsTableMissing || saving}
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      style={{ position: 'absolute', right: '1rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {showGeminiKey ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>ChatGPT API Key (OpenAI)</label>
                  <div className={styles.inputIconWrapper}>
                    <input
                      type={showChatgptKey ? "text" : "password"}
                      placeholder="sk-proj-xxxxxxxxxxxxx"
                      className={styles.input}
                      style={{ paddingLeft: '1rem', paddingRight: '2.5rem' }}
                      value={chatgptApiKey}
                      onChange={(e) => setChatgptApiKey(e.target.value)}
                      disabled={secretsTableMissing || saving}
                    />
                    <button
                      type="button"
                      onClick={() => setShowChatgptKey(!showChatgptKey)}
                      style={{ position: 'absolute', right: '1rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {showChatgptKey ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botón de Guardado */}
          <div className={styles.actionButtons}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={secretsTableMissing || saving}
            >
              {saving ? "Guardando..." : "Guardar Claves de APIs"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
