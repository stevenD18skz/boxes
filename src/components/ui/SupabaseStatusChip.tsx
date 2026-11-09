"use client";

import { useSupabaseStatus } from "@/hooks/useSupabaseStatus";

const SupabaseLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 109 113"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden
  >
    <path
      d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.319L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z"
      fill="currentColor"
    />
    <path
      d="M45.317 2.07103C48.1765 -1.53037 53.9745 0.442937 54.0434 5.03648L54.4849 72.2922L9.83113 72.2922C1.64038 72.2922 -2.92775 62.8321 2.16544 56.4175L45.317 2.07103Z"
      fill="currentColor"
    />
  </svg>
);

export default function SupabaseStatusChip() {
  const status = useSupabaseStatus();
  const isConnected = status === "connected";
  const isChecking = status === "checking";

  const label = isChecking
    ? "Conectando..."
    : isConnected
      ? "Conectado"
      : "Desconectado";

  return (
    <div
      title={`Supabase: ${label}`}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        isConnected
          ? "border-[#3ECF8E]/30 bg-[#3ECF8E]/10 text-[#3ECF8E]"
          : "border-slate-200 bg-slate-50 text-slate-500"
      }`}
    >
      <SupabaseLogo
        className={`h-3.5 w-3.5 ${isChecking ? "animate-pulse" : ""}`}
      />
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}
