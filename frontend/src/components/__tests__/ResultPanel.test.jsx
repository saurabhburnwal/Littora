import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ResultPanel from "../ResultPanel.jsx";

const baseResult = {
  id: 10,
  detections:     { bottle: 3, can: 2, bag: 1, wrapper: 0 },
  total_waste:    6,
  pollution_score: 45,
  severity:       "High",
  location_label: "Palolem Beach, Goa",
  created_at:     "2026-08-22T10:00:00Z",
  image_url:      "https://example.com/photo.jpg",
  latitude:       15.01,
  longitude:      74.02,
  user_name:      "Saurabh",
  boxes: [
    { class_name: "bottle", confidence: 0.92 },
    { class_name: "bottle", confidence: 0.88 },
    { class_name: "bag", confidence: 0.65 },
  ],
};

function renderResultPanel(result, showUser = false) {
  return render(
    <MemoryRouter>
      <ResultPanel result={result} showUser={showUser} />
    </MemoryRouter>
  );
}

describe("ResultPanel component", () => {
  it("renders location, date, severity score, item count, and action status correctly", () => {
    renderResultPanel(baseResult, true);

    expect(screen.getByText("Palolem Beach, Goa")).toBeInTheDocument();
    expect(screen.getByText("22 Aug 2026")).toBeInTheDocument();
    expect(screen.getByText("Saurabh")).toBeInTheDocument();
    expect(screen.getByText(/Score:/i)).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("6 waste items")).toBeInTheDocument();
    expect(screen.getByText("Cleanup priority")).toBeInTheDocument();
  });

  it("renders detected waste items with itemized confidence percentages", () => {
    renderResultPanel(baseResult);

    expect(screen.getByText("Plastic Bottle")).toBeInTheDocument();
    expect(screen.getByText("90% confidence")).toBeInTheDocument();
    expect(screen.getByText("Plastic Bag")).toBeInTheDocument();
    expect(screen.getByText("65% confidence")).toBeInTheDocument();
  });

  it("renders View on Map button and secondary more menu", () => {
    renderResultPanel(baseResult);

    expect(screen.getByRole("link", { name: /view on map/i })).toBeInTheDocument();

    const moreBtn = screen.getByRole("button", { name: /more actions/i });
    expect(moreBtn).toBeInTheDocument();

    fireEvent.click(moreBtn);
    expect(screen.getByRole("menuitem", { name: /export json/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /download photo/i })).toBeInTheDocument();
  });

  it("renders correctly when all detections are zero", () => {
    const result = {
      ...baseResult,
      detections:     { bottle: 0, can: 0, bag: 0, wrapper: 0 },
      total_waste:    0,
      pollution_score: 0,
      severity:       "Low",
      boxes:          [],
    };
    renderResultPanel(result);
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("0 waste items")).toBeInTheDocument();
    expect(screen.getByText("Routine maintenance")).toBeInTheDocument();
  });

  it("renders 'Severe' severity and 'Urgent intervention' correctly", () => {
    renderResultPanel({ ...baseResult, pollution_score: 75, severity: "Severe" });
    const badge = screen.getByText("Severe");
    expect(badge).toHaveClass("severity-severe");
    expect(screen.getByText("Urgent intervention")).toBeInTheDocument();
  });
});
