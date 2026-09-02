import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mock supabase BEFORE any other imports ───────────────────────────────────
vi.mock("../../lib/supabase.js", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: "mock-token",
            user: { email: "test@test.com" },
          },
        },
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

vi.mock("axios");
vi.mock("../../assets/logo.png",         () => ({ default: "logo.png" }));
vi.mock("../../assets/navbar_image_transparent.png", () => ({ default: "navbar.png" }));

import axios from "axios";
import { AuthProvider } from "../../context/AuthContext.jsx";
import { SettingsProvider } from "../../context/SettingsContext.jsx";
import HistoryPage from "../HistoryPage.jsx";

const mockHistoryData = [
  {
    id: 1,
    created_at: "2026-07-20T10:00:00Z",
    location_label: "Juhu Beach, Mumbai",
    total_waste: 5,
    pollution_score: 15,
    severity: "Moderate",
    image_url: "https://example.com/photo1.jpg",
    detections: [{ waste_type: "bottle", count: 3 }],
  },
  {
    id: 2,
    created_at: "2026-07-21T10:00:00Z",
    location_label: "Baga Beach, Goa",
    total_waste: 2,
    pollution_score: 5,
    severity: "low",
    image_url: "https://example.com/photo2.jpg",
    detections: [{ waste_type: "can", count: 2 }],
  },
  {
    id: 3,
    created_at: "2026-07-22T10:00:00Z",
    location_label: "Marina Beach, Chennai",
    total_waste: 12,
    pollution_score: 45,
    severity: "HIGH",
    image_url: "https://example.com/photo3.jpg",
    detections: [{ waste_type: "bag", count: 5 }],
  },
  {
    id: 4,
    created_at: "2026-07-23T10:00:00Z",
    location_label: "Juhu Beach, Mumbai",
    total_waste: 20,
    pollution_score: 85,
    severity: "Severe",
    image_url: "https://example.com/photo4.jpg",
    detections: [{ waste_type: "wrapper", count: 10 }],
  },
];

beforeEach(() => {
  axios.get    = vi.fn().mockResolvedValue({ data: mockHistoryData });
  axios.delete = vi.fn().mockResolvedValue({ data: { message: "Analysis deleted" } });
});

afterEach(() => {
  vi.clearAllMocks();
});

function renderHistoryPage() {
  return render(
    <SettingsProvider><AuthProvider>
      <HistoryPage />
    </AuthProvider></SettingsProvider>
  );
}

async function waitForLoaded() {
  await waitFor(
    () => expect(screen.queryByText(/loading your analyses/i)).not.toBeInTheDocument(),
    { timeout: 5000 }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
describe("HistoryPage — rendering and filtering", () => {
  it("renders History page title and KPI summary stats", async () => {
    renderHistoryPage();
    expect(screen.getByRole("heading", { level: 1, name: /detection history/i })).toBeInTheDocument();
    await waitForLoaded();
    expect(screen.getByText("Detection Sessions")).toBeInTheDocument();
    expect(screen.getByText("Waste Items")).toBeInTheDocument();
    expect(screen.getByText("Avg. Severity Score")).toBeInTheDocument();
    expect(screen.queryByText("Unique Contributors")).not.toBeInTheDocument();
  });

  it("filters analyses correctly when clicking Low severity pill in filters popover", async () => {
    renderHistoryPage();
    await waitForLoaded();

    // Open Filters popover
    fireEvent.click(screen.getByRole("button", { name: /toggle filters/i }));

    fireEvent.click(screen.getByRole("button", { name: /^low/i }));

    expect(screen.getByText(/severity: low/i)).toBeInTheDocument();
    expect(screen.getByText(/1 detection/i)).toBeInTheDocument();
    expect(screen.getAllByText("Baga Beach, Goa").length).toBeGreaterThan(0);
    expect(screen.queryByRole("cell", { name: "Marina Beach, Chennai" })).not.toBeInTheDocument();
  });

  it("filters analyses correctly when clicking High severity pill in filters popover", async () => {
    renderHistoryPage();
    await waitForLoaded();

    // Open Filters popover
    fireEvent.click(screen.getByRole("button", { name: /toggle filters/i }));

    fireEvent.click(screen.getByRole("button", { name: /^high/i }));

    expect(screen.getByText(/severity: high/i)).toBeInTheDocument();
    expect(screen.getAllByText("Marina Beach, Chennai").length).toBeGreaterThan(0);
  });

  it("filters analyses by location search input", async () => {
    renderHistoryPage();
    await waitForLoaded();

    const searchInput = screen.getByPlaceholderText(/search location, waste type, contributor\.\.\./i);
    fireEvent.change(searchInput, { target: { value: "Juhu" } });

    expect(screen.getByText(/2 detections/i)).toBeInTheDocument();
    expect(screen.getAllByText("Juhu Beach, Mumbai").length).toBeGreaterThan(0);
    expect(screen.queryByRole("cell", { name: "Baga Beach, Goa" })).not.toBeInTheDocument();
  });

  it("combines severity pill filter and search input and allows Clear all", async () => {
    renderHistoryPage();
    await waitForLoaded();

    // Open Filters popover
    fireEvent.click(screen.getByRole("button", { name: /toggle filters/i }));

    fireEvent.click(screen.getByRole("button", { name: /^moderate/i }));
    const searchInput = screen.getByPlaceholderText(/search location, waste type, contributor\.\.\./i);
    fireEvent.change(searchInput, { target: { value: "Juhu" } });

    expect(screen.getByText(/1 detection/i)).toBeInTheDocument();

    // Click Clear all
    fireEvent.click(screen.getByRole("button", { name: /clear all/i }));
    expect(screen.queryByText(/active filters:/i)).not.toBeInTheDocument();
  });

  it("filters by categorical waste type dropdown inside popover", async () => {
    renderHistoryPage();
    await waitForLoaded();

    // Open Filters popover
    fireEvent.click(screen.getByRole("button", { name: /toggle filters/i }));

    const wasteSelect = screen.getByLabelText(/filter by waste type/i);
    fireEvent.change(wasteSelect, { target: { value: "bottle" } });

    expect(screen.getByText(/waste: plastic bottle/i)).toBeInTheDocument();
    expect(screen.getAllByText("Juhu Beach, Mumbai").length).toBeGreaterThan(0);
    expect(screen.queryByRole("cell", { name: "Marina Beach, Chennai" })).not.toBeInTheDocument();
  });

  it("displays empty filter state when no matches are found", async () => {
    renderHistoryPage();
    await waitForLoaded();

    const searchInput = screen.getByPlaceholderText(/search location, waste type, contributor\.\.\./i);
    fireEvent.change(searchInput, { target: { value: "NonExistentLocation" } });

    expect(screen.getByText(/0 detections/i)).toBeInTheDocument();
    expect(screen.getAllByText(/no photos match the selected filter/i).length).toBeGreaterThan(0);
  });

  it("shows empty state when API returns no data", async () => {
    axios.get = vi.fn().mockResolvedValue({ data: [] });
    renderHistoryPage();
    await waitForLoaded();

    expect(screen.getByText(/you haven't uploaded any photos yet/i)).toBeInTheDocument();
  });

  it("shows error state when API call fails", async () => {
    axios.get = vi.fn().mockRejectedValue({
      response: { data: { error: "Server error" } },
    });
    renderHistoryPage();
    await waitForLoaded();

    expect(screen.getByText(/server error/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("HistoryPage — delete feature", () => {
  it("shows confirmation modal when delete is requested via gallery", async () => {
    renderHistoryPage();
    await waitForLoaded();

    // Click the delete button on the first gallery card
    const deleteBtns = screen.getAllByRole("button", { name: /delete analysis/i });
    fireEvent.click(deleteBtns[0]);

    expect(screen.getByText(/delete this analysis\?/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it("dismisses modal when Cancel is clicked", async () => {
    renderHistoryPage();
    await waitForLoaded();

    const deleteBtns = screen.getAllByRole("button", { name: /delete analysis/i });
    fireEvent.click(deleteBtns[0]);

    expect(screen.getByText(/delete this analysis\?/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText(/delete this analysis\?/i)).not.toBeInTheDocument();
  });

  it("dismisses modal when backdrop is clicked", async () => {
    renderHistoryPage();
    await waitForLoaded();

    const deleteBtns = screen.getAllByRole("button", { name: /delete analysis/i });
    fireEvent.click(deleteBtns[0]);

    const backdrop = screen.getByTestId("confirm-modal-backdrop");
    fireEvent.click(backdrop);

    expect(screen.queryByText(/delete this analysis\?/i)).not.toBeInTheDocument();
  });

  it("deletes analysis and removes it from the list on confirm", async () => {
    axios.delete = vi.fn().mockResolvedValueOnce({ data: { message: "Analysis deleted", id: "1" } });

    renderHistoryPage();
    await waitForLoaded();

    expect(screen.getAllByText("Juhu Beach, Mumbai").length).toBeGreaterThan(0);

    const deleteBtns = screen.getAllByRole("button", { name: /delete analysis/i });
    fireEvent.click(deleteBtns[0]);

    fireEvent.click(screen.getByRole("button", { name: /yes, delete/i }));

    await waitFor(() => {
      expect(screen.getByText(/analysis deleted successfully/i)).toBeInTheDocument();
    });
    expect(axios.delete).toHaveBeenCalledOnce();
  });

  it("shows error toast when delete fails", async () => {
    axios.delete = vi.fn().mockRejectedValueOnce({
      response: { data: { error: "Delete failed on server" } },
    });

    renderHistoryPage();
    await waitForLoaded();

    const deleteBtns = screen.getAllByRole("button", { name: /delete analysis/i });
    fireEvent.click(deleteBtns[0]);
    fireEvent.click(screen.getByRole("button", { name: /yes, delete/i }));

    await waitFor(() => {
      expect(screen.getByText(/delete failed on server/i)).toBeInTheDocument();
    });
  });
});
