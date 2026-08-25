import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import SectionHeader from "../SectionHeader.jsx";

describe("SectionHeader component", () => {
  it("renders title correctly", () => {
    render(<SectionHeader title="Photo Gallery" />);
    const heading = screen.getByRole("heading", { level: 2, name: /photo gallery/i });
    expect(heading).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    render(
      <SectionHeader
        title="Analysis Records"
        subtitle="Cataloged detection scans and pollution assessments"
      />
    );
    expect(screen.getByText("Cataloged detection scans and pollution assessments")).toBeInTheDocument();
  });

  it("renders action element on the right when provided", () => {
    render(
      <SectionHeader
        title="Recent Detections"
        action={<button type="button">Export CSV</button>}
      />
    );
    expect(screen.getByRole("button", { name: /export csv/i })).toBeInTheDocument();
  });

  it("applies custom className when provided", () => {
    const { container } = render(
      <SectionHeader
        title="Waste Composition"
        className="custom-margin"
      />
    );
    expect(container.firstChild).toHaveClass("custom-margin");
  });

  it("renders nothing when all props are empty", () => {
    const { container } = render(<SectionHeader />);
    expect(container.firstChild).toBeNull();
  });
});
