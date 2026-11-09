import type { ActivityItem } from "./dashboardUtils";

// Últimos movimientos del negocio, mezclados y ordenados por fecha.
export default function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <h3 className="text-sm font-semibold text-slate-700">
        Actividad reciente
      </h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Sin actividad todavía.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.accent}`}
              >
                <item.icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-slate-700">{item.text}</p>
                <p className="text-xs text-slate-500">
                  {new Date(item.date).toLocaleString("es-CO", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
