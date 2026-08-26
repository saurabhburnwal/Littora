import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BoundingBoxImage from "../BoundingBoxImage.jsx";

describe("BoundingBoxImage component", () => {
  it("renders nothing when src is not provided", () => {
    const { container } = render(<BoundingBoxImage src="" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders uncropped full image without bounding boxes when boxes is empty", () => {
    render(<BoundingBoxImage src="https://example.com/beach.jpg" alt="Test Beach" />);
    const img = screen.getByRole("img", { name: "Test Beach" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/beach.jpg");
    expect(img).toHaveClass("modal-img-full");
    expect(screen.queryByTestId("bbox-overlay")).toBeNull();
    expect(screen.queryByTestId("bbox-filter-toolbar")).toBeNull();
  });

  it("renders bounding box overlays when boxes array is provided", () => {
    const mockBoxes = [
      {
        class_name: "bottle",
        confidence: 0.94,
        box_normalized: [0.1, 0.2, 0.3, 0.4],
      },
      {
        class_name: "can",
        confidence: 0.88,
        box_normalized: [0.5, 0.6, 0.8, 0.9],
      },
    ];

    render(
      <BoundingBoxImage
        src="https://example.com/beach.jpg"
        alt="Beach with detections"
        boxes={mockBoxes}
      />
    );

    const overlay = screen.getByTestId("bbox-overlay");
    expect(overlay).toBeInTheDocument();

    const boxes = screen.getAllByTestId("bbox-box");
    expect(boxes).toHaveLength(2);

    expect(screen.getByText(/bottle 94%/i)).toBeInTheDocument();
    expect(screen.getByText(/can 88%/i)).toBeInTheDocument();
    expect(screen.getByTestId("bbox-filter-toolbar")).toBeInTheDocument();
  });

  it("toggles category visibility when clicking category chips", () => {
    const mockBoxes = [
      {
        class_name: "bottle",
        confidence: 0.9,
        box_normalized: [0.1, 0.2, 0.3, 0.4],
      },
      {
        class_name: "bag",
        confidence: 0.85,
        box_normalized: [0.5, 0.6, 0.8, 0.9],
      },
    ];

    render(
      <BoundingBoxImage
        src="https://example.com/beach.jpg"
        alt="Multi-category test"
        boxes={mockBoxes}
      />
    );

    expect(screen.getAllByTestId("bbox-box")).toHaveLength(2);

    // Click "Bottle" chip to hide bottles
    const bottleChip = screen.getByTitle(/hide bottle detections/i);
    fireEvent.click(bottleChip);

    expect(screen.getAllByTestId("bbox-box")).toHaveLength(1);
    expect(screen.queryByText(/bottle 90%/i)).toBeNull();
    expect(screen.getByText(/bag 85%/i)).toBeInTheDocument();

    // Click again to show bottles
    fireEvent.click(bottleChip);
    expect(screen.getAllByTestId("bbox-box")).toHaveLength(2);
  });

  it("filters boxes when adjusting confidence threshold slider", () => {
    const mockBoxes = [
      {
        class_name: "bottle",
        confidence: 0.30,
        box_normalized: [0.1, 0.2, 0.3, 0.4],
      },
      {
        class_name: "can",
        confidence: 0.80,
        box_normalized: [0.5, 0.6, 0.8, 0.9],
      },
    ];

    render(
      <BoundingBoxImage
        src="https://example.com/beach.jpg"
        alt="Confidence slider test"
        boxes={mockBoxes}
      />
    );

    // Initial default threshold is 25%, so both boxes (30% and 80%) show
    expect(screen.getAllByTestId("bbox-box")).toHaveLength(2);

    // Change confidence threshold to 50%
    const slider = screen.getByLabelText(/minimum detection confidence/i);
    fireEvent.change(slider, { target: { value: "50" } });

    // Now only the 80% can box should be visible
    expect(screen.getAllByTestId("bbox-box")).toHaveLength(1);
    expect(screen.getByText(/can 80%/i)).toBeInTheDocument();
    expect(screen.queryByText(/bottle 30%/i)).toBeNull();
  });

  it("filters out invalid bounding boxes gracefully", () => {
    const invalidBoxes = [
      null,
      { class_name: "other" }, // missing box_normalized
      { class_name: "bag", box_normalized: [0.1, 0.2] }, // invalid length
      { class_name: "glass", confidence: 0.95, box_normalized: [0.1, 0.1, 0.5, 0.5] }, // valid
    ];

    render(
      <BoundingBoxImage
        src="https://example.com/beach.jpg"
        alt="Partial boxes"
        boxes={invalidBoxes}
      />
    );

    const boxes = screen.getAllByTestId("bbox-box");
    expect(boxes).toHaveLength(1);
    expect(screen.getByText(/glass 95%/i)).toBeInTheDocument();
  });

  // ─── Always-Full Image Tests (zoom toggle removed) ───

  it("always renders full image in lightbox mode — no zoom applied", () => {
    const mockBoxes = [
      {
        class_name: "bottle",
        confidence: 0.92,
        box_normalized: [0.4, 0.45, 0.5, 0.55], // small center detection
      },
    ];

    render(
      <BoundingBoxImage
        src="https://example.com/beach.jpg"
        alt="Always full image test"
        boxes={mockBoxes}
        lightbox
      />
    );

    const frame = screen.getByTestId("modal-image-frame");
    // Transform must always be "none" — no zoom
    expect(frame).toHaveStyle({ transform: "none" });
    // No view-mode toggle rendered
    expect(screen.queryByTestId("bbox-view-mode-toggle")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /focus detections/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /full image/i })).not.toBeInTheDocument();
  });

  it("renders full image even with no detections in lightbox mode", () => {
    render(
      <BoundingBoxImage
        src="https://example.com/beach.jpg"
        alt="No detections test"
        boxes={[]}
        lightbox
      />
    );

    const frame = screen.getByTestId("modal-image-frame");
    expect(frame).toHaveStyle({ transform: "none" });
    expect(screen.queryByTestId("bbox-view-mode-toggle")).not.toBeInTheDocument();
  });

  it("bounding boxes render correctly in lightbox mode without zoom", () => {
    const mockBoxes = [
      {
        class_name: "bottle",
        confidence: 0.90,
        box_normalized: [0.10, 0.20, 0.18, 0.25],
      },
      {
        class_name: "bag",
        confidence: 0.88,
        box_normalized: [0.60, 0.21, 0.70, 0.27],
      },
    ];

    render(
      <BoundingBoxImage
        src="https://example.com/beach.jpg"
        alt="Multiple detections lightbox"
        boxes={mockBoxes}
        lightbox
      />
    );

    const frame = screen.getByTestId("modal-image-frame");
    expect(frame).toHaveStyle({ transform: "none" });
    expect(screen.getAllByTestId("bbox-box")).toHaveLength(2);
  });

  it("8. keeps bounding boxes perfectly aligned with normalized coordinates", () => {
    const mockBoxes = [
      {
        class_name: "wrapper",
        confidence: 0.92,
        box_normalized: [0.15, 0.25, 0.35, 0.45],
      },
    ];

    render(
      <BoundingBoxImage
        src="https://example.com/beach.jpg"
        alt="Alignment verification"
        boxes={mockBoxes}
        lightbox
      />
    );

    const box = screen.getByTestId("bbox-box");
    expect(box).toHaveStyle({
      left: "15%",
      top: "25%",
      width: "20%",
      height: "20%",
    });
  });

  it("renders cleanly under Earth and Dark themes without zoom toggle", () => {
    const mockBoxes = [
      {
        class_name: "bottle",
        confidence: 0.90,
        box_normalized: [0.2, 0.2, 0.4, 0.4],
      },
    ];

    // Earth theme container
    const { unmount } = render(
      <div data-theme="earth">
        <BoundingBoxImage
          src="https://example.com/beach.jpg"
          alt="Earth theme test"
          boxes={mockBoxes}
          lightbox
        />
      </div>
    );
    expect(screen.queryByTestId("bbox-view-mode-toggle")).not.toBeInTheDocument();
    unmount();

    // Dark theme container
    render(
      <div data-theme="dark">
        <BoundingBoxImage
          src="https://example.com/beach.jpg"
          alt="Dark theme test"
          boxes={mockBoxes}
          lightbox
        />
      </div>
    );
    expect(screen.queryByTestId("bbox-view-mode-toggle")).not.toBeInTheDocument();
  });
});

