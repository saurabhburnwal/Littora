import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Badge from "../Badge.jsx";

describe("Badge component", () => {
  it("renders severity variant with correct class", () => {
    const { container } = render(<Badge variant="severity" type="Moderate" className="bg-amber-100 text-amber-800" />);
    const badge = container.firstChild;
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("rounded-pill");
    expect(badge.className).toContain("bg-amber-100");
    expect(badge.className).toContain("text-amber-800");
    expect(badge.className).toContain("text-xs sm:text-sm");
  });

  it("renders waste category variant", () => {
    render(<Badge variant="waste" type="bottle">Plastic Bottle</Badge>);
    expect(screen.getByText("Plastic Bottle")).toBeInTheDocument();
  });

  it("renders role variant", () => {
    render(<Badge variant="role" type="admin">Administrator</Badge>);
    expect(screen.getByText("Administrator")).toBeInTheDocument();
  });

  it("renders status variant", () => {
    render(<Badge variant="status" type="active">Active Monitoring</Badge>);
    expect(screen.getByText("Active Monitoring")).toBeInTheDocument();
  });

  it("supports compact size and overlay mode", () => {
    const { container } = render(
      <Badge variant="severity" type="high" size="compact" overlay>
        High
      </Badge>
    );
    const badge = container.firstChild;
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("text-xs");
    expect(badge.className).not.toContain("sm:text-sm");
    expect(badge.className).toContain("backdrop-blur-sm");
  });

  it("renders optional leading icon", () => {
    render(
      <Badge variant="severity" type="low" icon={<span data-testid="badge-icon">🌿</span>}>
        Low
      </Badge>
    );
    expect(screen.getByTestId("badge-icon")).toBeInTheDocument();
  });
});
