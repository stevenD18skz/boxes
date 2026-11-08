"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { isSimulationOn, stopSimulation } from "@/lib/simulation/store";
import AuthShell from "@/components/auth/AuthShell";
import SubmitButton from "@/components/auth/SubmitButton";
import {
  AuthError,
  AuthField,
  PasswordField,
} from "@/components/auth/AuthField";

// Mismo patrón que usa el input type="email" del navegador: alcanza para
// descartar "prueba1" sin ser tan estricto como para rechazar un correo real.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value) {
  const trimmed = value.trim();
  if (!trimmed) return "Escribe tu correo electrónico";
  if (!EMAIL_RE.test(trimmed)) return "Ese correo no parece válido";
  return "";
}

function validatePassword(value) {
  if (!value) return "Escribe tu contraseña";
  return "";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  // Errores que no señalan un campo puntual (red caída, servidor caído): van
  // aparte, en el cartel general.
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleEmailBlur = () => {
    if (email) setEmailError(validateEmail(email));
  };
  const handlePasswordBlur = () => {
    if (password) setPasswordError(validatePassword(password));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const emailMsg = validateEmail(email);
    const passwordMsg = validatePassword(password);
    setEmailError(emailMsg);
    setPasswordError(passwordMsg);

    if (emailMsg) {
      emailRef.current?.focus();
      return;
    }
    if (passwordMsg) {
      passwordRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const code = body?.error?.code;
        const message = body?.error?.message || "No se pudo iniciar sesión";
        const details = body?.error?.details;
        if (code === "invalid_credentials") {
          // El servidor no dice cuál de los dos falló (a propósito), así que
          // el aviso va en la contraseña, que es lo que se suele corregir.
          setPasswordError(message);
          passwordRef.current?.focus();
        } else if (code === "invalid_payload" && details) {
          // Validación que el propio servidor rechazó (p. ej. un correo
          // pegado con más de 200 caracteres, algo que el front no cubre):
          // el detalle ya viene separado por campo.
          if (details.email) setEmailError(details.email);
          if (details.password) setPasswordError(details.password);
          (details.email ? emailRef : passwordRef).current?.focus();
        } else {
          // Error inesperado del servidor (caído, sin base de datos, etc.):
          // no hay un campo culpable, así que va en el cartel general.
          setFormError(message);
        }
        return;
      }
      // Si esta pestaña había quedado con la simulación encendida, un login
      // real debe ganarle: si no, la cookie/sessionStorage de simulación
      // siguen mandando y el dashboard sigue mostrando datos de mentira.
      if (isSimulationOn()) stopSimulation();

      const from = searchParams.get("from");
      router.replace(from && from.startsWith("/") ? from : "/dashboard");
      router.refresh();
    } catch {
      setFormError("No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  // Cuando el middleware manda acá por entrar a una pantalla protegida, se dice
  // por qué: sin eso, un redirect silencioso a login se lee como un error.
  const redirected = Boolean(searchParams.get("from"));

  return (
    <AuthShell
      title="Entra a tu tienda"
      subtitle={
        redirected
          ? "Para abrir esa pantalla primero hay que iniciar sesión."
          : "Con tu correo y tu contraseña."
      }
      footer={
        <p className="text-center text-sm text-slate-600">
          ¿Todavía no tienes tienda?{" "}
          <Link
            href="/signup"
            className="rounded font-semibold text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Crear una
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthField
          ref={emailRef}
          id="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          autoFocus
          required
          error={emailError}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError("");
            if (formError) setFormError("");
          }}
          onBlur={handleEmailBlur}
          placeholder="tucorreo@ejemplo.com"
        />

        <PasswordField
          ref={passwordRef}
          id="password"
          label="Contraseña"
          autoComplete="current-password"
          required
          error={passwordError}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (passwordError) setPasswordError("");
            if (formError) setFormError("");
          }}
          onBlur={handlePasswordBlur}
          placeholder="••••••••"
        />

        <AuthError message={formError} />

        <SubmitButton loading={submitting} loadingLabel="Entrando...">
          Entrar
        </SubmitButton>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
