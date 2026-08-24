import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LogOut, Trash2 } from "lucide-react";
import ConfirmModal from "../ConfirmModal.jsx";

describe("ConfirmModal component", () => {
  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <ConfirmModal
        isOpen={false}
        title="Confirm Sign Out"
        message="Are you sure you want to log out?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders modal with primary variant (Sign Out dialog)", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        title="Confirm Sign Out"
        message="Are you sure you want to log out of your Littora account?"
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        confirmVariant="primary"
        icon={LogOut}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByRole("dialog", { name: "Confirm Sign Out" })).toBeInTheDocument();
    expect(screen.getByText("Confirm Sign Out")).toBeInTheDocument();
    expect(screen.getByText("Are you sure you want to log out of your Littora account?")).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    expect(cancelBtn).toHaveClass("admin-modal-cancel");

    const confirmBtn = screen.getByRole("button", { name: "Sign Out" });
    expect(confirmBtn).toHaveClass("admin-modal-primary");

    // Click confirm
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);

    // Click cancel
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("renders modal with danger variant (Delete dialog)", () => {
    const onConfirm = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        title="Delete Record"
        message="This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        icon={Trash2}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    const deleteBtn = screen.getByRole("button", { name: /delete/i });
    expect(deleteBtn).toHaveClass("admin-modal-confirm");
    expect(document.querySelector(".admin-modal-icon-badge--danger")).toBeInTheDocument();
  });

  it("closes when clicking backdrop", () => {
    const onCancel = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        title="Confirm Sign Out"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    const backdrop = document.querySelector(".admin-modal-backdrop");
    fireEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("does not close when clicking inside the dialog", () => {
    const onCancel = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        title="Confirm Sign Out"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    const modal = document.querySelector(".admin-modal");
    fireEvent.click(modal);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("closes when Escape key is pressed", () => {
    const onCancel = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        title="Confirm Sign Out"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("renders cleanly under Earth and Dark themes", () => {
    const { container: earthContainer } = render(
      <div data-theme="earth">
        <ConfirmModal
          isOpen={true}
          title="Confirm Sign Out"
          confirmVariant="primary"
          icon={LogOut}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </div>
    );
    expect(earthContainer.querySelector(".admin-modal-icon-badge--primary")).toBeInTheDocument();

    const { container: darkContainer } = render(
      <div data-theme="dark">
        <ConfirmModal
          isOpen={true}
          title="Confirm Sign Out"
          confirmVariant="primary"
          icon={LogOut}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </div>
    );
    expect(darkContainer.querySelector(".admin-modal-icon-badge--primary")).toBeInTheDocument();
  });
});
