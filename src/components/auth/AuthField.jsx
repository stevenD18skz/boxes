"use client";

import { forwardRef, useState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

const base =
  "w-full rounded-lg border bg-white px-3.5 text-[15px] text-slate-900 outline-none transition-colors placeholder:text-slate-500 focus:ring-4";
// 48px de alto: por debajo de 44px el dedo falla, y en iOS un input con texto
// menor a 16px hace que el navegador acerque la página al enfocarlo.
const size = "min-h-[48px]";

const tone = (invalid) =>
  invalid
    ? "border-red-300 focus:border-red-500 focus:ring-red-100"
    : "border-slate-300 focus:border-blue-500 focus:ring-blue-100";

// El error se muestra pegado a su campo, no solo en un cartel al final del
// formulario: si hay dos inputs y un solo error abajo del todo, no queda
// claro cuál de los dos hay que corregir.
function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-600"
    >
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

export const AuthField = forwardRef(function AuthField(
  { id, label, hint, error, invalid = false, className = "", ...inputProps },
  ref
) {
  const isInvalid = invalid || !!error;
  const errorId = `${id}-error`;
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={isInvalid || undefined}
        aria-describedby={error ? errorId : undefined}
        className={`${base} ${size} ${tone(isInvalid)} ${className}`}
        {...inputProps}
      />
      {hint && !error && (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
});

// Campo de contraseña con el ojo para ver lo que se escribió. En un mostrador
// se teclea con una mano y con prisa: sin esto, un error de dedo solo se
// descubre cuando el login falla.
export const PasswordField = forwardRef(function PasswordField(
  { id, label, hint, error, invalid = false, ...inputProps },
  ref
) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  const isInvalid = invalid || !!error;
  const errorId = `${id}-error`;

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={isInvalid || undefined}
          aria-describedby={error ? errorId : undefined}
          className={`${base} ${size} ${tone(isInvalid)} pr-12`}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </button>
      </div>
      {hint && !error && (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
});

// El aviso de error se anuncia solo a los lectores de pantalla: quien no ve la
// pantalla se enteraría del fallo únicamente al volver a recorrer el
// formulario.
export function AuthError({ message }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}
