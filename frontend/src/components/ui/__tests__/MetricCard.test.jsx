import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import MetricCard from "../MetricCard.jsx";

describe("MetricCard component", () => {
  it("renders label and value correctly", () => {
    render(<MetricCard label="Waste Items" value="22" />);
    expect(screen.getByText("Waste Items")).toBeInTheDocument();
    expect(screen.getByText("22")).toBeInTheDocument();
  });

  it("renders with optional icon", () => {
    render(
      <MetricCard
        label="Detections"
        value={105}
        icon={<span data-testid="test-icon">🔍</span>}
      />
    );
    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
    expect(screen.getByText("105")).toBeInTheDocument();
  });

  it("renders with severity tier badge", () => {
    render(
      <MetricCard
        label="Avg. Severity Score"
        value="18"
        tier="Moderate"
      />
    );
    const tierBadge = screen.getByText("Moderate");
    expect(tierBadge).toBeInTheDocument();
    expect(tierBadge).toHaveClass("tier-moderate");
  });

  it("renders supporting text and trend indicator", () => {
    render(
      <MetricCard
        label="Total Waste"
        value="3,450"
        supportingText="Cataloged items"
        trend="+15% this week"
      />
    );
    expect(screen.getByText("Cataloged items")).toBeInTheDocument();
    expect(screen.getByText("+15% this week")).toBeInTheDocument();
  });

  it("handles click events when onClick is provided", () => {
    const handleClick = vi.fn();
    render(
      <MetricCard
        label="Actionable Sites"
        value="8"
        onClick={handleClick}
      />
    );
    const card = screen.getByRole("button");
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
