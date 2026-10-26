"use client";
import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

export function AuthField({
  label,
  name,
  error,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  error?: string;
  hint?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  // La visibilidad se controla únicamente en los campos de contraseña.
  const isPassword = props.type === "password";

  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <div className={isPassword ? "relative" : undefined}>
        <input
          {...props}
          id={name}
          name={name}
          type={isPassword && showPassword ? "text" : props.type}
          required
          className={isPassword ? "field pr-12" : "field"}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={
              showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
            }
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-1 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-(--text-secondary)  hover:text-(--brand-secondary)"
          >
            {showPassword ? (
              <EyeOff size={20} aria-hidden="true" />
            ) : (
              <Eye size={20} aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {hint && <p className="mt-1 text-xs text-(--text-secondary)">{hint}</p>}
      {error && (
        <p id={`${name}-error`} className="mt-1 text-xs text-(--action-danger)">
          {error}
        </p>
      )}
    </div>
  );
}
