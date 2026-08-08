import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";

vi.mock("axios");
vi.mock("../../lib/supabase.js", () => ({
  supabase: {
    auth: {
      getSession:        vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

import { supabase } from "../../lib/supabase.js";
import { AuthProvider } from "../../context/AuthContext.jsx";
import { StatsProvider } from "../../context/StatsContext.jsx";
import { SettingsProvider } from "../../context/SettingsContext.jsx";
import UploadPage from "../UploadPage.jsx";

function renderUploadPage({ user = null } = {}) {
  if (user) {
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { user } },
    });
  }
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <AuthProvider>
          <StatsProvider>
            <UploadPage />
          </StatsProvider>
        </AuthProvider>
      </SettingsProvider>
    </MemoryRouter>
  );
}

describe("UploadPage component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    axios.get.mockResolvedValue({
      data: {
        activeModel: "yolov8m",
        activeModelDetails: { id: "yolov8m", name: "YOLOv8 Medium", tag: "Baseline", badge: "Default" },
        availableModels: [
          { id: "yolov8m", name: "YOLOv8 Medium", tag: "Baseline", params: "25.9M" },
          { id: "yolov11m", name: "YOLOv11 Medium", tag: "Precision", params: "20.1M" },
          { id: "yolov26s", name: "YOLOv26 Small", tag: "Fast", params: "9.6M" },
        ],
      },
    });
  });

  it("renders page title and upload placeholder card", async () => {
    renderUploadPage();
    await vi.waitFor(() => {
      expect(screen.getByRole("heading", { name: /detect waste/i })).toBeInTheDocument();
    });
    expect(screen.getByText("Upload & Detection View")).toBeInTheDocument();
    expect(screen.getByText("Detection Result & Analytics")).toBeInTheDocument();
    expect(screen.getByText(/Your analysis breakdown and charts will appear here/i)).toBeInTheDocument();
  });

  it("allows Admin to switch active AI model globally", async () => {
    const adminUser = { id: "admin-1", email: import.meta.env.VITE_ADMIN_EMAIL || "admin@littora.app" };
    axios.post.mockResolvedValueOnce({
      data: {
        activeModel: "yolov11m",
        activeModelDetails: { id: "yolov11m", name: "YOLOv11 Medium", tag: "Precision", badge: "High Precision" },
      },
    });

    renderUploadPage({ user: adminUser });
    await vi.waitFor(() => screen.getByText("System Admin Control:"));

    const btn = screen.getByRole("button", { name: /YOLOv11 Medium/i });
    fireEvent.click(btn);

    await vi.waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/api/model"),
        { modelId: "yolov11m" },
        expect.any(Object)
      );
    });
  });

  it("opens AuthRequiredModal when unauthenticated guest attempts to upload file", async () => {
    const { container } = renderUploadPage(); // guest
    await vi.waitFor(() => screen.getByRole("heading", { name: /detect waste/i }));

    const file = new File(["dummy content"], "beach.png", { type: "image/png" });
    const input = container.querySelector("input[type='file']");
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: /analyze photo/i }));

    expect(screen.getByText("Sign In Required")).toBeInTheDocument();
    expect(screen.getByText(/run AI waste detection on beach photos/i)).toBeInTheDocument();
  });

  it("successfully posts image payload and renders ResultPanel when logged in", async () => {
    const mockResult = {
      total_waste: 4,
      pollution_score: 55,
      severity: "Moderate",
      model_name: "YOLOv8 Medium",
      latitude: 19.07,
      longitude: 72.87,
      location_label: "Juhu Beach",
      detections: { bottle: 2, can: 2 },
      boxes: [],
    };
    axios.post.mockResolvedValueOnce({ data: mockResult });

    const { container } = renderUploadPage({ user: { id: "u-auth", email: "auth@example.com" } });
    await vi.waitFor(() => screen.getByRole("heading", { name: /detect waste/i }));

    const file = new File(["dummy image"], "clean.png", { type: "image/png" });
    const input = container.querySelector("input[type='file']");
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: /analyze photo/i }));

    await vi.waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
      expect(screen.getByText("Total waste")).toBeInTheDocument();
      expect(screen.getByText("Moderate")).toBeInTheDocument();
    });
  });

  it("renders error alert message when backend analysis request fails", async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { error: "AI model failed to process image" } },
    });

    const { container } = renderUploadPage({ user: { id: "u-auth", email: "auth@example.com" } });
    await vi.waitFor(() => screen.getByRole("heading", { name: /detect waste/i }));

    const file = new File(["broken image"], "bad.png", { type: "image/png" });
    const input = container.querySelector("input[type='file']");
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: /analyze photo/i }));

    await vi.waitFor(() => {
      expect(screen.getByText(/AI model failed to process image/i)).toBeInTheDocument();
    });
  });
});
