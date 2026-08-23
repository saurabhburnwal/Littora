import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import FilterToolbar from "../FilterToolbar.jsx";

describe("FilterToolbar component", () => {
  it("renders search input and triggers onSearchChange on typing", () => {
    const handleSearchChange = vi.fn();
    render(
      <FilterToolbar
        searchQuery="Goa"
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search beaches..."
      />
    );

    const input = screen.getByPlaceholderText("Search beaches...");
    expect(input).toHaveValue("Goa");

    fireEvent.change(input, { target: { value: "Kovalam" } });
    expect(handleSearchChange).toHaveBeenCalledWith("Kovalam");
  });

  it("clears search query when clear button is clicked", () => {
    const handleSearchChange = vi.fn();
    render(
      <FilterToolbar
        searchQuery="Plastic"
        onSearchChange={handleSearchChange}
      />
    );

    const clearBtn = screen.getByRole("button", { name: /clear search query/i });
    fireEvent.click(clearBtn);
    expect(handleSearchChange).toHaveBeenCalledWith("");
  });

  it("opens and toggles filter panel on button click", () => {
    render(
      <FilterToolbar activeFilterCount={2}>
        <div data-testid="filter-child-content">Severity Options</div>
      </FilterToolbar>
    );

    const filterBtn = screen.getByRole("button", { name: /toggle filters/i });
    expect(screen.queryByTestId("filter-child-content")).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(filterBtn);
    expect(screen.getByTestId("filter-child-content")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Click to close
    fireEvent.click(filterBtn);
    expect(screen.queryByTestId("filter-child-content")).not.toBeInTheDocument();
  });

  it("closes filter panel on Escape key", () => {
    render(
      <FilterToolbar>
        <div data-testid="filter-child-content">Filter body</div>
      </FilterToolbar>
    );

    const filterBtn = screen.getByRole("button", { name: /toggle filters/i });
    fireEvent.click(filterBtn);
    expect(screen.getByTestId("filter-child-content")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("filter-child-content")).not.toBeInTheDocument();
  });

  it("renders active filter chips and handles individual removal and clear all", () => {
    const handleRemoveHigh = vi.fn();
    const handleRemoveGoa = vi.fn();
    const handleClearAll = vi.fn();

    const activeChips = [
      { id: "sev-high", label: "Severity: High", onRemove: handleRemoveHigh },
      { id: "loc-goa", label: "Location: Goa", onRemove: handleRemoveGoa },
    ];

    render(
      <FilterToolbar
        activeFilterCount={2}
        activeChips={activeChips}
        onClearAll={handleClearAll}
      />
    );

    expect(screen.getByText("Severity: High")).toBeInTheDocument();
    expect(screen.getByText("Location: Goa")).toBeInTheDocument();

    // Remove single chip
    const removeHighBtn = screen.getByRole("button", { name: /remove filter severity: high/i });
    fireEvent.click(removeHighBtn);
    expect(handleRemoveHigh).toHaveBeenCalledTimes(1);

    // Clear all
    const clearAllBtn = screen.getByRole("button", { name: /clear all/i });
    fireEvent.click(clearAllBtn);
    expect(handleClearAll).toHaveBeenCalledTimes(1);
  });
});
