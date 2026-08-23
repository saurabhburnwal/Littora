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
});
