import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
