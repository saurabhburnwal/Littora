import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Badge from "../Badge.jsx";

describe("Badge component", () => {
  it("renders severity variant with correct class", () => {
    render(<Badge variant="severity" type="Moderate" />);
    const badge = screen.getByText("Moderate");
    expect(badge).toBeInTheDocument();
    expect(badge.closest(".badge-root")).toHaveClass("badge-severity");
    expect(badge.closest(".badge-root")).toHaveClass("badge-severity-moderate");
  });

  it("renders waste category variant", () => {
    render(<Badge variant="waste" type="bottle">Plastic Bottle</Badge>);
    expect(screen.getByText("Plastic Bottle")).toBeInTheDocument();
    expect(screen.getByText("Plastic Bottle").closest(".badge-root")).toHaveClass("badge-waste-bottle");
  });

  it("renders role variant", () => {
    render(<Badge variant="role" type="admin">Administrator</Badge>);
    expect(screen.getByText("Administrator")).toBeInTheDocument();
    expect(screen.getByText("Administrator").closest(".badge-root")).toHaveClass("badge-role-admin");
  });

  it("renders status variant", () => {
    render(<Badge variant="status" type="active">Active Monitoring</Badge>);
    expect(screen.getByText("Active Monitoring")).toBeInTheDocument();
    expect(screen.getByText("Active Monitoring").closest(".badge-root")).toHaveClass("badge-status-active");
  });

  it("supports compact size and overlay mode", () => {
    const { container } = render(
      <Badge variant="severity" type="high" size="compact" overlay>
        High
      </Badge>
    );
    expect(container.firstChild).toHaveClass("badge-compact");
    expect(container.firstChild).toHaveClass("badge-overlay");
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
