import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GuestLockScreen from "../GuestLockScreen.jsx";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("GuestLockScreen component", () => {
  it("renders title, message, and sign-in button", () => {
    render(
      <MemoryRouter>
        <GuestLockScreen
          title="Analytics Are Private to Signed-In Users"
          message="Sign in or create an account to view personal detection stats."
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Analytics Are Private to Signed-In Users")).toBeInTheDocument();
    expect(screen.getByText("Sign in or create an account to view personal detection stats.")).toBeInTheDocument();

    const signinBtn = screen.getByRole("button", { name: /sign in to access/i });
    expect(signinBtn).toBeInTheDocument();
    expect(signinBtn).toHaveClass("guest-lock-cta-btn");

    fireEvent.click(signinBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("renders cleanly under Earth and Dark theme containers", () => {
    const { container: earthContainer } = render(
      <MemoryRouter>
        <div data-theme="earth">
          <GuestLockScreen title="Earth Theme Locked" />
        </div>
      </MemoryRouter>
    );
    expect(earthContainer.querySelector(".guest-lock-icon-wrap")).toBeInTheDocument();

    const { container: darkContainer } = render(
      <MemoryRouter>
        <div data-theme="dark">
          <GuestLockScreen title="Dark Theme Locked" />
        </div>
      </MemoryRouter>
    );
    expect(darkContainer.querySelector(".guest-lock-icon-wrap")).toBeInTheDocument();
  });
});
