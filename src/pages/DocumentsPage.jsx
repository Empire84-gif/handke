import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Eye,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import logo from "../assets/logo.png";
import OfferGenerator from "../components/documents/OfferGenerator";

import {
  createDocument,
  deleteDocument as deleteDocumentRequest,
  getDocuments,
  getNextDocumentNumber,
  updateDocument as updateDocumentRequest,
} from "../api/documentsApi";

import { downloadInvoicePdf, downloadOfferPdf } from "../api/pdfApi";
import { getSettings } from "../api/settingsApi";
import { buildIssuerFromSettings, getLogoSrc } from "../utils/settingsUtils";

const issuerBankFallback = {
  beneficiary: "Handke Holding OU",
  iban: "BE62 9058 0452 3461",
  swift: "TRWIBEB1XXX",
  bank: "Wise, Rue du Trône 100, 3rd floor, Brussels 1050, Belgium",
};

const translations = {
  pl: {
    invoice: "Faktura",
    customer: "Nabywca",
    invoiceNumber: "Numer faktury",
    referenceNumber: "Numer referencyjny",
    date: "Data wystawienia",
    paymentDate: "Termin płatności",
    itemNo: "Lp.",
    description: "Opis usługi",
    qty: "Ilość",
    unitPrice: "Cena netto",
    net: "Netto",
    vatRate: "VAT",
    vatAmount: "Kwota VAT",
    total: "Razem",
    netAmount: "Kwota netto",
    vat: "VAT",
    grossAmount: "Kwota brutto",
    amountInWords: "Kwota słownie",
    issuedBy: "Fakturę wystawił",
    seller: "Sprzedawca",
    bankDetails: "Dane bankowe",
    reverseCharge:
      "Odwrotne obciążenie VAT – art. 196 Dyrektywy 2006/112/WE",
    noVat: "VAT nie został naliczony",
  },
  en: {
    invoice: "Invoice",
    customer: "Customer",
    invoiceNumber: "Invoice number",
    referenceNumber: "Reference number",
    date: "Date",
    paymentDate: "Payment date",
    itemNo: "No.",
    description: "Service Description",
    qty: "Qty",
    unitPrice: "Unit Price",
    net: "Net",
    vatRate: "VAT Rate",
    vatAmount: "VAT Amount",
    total: "Total",
    netAmount: "Net amount",
    vat: "VAT amount",
    grossAmount: "Gross amount",
    amountInWords: "Amount in words",
    issuedBy: "Invoice issued by",
    seller: "Seller",
    bankDetails: "Bank details",
    reverseCharge:
      "VAT reverse charge – Article 196 of Directive 2006/112/EC",
    noVat: "VAT not charged",
  },
};

const documentTypes = ["Oferta", "Faktura", "Umowa", "Notatka", "Inny"];

const documentStatuses = [
  "Roboczy",
  "Wysłany",
  "Zaakceptowany",
  "Odrzucony",
  "Anulowany",
];

function formatDate(dateValue) {
  if (!dateValue) {
    return "Brak daty";
  }

  const [year, month, day] = String(dateValue).slice(0, 10).split("-");

  if (!year || !month || !day) {
    return dateValue;
  }

  return `${day}.${month}.${year}`;
}

function formatInvoiceDate(dateValue) {
  if (!dateValue) {
    return "—";
  }

  const [year, month, day] = String(dateValue).split("-");

  if (!year || !month || !day) {
    return dateValue;
  }

  return `${day}.${month}.${year}`;
}

function formatInvoiceMoney(value, currency) {
  const number = Number(value || 0);

  return `${number.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function calculateItem(item, vatMode) {
  const qty = Number(item.qty || 0);
  const unitPrice = Number(item.unitPrice || 0);
  const vatRate = vatMode === "standard" ? Number(item.vatRate || 0) : 0;

  const net = qty * unitPrice;
  const vat = net * (vatRate / 100);
  const gross = net + vat;

  return {
    net,
    vat,
    gross,
    vatRate,
  };
}

function getStatusClass(status) {
  if (status === "Zaakceptowany") {
    return "payment-status payment-status-green";
  }

  if (status === "Wysłany" || status === "Roboczy") {
    return "payment-status payment-status-orange";
  }

  if (status === "Odrzucony" || status === "Anulowany") {
    return "payment-status payment-status-red";
  }

  return "payment-status";
}

function getTypeClass(type) {
  if (type === "Oferta") {
    return "payment-type payment-type-dark";
  }

  if (type === "Faktura" || type === "Umowa") {
    return "payment-type payment-type-blue";
  }

  return "payment-type payment-type-soft";
}

function normalizeDocument(document) {
  return {
    id: document.id,
    documentType: document.document_type || "Oferta",
    documentNumber: document.document_number || "",
    title: document.title || "",
    clientName: document.client_name || "",
    contactPerson: document.contact_person || "",
    projectName: document.project_name || "",
    status: document.status || "Roboczy",
    amount: document.amount || "",
    currency: document.currency || "PLN",
    issueDate: document.issue_date || "",
    dueDate: document.due_date || "",
    validUntil: document.valid_until || "",
    content: document.content || "",
    notes: document.notes || "",
    payloadJson: document.payload_json || "",
    createdAt: document.created_at || "",
    updatedAt: document.updated_at || "",
  };
}

function documentToPayload(document) {
  return {
    document_type: document.documentType || "Oferta",
    document_number: document.documentNumber || "",
    title: document.title || "",
    client_name: document.clientName || "",
    contact_person: document.contactPerson || "",
    project_name: document.projectName || "",
    status: document.status || "Roboczy",
    amount: document.amount || "",
    currency: document.currency || "PLN",
    issue_date: document.issueDate || "",
    due_date: document.dueDate || "",
    valid_until: document.validUntil || "",
    content: document.content || "",
    notes: document.notes || "",
    payload_json: document.payloadJson || "",
  };
}

function parseDocumentPayload(document) {
  if (!document.payloadJson) {
    return null;
  }

  try {
    return JSON.parse(document.payloadJson);
  } catch (error) {
    return null;
  }
}

function NewDocumentModal({ onClose, onCreate, isSaving }) {
  const [form, setForm] = useState({
    documentType: "Oferta",
    documentNumber: "",
    title: "",
    clientName: "",
    contactPerson: "",
    projectName: "",
    status: "Roboczy",
    amount: "",
    currency: "PLN",
    issueDate: "",
    dueDate: "",
    validUntil: "",
    content: "",
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
      setError("Podaj tytuł dokumentu.");
      return;
    }

    try {
      setError("");
      await onCreate(form);
      onClose();
    } catch (createError) {
      setError(createError.message || "Nie udało się dodać dokumentu.");
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="payment-edit-modal">
        <div className="payment-modal-head">
          <div>
            <p className="eyebrow">Nowy dokument</p>
            <h2>Dodaj dokument do CRM</h2>
            <span>
              Na tym etapie zapisujemy dokument jako rekord w bazie. Eksport PDF
              dodamy później.
            </span>
          </div>

          <button className="modal-close-button" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="payment-edit-grid">
          <label className="payment-field payment-field-wide">
            <span>Tytuł dokumentu</span>
            <input
              value={form.title}
              placeholder="np. Oferta wdrożenia systemu CRM"
              onChange={(event) => updateField("title", event.target.value)}
            />
          </label>

          <label className="payment-field">
            <span>Typ</span>
            <select
              value={form.documentType}
              onChange={(event) =>
                updateField("documentType", event.target.value)
              }
            >
              {documentTypes.map((type) => (
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
              {documentStatuses.map((status) => (
                <option value={status} key={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="payment-field">
            <span>Numer dokumentu</span>
            <input
              value={form.documentNumber}
              placeholder="np. OF/2026/001"
              onChange={(event) =>
                updateField("documentNumber", event.target.value)
              }
            />
          </label>

          <label className="payment-field">
            <span>Kwota</span>
            <input
              value={form.amount}
              placeholder="np. 18500"
              onChange={(event) => updateField("amount", event.target.value)}
            />
          </label>

          <label className="payment-field">
            <span>Waluta</span>
            <input
              value={form.currency}
              onChange={(event) => updateField("currency", event.target.value)}
            />
          </label>

          <label className="payment-field">
            <span>Data wystawienia</span>
            <input
              type="date"
              value={form.issueDate}
              onChange={(event) => updateField("issueDate", event.target.value)}
            />
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
            <span>Ważny do</span>
            <input
              type="date"
              value={form.validUntil}
              onChange={(event) =>
                updateField("validUntil", event.target.value)
              }
            />
          </label>

          <label className="payment-field">
            <span>Klient</span>
            <input
              value={form.clientName}
              placeholder="Nazwa firmy"
              onChange={(event) => updateField("clientName", event.target.value)}
            />
          </label>

          <label className="payment-field">
            <span>Osoba kontaktowa</span>
            <input
              value={form.contactPerson}
              placeholder="Imię i nazwisko"
              onChange={(event) =>
                updateField("contactPerson", event.target.value)
              }
            />
          </label>

          <label className="payment-field payment-field-wide">
            <span>Projekt</span>
            <input
              value={form.projectName}
              placeholder="Nazwa projektu"
              onChange={(event) => updateField("projectName", event.target.value)}
            />
          </label>

          <label className="payment-field payment-field-wide">
            <span>Treść / zakres dokumentu</span>
            <textarea
              value={form.content}
              placeholder="Krótka treść dokumentu, zakres oferty albo opis..."
              onChange={(event) => updateField("content", event.target.value)}
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
            {isSaving ? "Dodawanie..." : "Dodaj dokument"}
          </button>
        </div>
      </div>
    </div>
  );
}

 function DocumentModal({
  document,
  onClose,
  onUpdate,
  onDelete,
  onDownloadPdf,
  isSaving,
}) {
  const [editableDocument, setEditableDocument] = useState(document);
  const [error, setError] = useState("");

  useEffect(() => {
    setEditableDocument(document);
    setError("");
  }, [document]);

  function updateField(field, value) {
    setEditableDocument((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSave() {
    if (!editableDocument.title.trim()) {
      setError("Podaj tytuł dokumentu.");
      return;
    }

    try {
      setError("");
      await onUpdate(editableDocument);
    } catch (updateError) {
      setError(updateError.message || "Nie udało się zapisać dokumentu.");
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="payment-modal">
        <div className="payment-modal-head">
          <div>
            <p className="eyebrow">{editableDocument.documentType}</p>
            <h2>{editableDocument.title}</h2>
            <span>
              {editableDocument.clientName || "Brak klienta"} ·{" "}
              {editableDocument.projectName || "Brak projektu"}
            </span>
          </div>

          <button className="modal-close-button" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="payment-summary-grid">
          <div>
            <span>Status</span>
            <strong className={getStatusClass(editableDocument.status)}>
              {editableDocument.status}
            </strong>
          </div>

          <div>
            <span>Typ</span>
            <strong className={getTypeClass(editableDocument.documentType)}>
              {editableDocument.documentType}
            </strong>
          </div>

          <div>
            <span>Numer</span>
            <strong>{editableDocument.documentNumber || "Brak"}</strong>
          </div>

          <div>
            <span>Kwota</span>
            <strong>
              {editableDocument.amount || "Brak"}{" "}
              {editableDocument.currency || ""}
            </strong>
          </div>

          <div>
            <span>Wystawiono</span>
            <strong>{formatDate(editableDocument.issueDate)}</strong>
          </div>

          <div>
            <span>Ważny do</span>
            <strong>{formatDate(editableDocument.validUntil)}</strong>
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
                  <span>Tytuł dokumentu</span>
                  <input
                    value={editableDocument.title}
                    onChange={(event) => updateField("title", event.target.value)}
                  />
                </label>

                <label className="payment-field">
                  <span>Klient</span>
                  <input
                    value={editableDocument.clientName}
                    onChange={(event) =>
                      updateField("clientName", event.target.value)
                    }
                  />
                </label>

                <label className="payment-field">
                  <span>Osoba kontaktowa</span>
                  <input
                    value={editableDocument.contactPerson}
                    onChange={(event) =>
                      updateField("contactPerson", event.target.value)
                    }
                  />
                </label>

                <label className="payment-field payment-field-wide">
                  <span>Projekt</span>
                  <input
                    value={editableDocument.projectName}
                    onChange={(event) =>
                      updateField("projectName", event.target.value)
                    }
                  />
                </label>

                <label className="payment-field">
                  <span>Kwota</span>
                  <input
                    value={editableDocument.amount}
                    onChange={(event) => updateField("amount", event.target.value)}
                  />
                </label>

                <label className="payment-field">
                  <span>Waluta</span>
                  <input
                    value={editableDocument.currency}
                    onChange={(event) =>
                      updateField("currency", event.target.value)
                    }
                  />
                </label>
              </div>
            </div>

            <div className="payment-clean-section">
              <div className="payment-section-head">
                <h3>Treść dokumentu</h3>
              </div>

              <div className="payment-description-box">
                <p>{editableDocument.content || "Brak treści dokumentu."}</p>
              </div>
            </div>

            <div className="payment-clean-section">
              <div className="payment-section-head">
                <h3>Notatki</h3>
              </div>

              <div className="payment-description-box">
                <p>{editableDocument.notes || "Brak notatek."}</p>
              </div>
            </div>
          </section>

          <aside className="payment-modal-side">
            <div className="payment-side-card">
              <h3>Zarządzanie</h3>

              <label className="payment-field">
                <span>Status</span>
                <select
                  value={editableDocument.status}
                  onChange={(event) => updateField("status", event.target.value)}
                >
                  {documentStatuses.map((status) => (
                    <option value={status} key={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="payment-field">
                <span>Typ</span>
                <select
                  value={editableDocument.documentType}
                  onChange={(event) =>
                    updateField("documentType", event.target.value)
                  }
                >
                  {documentTypes.map((type) => (
                    <option value={type} key={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="payment-field">
                <span>Numer dokumentu</span>
                <input
                  value={editableDocument.documentNumber}
                  onChange={(event) =>
                    updateField("documentNumber", event.target.value)
                  }
                />
              </label>

              <label className="payment-field">
                <span>Data wystawienia</span>
                <input
                  type="date"
                  value={editableDocument.issueDate}
                  onChange={(event) =>
                    updateField("issueDate", event.target.value)
                  }
                />
              </label>

              <label className="payment-field">
                <span>Termin płatności</span>
                <input
                  type="date"
                  value={editableDocument.dueDate}
                  onChange={(event) => updateField("dueDate", event.target.value)}
                />
              </label>

              <label className="payment-field">
                <span>Ważny do</span>
                <input
                  type="date"
                  value={editableDocument.validUntil}
                  onChange={(event) =>
                    updateField("validUntil", event.target.value)
                  }
                />
              </label>

              <label className="payment-field">
                <span>Treść</span>
                <textarea
                  value={editableDocument.content}
                  onChange={(event) => updateField("content", event.target.value)}
                />
              </label>

              <label className="payment-field">
                <span>Notatki</span>
                <textarea
                  value={editableDocument.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                />
              </label>

              {error && <p className="client-form-error">{error}</p>}

              <div className="payment-side-actions">
                <button type="button" onClick={handleSave} disabled={isSaving}>
                  <Pencil size={15} />
                  {isSaving ? "Zapisywanie..." : "Zapisz dokument"}
                </button>

                <button
  type="button"
  onClick={() => onDownloadPdf(editableDocument)}
  disabled={isSaving}
>
  <FileText size={15} />
  Pobierz PDF
</button>

                <button
                  type="button"
                  onClick={() => onDelete(editableDocument.id)}
                  disabled={isSaving}
                >
                  <Trash2 size={15} />
                  Usuń dokument
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function InvoiceGeneratorPanel({
  invoice,
  items,
  totals,
  t,
  issuer,
  invoiceLogo,
  updateInvoice,
  updateItem,
  addItem,
  removeItem,
  onDownloadPdf,
  onSaveToRegister,
  isSaving,
}) {
  return (
    <div className="invoice-section">
      <div className="invoice-section-head">
        <div>
          <h3>Generator faktury</h3>
          <p>
            Wypełnij dane faktury, wybierz język oraz tryb VAT. Podgląd po
            prawej stronie aktualizuje się automatycznie.
          </p>
        </div>

        <div className="invoice-mode-pills">
          <button type="button" className="mode-pill" onClick={onDownloadPdf}>
            Pobierz PDF
          </button>

          <button
            type="button"
            className="mode-pill"
            onClick={onSaveToRegister}
            disabled={isSaving}
          >
            {isSaving ? "Zapisywanie..." : "Zapisz w rejestrze"}
          </button>

          <button
            type="button"
            className={invoice.language === "pl" ? "mode-pill active" : "mode-pill"}
            onClick={() => updateInvoice("language", "pl")}
          >
            Polski
          </button>

          <button
            type="button"
            className={invoice.language === "en" ? "mode-pill active" : "mode-pill"}
            onClick={() => updateInvoice("language", "en")}
          >
            English
          </button>
        </div>
      </div>

      <div className="invoice-workspace">
        <div className="invoice-form-panel">
          <section className="invoice-form-block">
            <div className="invoice-form-head">
              <h4>Dane faktury</h4>
            </div>

            <div className="invoice-form-grid two">
              <label className="invoice-field">
                <span>Numer faktury</span>
                <input
                  value={invoice.invoiceNumber}
                  onChange={(event) =>
                    updateInvoice("invoiceNumber", event.target.value)
                  }
                />
              </label>

              <label className="invoice-field">
                <span>Numer referencyjny</span>
                <input
                  value={invoice.referenceNumber}
                  onChange={(event) =>
                    updateInvoice("referenceNumber", event.target.value)
                  }
                />
              </label>

              <label className="invoice-field">
                <span>Data wystawienia</span>
                <input
                  type="date"
                  value={invoice.issueDate}
                  onChange={(event) =>
                    updateInvoice("issueDate", event.target.value)
                  }
                />
              </label>

              <label className="invoice-field">
                <span>Termin płatności</span>
                <input
                  type="date"
                  value={invoice.paymentDate}
                  onChange={(event) =>
                    updateInvoice("paymentDate", event.target.value)
                  }
                />
              </label>

              <label className="invoice-field">
                <span>Waluta</span>
                <select
                  value={invoice.currency}
                  onChange={(event) =>
                    updateInvoice("currency", event.target.value)
                  }
                >
                  <option>EUR</option>
                  <option>PLN</option>
                  <option>USD</option>
                </select>
              </label>

              <label className="invoice-field">
                <span>Wystawił</span>
                <input
                  value={invoice.issuedBy}
                  onChange={(event) =>
                    updateInvoice("issuedBy", event.target.value)
                  }
                />
              </label>
            </div>
          </section>

          <section className="invoice-form-block">
            <div className="invoice-form-head">
              <h4>Tryb VAT</h4>
            </div>

            <div className="vat-mode-grid">
              <button
                type="button"
                className={
                  invoice.vatMode === "reverse-charge"
                    ? "vat-mode-card active"
                    : "vat-mode-card"
                }
                onClick={() => updateInvoice("vatMode", "reverse-charge")}
              >
                <strong>Reverse charge</strong>
                <span>VAT 0%, z adnotacją reverse charge.</span>
              </button>

              <button
                type="button"
                className={
                  invoice.vatMode === "standard"
                    ? "vat-mode-card active"
                    : "vat-mode-card"
                }
                onClick={() => updateInvoice("vatMode", "standard")}
              >
                <strong>Z VAT</strong>
                <span>System dolicza VAT według stawki pozycji.</span>
              </button>

              <button
                type="button"
                className={
                  invoice.vatMode === "no-vat"
                    ? "vat-mode-card active"
                    : "vat-mode-card"
                }
                onClick={() => updateInvoice("vatMode", "no-vat")}
              >
                <strong>Bez VAT</strong>
                <span>VAT 0%, bez reverse charge.</span>
              </button>
            </div>
          </section>

          <section className="invoice-form-block">
            <div className="invoice-form-head">
              <h4>Klient</h4>
            </div>

            <div className="invoice-form-grid one">
              <label className="invoice-field">
                <span>Nazwa klienta</span>
                <input
                  value={invoice.customerName}
                  placeholder="np. Company OÜ"
                  onChange={(event) =>
                    updateInvoice("customerName", event.target.value)
                  }
                />
              </label>

              <label className="invoice-field">
                <span>Adres klienta</span>
                <textarea
                  value={invoice.customerAddress}
                  placeholder="Adres, miasto, kraj"
                  onChange={(event) =>
                    updateInvoice("customerAddress", event.target.value)
                  }
                />
              </label>

              <label className="invoice-field">
                <span>VAT / numer rejestrowy klienta</span>
                <input
                  value={invoice.customerVat}
                  placeholder="np. VAT EU / reg. no."
                  onChange={(event) =>
                    updateInvoice("customerVat", event.target.value)
                  }
                />
              </label>
            </div>
          </section>

          <section className="invoice-form-block">
            <div className="invoice-form-head">
              <h4>Pozycje faktury</h4>

              <button
                className="small-outline-button"
                type="button"
                onClick={addItem}
              >
                <Plus size={14} />
                Dodaj pozycję
              </button>
            </div>

            <div className="invoice-items-editor">
              {items.map((item, index) => (
                <div className="invoice-item-editor-row" key={item.id}>
                  <label className="invoice-field invoice-item-description">
                    <span>Opis usługi #{index + 1}</span>
                    <input
                      value={item.description}
                      placeholder="Opis usługi"
                      onChange={(event) =>
                        updateItem(item.id, "description", event.target.value)
                      }
                    />
                  </label>

                  <label className="invoice-field">
                    <span>Ilość</span>
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(event) =>
                        updateItem(item.id, "qty", event.target.value)
                      }
                    />
                  </label>

                  <label className="invoice-field">
                    <span>Cena netto</span>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(event) =>
                        updateItem(item.id, "unitPrice", event.target.value)
                      }
                    />
                  </label>

                  <label className="invoice-field">
                    <span>VAT %</span>
                    <input
                      type="number"
                      value={invoice.vatMode === "standard" ? item.vatRate : 0}
                      disabled={invoice.vatMode !== "standard"}
                      onChange={(event) =>
                        updateItem(item.id, "vatRate", event.target.value)
                      }
                    />
                  </label>

                  <button
                    className="invoice-remove-item"
                    type="button"
                    onClick={() => removeItem(item.id)}
                    title="Usuń pozycję"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="invoice-form-block">
            <div className="invoice-form-head">
              <h4>Kwota słownie i uwagi</h4>
            </div>

            <div className="invoice-form-grid one">
              <label className="invoice-field">
                <span>Kwota słownie</span>
                <input
                  value={invoice.amountInWords}
                  onChange={(event) =>
                    updateInvoice("amountInWords", event.target.value)
                  }
                />
              </label>

              <label className="invoice-field">
                <span>Dodatkowa uwaga</span>
                <textarea
                  value={invoice.note}
                  placeholder="Opcjonalna uwaga na fakturze"
                  onChange={(event) => updateInvoice("note", event.target.value)}
                />
              </label>
            </div>
          </section>
        </div>

        <div className="invoice-preview-panel">
          <div className="invoice-paper">
            <div className="invoice-paper-head">
              <div>
                <p>{t.invoice}</p>
                <h2>{invoice.invoiceNumber || "—"}</h2>
              </div>

              <img src={invoiceLogo} alt="Logo" />
            </div>

            <div className="invoice-meta-grid">
              <div>
                <span>{t.customer}</span>
                <strong>{invoice.customerName || "—"}</strong>
                <p>{invoice.customerAddress || "—"}</p>
                {invoice.customerVat && <p>{invoice.customerVat}</p>}
              </div>

              <div className="invoice-meta-right">
                <span>{t.invoiceNumber}</span>
                <strong>{invoice.invoiceNumber || "—"}</strong>

                <span>{t.referenceNumber}</span>
                <strong>{invoice.referenceNumber || "—"}</strong>

                <span>{t.date}</span>
                <strong>{formatInvoiceDate(invoice.issueDate)}</strong>

                <span>{t.paymentDate}</span>
                <strong>{formatInvoiceDate(invoice.paymentDate)}</strong>
              </div>
            </div>

            <div className="invoice-items-table">
              <div className="invoice-items-head">
                <span>{t.itemNo}</span>
                <span>{t.description}</span>
                <span>{t.qty}</span>
                <span>{t.unitPrice}</span>
                <span>{t.net}</span>
                <span>{t.vatRate}</span>
                <span>{t.vatAmount}</span>
                <span>{t.total}</span>
              </div>

              {items.map((item, index) => {
                const calculated = calculateItem(item, invoice.vatMode);

                return (
                  <div className="invoice-items-row" key={item.id}>
                    <span>{index + 1}</span>
                    <span>{item.description || "—"}</span>
                    <span>{item.qty || 0}</span>
                    <span>{formatInvoiceMoney(item.unitPrice, invoice.currency)}</span>
                    <span>{formatInvoiceMoney(calculated.net, invoice.currency)}</span>
                    <span>{calculated.vatRate}%</span>
                    <span>{formatInvoiceMoney(calculated.vat, invoice.currency)}</span>
                    <span>{formatInvoiceMoney(calculated.gross, invoice.currency)}</span>
                  </div>
                );
              })}
            </div>

            <div className="invoice-total-section">
              <div>
                <span>{t.netAmount}:</span>
                <strong>{formatInvoiceMoney(totals.net, invoice.currency)}</strong>
              </div>

              <div>
                <span>{t.vat}:</span>
                <strong>{formatInvoiceMoney(totals.vat, invoice.currency)}</strong>
              </div>

              <div>
                <span>{t.grossAmount}:</span>
                <strong>{formatInvoiceMoney(totals.gross, invoice.currency)}</strong>
              </div>

              <p>
                {t.amountInWords}: {invoice.amountInWords || "—"}
              </p>

              {invoice.vatMode === "reverse-charge" && <p>{t.reverseCharge}</p>}
              {invoice.vatMode === "no-vat" && <p>{t.noVat}</p>}
              {invoice.note && <p>{invoice.note}</p>}
            </div>

            <div className="invoice-footer-grid">
              <div>
                <strong>{t.seller}</strong>
                <p>{issuer.companyName}</p>
                <p>{issuer.addressLine1}</p>
                <p>{issuer.addressLine2}</p>
                <p>{issuer.country}</p>
                <p>Registration number: {issuer.registrationNumber}</p>
                <p>VAT EU: {issuer.vatEu}</p>
              </div>

              <div>
                <strong>Contact</strong>
                <p>Telephone: {issuer.phone}</p>
                <p>E-mail: {issuer.email}</p>
                <p>{issuer.website}</p>
                <p>
                  {t.issuedBy}: {invoice.issuedBy}
                </p>
              </div>

              <div>
                <strong>{t.bankDetails}</strong>
                <p>Beneficiary name: {issuer.beneficiary}</p>
                <p>IBAN: {issuer.iban}</p>
                <p>Swift/BIC: {issuer.swift}</p>
                <p>{issuer.bank}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [settings, setSettings] = useState(null);
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("Wszystkie");
  const [activeType, setActiveType] = useState("Wszystkie");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activePanel, setActivePanel] = useState("register");

  const [invoice, setInvoice] = useState({
    language: "en",
    vatMode: "reverse-charge",
    invoiceNumber: "HAN01/02/2026",
    referenceNumber: "#202601",
    issueDate: "2026-01-03",
    paymentDate: "2026-01-17",
    customerName: "",
    customerAddress: "",
    customerVat: "",
    issuedBy: "Karl Sebastian Handke",
    currency: "EUR",
    amountInWords: "seven hundred euros",
    note: "",
  });

  const [items, setItems] = useState([
    {
      id: 1,
      description: "Recruitment service – placement M. R. - CNC operator",
      qty: 1,
      unitPrice: 700,
      vatRate: 0,
    },
  ]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");

  const t = translations[invoice.language];

  const issuer = useMemo(() => {
    return {
      ...buildIssuerFromSettings(settings || {}),
      beneficiary:
        settings?.beneficiary ||
        settings?.company_name ||
        issuerBankFallback.beneficiary,
      iban: settings?.iban || issuerBankFallback.iban,
      swift: settings?.swift || issuerBankFallback.swift,
      bank: settings?.bank || issuerBankFallback.bank,
    };
  }, [settings]);

  const invoiceLogo = useMemo(() => {
    return getLogoSrc(settings?.logo_path, logo);
  }, [settings]);

  const totals = useMemo(() => {
    return items.reduce(
      (sum, item) => {
        const calculated = calculateItem(item, invoice.vatMode);

        return {
          net: sum.net + calculated.net,
          vat: sum.vat + calculated.vat,
          gross: sum.gross + calculated.gross,
        };
      },
      {
        net: 0,
        vat: 0,
        gross: 0,
      },
    );
  }, [items, invoice.vatMode]);

  useEffect(() => {
    loadDocuments();
    loadSettings();
  }, []);

  async function loadDocuments() {
    try {
      setIsLoading(true);
      setPageError("");

      const data = await getDocuments();
      const backendDocuments = data.documents || [];

      setDocuments(backendDocuments.map(normalizeDocument));
    } catch (error) {
      setPageError(error.message || "Nie udało się pobrać dokumentów.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadSettings() {
    try {
      const data = await getSettings();
      setSettings(data.settings || null);
    } catch (error) {
      console.error(error);
    }
  }

  function updateInvoice(field, value) {
    setInvoice((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateItem(itemId, field, value) {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      {
        id: Date.now(),
        description: "",
        qty: 1,
        unitPrice: 0,
        vatRate: invoice.vatMode === "standard" ? 20 : 0,
      },
    ]);
  }

  function removeItem(itemId) {
    setItems((current) => current.filter((item) => item.id !== itemId));
  }

  const stats = useMemo(() => {
  const draft = documents.filter((document) => document.status === "Roboczy")
    .length;

  const sent = documents.filter((document) => document.status === "Wysłany")
    .length;

  const accepted = documents.filter(
    (document) => document.status === "Zaakceptowany",
  ).length;

  const pdf = documents.filter((document) => document.payloadJson).length;

  return {
    all: documents.length,
    draft,
    sent,
    accepted,
    pdf,
  };
}, [documents]);

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return documents.filter((document) => {
      const matchesSearch =
        !normalizedQuery ||
        document.title.toLowerCase().includes(normalizedQuery) ||
        document.documentNumber.toLowerCase().includes(normalizedQuery) ||
        document.clientName.toLowerCase().includes(normalizedQuery) ||
        document.projectName.toLowerCase().includes(normalizedQuery);

      const matchesStatus =
        activeStatus === "Wszystkie" || document.status === activeStatus;

      const matchesType =
        activeType === "Wszystkie" || document.documentType === activeType;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [documents, query, activeStatus, activeType]);

  async function handleDownloadInvoicePdf() {
    try {
      setPageError("");
      setPageSuccess("");

      await downloadInvoicePdf({
        invoice,
        items,
        issuer,
      });

      setPageSuccess("PDF faktury został wygenerowany.");
    } catch (error) {
      setPageError(error.message || "Nie udało się wygenerować PDF faktury.");
    }
  }


async function handleDownloadDocumentPdf(document) {
  try {
    setPageError("");
    setPageSuccess("");

    const payload = parseDocumentPayload(document);

    if (!payload) {
      setPageError(
        "Ten dokument nie ma zapisanych danych PDF. Zapisz go ponownie z generatora.",
      );
      return;
    }

    if (document.documentType === "Faktura") {
      await downloadInvoicePdf(payload);
      setPageSuccess(`PDF faktury ${document.documentNumber || ""} został pobrany.`);
      return;
    }

    if (document.documentType === "Oferta") {
      await downloadOfferPdf(payload);
      setPageSuccess(`PDF oferty ${document.documentNumber || ""} został pobrany.`);
      return;
    }

    setPageError("PDF dla tego typu dokumentu dodamy później.");
  } catch (error) {
    setPageError(error.message || "Nie udało się pobrać PDF dokumentu.");
  }
}


  async function handleSaveInvoiceToRegister() {
    try {
      setIsSaving(true);
      setPageError("");
      setPageSuccess("");

      const numberData = await getNextDocumentNumber("Faktura");
      const generatedNumber = numberData.document_number || invoice.invoiceNumber;

      const invoiceWithNumber = {
  ...invoice,
  invoiceNumber: generatedNumber,
};

const invoicePdfPayload = {
  invoice: invoiceWithNumber,
  items,
  issuer,
};

      const invoiceContent = items
        .map((item, index) => {
          return `${index + 1}. ${
            item.description || "Pozycja faktury"
          } — ilość: ${item.qty || 0}, cena netto: ${item.unitPrice || 0} ${
            invoice.currency
          }`;
        })
        .join("\n");

      const data = await createDocument({
  document_type: "Faktura",
  document_number: generatedNumber,
  title: `Faktura ${generatedNumber}`,
  client_name: invoice.customerName || "",
  contact_person: "",
  project_name: "",
  status: invoice.vatMode === "reverse-charge" ? "Wysłany" : "Roboczy",
  amount: String(totals.gross || ""),
  currency: invoice.currency || "EUR",
  issue_date: invoice.issueDate || "",
  due_date: invoice.paymentDate || "",
  valid_until: "",
  content: invoiceContent,
  notes: invoice.note || "",
  payload_json: JSON.stringify(invoicePdfPayload),
});

      const createdDocument = normalizeDocument(data.document);

      setDocuments((current) => [createdDocument, ...current]);

     setInvoice(invoiceWithNumber);

      setPageSuccess(`Faktura ${generatedNumber} została zapisana w rejestrze.`);
    } catch (error) {
      setPageError(error.message || "Nie udało się zapisać faktury w rejestrze.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateDocument(document) {
    try {
      setIsSaving(true);
      setPageError("");
      setPageSuccess("");

      const data = await createDocument(documentToPayload(document));
      const createdDocument = normalizeDocument(data.document);

      setDocuments((current) => [createdDocument, ...current]);
      setPageSuccess("Dokument został dodany.");
    } catch (error) {
      setPageError(error.message || "Nie udało się dodać dokumentu.");
      throw error;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateDocument(updatedDocument) {
    try {
      setIsSaving(true);
      setPageError("");
      setPageSuccess("");

      const data = await updateDocumentRequest(
        updatedDocument.id,
        documentToPayload(updatedDocument),
      );

      const savedDocument = normalizeDocument(data.document);

      setDocuments((current) =>
        current.map((document) =>
          document.id === savedDocument.id ? savedDocument : document,
        ),
      );

      setSelectedDocument(savedDocument);
      setPageSuccess("Dokument został zapisany.");
    } catch (error) {
      setPageError(error.message || "Nie udało się zapisać dokumentu.");
      throw error;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteDocument(documentId) {
    const confirmed = window.confirm("Czy na pewno chcesz usunąć ten dokument?");

    if (!confirmed) {
      return;
    }

    try {
      setIsSaving(true);
      setPageError("");
      setPageSuccess("");

      await deleteDocumentRequest(documentId);

      setDocuments((current) =>
        current.filter((document) => document.id !== documentId),
      );

      setSelectedDocument(null);
      setPageSuccess("Dokument został usunięty.");
    } catch (error) {
      setPageError(error.message || "Nie udało się usunąć dokumentu.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="documents-page">
      {(pageError || pageSuccess) && (
        <div className="settings-global-message">
          {pageError && <p className="client-form-error">{pageError}</p>}
          {pageSuccess && <p className="client-form-success">{pageSuccess}</p>}
        </div>
      )}

      <div className="documents-hero">
        <div>
          <h2>Dokumenty</h2>
          <span>
            Rejestr dokumentów CRM, generator ofert oraz generator faktur w jednym
            miejscu.
          </span>
        </div>

        <div className="documents-hero-actions">
          <button
            className={
              activePanel === "register" ? "outline-button" : "small-outline-button"
            }
            type="button"
            onClick={() => setActivePanel("register")}
          >
            Rejestr
          </button>

          <button
            className={
              activePanel === "offer" ? "outline-button" : "small-outline-button"
            }
            type="button"
            onClick={() => setActivePanel("offer")}
          >
            Generator ofert
          </button>

          <button
            className={
              activePanel === "invoice" ? "outline-button" : "small-outline-button"
            }
            type="button"
            onClick={() => setActivePanel("invoice")}
          >
            Generator faktur
          </button>

          <button
            className="outline-button"
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={15} />
            Nowy dokument
          </button>
        </div>
      </div>

      {activePanel === "register" && (
        <>
          <div className="payments-stats-grid">
            <div>
              <span>Wszystkie dokumenty</span>
              <strong>{stats.all}</strong>
            </div>

            <div>
              <span>Robocze</span>
              <strong>{stats.draft}</strong>
            </div>

            <div>
              <span>Wysłane</span>
              <strong>{stats.sent}</strong>
            </div>

            <div>
              <span>Zaakceptowane</span>
              <strong>{stats.accepted}</strong>
            </div>

            <div>
              <span>PDF</span>
              <strong>{stats.pdf}</strong>
            </div>
          </div>

          <div className="payments-toolbar">
            <div className="payments-search">
              <Search size={15} />
              <input
                value={query}
                placeholder="Szukaj dokumentu, klienta, projektu..."
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
                {documentStatuses.map((status) => (
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
                {documentTypes.map((type) => (
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
              <span>Dokument</span>
              <span>Kwota</span>
              <span>Data</span>
              <span>Typ</span>
              <span>Status</span>
              <span>Akcje</span>
            </div>

            <div className="payments-table-body">
              {isLoading ? (
                <div className="payment-empty-row">
                  <FileText size={24} />
                  <h3>Ładowanie dokumentów...</h3>
                  <p>Pobieram dane z backendu.</p>
                </div>
              ) : filteredDocuments.length ? (
                filteredDocuments.map((document) => (
                  <div className="payments-table-row" key={document.id}>
                    <div className="payment-client-cell">
                      <strong>{document.clientName || "Brak klienta"}</strong>
                      <small>
                        {document.contactPerson || "Brak osoby kontaktowej"}
                      </small>
                    </div>

                    <div className="payment-project-cell">
                      <strong>{document.projectName || "Brak projektu"}</strong>
                      <small>
                        {document.validUntil
                          ? `Ważny do ${formatDate(document.validUntil)}`
                          : "Brak terminu"}
                      </small>
                    </div>

                    <button
                      className="payment-title-cell"
                      type="button"
                      onClick={() => setSelectedDocument(document)}
                    >
                      <strong>{document.title}</strong>
                      <small>
                        {document.documentNumber || "Brak numeru dokumentu"}
                      </small>
                    </button>

                    <div className="payment-amount-cell">
                      {document.amount || "Brak"} {document.currency || ""}
                    </div>

                    <div className="payment-date-cell">
                      <CalendarDays size={14} />
                      {formatDate(document.issueDate)}
                    </div>

                    <div>
                      <span className={getTypeClass(document.documentType)}>
                        {document.documentType}
                      </span>
                    </div>

                    <div>
                      <span className={getStatusClass(document.status)}>
                        {document.status}
                      </span>
                    </div>

                    <div className="payment-row-actions">
  <button
    type="button"
    title="Pobierz PDF"
    aria-label="Pobierz PDF"
    onClick={() => handleDownloadDocumentPdf(document)}
  >
    <FileText size={16} />
  </button>

  <button
    type="button"
    title="Podgląd dokumentu"
    aria-label="Podgląd dokumentu"
    onClick={() => setSelectedDocument(document)}
  >
    <Eye size={16} />
  </button>

  <button
    type="button"
    title="Edytuj dokument"
    aria-label="Edytuj dokument"
    onClick={() => setSelectedDocument(document)}
  >
    <Pencil size={16} />
  </button>

  <button
    type="button"
    title="Usuń dokument"
    aria-label="Usuń dokument"
    onClick={() => handleDeleteDocument(document.id)}
  >
    <Trash2 size={16} />
  </button>
</div>
                  </div>
                ))
              ) : (
                <div className="payment-empty-row">
                  <FileText size={24} />
                  <h3>Brak dokumentów</h3>
                  <p>Dodaj pierwszy dokument albo zmień filtry.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activePanel === "offer" && (
        <OfferGenerator
          issuer={issuer}
          settings={settings}
          logoSrc={invoiceLogo}
          onSavedToRegister={(createdDocument) => {
            setDocuments((current) => [
              normalizeDocument(createdDocument),
              ...current,
            ]);

            setPageSuccess("Oferta została zapisana w rejestrze.");
          }}
        />
      )}

      {activePanel === "invoice" && (
        <InvoiceGeneratorPanel
          invoice={invoice}
          items={items}
          totals={totals}
          t={t}
          issuer={issuer}
          invoiceLogo={invoiceLogo}
          updateInvoice={updateInvoice}
          updateItem={updateItem}
          addItem={addItem}
          removeItem={removeItem}
          onDownloadPdf={handleDownloadInvoicePdf}
          onSaveToRegister={handleSaveInvoiceToRegister}
          isSaving={isSaving}
        />
      )}

      {selectedDocument && (
        <DocumentModal
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          onUpdate={handleUpdateDocument}
          onDelete={handleDeleteDocument}
          onDownloadPdf={handleDownloadDocumentPdf}
          isSaving={isSaving}
        />
      )}

      {isCreateModalOpen && (
        <NewDocumentModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateDocument}
          isSaving={isSaving}
        />
      )}
    </section>
  );
}