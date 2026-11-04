import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("Autofarm welcome screen", () => {
  it("introduces the game and previews its farm", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /welcome to autofarm/i })).toBeTruthy();
    expect(screen.getByLabelText("A preview of the farm")).toBeTruthy();
  });
});
