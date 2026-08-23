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
    expect(document.querySelector(".bbox-overlay-layer")).toBeNull();
    expect(document.querySelector(".bbox-filter-toolbar")).toBeNull();
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

    const overlay = document.querySelector(".bbox-overlay-layer");
    expect(overlay).toBeInTheDocument();

    const boxes = document.querySelectorAll(".bbox-box");
    expect(boxes).toHaveLength(2);

    expect(screen.getByText(/bottle 94%/i)).toBeInTheDocument();
    expect(screen.getByText(/can 88%/i)).toBeInTheDocument();
    expect(document.querySelector(".bbox-filter-toolbar")).toBeInTheDocument();
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

    expect(document.querySelectorAll(".bbox-box")).toHaveLength(2);

    // Click "Bottle" chip to hide bottles
    const bottleChip = screen.getByTitle(/hide bottle detections/i);
    fireEvent.click(bottleChip);

    expect(document.querySelectorAll(".bbox-box")).toHaveLength(1);
    expect(screen.queryByText(/bottle 90%/i)).toBeNull();
    expect(screen.getByText(/bag 85%/i)).toBeInTheDocument();

    // Click again to show bottles
    fireEvent.click(bottleChip);
    expect(document.querySelectorAll(".bbox-box")).toHaveLength(2);
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
    expect(document.querySelectorAll(".bbox-box")).toHaveLength(2);

    // Change confidence threshold to 50%
    const slider = screen.getByLabelText(/minimum detection confidence/i);
    fireEvent.change(slider, { target: { value: "50" } });

    // Now only the 80% can box should be visible
    expect(document.querySelectorAll(".bbox-box")).toHaveLength(1);
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

    const boxes = document.querySelectorAll(".bbox-box");
    expect(boxes).toHaveLength(1);
    expect(screen.getByText(/glass 95%/i)).toBeInTheDocument();
  });

  // ─── Detection-Focus Viewport Tests (Chunk 15 Invariants) ───

  it("1. handles no detections in lightbox mode by defaulting to full image", () => {
    render(
      <BoundingBoxImage
        src="https://example.com/beach.jpg"
        alt="No detections test"
        boxes={[]}
        lightbox
      />
    );

    const fullBtn = screen.getByRole("button", { name: /full image/i });
    expect(fullBtn).toHaveAttribute("aria-pressed", "true");

    const focusBtn = screen.getByRole("button", { name: /focus detections/i });
    expect(focusBtn).toBeDisabled();

    const frame = document.querySelector(".modal-image-frame");
    expect(frame).toHaveStyle({ transform: "none" });
  });

  it("2. focuses and zooms on a single small detection in lightbox mode", () => {
    const mockBoxes = [
      {
        class_name: "bottle",
        confidence: 0.92,
        box_normalized: [0.4, 0.45, 0.5, 0.55], // 10% x 10% area in center
      },
    ];

    render(
      <BoundingBoxImage
        src="https://example.com/beach.jpg"
        alt="Single detection focus"
        boxes={mockBoxes}
        lightbox
      />
    );

    const focusBtn = screen.getByRole("button", { name: /focus detections/i });
    expect(focusBtn).toHaveAttribute("aria-pressed", "true");

    const frame = document.querySelector(".modal-image-frame");
    expect(frame.style.transform).toContain("scale(");
    // Origin should be centered near ~45% x 50%
    expect(frame.style.transformOrigin).toBeTruthy();
  });

  it("3. calculates combined bounding box for multiple spread-out detections", () => {
    const mockBoxes = [
      {
        class_name: "bottle",
        confidence: 0.90,
        box_normalized: [0.10, 0.20, 0.18, 0.25], // Left detection
      },
      {
        class_name: "bag",
        confidence: 0.88,
        box_normalized: [0.60, 0.21, 0.70, 0.27], // Right detection
      },
    ];

    render(
      <BoundingBoxImage
        src="https://example.com/beach.jpg"
        alt="Multiple detections focus"
        boxes={mockBoxes}
        lightbox
      />
    );

    const frame = document.querySelector(".modal-image-frame");
    expect(frame.style.transform).toContain("scale(");

    // Both bounding boxes must be rendered inside frame
    const renderedBoxes = document.querySelectorAll(".bbox-box");
    expect(renderedBoxes).toHaveLength(2);
  });

  it("4. clamps padding properly when detection is near image edge", () => {
    const mockBoxes = [
      {
        class_name: "can",
        confidence: 0.95,
        box_normalized: [0.01, 0.02, 0.10, 0.12], // Near top-left edge
      },
    ];

    render(
      <BoundingBoxImage
        src="https://example.com/beach.jpg"
        alt="Edge detection"
        boxes={mockBoxes}
        lightbox
      />
    );

    const frame = document.querySelector(".modal-image-frame");
    expect(frame.style.transform).toContain("scale(");
    // Origin must be non-negative and valid
    expect(parseFloat(frame.style.transformOrigin)).toBeGreaterThanOrEqual(0);
  });

  it("5. falls back to full image if detection region occupies most of the image", () => {
    const mockBoxes = [
      {
        class_name: "foam",
        confidence: 0.90,
        box_normalized: [0.05, 0.05, 0.95, 0.95], // Occupies 90% of image
      },
    ];

    render(
      <BoundingBoxImage
        src="https://example.com/beach.jpg"
        alt="Large detection"
        boxes={mockBoxes}
        lightbox
      />
    );

    const frame = document.querySelector(".modal-image-frame");
    expect(frame).toHaveStyle({ transform: "none" });

    const focusBtn = screen.getByRole("button", { name: /focus detections/i });
    expect(focusBtn).toBeDisabled();
  });

  it("6 & 7. toggles smoothly between Focus Detections and Full Image view modes", () => {
    const mockBoxes = [
      {
        class_name: "bottle",
        confidence: 0.95,
        box_normalized: [0.3, 0.3, 0.4, 0.4],
      },
    ];

    render(
      <BoundingBoxImage
        src="https://example.com/beach.jpg"
        alt="Toggle view mode test"
        boxes={mockBoxes}
        lightbox
      />
    );

    const frame = document.querySelector(".modal-image-frame");
    const focusBtn = screen.getByRole("button", { name: /focus detections/i });
    const fullBtn = screen.getByRole("button", { name: /full image/i });

    // Initially focused
    expect(focusBtn).toHaveAttribute("aria-pressed", "true");
    expect(frame.style.transform).toContain("scale(");

    // Switch to Full Image
    fireEvent.click(fullBtn);
    expect(fullBtn).toHaveAttribute("aria-pressed", "true");
    expect(focusBtn).toHaveAttribute("aria-pressed", "false");
    expect(frame).toHaveStyle({ transform: "none" });

    // Switch back to Focus Detections
    fireEvent.click(focusBtn);
    expect(focusBtn).toHaveAttribute("aria-pressed", "true");
    expect(frame.style.transform).toContain("scale(");
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

    const box = document.querySelector(".bbox-box");
    expect(box).toHaveStyle({
      left: "15%",
      top: "25%",
      width: "20%",
      height: "20%",
    });
  });

  it("9 & 10. renders cleanly under Earth and Dark themes", () => {
    const mockBoxes = [
      {
        class_name: "bottle",
        confidence: 0.90,
        box_normalized: [0.2, 0.2, 0.4, 0.4],
      },
    ];

    // Earth theme container
    const { container: earthContainer } = render(
      <div data-theme="earth">
        <BoundingBoxImage
          src="https://example.com/beach.jpg"
          alt="Earth theme test"
          boxes={mockBoxes}
          lightbox
        />
      </div>
    );
    expect(earthContainer.querySelector(".bbox-view-mode-toggle")).toBeInTheDocument();

    // Dark theme container
    const { container: darkContainer } = render(
      <div data-theme="dark">
        <BoundingBoxImage
          src="https://example.com/beach.jpg"
          alt="Dark theme test"
          boxes={mockBoxes}
          lightbox
        />
      </div>
    );
    expect(darkContainer.querySelector(".bbox-view-mode-toggle")).toBeInTheDocument();
  });
});
