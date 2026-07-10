import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type DoctorStatus = "Pending" | "Active" | "Disabled" | "Declined";
export type ProviderType = "Doctor" | "Nurse" | "Home Care" | "Physiotherapist" | "Healthcare Facility";
export type AppointmentStatus = "pending" | "scheduled" | "completed" | "cancelled" | "declined";

export interface Doctor {
  id: string;
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

export type BannerType = "image" | "promo" | "alert" | "info";
export interface Banner {
  id: string;
  title: string;
  message: string;
  type: BannerType;
  isActive: boolean;
  priority: number;
  promoCode?: string;
  linkUrl?: string;
  displayDuration: number;
  targetAudience: "All" | "Patients" | "Providers";
  createdAt: string;
  expiresAt?: string;
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

function getApiBase(): string {
  if (typeof window !== "undefined" && window.location?.hostname) {
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") {
      return "http://localhost/api";
    }
    const apiHost = h.replace(".expo.janeway.replit.dev", ".janeway.replit.dev");
    return `https://${apiHost}/api`;
  }
  return process.env["EXPO_PUBLIC_API_URL"] ?? "http://localhost/api";
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
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
  updateDoctorStatus: (id: string, status: DoctorStatus) => Promise<void>;
  addInstitute: (data: Omit<Institute, "id" | "createdAt">) => Promise<void>;
  updateInstituteStatus: (id: string, status: InstituteStatus) => Promise<void>;
  addBanner: (data: Omit<Banner, "id" | "createdAt">) => Promise<void>;
  toggleBanner: (id: string) => Promise<void>;
  deleteBanner: (id: string) => Promise<void>;
  updateReviewStatus: (id: string, status: ReviewStatus) => Promise<void>;
  togglePatientStatus: (id: string) => Promise<void>;
  updateCaseStatus: (id: string, status: TeleradiologyCase["status"]) => Promise<void>;
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

  const refresh = useCallback(async () => {
    try {
      const [
        doctorsData,
        appointmentsData,
        revenueData,
        institutesData,
        bannersData,
        reviewsData,
        patientsData,
        auditData,
        teleData,
        settingsData,
      ] = await Promise.all([
        apiFetch<Doctor[]>("/providers"),
        apiFetch<Appointment[]>("/appointments"),
        apiFetch<RevenueEntry[]>("/revenue"),
        apiFetch<Institute[]>("/institutes"),
        apiFetch<Banner[]>("/banners"),
        apiFetch<Review[]>("/reviews"),
        apiFetch<Patient[]>("/patients"),
        apiFetch<AuditLog[]>("/audit"),
        apiFetch<TeleradiologyCase[]>("/teleradiology"),
        apiFetch<PlatformSettings>("/settings"),
      ]);
      setDoctors(doctorsData);
      setAppointments(appointmentsData);
      setRevenue(revenueData);
      setInstitutes(institutesData);
      setBanners(bannersData);
      setReviews(reviewsData);
      setPatients(patientsData);
      setAuditLogs(auditData);
      setTeleradiologyCases(teleData);
      const { id: _id, ...settingsOnly } = settingsData as any;
      setSettings(settingsOnly);
    } catch (err) {
      console.error("DataContext refresh failed:", err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await refresh();
      setIsLoading(false);
    })();
  }, [refresh]);

  const updateDoctorStatus = async (id: string, status: DoctorStatus) => {
    const updated = await apiFetch<Doctor>(`/providers/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setDoctors((prev) => prev.map((d) => (d.id === id ? updated : d)));
  };

  const addInstitute = async (data: Omit<Institute, "id" | "createdAt">) => {
    const created = await apiFetch<Institute>("/institutes", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setInstitutes((prev) => [created, ...prev]);
  };

  const updateInstituteStatus = async (id: string, status: InstituteStatus) => {
    const updated = await apiFetch<Institute>(`/institutes/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setInstitutes((prev) => prev.map((i) => (i.id === id ? updated : i)));
  };

  const addBanner = async (data: Omit<Banner, "id" | "createdAt">) => {
    const created = await apiFetch<Banner>("/banners", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setBanners((prev) => [...prev, created]);
  };

  const toggleBanner = async (id: string) => {
    const updated = await apiFetch<Banner>(`/banners/${id}/toggle`, {
      method: "PATCH",
    });
    setBanners((prev) => prev.map((b) => (b.id === id ? updated : b)));
  };

  const deleteBanner = async (id: string) => {
    await apiFetch(`/banners/${id}`, { method: "DELETE" });
    setBanners((prev) => prev.filter((b) => b.id !== id));
  };

  const updateReviewStatus = async (id: string, status: ReviewStatus) => {
    const updated = await apiFetch<Review>(`/reviews/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
  };

  const togglePatientStatus = async (id: string) => {
    const updated = await apiFetch<Patient>(`/patients/${id}/toggle`, {
      method: "PATCH",
    });
    setPatients((prev) => prev.map((p) => (p.id === id ? updated : p)));
  };

  const updateCaseStatus = async (id: string, status: TeleradiologyCase["status"]) => {
    const updated = await apiFetch<TeleradiologyCase>(`/teleradiology/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setTeleradiologyCases((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  const updateSettings = async (s: PlatformSettings) => {
    const updated = await apiFetch<PlatformSettings>("/settings", {
      method: "PUT",
      body: JSON.stringify(s),
    });
    const { id: _id, ...settingsData } = updated as any;
    setSettings(settingsData);
  };

  const changeGatewayPassword = async (newPassword: string) => {
    await apiFetch("/settings/gateway-password", {
      method: "PATCH",
      body: JSON.stringify({ password: newPassword }),
    });
    setSettings((prev) => ({ ...prev, gatewayPassword: newPassword }));
  };

  return (
    <DataContext.Provider
      value={{
        doctors, appointments, revenue, institutes, banners, reviews,
        patients, auditLogs, teleradiologyCases, settings,
        updateDoctorStatus, addInstitute, updateInstituteStatus,
        addBanner, toggleBanner, deleteBanner,
        updateReviewStatus, togglePatientStatus, updateCaseStatus, updateSettings,
        changeGatewayPassword, isLoading, refresh,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
