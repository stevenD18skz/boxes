"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { isSimulationOn, stopSimulation } from "@/lib/simulation/store";
import AuthShell from "@/components/auth/AuthShell";
import SubmitButton from "@/components/auth/SubmitButton";
import {
  AuthError,
  AuthField,
  PasswordField,
} from "@/components/auth/AuthField";

export default function SignupPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [dueno, setDueno] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Se avisa en el momento en que las dos contraseñas dejan de coincidir, pero
  // solo cuando ya se escribió algo en la confirmación: marcarlo desde la
  // primera letra sería regañar a alguien que todavía está escribiendo.
  const mismatch = confirm !== "" && password !== confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, dueno, email, password }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message || "No se pudo crear la tienda");
        return;
      }
      // Misma razón que en /login: una tienda nueva real no debe quedar
      // tapada por una simulación que haya quedado encendida en la pestaña.
      if (isSimulationOn()) stopSimulation();

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      accent="teal"
      title="Crea tu tienda"
      subtitle="Arranca vacía y separada de cualquier otra tienda. Toma menos de un minuto."
      footer={
        <p className="text-center text-sm text-slate-600">
          ¿Ya tienes una tienda?{" "}
          <Link
            href="/login"
            className="rounded font-semibold text-teal-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            Entrar
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthField
          id="nombre"
          label="Nombre de la tienda"
          hint="Así aparece arriba en la app y en los recibos."
          type="text"
          autoComplete="organization"
          autoFocus
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Mi tienda"
        />

        <AuthField
          id="dueno"
          label="Tu nombre"
          type="text"
          autoComplete="name"
          required
          value={dueno}
          onChange={(e) => setDueno(e.target.value)}
          placeholder="Ej. Marta Gómez"
        />

        <AuthField
          id="email"
          label="Correo electrónico"
          hint="Con este correo y tu contraseña vas a entrar."
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tucorreo@ejemplo.com"
        />

        <PasswordField
          id="password"
          label="Contraseña"
          hint="Mínimo 8 caracteres."
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        <div>
          <PasswordField
            id="confirm"
            label="Confirmar contraseña"
            autoComplete="new-password"
            required
            minLength={8}
            invalid={mismatch}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
          {mismatch && (
            <p className="mt-1.5 text-xs font-semibold text-red-600">
              Las dos contraseñas deben ser iguales.
            </p>
          )}
        </div>

        <AuthError message={error} />

        <SubmitButton
          accent="teal"
          loading={submitting}
          loadingLabel="Creando..."
        >
          Crear tienda
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
