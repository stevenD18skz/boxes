// ExpensesPage.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from "@/services/expenses.service";
import { useToasts } from "@/hooks/useToasts";

import { Plus, Wallet } from "lucide-react";

import DeleteExpenseDialog from "@/components/expenses/DeleteExpenseDialog";
import ExpenseFilters from "@/components/expenses/ExpenseFilters";
import ExpenseFormModal from "@/components/expenses/ExpenseFormModal";
import ExpenseSummaryCards from "@/components/expenses/ExpenseSummaryCards";
import ExpenseToasts from "@/components/expenses/ExpenseToasts";
import ExpensesTable from "@/components/expenses/ExpensesTable";
import { PAGE_SIZE, emptyDraft } from "@/components/expenses/expensesUtils";
import { matchesText } from "@/lib/text";

/*
  ExpensesPage
  - Módulo de gastos y movimientos de caja. Nace de las columnas GASTO,
    DENTRADA y SALIDA de Hoja1 del Excel de 2025.
  - El Excel guardaba un único total de gasto por día, sin concepto. Por eso los
    registros importados llegan con un concepto genérico y una nota que lo
    advierte: de aquí en adelante la idea es detallarlos uno por uno.
  - Entrada y salida son movimientos de caja por fuera de las ventas. Solo se
    llevaron de enero a abril de 2025.
  - Esta página coordina el estado; el dibujo vive en components/expenses.
*/

export default function ExpensesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // filtros
  const [kindFilter, setKindFilter] = useState("todos");
  const [monthFilter, setMonthFilter] = useState("todos");
  const [yearFilter, setYearFilter] = useState("todos");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  // formulario
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { toasts, push, dismiss } = useToasts();

  const reload = async () => {
    const data = await getExpenses();
    setItems([...data]);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getExpenses();
        if (alive) setItems([...data]);
      } catch {
        if (alive) push("No se pudieron cargar los gastos", "error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const years = useMemo(() => {
    const set = new Set(items.map((e) => e.date.slice(0, 4)));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((e) => {
      if (kindFilter !== "todos" && e.kind !== kindFilter) return false;
      if (yearFilter !== "todos" && e.date.slice(0, 4) !== yearFilter)
        return false;
      if (monthFilter !== "todos" && e.date.slice(5, 7) !== monthFilter)
        return false;
      if (q && !matchesText(q, e.concept, e.notes)) return false;
      return true;
    });
  }, [items, kindFilter, monthFilter, yearFilter, query]);

  const totals = useMemo(() => {
    const sum = (kind) =>
      filtered.filter((e) => e.kind === kind).reduce((a, e) => a + e.amount, 0);
    const gasto = sum("gasto");
    const entrada = sum("entrada");
    const salida = sum("salida");
    return { gasto, entrada, salida, neto: entrada - salida - gasto };
  }, [filtered]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  useEffect(() => setPage(1), [kindFilter, monthFilter, yearFilter, query]);

  const openNew = () => setDraft(emptyDraft());

  // Desde Inicio, "Anotar un gasto" llega con ?nuevo=1 y abre el formulario
  // de una. Se limpia la dirección para que recargar no lo vuelva a abrir.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("nuevo") === "1") {
      setDraft(emptyDraft());
      url.searchParams.delete("nuevo");
      window.history.replaceState(null, "", url);
    }
  }, []);
  const openEdit = (item) => setDraft({ ...item, amount: String(item.amount) });

  const saveDraft = async (e) => {
    e.preventDefault();
    const amount = Number(draft.amount);
    if (!draft.date) return push("Falta la fecha", "error");
    if (!Number.isFinite(amount) || amount <= 0)
      return push("El monto debe ser mayor que cero", "error");
    if (!draft.concept.trim())
      return push(
        "Escribe un concepto para poder identificarlo después",
        "error",
      );

    setSaving(true);
    try {
      const payload = {
        date: draft.date,
        kind: draft.kind,
        amount,
        concept: draft.concept.trim(),
        notes: draft.notes.trim(),
      };
      if (draft.id) {
        await updateExpense(draft.id, payload);
        push("Registro actualizado", "success");
      } else {
        await createExpense(payload);
        push("Registro guardado", "success");
      }
      await reload();
      setDraft(null);
    } catch (err) {
      push(err.message || "No se pudo guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    try {
      await deleteExpense(confirmDelete.id);
      await reload();
      push("Registro eliminado", "success");
    } catch (err) {
      push(err.message || "No se pudo eliminar", "error");
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-800">
            <Wallet className="h-5 w-5 text-blue-600" />
            Gastos y caja
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Gastos del negocio y movimientos de caja que no son ventas.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo registro
        </button>
      </div>



      <ExpenseSummaryCards totals={totals} />

      <ExpenseFilters
        kindFilter={kindFilter}
        onKindFilterChange={setKindFilter}
        years={years}
        yearFilter={yearFilter}
        onYearFilterChange={setYearFilter}
        monthFilter={monthFilter}
        onMonthFilterChange={setMonthFilter}
        query={query}
        onQueryChange={setQuery}
      />

      <ExpensesTable
        loading={loading}
        filtered={filtered}
        visible={visible}
        page={current}
        pageCount={pageCount}
        onPageChange={setPage}
        onEdit={openEdit}
        onDelete={setConfirmDelete}
      />

      {draft && (
        <ExpenseFormModal
          draft={draft}
          onDraftChange={setDraft}
          saving={saving}
          onClose={() => setDraft(null)}
          onSubmit={saveDraft}
        />
      )}

      {confirmDelete && (
        <DeleteExpenseDialog
          item={confirmDelete}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={doDelete}
        />
      )}

      <ExpenseToasts toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
