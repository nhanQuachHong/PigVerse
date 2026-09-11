import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";
import { FormField } from "./form-field";

describe("shared frontend components", () => {
  it("connects field errors to the input", () => {
    render(<FormField error="Required" label="Name" name="name" />);
    expect(screen.getByLabelText("Name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Name")).toHaveAccessibleDescription(
      "Required",
    );
  });

  it("uses a real button with a stable default type", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
      "type",
      "button",
    );
  });
});
