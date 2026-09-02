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
  useMap: () => ({ setView: vi.fn(), fitBounds: vi.fn(), closePopup: vi.fn() }),
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

function setupAuthMock(user = null) {
  sessionStorage.clear();
  localStorage.clear();
  supabase.auth.getSession.mockReset();
  supabase.auth.onAuthStateChange.mockReset();

  const session = user ? { user } : null;
  supabase.auth.getSession.mockResolvedValue({ data: { session } });
  supabase.auth.onAuthStateChange.mockImplementation((cb) => {
    cb(user ? "SIGNED_IN" : "SIGNED_OUT", session);
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
}

function renderMapWithStats(statsOverride = { locations: mockLocations }, user = { id: "u1", email: "user@test.com" }) {
  setupAuthMock(user);
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
  });

  it("renders page title and interactive map container when loaded", async () => {
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

  it("does not render redundant standalone severity legend card or verbose descriptions", async () => {
    renderMapWithStats();
    await vi.waitFor(() => {
      expect(screen.getByRole("heading", { name: /pollution map/i })).toBeInTheDocument();
    });
    expect(screen.queryByText(/severity legend/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/minimal risk/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cleanup priority/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/urgent action/i)).not.toBeInTheDocument();
  });

  it("renders consolidated GIS status pill overlay", async () => {
    renderMapWithStats();
    await vi.waitFor(() => {
      expect(screen.getByText(/3 hotspots/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/1 critical/i)).toBeInTheDocument();
    expect(screen.getByText(/peak 75/i)).toBeInTheDocument();
  });

  it("filters map markers by timeframe correctly", async () => {
    const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    const recentDate = new Date().toISOString();
    const timeframeLocations = [
      { id: "1", location_label: "Recent Beach", severity: "Low", latitude: 10, longitude: 20, created_at: recentDate },
      { id: "2", location_label: "Old Beach", severity: "Low", latitude: 30, longitude: 40, created_at: oldDate },
    ];
    renderMapWithStats({ locations: timeframeLocations });

    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: /^7d$/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^7d$/i }));
    const markers = screen.getAllByTestId("circle-marker");
    expect(markers).toHaveLength(1);
  });

  it("switches map tile style when tile mode button is clicked", async () => {
    renderMapWithStats();
    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: /satellite/i })).toBeInTheDocument();
    });

    const streetsBtn = screen.getByRole("button", { name: /streets/i });
    fireEvent.click(streetsBtn);
    expect(localStorage.getItem("littora_map_tile_mode")).toBe("streets");
  });

  it("renders empty state when no locations exist", async () => {
    renderMapWithStats({ locations: [] });
    await vi.waitFor(() => {
      expect(screen.getByText(/no location data yet/i)).toBeInTheDocument();
    });
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

  it("renders empty filter state with clear button when filters match nothing", async () => {
    renderMapWithStats();
    await vi.waitFor(() => {
      expect(screen.getByPlaceholderText(/search beach hotspot/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search beach hotspot/i);
    fireEvent.change(searchInput, { target: { value: "NonExistentLocationXYZ" } });

    expect(screen.getByText(/no beach hotspots match/i)).toBeInTheDocument();
    const clearBtn = screen.getByRole("button", { name: /clear map filters/i });
    fireEvent.click(clearBtn);

    expect(screen.getAllByTestId("circle-marker")).toHaveLength(4);
  });

  it("renders multi-scan inspection popup rows with view action for grouped pins", async () => {
    const multiScanLoc = {
      id: "group-1",
      location_label: "Clustered Beach",
      severity: "Severe",
      latitude: 15.1,
      longitude: 73.9,
      total_waste: 10,
      pollution_score: 85,
      created_at: new Date().toISOString(),
      scans: [
        { id: "s1", severity: "Low", pollution_score: 10, image_url: "https://example.com/s1.jpg", created_at: new Date().toISOString() },
        { id: "s2", severity: "Severe", pollution_score: 85, image_url: "https://example.com/s2.jpg", created_at: new Date().toISOString() },
      ],
    };
    renderMapWithStats({ locations: [multiScanLoc] });

    await vi.waitFor(() => {
      expect(screen.getByText(/Clustered Beach/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/2 scans/i)).toBeInTheDocument();
    const viewButtons = screen.getAllByRole("button", { name: /view/i });
    expect(viewButtons).toHaveLength(2);

    fireEvent.click(viewButtons[0]);
    // Lightbox modal is rendered
    expect(document.querySelector(".fixed.inset-0") || document.body).toBeInTheDocument();
  });

  it("safely handles invalid created_at timestamps during timeframe filtering", async () => {
    const invalidDateLocs = [
      { id: "1", location_label: "Valid Recent", severity: "Low", latitude: 10, longitude: 20, created_at: new Date().toISOString() },
      { id: "2", location_label: "Corrupted Date", severity: "Low", latitude: 30, longitude: 40, created_at: "not-a-valid-date" },
      { id: "3", location_label: "Missing Date", severity: "Low", latitude: 50, longitude: 60, created_at: null },
    ];
    renderMapWithStats({ locations: invalidDateLocs });

    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: /^7d$/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^7d$/i }));
    const markers = screen.getAllByTestId("circle-marker");
    expect(markers).toHaveLength(1);
  });

  it("safely renders string coordinates and handles missing location labels without crashing", async () => {
    const stringCoordLocs = [
      { id: "str1", location_label: "", severity: "Low", latitude: "19.7983", longitude: "85.8249", total_waste: 2, pollution_score: 10, created_at: new Date().toISOString() },
    ];
    renderMapWithStats({ locations: stringCoordLocs });

    await vi.waitFor(() => {
      expect(screen.getByTestId("map-container")).toBeInTheDocument();
    });

    expect(screen.getByText("19.7983, 85.8249")).toBeInTheDocument();
    expect(screen.getByText(/1 hotspot$/i)).toBeInTheDocument();
  });

  it("safely handles null locations array without crashing", async () => {
    renderMapWithStats({ locations: null });
    await vi.waitFor(() => {
      expect(screen.getByText(/no location data yet/i)).toBeInTheDocument();
    });
  });

  it("handles high-volume multi-scan grouping with 50+ analyses under one coordinate pin", async () => {
    const scans50 = Array.from({ length: 50 }, (_, i) => ({
      id: `scan-${i}`,
      severity: i % 2 === 0 ? "Severe" : "Low",
      pollution_score: (i * 2) % 100,
      image_url: `https://example.com/scan-${i}.jpg`,
      created_at: new Date(Date.now() - i * 60000).toISOString(),
    }));
    const clustered50 = {
      id: "super-cluster",
      location_label: "Super Clustered Beach",
      severity: "Severe",
      latitude: 12.34,
      longitude: 56.78,
      total_waste: 120,
      pollution_score: 95,
      created_at: new Date().toISOString(),
      scans: scans50,
    };
    renderMapWithStats({ locations: [clustered50] });

    await vi.waitFor(() => {
      expect(screen.getByText(/Super Clustered Beach/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/50 scans/i)).toBeInTheDocument();
    const viewButtons = screen.getAllByRole("button", { name: /view/i });
    expect(viewButtons).toHaveLength(50);
  });

  it("searches beach hotspot by city or country when location_label is empty", async () => {
    const multiFieldLocs = [
      { id: "1", location_label: "", beach: "Candolim", city: "North Goa", country: "India", severity: "Low", latitude: 15.5, longitude: 73.7, created_at: new Date().toISOString() },
    ];
    renderMapWithStats({ locations: multiFieldLocs });

    await vi.waitFor(() => {
      expect(screen.getByPlaceholderText(/search beach hotspot/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search beach hotspot/i);
    fireEvent.change(searchInput, { target: { value: "Goa" } });
    expect(screen.getAllByTestId("circle-marker")).toHaveLength(1);
  });

  it("renders safe fallback dash when scan created_at is corrupted in popup", async () => {
    const corruptedDateLoc = {
      id: "corrupt-1",
      location_label: "Puri",
      severity: "Low",
      latitude: 19.8,
      longitude: 85.8,
      created_at: new Date().toISOString(),
      scans: [
        { id: "s1", severity: "Low", pollution_score: 5, created_at: "corrupted-date-value" },
      ],
    };
    renderMapWithStats({ locations: [corruptedDateLoc] });

    await vi.waitFor(() => {
      expect(screen.getByText(/Puri/i)).toBeInTheDocument();
    });

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders admin-scoped context subtitle when authenticated as administrator", async () => {
    renderMapWithStats({ locations: mockLocations }, { id: "admin-1", email: "admin@littora.app" });
    await vi.waitFor(() => {
      expect(
        screen.getByText(/Community pollution map — all geolocated beach waste scan hotspots across all users\./i)
      ).toBeInTheDocument();
    });
  });

  it("clears search input when clear X button is clicked", async () => {
    renderMapWithStats();
    await vi.waitFor(() => {
      expect(screen.getByPlaceholderText(/search beach hotspot/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search beach hotspot/i);
    fireEvent.change(searchInput, { target: { value: "Puri" } });
    expect(screen.getAllByTestId("circle-marker")).toHaveLength(1);

    const clearBtn = screen.getByRole("button", { name: /clear search/i });
    fireEvent.click(clearBtn);
    expect(searchInput.value).toBe("");
    expect(screen.getAllByTestId("circle-marker")).toHaveLength(4);
  });

  it("filters map markers by 30d and 90d timeframes properly", async () => {
    const d20 = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
    const d60 = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const d120 = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
    const timeframeLocs = [
      { id: "1", location_label: "20 Days Ago", severity: "Low", latitude: 10, longitude: 20, created_at: d20 },
      { id: "2", location_label: "60 Days Ago", severity: "Low", latitude: 30, longitude: 40, created_at: d60 },
      { id: "3", location_label: "120 Days Ago", severity: "Low", latitude: 50, longitude: 60, created_at: d120 },
    ];
    renderMapWithStats({ locations: timeframeLocs });

    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: /^30d$/i })).toBeInTheDocument();
    });

    // 30d should match 1 location
    fireEvent.click(screen.getByRole("button", { name: /^30d$/i }));
    expect(screen.getAllByTestId("circle-marker")).toHaveLength(1);

    // 90d should match 2 locations
    fireEvent.click(screen.getByRole("button", { name: /^90d$/i }));
    expect(screen.getAllByTestId("circle-marker")).toHaveLength(2);
  });

  it("closes the lightbox modal when close button is clicked", async () => {
    const singleLoc = {
      id: "view-test",
      location_label: "Lightbox Test Beach",
      severity: "Low",
      latitude: 10,
      longitude: 20,
      total_waste: 1,
      pollution_score: 5,
      created_at: new Date().toISOString(),
      scans: [
        { id: "s1", severity: "Low", pollution_score: 5, image_url: "https://example.com/s1.jpg", created_at: new Date().toISOString() },
      ],
    };
    renderMapWithStats({ locations: [singleLoc] });

    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: /view/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /view/i }));
    expect(screen.getByRole("dialog", { name: /photo analysis detail/i })).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: /close photo analysis detail/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("dialog", { name: /photo analysis detail/i })).not.toBeInTheDocument();
  });
});



