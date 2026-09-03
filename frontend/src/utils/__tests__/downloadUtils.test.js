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

  it("handles downloadJson properly", async () => {
    let capturedLink = null;
    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === "a") {
        el.click = clickSpy;
        capturedLink = el;
      }
      return el;
    });

    const testData = { foo: "bar", count: 42, nested: { item: "bottle" } };
    downloadJson(testData, "test.json");

    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    const blob = global.URL.createObjectURL.mock.calls[0][0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/json");

    const text = await blob.text();
    expect(JSON.parse(text)).toEqual(testData);
    expect(capturedLink.download).toBe("test.json");
    expect(clickSpy).toHaveBeenCalled();
  });

  it("handles downloadCsv properly", async () => {
    let capturedLink = null;
    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === "a") {
        el.click = clickSpy;
        capturedLink = el;
      }
      return el;
    });

    downloadCsv(["ID", "Name", "Score"], [["1", "Beach A", "8.5"], ["2", "Beach B", "4.0"]], "test.csv");

    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    const blob = global.URL.createObjectURL.mock.calls[0][0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toContain("text/csv");

    const text = await blob.text();
    expect(text).toBe("ID,Name,Score\n1,Beach A,8.5\n2,Beach B,4.0");
    expect(capturedLink.download).toBe("test.csv");
    expect(clickSpy).toHaveBeenCalled();
  });

  it("handles downloadMarkdown properly", async () => {
    let capturedLink = null;
    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === "a") {
        el.click = clickSpy;
        capturedLink = el;
      }
      return el;
    });

    const markdownText = "# Littora Report\n\n- Total scans: 42\n- Status: Active";
    downloadMarkdown(markdownText, "report.md");

    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    const blob = global.URL.createObjectURL.mock.calls[0][0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toContain("text/markdown");

    const text = await blob.text();
    expect(text).toBe(markdownText);
    expect(capturedLink.download).toBe("report.md");
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
