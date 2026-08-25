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

describe("AnalysisLightbox — Resizable Split Pane Invariants", () => {
  let originalInnerWidth;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    window.innerWidth = 1440; // Default desktop
  });

  afterEach(() => {
    window.innerWidth = originalInnerWidth;
  });

  it("1. renders with default 60/40 split on large desktop", () => {
    render(<AnalysisLightbox item={mockItem} onClose={vi.fn()} />);

    const splitter = screen.getByRole("separator", { name: /resize image and details panels/i });
    expect(splitter).toBeInTheDocument();
    expect(splitter).toHaveAttribute("aria-valuenow", "60");

    const stage = screen.getByTestId("lightbox-stage");
    expect(stage).toHaveStyle({ width: "60%" });

    const details = screen.getByTestId("lightbox-details");
    expect(details).toHaveStyle({ width: "40%" });
  });

  it("2 & 3. handles dragging divider left and right", () => {
    render(<AnalysisLightbox item={mockItem} onClose={vi.fn()} />);

    const lightboxSection = screen.getByTestId("lightbox-container");
    // Mock getBoundingClientRect for the container
    vi.spyOn(lightboxSection, "getBoundingClientRect").mockReturnValue({
      left: 100,
      top: 50,
      width: 1000,
      height: 600,
      right: 1100,
      bottom: 650,
      x: 100,
      y: 50,
      toJSON: () => {},
    });

    const splitter = screen.getByRole("separator", { name: /resize image and details panels/i });

    // Start drag
    fireEvent.mouseDown(splitter, { clientX: 700 });
    expect(splitter).toHaveClass("dragging");

    // Move left to 520 (which is (520 - 100) / 1000 = 42% -> clamped to 45%)
    fireEvent.mouseMove(document, { clientX: 520 });
    expect(splitter).toHaveAttribute("aria-valuenow", "45");

    // Move right to 650 ((650 - 100) / 1000 = 55%)
    fireEvent.mouseMove(document, { clientX: 650 });
    expect(splitter).toHaveAttribute("aria-valuenow", "55");

    // Release mouse
    fireEvent.mouseUp(document);
    expect(splitter).not.toHaveClass("dragging");
  });

  it("4. enforces minimum image width limit (45%)", () => {
    render(<AnalysisLightbox item={mockItem} onClose={vi.fn()} />);

    const lightboxSection = screen.getByTestId("lightbox-container");
    vi.spyOn(lightboxSection, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 600,
      right: 1000,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const splitter = screen.getByRole("separator", { name: /resize image and details panels/i });

    fireEvent.mouseDown(splitter, { clientX: 600 });
    // Drag way far left (200px = 20%)
    fireEvent.mouseMove(document, { clientX: 200 });
    fireEvent.mouseUp(document);

    expect(splitter).toHaveAttribute("aria-valuenow", "45");
    const stage = screen.getByTestId("lightbox-stage");
    expect(stage).toHaveStyle({ width: "45%" });
  });

  it("5. enforces maximum image width limit (70%)", () => {
    render(<AnalysisLightbox item={mockItem} onClose={vi.fn()} />);

    const lightboxSection = screen.getByTestId("lightbox-container");
    vi.spyOn(lightboxSection, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 600,
      right: 1000,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const splitter = screen.getByRole("separator", { name: /resize image and details panels/i });

    fireEvent.mouseDown(splitter, { clientX: 600 });
    // Drag way far right (900px = 90%)
    fireEvent.mouseMove(document, { clientX: 900 });
    fireEvent.mouseUp(document);

    expect(splitter).toHaveAttribute("aria-valuenow", "70");
    const stage = screen.getByTestId("lightbox-stage");
    expect(stage).toHaveStyle({ width: "70%" });
  });

  it("6. restores default split on double-click", () => {
    render(<AnalysisLightbox item={mockItem} onClose={vi.fn()} />);

    const splitter = screen.getByRole("separator", { name: /resize image and details panels/i });

    // Change ratio via keyboard
    fireEvent.keyDown(splitter, { key: "ArrowLeft" });
    fireEvent.keyDown(splitter, { key: "ArrowLeft" });
    expect(splitter).toHaveAttribute("aria-valuenow", "56");

    // Double click to reset
    fireEvent.doubleClick(splitter);
    expect(splitter).toHaveAttribute("aria-valuenow", "60");
  });

  it("7 & 8. resizes via ArrowLeft and ArrowRight keyboard keys", () => {
    render(<AnalysisLightbox item={mockItem} onClose={vi.fn()} />);

    const splitter = screen.getByRole("separator", { name: /resize image and details panels/i });
    expect(splitter).toHaveAttribute("aria-valuenow", "60");

    // ArrowLeft decreases by 2%
    fireEvent.keyDown(splitter, { key: "ArrowLeft" });
    expect(splitter).toHaveAttribute("aria-valuenow", "58");

    // ArrowRight increases by 2%
    fireEvent.keyDown(splitter, { key: "ArrowRight" });
    expect(splitter).toHaveAttribute("aria-valuenow", "60");
  });

  it("9 & 10. jumps to min (Home) and max (End) widths via keyboard", () => {
    render(<AnalysisLightbox item={mockItem} onClose={vi.fn()} />);

    const splitter = screen.getByRole("separator", { name: /resize image and details panels/i });

    // Home jumps to 45%
    fireEvent.keyDown(splitter, { key: "Home" });
    expect(splitter).toHaveAttribute("aria-valuenow", "45");

    // End jumps to 70%
    fireEvent.keyDown(splitter, { key: "End" });
    expect(splitter).toHaveAttribute("aria-valuenow", "70");
  });

  it("11. retains splitter structure accessible for all layouts", () => {
    render(<AnalysisLightbox item={mockItem} onClose={vi.fn()} />);

    const splitter = screen.getByRole("separator", { name: /resize image and details panels/i });
    expect(splitter).toHaveAttribute("aria-orientation", "vertical");
    expect(splitter).toHaveAttribute("tabIndex", "0");
  });

  it("12, 13 & 14. maintains bounding boxes, Focus Detections, and Full Image interactivity inside resized stage", () => {
    render(<AnalysisLightbox item={mockItem} onClose={vi.fn()} />);

    // Check bounding boxes exist
    expect(screen.getAllByTestId("bbox-box")).toHaveLength(2);

    const focusBtn = screen.getByRole("button", { name: /focus detections/i });
    const fullBtn = screen.getByRole("button", { name: /full image/i });

    expect(focusBtn).toBeInTheDocument();
    expect(fullBtn).toBeInTheDocument();

    // Toggle to full image
    fireEvent.click(fullBtn);
    expect(fullBtn).toHaveAttribute("aria-pressed", "true");

    // Toggle back to focus detections
    fireEvent.click(focusBtn);
    expect(focusBtn).toHaveAttribute("aria-pressed", "true");
  });
});
