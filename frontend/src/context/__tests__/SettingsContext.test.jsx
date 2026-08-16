import { render, screen, fireEvent, renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SettingsProvider, useSettings } from "../SettingsContext.jsx";

function TestConsumer({ sampleDate = "2026-08-07T12:00:00Z" }) {
  const {
    language, setLanguage,
    dateFormat, setDateFormat,
    itemsPerPage, setItemsPerPage,
    notifications, setNotifications,
    formatDate,
  } = useSettings();

  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="df">{dateFormat}</span>
      <span data-testid="ipp">{itemsPerPage}</span>
      <span data-testid="formatted-date">{formatDate(sampleDate)}</span>
      <span data-testid="notifs">{JSON.stringify(notifications)}</span>

      <button onClick={() => setLanguage("hi")}>Set Hindi</button>
      <button onClick={() => setDateFormat("MM/DD/YYYY")}>Set MM/DD/YYYY</button>
      <button onClick={() => setDateFormat("YYYY-MM-DD")}>Set YYYY-MM-DD</button>
      <button onClick={() => setItemsPerPage("25")}>Set 25 IPP</button>
      <button onClick={() => setNotifications({ email: false, highPollution: true, weekly: true })}>Set Notifs</button>
    </div>
  );
}

describe("SettingsContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("throws error when useSettings is used outside <SettingsProvider>", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useSettings())).toThrow("useSettings must be used inside <SettingsProvider>");
    spy.mockRestore();
  });

  it("provides default settings and formats dates using default format (DD MMM YYYY)", () => {
    render(
      <SettingsProvider>
        <TestConsumer sampleDate="2026-08-07T12:00:00Z" />
      </SettingsProvider>
    );

    expect(screen.getByTestId("lang").textContent).toBe("en");
    expect(screen.getByTestId("df").textContent).toBe("DD MMM YYYY");
    expect(screen.getByTestId("ipp").textContent).toBe("10");
    expect(screen.getByTestId("formatted-date").textContent).toBe("07 Aug 2026");
  });

  it("updates date format and formats dates according to selected format (MM/DD/YYYY and YYYY-MM-DD)", () => {
    render(
      <SettingsProvider>
        <TestConsumer sampleDate="2026-08-07T12:00:00Z" />
      </SettingsProvider>
    );

    fireEvent.click(screen.getByText("Set MM/DD/YYYY"));
    expect(screen.getByTestId("df").textContent).toBe("MM/DD/YYYY");
    expect(screen.getByTestId("formatted-date").textContent).toBe("08/07/2026");

    fireEvent.click(screen.getByText("Set YYYY-MM-DD"));
    expect(screen.getByTestId("df").textContent).toBe("YYYY-MM-DD");
    expect(screen.getByTestId("formatted-date").textContent).toBe("2026-08-07");
  });

  it("updates language, items per page, and notifications", () => {
    render(
      <SettingsProvider>
        <TestConsumer />
      </SettingsProvider>
    );

    fireEvent.click(screen.getByText("Set Hindi"));
    expect(screen.getByTestId("lang").textContent).toBe("hi");

    fireEvent.click(screen.getByText("Set 25 IPP"));
    expect(screen.getByTestId("ipp").textContent).toBe("25");

    fireEvent.click(screen.getByText("Set Notifs"));
    expect(screen.getByTestId("notifs").textContent).toContain('"email":false');
  });

  it("formatDate handles empty input and invalid dates cleanly", () => {
    let testFormatDate;
    function CustomDateConsumer() {
      const { formatDate } = useSettings();
      testFormatDate = formatDate;
      return null;
    }

    render(
      <SettingsProvider>
        <CustomDateConsumer />
      </SettingsProvider>
    );

    expect(testFormatDate(null)).toBe("—");
    expect(testFormatDate("")).toBe("—");
    expect(testFormatDate("invalid-date-string")).toBe("invalid-date-string");
  });
});
