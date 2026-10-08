import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

const BUTTON_VARIANTS = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition-colors
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600
        disabled:cursor-not-allowed disabled:opacity-50
        ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string };

export function TextField({ label, id, ...props }: TextFieldProps) {
  // Links the label to its input, so clicking the label focuses the field
  // and screen readers announce it
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        {...props}
        id={inputId}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-xs
          focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
      />
    </div>
  );
}