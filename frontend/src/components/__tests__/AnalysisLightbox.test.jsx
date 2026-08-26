import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

describe("AnalysisLightbox — Overlay Layout Invariants", () => {
  it("renders image stage and details panel in overlay layout", () => {
    render(<AnalysisLightbox item={mockItem} onClose={vi.fn()} />);

    const stage = screen.getByTestId("lightbox-stage");
    const details = screen.getByTestId("lightbox-details");

    expect(stage).toBeInTheDocument();
    expect(details).toBeInTheDocument();
    // No draggable separator in the new layout
    expect(screen.queryByRole("separator", { name: /resize/i })).not.toBeInTheDocument();
  });

  it("renders bounding boxes inside the image stage", () => {
    render(<AnalysisLightbox item={mockItem} onClose={vi.fn()} />);
    expect(screen.getAllByTestId("bbox-box")).toHaveLength(2);
  });

  it("does not render Focus Detections or Full Image toggle buttons", () => {
    render(<AnalysisLightbox item={mockItem} onClose={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /focus detections/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /full image/i })).not.toBeInTheDocument();
  });

  it("renders detection metadata in the overlay panel", () => {
    render(<AnalysisLightbox item={mockItem} onClose={vi.fn()} />);
    expect(screen.getByText(/detected waste/i)).toBeInTheDocument();
    expect(screen.getByText(/palolem beach/i)).toBeInTheDocument();
  });

  it("toggles the metadata overlay card when clicking the Info button", () => {
    render(<AnalysisLightbox item={mockItem} onClose={vi.fn()} />);
    expect(screen.getByTestId("lightbox-details")).toBeInTheDocument();

    const infoToggle = screen.getByRole("button", { name: /hide analysis details/i });
    fireEvent.click(infoToggle);
    expect(screen.queryByTestId("lightbox-details")).not.toBeInTheDocument();

    const showToggle = screen.getByRole("button", { name: /show analysis details/i });
    fireEvent.click(showToggle);
    expect(screen.getByTestId("lightbox-details")).toBeInTheDocument();
  });
});

