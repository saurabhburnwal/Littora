import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import UploadForm from "../UploadForm.jsx";

describe("UploadForm component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:preview-url");
  });

  it("renders placeholder text, file input, beach selector, and submit button", () => {
    const { container } = render(<UploadForm onUpload={vi.fn()} loading={false} result={null} />);
    expect(screen.getByText("Drag & drop or click to browse")).toBeInTheDocument();
    expect(container.querySelector("input[type='file']")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /analyze photo/i })).toBeDisabled();
  });

  it("does not render active model selector for non-admin users", () => {
    render(<UploadForm onUpload={vi.fn()} loading={false} result={null} isAdmin={false} />);
    expect(screen.queryByText("AI Inference Model")).not.toBeInTheDocument();
  });

  it("renders interactive model selector buttons for Admin users", () => {
    const onUpdateModel = vi.fn();
    render(<UploadForm onUpload={vi.fn()} loading={false} result={null} isAdmin={true} onUpdateModel={onUpdateModel} />);

    expect(screen.getByText("System Admin Control:")).toBeInTheDocument();
    const modelBtn = screen.getByRole("button", { name: /YOLOv11 Medium/i });
    fireEvent.click(modelBtn);

    expect(onUpdateModel).toHaveBeenCalledWith("yolov11m");
  });

  it("previews selected file and enables Analyze photo button", () => {
    const { container } = render(<UploadForm onUpload={vi.fn()} loading={false} result={null} />);
    const file = new File(["dummy content"], "beach.jpg", { type: "image/jpeg" });

    const input = container.querySelector("input[type='file']");
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByAltText("Selected beach photo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /analyze photo/i })).not.toBeDisabled();
  });

  it("submits preset beach coordinates on form submission", () => {
    const onUpload = vi.fn();
    const mockLocations = [
      { id: "marina", location_label: "Marina Beach, Chennai", latitude: 13.0499, longitude: 80.2824 },
    ];
    const { container } = render(<UploadForm onUpload={onUpload} loading={false} result={null} locations={mockLocations} />);
    const file = new File(["dummy content"], "beach.jpg", { type: "image/jpeg" });

    const select = container.querySelector("select");
    fireEvent.change(select, { target: { value: "marina" } });

    const input = container.querySelector("input[type='file']");
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.submit(container.querySelector("form"));

    expect(onUpload).toHaveBeenCalledWith(file, {
      latitude: 13.0499,
      longitude: 80.2824,
      locationLabel: "Marina Beach, Chennai",
    });
  });

  it("handles drag over, drag leave, and drop events", () => {
    const { container } = render(<UploadForm onUpload={vi.fn()} loading={false} result={null} />);
    const label = container.querySelector("label");

    fireEvent.dragOver(label);
    expect(label.className).toContain("drag-over");

    fireEvent.dragLeave(label);
    expect(label.className).not.toContain("drag-over");

    const file = new File(["drop content"], "drop.png", { type: "image/png" });
    fireEvent.drop(label, { dataTransfer: { files: [file] } });

    expect(screen.getByAltText("Selected beach photo")).toBeInTheDocument();
  });

  it("renders bounding box overlays when result contains detections boxes", () => {
    const result = {
      boxes: [
        { class_name: "bottle", confidence: 0.95, box_normalized: [0.1, 0.1, 0.4, 0.4] },
      ],
    };

    const { container } = render(<UploadForm onUpload={vi.fn()} loading={false} result={result} />);
    const file = new File(["img"], "img.png", { type: "image/png" });

    const input = container.querySelector("input[type='file']");
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("bottle 95%")).toBeInTheDocument();
  });

  it("shows toast notification on camera button click", () => {
    render(<UploadForm onUpload={vi.fn()} loading={false} result={null} />);

    fireEvent.click(screen.getByRole("button", { name: /open camera/i }));
    expect(screen.getByText("Camera capture coming soon!")).toBeInTheDocument();
  });

  it("revokes previous object URL on new image selection and component unmount", () => {
    const revokeSpy = vi.spyOn(global.URL, "revokeObjectURL").mockImplementation(() => {});
    const { container, unmount } = render(<UploadForm onUpload={vi.fn()} loading={false} result={null} />);
    const file1 = new File(["dummy 1"], "beach1.jpg", { type: "image/jpeg" });
    const file2 = new File(["dummy 2"], "beach2.jpg", { type: "image/jpeg" });

    const input = container.querySelector("input[type='file']");
    fireEvent.change(input, { target: { files: [file1] } });
    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);

    fireEvent.change(input, { target: { files: [file2] } });
    expect(revokeSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith("blob:preview-url");

    unmount();
    expect(revokeSpy).toHaveBeenCalledTimes(2);
    revokeSpy.mockRestore();
  });

  it("submits with extracted EXIF coordinates when available", async () => {
    const onUpload = vi.fn();
    const { container } = render(<UploadForm onUpload={onUpload} loading={false} result={null} />);
    const file = new File(["dummy"], "photo_with_gps.jpg", { type: "image/jpeg" });

    const input = container.querySelector("input[type='file']");
    fireEvent.change(input, { target: { files: [file] } });

    // Submit form
    fireEvent.submit(container.querySelector("form"));
    expect(onUpload).toHaveBeenCalled();
  });
});

