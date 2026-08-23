import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AnalysisLightbox from "../AnalysisLightbox.jsx";

const mockItem = {
  id: 101,
  created_at: "2026-07-20T10:00:00Z",
  location_label: "Palolem Beach, Goa",
  total_waste: 5,
  pollution_score: 25,
  severity: "Moderate",
  image_url: "https://example.com/beach1.jpg",
  detections: { bottle: 3, can: 2 },
  boxes: [
    { class_name: "bottle", confidence: 0.95, box_normalized: [0.1, 0.1, 0.3, 0.4] },
    { class_name: "can", confidence: 0.88, box_normalized: [0.4, 0.2, 0.6, 0.5] },
  ],
};

describe("AnalysisLightbox — rendering & interaction", () => {
  it("renders null when item is null", () => {
    const { container } = render(<AnalysisLightbox item={null} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders two-pane lightbox with image stage and details pane", () => {
    render(<AnalysisLightbox item={mockItem} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: /photo analysis detail/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close photo analysis detail/i })).toBeInTheDocument();
    expect(screen.getByAltText(/full-size beach analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/detected waste/i)).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<AnalysisLightbox item={mockItem} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /close photo analysis detail/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when overlay backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<AnalysisLightbox item={mockItem} onClose={onClose} />);

    const overlay = screen.getByRole("dialog", { name: /photo analysis detail/i });
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(<AnalysisLightbox item={mockItem} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("displays uploaded by user info when showUser=true", () => {
    const itemWithUser = { ...mockItem, user_name: "Saurabh", user_email: "saurabh@test.com" };
    render(<AnalysisLightbox item={itemWithUser} showUser={true} onClose={vi.fn()} />);

    expect(screen.getByText("Saurabh")).toBeInTheDocument();
  });
});
