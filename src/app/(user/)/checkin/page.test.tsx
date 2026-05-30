import { render } from "@testing-library/react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import CheckinPage from "./page";

// Mock the global fetch
global.fetch = jest.fn();

describe("CheckinPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the guest check-in form initially", async () => {
    const { container } = render(<CheckinPage />);
    expect(screen.getByText(/Guest Check-in/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Vehicle Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Vehicle Type/i)).toBeInTheDocument();
  });

  it("shows validation error when vehicle number is empty", async () => {
    render(<CheckinPage />);
    const submitButton = screen.getByRole("button", { name: /Check-in/i });
    fireEvent.click(submitButton);
    expect(
      await screen.findByText(/Vehicle number is required/i),
    ).toBeInTheDocument();
  });

  it("transitions to receipt screen on successful check-in", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tokenId: "TKN-12345" }),
    });

    render(<CheckinPage />);

    fireEvent.change(screen.getByLabelText(/Vehicle Number/i), {
      target: { value: "KA01AB1234" },
    });
    fireEvent.change(screen.getByLabelText(/Vehicle Type/i), {
      target: { value: "FOUR_WHEELER" },
    });

    const submitButton = screen.getByRole("button", { name: /Check-in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Check-in Successful/i)).toBeInTheDocument();
      expect(screen.getByText("TKN-12345")).toBeInTheDocument();
    });
  });

  it("shows error message on API failure", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<CheckinPage />);

    fireEvent.change(screen.getByLabelText(/Vehicle Number/i), {
      target: { value: "KA01AB1234" },
    });

    const submitButton = screen.getByRole("button", { name: /Check-in/i });
    fireEvent.click(submitButton);

    expect(
      await screen.findByText(/Something went wrong/i),
    ).toBeInTheDocument();
  });
});
