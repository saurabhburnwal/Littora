import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ResultPanel from "../ResultPanel.jsx";

const baseResult = {
  detections:     { bottle: 3, can: 2, bag: 1, wrapper: 0 },
  total_waste:    6,
  pollution_score: 45,
  severity:       "Moderate",
};

// ─────────────────────────────────────────────────────────────────────────────
describe("ResultPanel component", () => {
  it("renders summary stats correctly", () => {
    render(<ResultPanel result={baseResult} />);

    expect(screen.getByText("6")).toBeInTheDocument();   // total waste
    expect(screen.getByText("45")).toBeInTheDocument();  // pollution score
    expect(screen.getByText("Moderate")).toBeInTheDocument(); // severity badge
  });

  it("renders the waste breakdown chart section heading", () => {
    render(<ResultPanel result={baseResult} />);
    expect(screen.getByText(/this photo — waste breakdown/i)).toBeInTheDocument();
  });

  it("renders the recyclable pie chart section heading", () => {
    render(<ResultPanel result={baseResult} />);
    expect(screen.getByText(/recyclable vs non-recyclable/i)).toBeInTheDocument();
  });

  it("renders correctly when all detections are zero", () => {
    const result = {
      ...baseResult,
      detections:     { bottle: 0, can: 0, bag: 0, wrapper: 0 },
      total_waste:    0,
      pollution_score: 0,
      severity:       "Low",
    };
    render(<ResultPanel result={result} />);
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });

  it("renders severity badge with the correct class", () => {
    render(<ResultPanel result={baseResult} />);
    const badge = screen.getByText("Moderate");
    expect(badge).toHaveClass("severity-moderate");
  });

  it("renders 'Severe' severity correctly", () => {
    render(<ResultPanel result={{ ...baseResult, severity: "Severe" }} />);
    const badge = screen.getByText("Severe");
    expect(badge).toHaveClass("severity-severe");
  });
});
