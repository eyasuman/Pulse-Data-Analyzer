import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import { useData } from "@/context/DataContext";
import DashboardScreen from "@/app/(tabs)/index";
import LicenseReviewScreen from "@/app/license-review";
import PaymentReviewScreen from "@/app/payment-review";
import ProviderDetailScreen from "@/app/provider/[id]";
import InstitutesScreen from "@/app/institutes";
import ReviewsScreen from "@/app/reviews";
import TeleradiologyScreen from "@/app/teleradiology";
import BannersScreen from "@/app/banners";
import { createSeededAdminData } from "./fixtures/adminData";

jest.mock("@/context/DataContext", () => ({
  useData: jest.fn(),
}));

const useDataMock = useData as jest.Mock;
const router = useRouter() as unknown as { push: jest.Mock; back: jest.Mock };

function renderAdminScreen(Screen: React.ComponentType, overrides: Record<string, unknown> = {}) {
  const data = { ...createSeededAdminData(), ...overrides };
  useDataMock.mockReturnValue(data);
  render(<Screen />);
  return data;
}

async function confirm(triggerTestId: string, optionTestId: string) {
  fireEvent.press(screen.getByTestId(triggerTestId));
  const option = await screen.findByTestId(optionTestId);
  await act(async () => {
    fireEvent.press(option);
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("seeded admin confirmations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("dashboard stat-card routes", () => {
    it("routes each stat card to its admin destination", () => {
      renderAdminScreen(DashboardScreen);

      fireEvent.press(screen.getByTestId("dashboard-stat-active-providers"));
      fireEvent.press(screen.getByTestId("dashboard-stat-pending-review"));
      fireEvent.press(screen.getByTestId("dashboard-stat-completed-appointments"));
      fireEvent.press(screen.getByTestId("dashboard-stat-platform-revenue"));

      expect(router.push.mock.calls).toEqual([
        ["/(tabs)/providers"],
        ["/license-review"],
        ["/(tabs)/appointments"],
        ["/(tabs)/revenue"],
      ]);
    });

    it("shows a retryable warning when live data is unavailable", async () => {
      const refresh = jest.fn().mockResolvedValue(undefined);
      renderAdminScreen(DashboardScreen, {
        connectionError: "We couldn't load live data. Check your connection and try again.",
        refresh,
      });

      expect(screen.getByTestId("dashboard-connection-warning")).toBeTruthy();
      expect(screen.getByText("Connection issue")).toBeTruthy();

      await act(async () => {
        fireEvent.press(screen.getByTestId("dashboard-retry"));
        await Promise.resolve();
      });

      expect(refresh).toHaveBeenCalledTimes(1);
    });

    it("does not show a connection warning for healthy empty data", () => {
      renderAdminScreen(DashboardScreen, {
        doctors: [],
        appointments: [],
        institutes: [],
        banners: [],
        reviews: [],
        patients: [],
        teleradiologyCases: [],
        connectionError: null,
      });

      expect(screen.queryByTestId("dashboard-connection-warning")).toBeNull();
      expect(screen.getByTestId("dashboard-stat-active-providers")).toBeTruthy();
    });
  });

  describe("license review", () => {
    it("calls approval handler and shows success feedback", async () => {
      const verifyDoctorLicense = jest.fn().mockResolvedValue(undefined);
      renderAdminScreen(LicenseReviewScreen, { verifyDoctorLicense });

      await confirm("license-approve-doctor-1", "action-modal-option-approve");

      await waitFor(() => expect(verifyDoctorLicense).toHaveBeenCalledWith("doctor-1", true));
      expect(await screen.findByText("Dr. Maya Chen has been activated as a provider.")).toBeTruthy();
    });

    it("shows error feedback when approval fails", async () => {
      const verifyDoctorLicense = jest.fn().mockRejectedValue(new Error("License service unavailable"));
      renderAdminScreen(LicenseReviewScreen, { verifyDoctorLicense });

      await confirm("license-approve-doctor-1", "action-modal-option-approve");

      expect(await screen.findByText("License service unavailable")).toBeTruthy();
    });
  });

  describe("payment review", () => {
    it("calls verification handler and shows success feedback", async () => {
      const updatePaymentStatus = jest.fn().mockResolvedValue(undefined);
      renderAdminScreen(PaymentReviewScreen, { updatePaymentStatus });

      await confirm("payment-verify-appointment-1", "action-modal-option-verify");

      await waitFor(() => expect(updatePaymentStatus).toHaveBeenCalledWith("appointment-1", "verified"));
      expect(await screen.findByText("Payment for Layla Hassan has been verified.")).toBeTruthy();
    });

    it("shows error feedback when verification fails", async () => {
      const updatePaymentStatus = jest.fn().mockRejectedValue(new Error("Payment gateway unavailable"));
      renderAdminScreen(PaymentReviewScreen, { updatePaymentStatus });

      await confirm("payment-verify-appointment-1", "action-modal-option-verify");

      expect(await screen.findByText("Payment gateway unavailable")).toBeTruthy();
    });
  });

  describe("provider status", () => {
    it("calls status handler and shows success feedback", async () => {
      const updateDoctorStatus = jest.fn().mockResolvedValue(undefined);
      renderAdminScreen(ProviderDetailScreen, { updateDoctorStatus });

      await confirm("provider-status-disabled", "action-modal-option-confirm");

      await waitFor(() => expect(updateDoctorStatus).toHaveBeenCalledWith("doctor-1", "Disabled"));
      expect(await screen.findByText("Provider status set to Disabled.")).toBeTruthy();
    });

    it("shows error feedback when status update fails", async () => {
      const updateDoctorStatus = jest.fn().mockRejectedValue(new Error("Provider update unavailable"));
      renderAdminScreen(ProviderDetailScreen, { updateDoctorStatus });

      await confirm("provider-status-disabled", "action-modal-option-confirm");

      expect(await screen.findByText("Provider update unavailable")).toBeTruthy();
    });
  });

  describe("institute status", () => {
    it("calls status handler and shows success feedback", async () => {
      const updateInstituteStatus = jest.fn().mockResolvedValue(undefined);
      renderAdminScreen(InstitutesScreen, { updateInstituteStatus });

      await confirm("institute-status-menu-institute-1", "action-modal-option-suspended");

      await waitFor(() => expect(updateInstituteStatus).toHaveBeenCalledWith("institute-1", "Suspended"));
      expect(await screen.findByText("Institute status set to Suspended.")).toBeTruthy();
    });

    it("shows error feedback when status update fails", async () => {
      const updateInstituteStatus = jest.fn().mockRejectedValue(new Error("Institute update unavailable"));
      renderAdminScreen(InstitutesScreen, { updateInstituteStatus });

      await confirm("institute-status-menu-institute-1", "action-modal-option-suspended");

      expect(await screen.findByText("Institute update unavailable")).toBeTruthy();
    });
  });

  describe("review status", () => {
    it("calls status handler and shows success feedback", async () => {
      const updateReviewStatus = jest.fn().mockResolvedValue(undefined);
      renderAdminScreen(ReviewsScreen, { updateReviewStatus });

      await confirm("review-status-menu-review-1", "action-modal-option-pinned");

      await waitFor(() => expect(updateReviewStatus).toHaveBeenCalledWith("review-1", "pinned"));
      expect(await screen.findByText("Review status set to pinned.")).toBeTruthy();
    });

    it("shows error feedback when status update fails", async () => {
      const updateReviewStatus = jest.fn().mockRejectedValue(new Error("Review update unavailable"));
      renderAdminScreen(ReviewsScreen, { updateReviewStatus });

      await confirm("review-status-menu-review-1", "action-modal-option-pinned");

      expect(await screen.findByText("Review update unavailable")).toBeTruthy();
    });
  });

  describe("teleradiology status", () => {
    it("calls status handler and shows success feedback", async () => {
      const updateCaseStatus = jest.fn().mockResolvedValue(undefined);
      renderAdminScreen(TeleradiologyScreen, { updateCaseStatus });

      await confirm("teleradiology-status-menu-case-1", "action-modal-option-completed");

      await waitFor(() => expect(updateCaseStatus).toHaveBeenCalledWith("case-1", "completed"));
      expect(await screen.findByText("Case status set to completed.")).toBeTruthy();
    });

    it("shows error feedback when status update fails", async () => {
      const updateCaseStatus = jest.fn().mockRejectedValue(new Error("Radiology update unavailable"));
      renderAdminScreen(TeleradiologyScreen, { updateCaseStatus });

      await confirm("teleradiology-status-menu-case-1", "action-modal-option-completed");

      expect(await screen.findByText("Radiology update unavailable")).toBeTruthy();
    });
  });

  describe("banner deletion", () => {
    it("calls delete handler and shows success feedback", async () => {
      const deleteBanner = jest.fn().mockResolvedValue(undefined);
      renderAdminScreen(BannersScreen, { deleteBanner });

      await confirm("banner-delete-banner-1", "action-modal-option-delete");

      await waitFor(() => expect(deleteBanner).toHaveBeenCalledWith("banner-1"));
      expect(await screen.findByText('"Summer health check" has been deleted.')).toBeTruthy();
    });

    it("shows error feedback when deletion fails", async () => {
      const deleteBanner = jest.fn().mockRejectedValue(new Error("Banner deletion unavailable"));
      renderAdminScreen(BannersScreen, { deleteBanner });

      await confirm("banner-delete-banner-1", "action-modal-option-delete");

      expect(await screen.findByText("Banner deletion unavailable")).toBeTruthy();
    });
  });
});