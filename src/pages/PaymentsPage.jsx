import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Eye,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  createPayment,
  deletePayment as deletePaymentRequest,
  getPayments,
  updatePayment as updatePaymentRequest,
} from "../api/paymentsApi";

import {
  paymentMethods,
  paymentStatuses,
  paymentTypes,
} from "../data/payments";

function formatDate(dateValue) {
  if (!dateValue) {
    return "Brak daty";
  }

  const [year, month, day] = dateValue.split("-");

  if (!year || !month || !day) {
    return dateValue;
  }

  return `${day}.${month}.${year}`;
}

function getStatusClass(status) {
  if (status === "Opłacone") {
    return "payment-status payment-status-green";
  }

  if (status === "Oczekuje" || status === "Planowane") {
    return "payment-status payment-status-orange";
  }

  if (status === "Po terminie" || status === "Anulowane") {
    return "payment-status payment-status-red";
  }

  return "payment-status";
}

function getTypeClass(type) {
  if (type === "Zaliczka") {
    return "payment-type payment-type-dark";
  }

  if (type === "Etap" || type === "Płatność końcowa") {
    return "payment-type payment-type-blue";
  }

  return "payment-type payment-type-soft";
}

function normalizePayment(payment) {
  return {
    id: payment.id,
    client: payment.client_name || "",
    contactPerson: payment.contact_person || "",
    project: payment.project_name || "",
    title: payment.title || "",
    description: payment.description || "",
    amount: payment.amount || "",
    currency: payment.currency || "PLN",
    type: payment.type || "Zaliczka",
    status: payment.status || "Planowane",
    dueDate: payment.due_date || "",
    paidDate: payment.paid_date || "",
    method: payment.method || "Przelew",
    documentNumber: payment.document_number || "",
    relatedDocument: payment.related_document || "",
    notes: payment.notes || "",
    createdAt: payment.created_at || "",
    updatedAt: payment.updated_at || "",
    logs: [
      {
        id: 1,
        date: payment.created_at ? payment.created_at.slice(0, 10) : "",
        type: "Płatność",
        message: "Płatność zapisana w bazie danych.",
        author: "System",
      },
    ],
  };
}

function paymentToPayload(payment) {
  return {
    client_name: payment.client || "",
    contact_person: payment.contactPerson || "",
    project_name: payment.project || "",
    title: payment.title || "",
    description: payment.description || "",
    amount: payment.amount || "",
    currency: payment.currency || "PLN",
    type: payment.type || "Zaliczka",
    status: payment.status || "Planowane",
    due_date: payment.dueDate || "",
    paid_date: payment.paidDate || "",
    method: payment.method || "Przelew",
    document_number: payment.documentNumber || "",
    related_document: payment.relatedDocument || "",
    notes: payment.notes || "",
  };
}

function amountToNumber(payment) {
  const numeric = Number(String(payment.amount).replace(/\D/g, "")) || 0;
  return numeric;
}

function NewPaymentModal({ onClose, onCreate, isSaving }) {
  const [form, setForm] = useState({
    client: "",
    contactPerson: "",
    project: "",
    title: "",
    description: "",
    amount: "",
    currency: "PLN",
    type: "Zaliczka",
    status: "Planowane",
    dueDate: "",
    paidDate: "",
    method: "Przelew",
    documentNumber: "",
    relatedDocument: "",
    notes: "",
  });

  const [error, setError] = useState("");

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit() {
    if (!form.title.trim()) {
      setError("Podaj nazwę płatności.");
      return;
    }

    try {
      setError("");
      await onCreate(form);
      onClose();
    } catch (createError) {
      setError(createError.message || "Nie udało się dodać płatności.");
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="payment-edit-modal">
        <div className="payment-modal-head">
          <div>
            <p className="eyebrow">Nowa płatność</p>
            <h2>Dodaj płatność ręcznie</h2>
            <span>
              To jest wewnętrzny rejestr płatności — bez automatycznych płatności online.
            </span>
          </div>

          <button className="modal-close-button" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="payment-edit-grid">
          <label className="payment-field payment-field-wide">
            <span>Nazwa płatności</span>
            <input
              value={form.title}
              placeholder="np. Zaliczka za wdrożenie CRM"
              onChange={(event) => updateField("title", event.target.value)}
            />
          </label>

          <label className="payment-field">
            <span>Klient</span>
            <input
              value={form.client}
              placeholder="Nazwa firmy"
              onChange={(event) => updateField("client", event.target.value)}
            />
          </label>

          <label className="payment-field">
            <span>Osoba kontaktowa</span>
            <input
              value={form.contactPerson}
              placeholder="Imię i nazwisko"
              onChange={(event) => updateField("contactPerson", event.target.value)}
            />
          </label>

          <label className="payment-field payment-field-wide">
            <span>Projekt</span>
            <input
              value={form.project}
              placeholder="Nazwa projektu"
              onChange={(event) => updateField("project", event.target.value)}
            />
          </label>

          <label className="payment-field">
            <span>Kwota</span>
            <input
              value={form.amount}
              placeholder="np. 5000"
              onChange={(event) => updateField("amount", event.target.value)}
            />
          </label>

          <label className="payment-field">
            <span>Waluta</span>
            <input
              value={form.currency}
              placeholder="PLN"
              onChange={(event) => updateField("currency", event.target.value)}
            />
          </label>

          <label className="payment-field">
            <span>Typ</span>
            <select
              value={form.type}
              onChange={(event) => updateField("type", event.target.value)}
            >
              {paymentTypes.map((type) => (
                <option value={type} key={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="payment-field">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) => updateField("status", event.target.value)}
            >
              {paymentStatuses.map((status) => (
                <option value={status} key={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="payment-field">
            <span>Termin płatności</span>
            <input
              type="date"
              value={form.dueDate}
              onChange={(event) => updateField("dueDate", event.target.value)}
            />
          </label>

          <label className="payment-field">
            <span>Data opłacenia</span>
            <input
              type="date"
              value={form.paidDate}
              onChange={(event) => updateField("paidDate", event.target.value)}
            />
          </label>

          <label className="payment-field">
            <span>Metoda</span>
            <select
              value={form.method}
              onChange={(event) => updateField("method", event.target.value)}
            >
              {paymentMethods.map((method) => (
                <option value={method} key={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>

          <label className="payment-field">
            <span>Numer dokumentu</span>
            <input
              value={form.documentNumber}
              placeholder="np. FV/2026/001"
              onChange={(event) => updateField("documentNumber", event.target.value)}
            />
          </label>

          <label className="payment-field payment-field-wide">
            <span>Powiązany dokument</span>
            <input
              value={form.relatedDocument}
              placeholder="np. Oferta OF/2026/001"
              onChange={(event) => updateField("relatedDocument", event.target.value)}
            />
          </label>

          <label className="payment-field payment-field-wide">
            <span>Opis</span>
            <textarea
              value={form.description}
              placeholder="Krótki opis płatności..."
              onChange={(event) => updateField("description", event.target.value)}
            />
          </label>

          <label className="payment-field payment-field-wide">
            <span>Notatki</span>
            <textarea
              value={form.notes}
              placeholder="Notatki wewnętrzne..."
              onChange={(event) => updateField("notes", event.target.value)}
            />
          </label>
        </div>

        {error && <p className="client-form-error">{error}</p>}

        <div className="payment-modal-actions">
          <button
            className="small-outline-button"
            type="button"
            onClick={onClose}
            disabled={isSaving}
          >
            Anuluj
          </button>

          <button
            className="outline-button"
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            <Plus size={15} />
            {isSaving ? "Dodawanie..." : "Dodaj płatność"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({ payment, onClose, onUpdate, onDelete, isSaving }) {
  const [editablePayment, setEditablePayment] = useState(payment);
  const [error, setError] = useState("");

  useEffect(() => {
    setEditablePayment(payment);
    setError("");
  }, [payment]);

  function updateField(field, value) {
    setEditablePayment((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSave() {
    if (!editablePayment.title.trim()) {
      setError("Podaj nazwę płatności.");
      return;
    }

    try {
      setError("");
      await onUpdate(editablePayment);
    } catch (updateError) {
      setError(updateError.message || "Nie udało się zapisać płatności.");
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="payment-modal">
        <div className="payment-modal-head">
          <div>
            <p className="eyebrow">{editablePayment.type}</p>
            <h2>{editablePayment.title}</h2>
            <span>
              {editablePayment.client || "Brak klienta"} ·{" "}
              {editablePayment.project || "Brak projektu"}
            </span>
          </div>

          <button className="modal-close-button" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="payment-summary-grid">
          <div>
            <span>Status</span>
            <strong className={getStatusClass(editablePayment.status)}>
              {editablePayment.status}
            </strong>
          </div>

          <div>
            <span>Typ</span>
            <strong className={getTypeClass(editablePayment.type)}>
              {editablePayment.type}
            </strong>
          </div>

          <div>
            <span>Kwota</span>
            <strong>
              {editablePayment.amount || "Brak"} {editablePayment.currency || ""}
            </strong>
          </div>

          <div>
            <span>Termin</span>
            <strong>{formatDate(editablePayment.dueDate)}</strong>
          </div>

          <div>
            <span>Opłacono</span>
            <strong>{formatDate(editablePayment.paidDate)}</strong>
          </div>

          <div>
            <span>Dokument</span>
            <strong>{editablePayment.documentNumber || "Brak"}</strong>
          </div>
        </div>

        <div className="payment-modal-layout">
          <section className="payment-modal-main">
            <div className="payment-clean-section">
              <div className="payment-section-head">
                <h3>Podstawowe dane</h3>
              </div>

              <div className="payment-edit-grid">
                <label className="payment-field payment-field-wide">
                  <span>Nazwa płatności</span>
                  <input
                    value={editablePayment.title}
                    onChange={(event) => updateField("title", event.target.value)}
                  />
                </label>

                <label className="payment-field">
                  <span>Klient</span>
                  <input
                    value={editablePayment.client}
                    onChange={(event) => updateField("client", event.target.value)}
                  />
                </label>

                <label className="payment-field">
                  <span>Osoba kontaktowa</span>
                  <input
                    value={editablePayment.contactPerson}
                    onChange={(event) =>
                      updateField("contactPerson", event.target.value)
                    }
                  />
                </label>

                <label className="payment-field payment-field-wide">
                  <span>Projekt</span>
                  <input
                    value={editablePayment.project}
                    onChange={(event) => updateField("project", event.target.value)}
                  />
                </label>

                <label className="payment-field">
                  <span>Kwota</span>
                  <input
                    value={editablePayment.amount}
                    onChange={(event) => updateField("amount", event.target.value)}
                  />
                </label>

                <label className="payment-field">
                  <span>Waluta</span>
                  <input
                    value={editablePayment.currency}
                    onChange={(event) => updateField("currency", event.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="payment-clean-section">
              <div className="payment-section-head">
                <h3>Szczegóły płatności</h3>
              </div>

              <div className="payment-detail-grid">
                <div>
                  <span>Metoda</span>
                  <strong>{editablePayment.method || "Brak"}</strong>
                </div>

                <div>
                  <span>Numer dokumentu</span>
                  <strong>{editablePayment.documentNumber || "Brak"}</strong>
                </div>

                <div>
                  <span>Powiązany dokument</span>
                  <strong>{editablePayment.relatedDocument || "Brak"}</strong>
                </div>

                <div>
                  <span>Ostatnia aktualizacja</span>
                  <strong>{editablePayment.updatedAt || "Brak"}</strong>
                </div>
              </div>
            </div>

            <div className="payment-clean-section">
              <div className="payment-section-head">
                <h3>Opis</h3>
              </div>

              <div className="payment-description-box">
                <p>{editablePayment.description || "Brak opisu."}</p>
              </div>
            </div>

            <div className="payment-clean-section">
              <div className="payment-section-head">
                <h3>Notatki</h3>
              </div>

              <div className="payment-description-box">
                <p>{editablePayment.notes || "Brak notatek."}</p>
              </div>
            </div>

            <div className="payment-clean-section">
              <div className="payment-section-head">
                <h3>Log płatności</h3>
              </div>

              <div className="payment-logs">
                {editablePayment.logs.map((log) => (
                  <div className="payment-log-row" key={log.id}>
                    <span>{formatDate(log.date)}</span>
                    <strong>{log.type}</strong>
                    <p>{log.message}</p>
                    <em>{log.author}</em>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="payment-modal-side">
            <div className="payment-side-card">
              <h3>Zarządzanie</h3>

              <label className="payment-field">
                <span>Status</span>
                <select
                  value={editablePayment.status}
                  onChange={(event) => updateField("status", event.target.value)}
                >
                  {paymentStatuses.map((status) => (
                    <option value={status} key={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="payment-field">
                <span>Typ</span>
                <select
                  value={editablePayment.type}
                  onChange={(event) => updateField("type", event.target.value)}
                >
                  {paymentTypes.map((type) => (
                    <option value={type} key={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="payment-field">
                <span>Metoda</span>
                <select
                  value={editablePayment.method}
                  onChange={(event) => updateField("method", event.target.value)}
                >
                  {paymentMethods.map((method) => (
                    <option value={method} key={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>

              <label className="payment-field">
                <span>Termin</span>
                <input
                  type="date"
                  value={editablePayment.dueDate}
                  onChange={(event) => updateField("dueDate", event.target.value)}
                />
              </label>

              <label className="payment-field">
                <span>Data opłacenia</span>
                <input
                  type="date"
                  value={editablePayment.paidDate}
                  onChange={(event) => updateField("paidDate", event.target.value)}
                />
              </label>

              <label className="payment-field">
                <span>Numer dokumentu</span>
                <input
                  value={editablePayment.documentNumber}
                  onChange={(event) =>
                    updateField("documentNumber", event.target.value)
                  }
                />
              </label>

              <label className="payment-field">
                <span>Powiązany dokument</span>
                <input
                  value={editablePayment.relatedDocument}
                  onChange={(event) =>
                    updateField("relatedDocument", event.target.value)
                  }
                />
              </label>

              <label className="payment-field">
                <span>Opis</span>
                <textarea
                  value={editablePayment.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                />
              </label>

              <label className="payment-field">
                <span>Notatki</span>
                <textarea
                  value={editablePayment.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                />
              </label>

              {error && <p className="client-form-error">{error}</p>}

              <div className="payment-side-actions">
                <button type="button" onClick={handleSave} disabled={isSaving}>
                  <Pencil size={15} />
                  {isSaving ? "Zapisywanie..." : "Zapisz płatność"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateField(
                      "status",
                      editablePayment.status === "Opłacone" ? "Oczekuje" : "Opłacone",
                    )
                  }
                >
                  <CreditCard size={15} />
                  Oznacz jako opłacone
                </button>

                <button type="button">
                  <FileText size={15} />
                  Dokument
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(editablePayment.id)}
                  disabled={isSaving}
                >
                  <Trash2 size={15} />
                  Usuń płatność
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("Wszystkie");
  const [activeType, setActiveType] = useState("Wszystkie");
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    try {
      setIsLoading(true);
      setPageError("");

      const data = await getPayments();
      const backendPayments = data.payments || [];

      setPayments(backendPayments.map(normalizePayment));
    } catch (error) {
      setPageError(error.message || "Nie udało się pobrać płatności.");
    } finally {
      setIsLoading(false);
    }
  }

  const stats = useMemo(() => {
    const paid = payments.filter((payment) => payment.status === "Opłacone");
    const waiting = payments.filter((payment) => payment.status === "Oczekuje");
    const overdue = payments.filter((payment) => payment.status === "Po terminie");

    const paidValue = paid.reduce((sum, payment) => sum + amountToNumber(payment), 0);
    const waitingValue = waiting.reduce(
      (sum, payment) => sum + amountToNumber(payment),
      0,
    );

    return {
      all: payments.length,
      paid: paid.length,
      waiting: waiting.length,
      overdue: overdue.length,
      paidValue: `${paidValue.toLocaleString("pl-PL")} zł`,
      waitingValue: `${waitingValue.toLocaleString("pl-PL")} zł`,
    };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return payments.filter((payment) => {
      const matchesSearch =
        !normalizedQuery ||
        payment.client.toLowerCase().includes(normalizedQuery) ||
        payment.project.toLowerCase().includes(normalizedQuery) ||
        payment.title.toLowerCase().includes(normalizedQuery) ||
        payment.documentNumber.toLowerCase().includes(normalizedQuery);

      const matchesStatus =
        activeStatus === "Wszystkie" || payment.status === activeStatus;

      const matchesType = activeType === "Wszystkie" || payment.type === activeType;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [payments, query, activeStatus, activeType]);

  async function handleCreatePayment(payment) {
    try {
      setIsSaving(true);
      setPageError("");
      setPageSuccess("");

      const data = await createPayment(paymentToPayload(payment));
      const createdPayment = normalizePayment(data.payment);

      setPayments((current) => [createdPayment, ...current]);
      setPageSuccess("Płatność została dodana.");
    } catch (error) {
      setPageError(error.message || "Nie udało się dodać płatności.");
      throw error;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdatePayment(updatedPayment) {
    try {
      setIsSaving(true);
      setPageError("");
      setPageSuccess("");

      const data = await updatePaymentRequest(
        updatedPayment.id,
        paymentToPayload(updatedPayment),
      );

      const savedPayment = normalizePayment(data.payment);

      setPayments((current) =>
        current.map((payment) =>
          payment.id === savedPayment.id ? savedPayment : payment,
        ),
      );

      setSelectedPayment(savedPayment);
      setPageSuccess("Płatność została zapisana.");
    } catch (error) {
      setPageError(error.message || "Nie udało się zapisać płatności.");
      throw error;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeletePayment(paymentId) {
    const confirmed = window.confirm("Czy na pewno chcesz usunąć tę płatność?");

    if (!confirmed) {
      return;
    }

    try {
      setIsSaving(true);
      setPageError("");
      setPageSuccess("");

      await deletePaymentRequest(paymentId);

      setPayments((current) =>
        current.filter((payment) => payment.id !== paymentId),
      );
      setSelectedPayment(null);
      setPageSuccess("Płatność została usunięta.");
    } catch (error) {
      setPageError(error.message || "Nie udało się usunąć płatności.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="payments-page">
      {(pageError || pageSuccess) && (
        <div className="settings-global-message">
          {pageError && <p className="client-form-error">{pageError}</p>}
          {pageSuccess && <p className="client-form-success">{pageSuccess}</p>}
        </div>
      )}

      <div className="payments-hero">
        <div>
          <h2>Płatności</h2>
          <span>
            Ręczny rejestr płatności: zaliczki, etapy, terminy, statusy i dokumenty.
          </span>
        </div>

        <button
          className="outline-button"
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus size={15} />
          Nowa płatność
        </button>
      </div>

      <div className="payments-stats-grid">
        <div>
          <span>Wszystkie</span>
          <strong>{stats.all}</strong>
        </div>

        <div>
          <span>Opłacone</span>
          <strong>{stats.paid}</strong>
        </div>

        <div>
          <span>Oczekujące</span>
          <strong>{stats.waiting}</strong>
        </div>

        <div>
          <span>Po terminie</span>
          <strong>{stats.overdue}</strong>
        </div>

        <div>
          <span>Wpłacono</span>
          <strong>{stats.paidValue}</strong>
        </div>
      </div>

      <div className="payments-toolbar">
        <div className="payments-search">
          <Search size={15} />
          <input
            value={query}
            placeholder="Szukaj klienta, projektu, dokumentu..."
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <label className="payments-select">
          <span>Status</span>
          <select
            value={activeStatus}
            onChange={(event) => setActiveStatus(event.target.value)}
          >
            <option>Wszystkie</option>
            {paymentStatuses.map((status) => (
              <option value={status} key={status}>
                {status}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>

        <label className="payments-select">
          <span>Typ</span>
          <select
            value={activeType}
            onChange={(event) => setActiveType(event.target.value)}
          >
            <option>Wszystkie</option>
            {paymentTypes.map((type) => (
              <option value={type} key={type}>
                {type}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>
      </div>

      <div className="payments-table-card">
        <div className="payments-table-head">
          <span>Klient</span>
          <span>Projekt</span>
          <span>Płatność</span>
          <span>Kwota</span>
          <span>Termin</span>
          <span>Typ</span>
          <span>Status</span>
          <span>Akcje</span>
        </div>

        <div className="payments-table-body">
          {isLoading ? (
            <div className="payment-empty-row">
              <CreditCard size={24} />
              <h3>Ładowanie płatności...</h3>
              <p>Pobieram dane z backendu.</p>
            </div>
          ) : filteredPayments.length ? (
            filteredPayments.map((payment) => (
              <div className="payments-table-row" key={payment.id}>
                <div className="payment-client-cell">
                  <strong>{payment.client || "Brak klienta"}</strong>
                  <small>{payment.contactPerson || "Brak osoby kontaktowej"}</small>
                </div>

                <div className="payment-project-cell">
                  <strong>{payment.project || "Brak projektu"}</strong>
                  <small>{payment.relatedDocument || "Brak dokumentu"}</small>
                </div>

                <button
                  className="payment-title-cell"
                  type="button"
                  onClick={() => setSelectedPayment(payment)}
                >
                  <strong>{payment.title}</strong>
                  <small>{payment.documentNumber || "Brak numeru dokumentu"}</small>
                </button>

                <div className="payment-amount-cell">
                  <CircleDollarSign size={14} />
                  {payment.amount || "Brak"} {payment.currency || ""}
                </div>

                <div className="payment-date-cell">
                  <CalendarDays size={14} />
                  {formatDate(payment.dueDate)}
                </div>

                <div>
                  <span className={getTypeClass(payment.type)}>{payment.type}</span>
                </div>

                <div>
                  <span className={getStatusClass(payment.status)}>
                    {payment.status}
                  </span>
                </div>

                <div className="payment-row-actions">
                  <button
                    type="button"
                    title="Podgląd płatności"
                    aria-label="Podgląd płatności"
                    onClick={() => setSelectedPayment(payment)}
                  >
                    <Eye size={16} />
                  </button>

                  <button
                    type="button"
                    title="Edytuj płatność"
                    aria-label="Edytuj płatność"
                    onClick={() => setSelectedPayment(payment)}
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    title="Usuń płatność"
                    aria-label="Usuń płatność"
                    onClick={() => handleDeletePayment(payment.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="payment-empty-row">
              <CreditCard size={24} />
              <h3>Brak płatności</h3>
              <p>Dodaj pierwszą płatność ręcznie albo zmień filtry.</p>
            </div>
          )}
        </div>
      </div>

      {selectedPayment && (
        <PaymentModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onUpdate={handleUpdatePayment}
          onDelete={handleDeletePayment}
          isSaving={isSaving}
        />
      )}

      {isCreateModalOpen && (
        <NewPaymentModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreatePayment}
          isSaving={isSaving}
        />
      )}
    </section>
  );
}