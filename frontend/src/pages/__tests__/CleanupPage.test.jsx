import { render, screen } from "@testing-library/react";
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

import { supabase } from "../../lib/supabase.js";
import { AuthProvider } from "../../context/AuthContext.jsx";
import { StatsProvider } from "../../context/StatsContext.jsx";
import { SettingsProvider } from "../../context/SettingsContext.jsx";
import CleanupPage from "../CleanupPage.jsx";

function setupAuthMock(user = { id: "u1", email: "user@test.com" }) {
  const session = user ? { user } : null;
  supabase.auth.getSession.mockResolvedValue({ data: { session } });
  supabase.auth.onAuthStateChange.mockImplementation((cb) => {
    cb(user ? "SIGNED_IN" : "SIGNED_OUT", session);
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
}

function renderCleanup() {
  setupAuthMock();
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <AuthProvider>
          <StatsProvider>
            <CleanupPage />
          </StatsProvider>
        </AuthProvider>
      </SettingsProvider>
    </MemoryRouter>
  );
}

describe("CleanupPage component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Cleanup Recommendations title and recommended actions", async () => {
    renderCleanup();
    await vi.waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /cleanup recommendations/i })).toBeInTheDocument();
    });
    expect(screen.getByText("Recommended Actions")).toBeInTheDocument();
  });
});
