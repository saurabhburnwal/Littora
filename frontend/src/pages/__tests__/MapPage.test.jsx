import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../lib/supabase.js", () => ({
  supabase: {
    auth: {
      getSession:        vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

// Mock leaflet components to prevent canvas/DOM errors in test runner
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  CircleMarker: ({ children }) => <div data-testid="circle-marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  useMap: () => ({ setView: vi.fn(), fitBounds: vi.fn() }),
}));

import { supabase } from "../../lib/supabase.js";
import { AuthProvider } from "../../context/AuthContext.jsx";
import { StatsContext } from "../../context/StatsContext.jsx";
import { SettingsProvider } from "../../context/SettingsContext.jsx";
import MapPage from "../MapPage.jsx";

const mockLocations = [
  { id: "1", location_label: "Puri Beach, Odisha", severity: "Low", latitude: 19.7983, longitude: 85.8249, total_waste: 2, pollution_score: 10, created_at: new Date().toISOString() },
  { id: "2", location_label: "Marina Beach, Chennai", severity: "moderate", latitude: 13.0499, longitude: 80.2824, total_waste: 5, pollution_score: 45, created_at: new Date().toISOString() },
  { id: "3", location_label: "Malpe Beach, Udupi", severity: "High", latitude: 13.3497, longitude: 74.7042, total_waste: 8, pollution_score: 75, created_at: new Date().toISOString() },
];

function renderMapWithStats(statsOverride = { locations: mockLocations }) {
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <AuthProvider>
          <StatsContext.Provider value={{ stats: statsOverride, loading: false, fetchStats: vi.fn() }}>
            <MapPage />
          </StatsContext.Provider>
        </AuthProvider>
      </SettingsProvider>
    </MemoryRouter>
  );
}

describe("MapPage component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it("renders page title and interactive map container", async () => {
    renderMapWithStats();
    await vi.waitFor(() => {
      expect(screen.getByRole("heading", { name: /pollution map/i })).toBeInTheDocument();
    });
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
  });

  it("filters map markers by severity chip case-insensitively and updates counts", async () => {
    renderMapWithStats();
    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: /Low/i })).toBeInTheDocument();
    });

    const lowBtn = screen.getByRole("button", { name: /Low/i });
    fireEvent.click(lowBtn);

    const markers = screen.getAllByTestId("circle-marker");
    expect(markers).toHaveLength(1);

    const modBtn = screen.getByRole("button", { name: /Moderate/i });
    fireEvent.click(modBtn);

    const modMarkers = screen.getAllByTestId("circle-marker");
    expect(modMarkers).toHaveLength(1);
  });

  it("filters map markers by search query input", async () => {
    renderMapWithStats();
    await vi.waitFor(() => {
      expect(screen.getByPlaceholderText(/search beach hotspot/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search beach hotspot/i);
    fireEvent.change(searchInput, { target: { value: "Puri" } });

    const markers = screen.getAllByTestId("circle-marker");
    expect(markers).toHaveLength(1);
  });

  it("resets map filters when clicking Reset Filters", async () => {
    renderMapWithStats();
    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: /High/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /High/i }));
    expect(screen.getByRole("button", { name: /reset filters/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /reset filters/i }));
    expect(screen.getAllByTestId("circle-marker")).toHaveLength(4);
  });
});
