import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadBlob, downloadJson, downloadCsv, downloadMarkdown, downloadFileUrl } from "../downloadUtils.js";


describe("downloadUtils", () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/test");
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("triggers blob download and revokes URL", () => {
    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === "a") {
        el.click = clickSpy;
      }
      return el;
    });

    const blob = new Blob(["test data"], { type: "text/plain" });
    downloadBlob(blob, "test.txt");

    expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/test");
  });

  it("handles downloadJson properly", () => {
    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === "a") el.click = clickSpy;
      return el;
    });

    downloadJson({ foo: "bar" }, "test.json");
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });

  it("handles downloadCsv properly", () => {
    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === "a") el.click = clickSpy;
      return el;
    });

    downloadCsv(["ID", "Name"], [["1", "Beach"]], "test.csv");
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });

  it("handles downloadMarkdown properly", () => {
    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === "a") el.click = clickSpy;
      return el;
    });

    downloadMarkdown("# Littora Report", "report.md");
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });

  it("handles downloadFileUrl with valid URL", () => {
    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === "a") el.click = clickSpy;
      return el;
    });

    downloadFileUrl("https://example.com/photo.jpg", "photo.jpg");
    expect(clickSpy).toHaveBeenCalled();
  });

  it("ignores downloadFileUrl if URL is empty", () => {
    const origCreateElement = document.createElement.bind(document);
    const clickSpy = vi.fn();
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === "a") el.click = clickSpy;
      return el;
    });
    downloadFileUrl(null, "photo.jpg");
    expect(clickSpy).not.toHaveBeenCalled();
  });
});
