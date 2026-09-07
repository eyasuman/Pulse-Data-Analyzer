import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Platform } from "react-native";

export type DoctorStatus = "Pending" | "Active" | "Disabled" | "Declined";
export type ProviderType = "Doctor" | "Nurse" | "Home Care" | "Physiotherapist" | "Healthcare Facility";
export type AppointmentStatus = "pending" | "scheduled" | "completed" | "cancelled" | "declined";
export type PaymentStatus = "pending" | "verified" | "rejected";

export interface LicenseFile {
  path: string;
  name: string;
  type: string;
  size?: number;
}

export interface Doctor {
  id: string;
  userId?: string;
  name: string;
  category: string;
  providerType?: string;
  specialty: string;
  status: DoctorStatus;
  email: string;
  phone?: string;
  city?: string;
  consultationFee: number;
  experienceYears?: number;
  licenseNo: string;
  licenseFile?: LicenseFile | null;
  avatarUrl?: string;
  bio?: string;
  serviceModes: { video: boolean; audio: boolean; inPerson: boolean; homeVisit: boolean };
  createdAt: string;
}

export interface Appointment {
  id: string;
  doctorName: string;
  patientName: string;
  specialty: string;
  status: AppointmentStatus;
  consultationFee: number;
  platformFee: number;
  totalPrice: number;
  date: string;
  serviceType: string;
  // Payment proof fields (from PULSE Supabase schema)
  paymentStatus?: PaymentStatus | null;
  paymentProofUrl?: string | null;
  transactionId?: string | null;
  senderName?: string | null;
  paymentMethod?: string | null;
  createdAt: string;
}

export interface RevenueEntry {
  month: string;
  revenue: number;
  appointments: number;
}

export type InstituteStatus = "Active" | "Pending" | "Suspended";
export type InstituteType = "Hospital" | "Clinic" | "Diagnostic Center" | "Pharmacy" | "Rehabilitation" | "Dental" | "Specialty Center";

export interface Institute {
  id: string;
  name: string;
  type: InstituteType;
  status: InstituteStatus;
  city: string;
  address: string;
  phone: string;
  email: string;
  licenseNo: string;
  totalDoctors: number;
  totalBeds?: number;
  services: string[];
  accreditations?: string[];
  createdAt: string;
}

// Banner schema matches public.banners in PULSE Supabase
export interface Banner {
  id: string;
  title: string;
  message: string;
  /** Defaults to 'photo' in DB */
  type: string;
  isActive: boolean;
  /** Higher priority = shown first (sorted DESC) */
  priority: number;
  promoCode?: string | null;
  /** Public URL of banner image in `banners` storage bucket */
  imageUrl?: string | null;
  videoUrl?: string | null;
  linkUrl?: string | null;
  displayDuration: number;
  createdAt: string;
}

export type ReviewStatus = "visible" | "pinned" | "banned" | "shadow_banned";
export interface Review {
  id: string;
  doctorId: string;
  doctorName: string;
  patientName: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  createdAt: string;
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  status: "active" | "suspended";
  totalAppointments: number;
  createdAt: string;
  manageable?: boolean;
}

export interface AuditLog {
  id: string;
  actorName: string;
  action: string;
  objectType: string;
  type: "User" | "Admin" | "System";
  timestamp: string;
}

export interface TeleradiologyCase {
  id: string;
  caseId: string;
  patientName: string;
  radiologistName?: string;
  modality: string;
  bodyPart: string;
  status: "pending" | "in-review" | "completed" | "urgent";
  priority?: string;
  notes?: string;
  createdAt: string;
}

export interface PlatformSettings {
  platformFee: number;
  cancellationNoticePeriodHours: number;
  cancellationPenaltyFee: number;
  reminderCadence: "weekly" | "daily" | "same-day";
  gatewayPassword: string;
  inactivityTimeoutMinutes: number;
}

export type DataResource =
  | "providers"
  | "appointments"
  | "revenue"
  | "institutes"
  | "banners"
  | "reviews"
  | "patients"
  | "audit"
  | "teleradiology"
  | "settings";

export type DataResourceErrors = Record<DataResource, string | null>;

// ─── API fetch ────────────────────────────────────────────────────────────────

function getApiBase(): string {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.hostname) {
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") return "http://localhost/api";
    const apiHost = h.replace(".expo.janeway.replit.dev", ".janeway.replit.dev");
    return `https://${apiHost}/api`;
  }
  // Expo statically inlines EXPO_PUBLIC_* variables only when accessed with
  // dot notation. Bracket notation leaves production native builds without
  // an API URL, causing every request to fail before reaching the server.
  const explicitApiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (explicitApiUrl) return explicitApiUrl.replace(/\/$/, "");
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain.replace(/^https?:\/\//, "").replace(/\/$/, "")}/api`;
  throw new Error("Production API URL is not configured for this build.");
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = getApiBase();
  const res = await fetch(`${base}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

interface SafeApiResult<T> {
  data: T;
  error: unknown | null;
}

async function safeApiFetch<T>(path: string, fallback: T): Promise<SafeApiResult<T>> {
  try {
    return { data: await apiFetch<T>(path), error: null };
  } catch (error) {
    console.warn(`API resource ${path} is unavailable:`, error);
    return { data: fallback, error };
  }
}

// ─── Context value ────────────────────────────────────────────────────────────

interface DataContextValue {
  doctors: Doctor[];
  appointments: Appointment[];
  revenue: RevenueEntry[];
  institutes: Institute[];
  banners: Banner[];
  reviews: Review[];
  patients: Patient[];
  auditLogs: AuditLog[];
  teleradiologyCases: TeleradiologyCase[];
  settings: PlatformSettings;
  isLoading: boolean;
  connectionError: string | null;
  connectionErrors: DataResourceErrors;

  // Providers
  updateDoctorStatus: (id: string, status: DoctorStatus) => Promise<void>;
  /** Approve (true) or reject (false) a doctor's uploaded license */
  verifyDoctorLicense: (id: string, approved: boolean) => Promise<void>;
  /** Get a short-lived signed URL for a doctor's private license file */
  getDoctorLicenseUrl: (id: string) => Promise<{
    signedUrl: string;
    fileName: string;
    mimeType?: string;
    size?: number;
  }>;

  // Institutes
  addInstitute: (data: Omit<Institute, "id" | "createdAt">) => Promise<void>;
  updateInstituteStatus: (id: string, status: InstituteStatus) => Promise<void>;

  // Banners
  addBanner: (data: Omit<Banner, "id" | "createdAt">) => Promise<void>;
  toggleBanner: (id: string) => Promise<void>;
  deleteBanner: (id: string) => Promise<void>;
  /** Upload a banner image (base64) to the `banners` storage bucket. Returns public imageUrl. */
  uploadBannerImage: (base64: string, contentType: string, ext: string) => Promise<string>;

  // Reviews
  updateReviewStatus: (id: string, status: ReviewStatus) => Promise<void>;

  // Patients
  togglePatientStatus: (id: string) => Promise<void>;

  // Appointments — payment proof
  /** Set paymentStatus to 'verified' or 'rejected' */
  updatePaymentStatus: (id: string, paymentStatus: PaymentStatus) => Promise<void>;

  // Teleradiology
  updateCaseStatus: (id: string, status: TeleradiologyCase["status"]) => Promise<void>;

  // Settings
  updateSettings: (s: PlatformSettings) => Promise<void>;
  changeGatewayPassword: (newPassword: string) => Promise<void>;

  refresh: () => Promise<void>;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  platformFee: 10,
  cancellationNoticePeriodHours: 24,
  cancellationPenaltyFee: 50,
  reminderCadence: "daily",
  gatewayPassword: "0000",
  inactivityTimeoutMinutes: 5,
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [revenue, setRevenue] = useState<RevenueEntry[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [teleradiologyCases, setTeleradiologyCases] = useState<TeleradiologyCase[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionErrors, setConnectionErrors] = useState<DataResourceErrors>({
    providers: null,
    appointments: null,
    revenue: null,
    institutes: null,
    banners: null,
    reviews: null,
    patients: null,
    audit: null,
    teleradiology: null,
    settings: null,
  });

  const refresh = useCallback(async () => {
    const [
      doctorsResult, appointmentsResult, revenueResult, institutesResult,
      bannersResult, reviewsResult, patientsResult, auditResult, teleResult, settingsResult,
    ] = await Promise.all([
      safeApiFetch<Doctor[]>("/providers", []),
      safeApiFetch<Appointment[]>("/appointments", []),
      safeApiFetch<RevenueEntry[]>("/revenue", []),
      safeApiFetch<Institute[]>("/institutes", []),
      safeApiFetch<Banner[]>("/banners", []),
      safeApiFetch<Review[]>("/reviews", []),
      safeApiFetch<Patient[]>("/patients", []),
      safeApiFetch<AuditLog[]>("/audit", []),
      safeApiFetch<TeleradiologyCase[]>("/teleradiology", []),
      safeApiFetch<PlatformSettings>("/settings", DEFAULT_SETTINGS),
    ]);

    const results = [
      doctorsResult, appointmentsResult, revenueResult, institutesResult,
      bannersResult, reviewsResult, patientsResult, auditResult, teleResult, settingsResult,
    ];
    const errorMessage = "We couldn't load live data. Check your connection and try again.";
    const nextConnectionErrors: DataResourceErrors = {
      providers: doctorsResult.error ? errorMessage : null,
      appointments: appointmentsResult.error ? errorMessage : null,
      revenue: revenueResult.error ? errorMessage : null,
      institutes: institutesResult.error ? errorMessage : null,
      banners: bannersResult.error ? errorMessage : null,
      reviews: reviewsResult.error ? errorMessage : null,
      patients: patientsResult.error ? errorMessage : null,
      audit: auditResult.error ? errorMessage : null,
      teleradiology: teleResult.error ? errorMessage : null,
      settings: settingsResult.error ? errorMessage : null,
    };
    setConnectionErrors(nextConnectionErrors);
    setConnectionError(
      results.some((result) => result.error)
        ? errorMessage
        : null,
    );

    setDoctors(doctorsResult.data);
    setAppointments(appointmentsResult.data);
    setRevenue(revenueResult.data);
    setInstitutes(institutesResult.data);
    setBanners(bannersResult.data);
    setReviews(reviewsResult.data);
    setPatients(patientsResult.data);
    setAuditLogs(auditResult.data);
    setTeleradiologyCases(teleResult.data);
    const { id: _id, ...settingsOnly } = settingsResult.data as PlatformSettings & { id?: string };
    setSettings(settingsOnly);
  }, []);

  useEffect(() => {
    (async () => { setIsLoading(true); await refresh(); setIsLoading(false); })();
  }, [refresh]);

  // ── Providers ──────────────────────────────────────────────────────────────

  const updateDoctorStatus = async (id: string, status: DoctorStatus) => {
    const updated = await apiFetch<Doctor>(`/providers/${id}/status`, {
      method: "PATCH", body: JSON.stringify({ status }),
    });
    setDoctors((prev) => prev.map((d) => (d.id === id ? updated : d)));
  };

  const verifyDoctorLicense = async (id: string, approved: boolean) => {
    const updated = await apiFetch<Doctor>(`/providers/${id}/verify`, {
      method: "PATCH", body: JSON.stringify({ approved }),
    });
    setDoctors((prev) => prev.map((d) => (d.id === id ? updated : d)));
  };

  const getDoctorLicenseUrl = async (id: string) => {
    return apiFetch<{
      signedUrl: string;
      fileName: string;
      mimeType?: string;
      size?: number;
    }>(`/providers/${id}/license-url`);
  };

  // ── Institutes ─────────────────────────────────────────────────────────────

  const addInstitute = async (data: Omit<Institute, "id" | "createdAt">) => {
    const created = await apiFetch<Institute>("/institutes", {
      method: "POST", body: JSON.stringify(data),
    });
    setInstitutes((prev) => [created, ...prev]);
  };

  const updateInstituteStatus = async (id: string, status: InstituteStatus) => {
    const updated = await apiFetch<Institute>(`/institutes/${id}/status`, {
      method: "PATCH", body: JSON.stringify({ status }),
    });
    setInstitutes((prev) => prev.map((i) => (i.id === id ? updated : i)));
  };

  // ── Banners ────────────────────────────────────────────────────────────────

  const addBanner = async (data: Omit<Banner, "id" | "createdAt">) => {
    const created = await apiFetch<Banner>("/banners", {
      method: "POST", body: JSON.stringify(data),
    });
    setBanners((prev) => [created, ...prev]);
  };

  const toggleBanner = async (id: string) => {
    const updated = await apiFetch<Banner>(`/banners/${id}/toggle`, { method: "PATCH" });
    setBanners((prev) => prev.map((b) => (b.id === id ? updated : b)));
  };

  const deleteBanner = async (id: string) => {
    await apiFetch(`/banners/${id}`, { method: "DELETE" });
    setBanners((prev) => prev.filter((b) => b.id !== id));
  };

  const uploadBannerImage = async (base64: string, contentType: string, ext: string): Promise<string> => {
    const result = await apiFetch<{ imageUrl: string }>("/banners/upload-image", {
      method: "POST", body: JSON.stringify({ base64, contentType, ext }),
    });
    return result.imageUrl;
  };

  // ── Reviews ────────────────────────────────────────────────────────────────

  const updateReviewStatus = async (id: string, status: ReviewStatus) => {
    const updated = await apiFetch<Review>(`/reviews/${id}/status`, {
      method: "PATCH", body: JSON.stringify({ status }),
    });
    setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
  };

  // ── Patients ───────────────────────────────────────────────────────────────

  const togglePatientStatus = async (id: string) => {
    const updated = await apiFetch<Patient>(`/patients/${id}/toggle`, { method: "PATCH" });
    setPatients((prev) => prev.map((p) => (p.id === id ? updated : p)));
  };

  // ── Appointments — payment proof ───────────────────────────────────────────

  const updatePaymentStatus = async (id: string, paymentStatus: PaymentStatus) => {
    const updated = await apiFetch<Appointment>(`/appointments/${id}/payment-status`, {
      method: "PATCH", body: JSON.stringify({ paymentStatus }),
    });
    setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
  };

  // ── Teleradiology ──────────────────────────────────────────────────────────

  const updateCaseStatus = async (id: string, status: TeleradiologyCase["status"]) => {
    const updated = await apiFetch<TeleradiologyCase>(`/teleradiology/${id}/status`, {
      method: "PATCH", body: JSON.stringify({ status }),
    });
    setTeleradiologyCases((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  // ── Settings ───────────────────────────────────────────────────────────────

  const updateSettings = async (s: PlatformSettings) => {
    const updated = await apiFetch<PlatformSettings>("/settings", {
      method: "PUT", body: JSON.stringify(s),
    });
    const { id: _id, ...settingsData } = updated as any;
    setSettings(settingsData);
  };

  const changeGatewayPassword = async (newPassword: string) => {
    await apiFetch("/settings/gateway-password", {
      method: "PATCH", body: JSON.stringify({ password: newPassword }),
    });
    setSettings((prev) => ({ ...prev, gatewayPassword: newPassword }));
  };

  return (
    <DataContext.Provider value={{
      doctors, appointments, revenue, institutes, banners, reviews,
      patients, auditLogs, teleradiologyCases, settings, isLoading, connectionError,
      connectionErrors,
      updateDoctorStatus, verifyDoctorLicense, getDoctorLicenseUrl,
      addInstitute, updateInstituteStatus,
      addBanner, toggleBanner, deleteBanner, uploadBannerImage,
      updateReviewStatus, togglePatientStatus, updatePaymentStatus,
      updateCaseStatus, updateSettings, changeGatewayPassword, refresh,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
