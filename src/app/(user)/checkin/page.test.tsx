import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CheckinPage from "./page";
import { vi } from "vitest";

// Mocking the API call
const mockCheckin = vi.fn();
vi.mock("/api/checkin", () => ({
  default: mockCheckin,
}));

// Mocking the actual API response if the page uses a separate fetch call
global.fetch = vi.fn();

describe("Guest Check-in Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles valid guest check-in: Form -> API call -> Receipt screen", async () => {
    const user = userEvent.setup();
    const mockToken = "test-token-123";

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tokenId: mockToken }),
    });

    render(<CheckinPage />);

    const vehicleInput = screen.getByLabelText(/vehicle number/i);
    const submitButton = screen.getByRole("button", { name: /check in/i });

    await user.type(vehicleInput, "ABC-1234");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(new RegExp(mockToken, "i"))).toBeInTheDocument();
    });
    expect(screen.getByText(/check-in successful/i)).toBeInTheDocument();
  });

  it("shows validation error when required fields are missing", async () => {
    const user = userEvent.setup();
    render(<CheckinPage />);

    const submitButton = screen.getByRole("button", { name: /check in/i });
    await user.click(submitButton);

    expect(screen.getByText(/vehicle number is required/i)).toBeInTheDocument();
  });

  it("handles API failure (500) and shows appropriate error state", async () => {
    const user = userEvent.setup();

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<CheckinPage />);

    const vehicleInput = screen.getByLabelText(/vehicle number/i);
    const submitButton = screen.getByRole("button", { name: /check in/i });

    await user.type(vehicleInput, "ABC-1234");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/please try again later/i)).toBeInTheDocument();
    });
  });

  it("verifies receipt state and Close button functionality", async () => {
    const user = userEvent.setup();
    const mockToken = "receipt-token-456";

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tokenId: mockToken }),
    });

    render(<CheckinPage />);

    const vehicleInput = screen.getByLabelText(/vehicle number/i);
    const submitButton = screen.getByRole("button", { name: /check in/i });

    await user.type(vehicleInput, "ABC-1234");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(new RegExp(mockToken, "i"))).toBeInTheDocument();
    });

    const closeButton = screen.getByRole("button", { name: /close/i });
    await user.click(closeButton);

    await waitFor(() => {
      expect(
        screen.queryByText(new RegExp(mockToken, "i")),
      ).not.toBeInTheDocument();
      expect(screen.getByLabelText(/vehicle number/i)).toBeInTheDocument();
    });
  });
});
