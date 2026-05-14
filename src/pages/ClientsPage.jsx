import { useEffect, useMemo, useState } from "react";
import {
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  createClient,
  deleteClient,
  getClients,
  updateClient,
} from "../api/clientsApi";

const emptyClientForm = {
  full_name: "",
  company_name: "",
  email: "",
  phone: "",
  status: "Nowy lead",
  source: "Ręcznie dodany",
  contact_type: "Email",
  value: "",
  website: "",
  address: "",
  tax_id: "",
  notes: "",
};

const clientStatuses = [
  "Nowy lead",
  "Do kontaktu",
  "W rozmowie",
  "Oferta wysłana",
  "Aktywny klient",
];

const clientSources = [
  "Ręcznie dodany",
  "Strona www",
  "Polecenie",
  "Email",
  "Telefon",
];

const contactTypes = ["Email", "Telefon", "Spotkanie", "Inne"];

function formatDate(dateValue) {
  if (!dateValue) {
    return "Brak";
  }

  const [datePart] = dateValue.split(" ");
  const [year, month, day] = datePart.split("-");

  if (!year || !month || !day) {
    return dateValue;
  }

  return `${day}.${month}.${year}`;
}

function ClientStatus({ status }) {
  return <span className="client-status-pill">{status}</span>;
}

function ClientField({
  label,
  value,
  placeholder,
  type = "text",
  onChange,
}) {
  return (
    <label className="client-form-field">
      <span>{label}</span>
      <input
        type={type}
        value={value || ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ClientSelect({ label, value, options, onChange }) {
  return (
    <label className="client-form-field">
      <span>{label}</span>
      <select value={value || ""} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option value={option} key={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function NewClientModal({ onClose, onCreate }) {
  const [form, setForm] = useState(emptyClientForm);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!form.full_name.trim()) {
      setError("Podaj nazwę klienta.");
      return;
    }

    setIsSaving(true);

    try {
      await onCreate(form);
      onClose();
    } catch (err) {
      setError(err.message || "Nie udało się dodać klienta.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="client-modal">
        <div className="client-modal-head">
          <div>
            <p className="eyebrow">Nowy klient</p>
            <h2>Dodaj klienta do CRM</h2>
            <span>Wpisz podstawowe dane klienta i zapisz je w bazie.</span>
          </div>

          <button className="modal-close-button" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <section className="client-clean-section">
            <div className="clean-section-head">
              <h3>Dane klienta</h3>
            </div>

            <div className="client-form-grid">
              <ClientField
                label="Nazwa klienta"
                value={form.full_name}
                placeholder="np. Marta Lewandowska"
                onChange={(value) => updateField("full_name", value)}
              />

              <ClientField
                label="Firma"
                value={form.company_name}
                placeholder="np. Luna Beauty Studio"
                onChange={(value) => updateField("company_name", value)}
              />

              <ClientField
                label="Email"
                type="email"
                value={form.email}
                placeholder="kontakt@firma.com"
                onChange={(value) => updateField("email", value)}
              />

              <ClientField
                label="Telefon"
                value={form.phone}
                placeholder="+48 000 000 000"
                onChange={(value) => updateField("phone", value)}
              />

              <ClientSelect
                label="Status"
                value={form.status}
                options={clientStatuses}
                onChange={(value) => updateField("status", value)}
              />

              <ClientSelect
                label="Źródło"
                value={form.source}
                options={clientSources}
                onChange={(value) => updateField("source", value)}
              />

              <ClientSelect
                label="Typ kontaktu"
                value={form.contact_type}
                options={contactTypes}
                onChange={(value) => updateField("contact_type", value)}
              />

              <ClientField
                label="Wartość"
                value={form.value}
                placeholder="np. 12 000 zł"
                onChange={(value) => updateField("value", value)}
              />

              <ClientField
                label="Strona www"
                value={form.website}
                placeholder="https://..."
                onChange={(value) => updateField("website", value)}
              />

              <ClientField
                label="NIP / VAT / Registry"
                value={form.tax_id}
                placeholder="Numer podatkowy"
                onChange={(value) => updateField("tax_id", value)}
              />
            </div>

            <label className="client-form-field client-form-field-wide">
              <span>Adres</span>
              <input
                value={form.address || ""}
                placeholder="Adres klienta"
                onChange={(event) => updateField("address", event.target.value)}
              />
            </label>

            <label className="client-form-field client-form-field-wide">
              <span>Notatka</span>
              <textarea
                value={form.notes || ""}
                placeholder="Krótka notatka o kliencie..."
                onChange={(event) => updateField("notes", event.target.value)}
              />
            </label>

            {error && <p className="client-form-error">{error}</p>}

            <div className="client-modal-actions">
              <button className="small-outline-button" type="button" onClick={onClose}>
                Anuluj
              </button>

              <button className="outline-button" type="submit" disabled={isSaving}>
                {isSaving ? "Zapisywanie..." : "Dodaj klienta"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}

function ClientModal({ client, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(client || emptyClientForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!client) {
    return null;
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSave(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!form.full_name.trim()) {
      setError("Podaj nazwę klienta.");
      return;
    }

    setIsSaving(true);

    try {
      await onSave(form);
      setMessage("Klient został zapisany.");
    } catch (err) {
      setError(err.message || "Nie udało się zapisać klienta.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm("Czy na pewno chcesz usunąć tego klienta?");

    if (!confirmed) {
      return;
    }

    try {
      await onDelete(client.id);
      onClose();
    } catch (err) {
      setError(err.message || "Nie udało się usunąć klienta.");
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="client-modal">
        <div className="client-modal-head">
          <div>
            <p className="eyebrow">Profil klienta</p>
            <h2>{form.full_name}</h2>
            <span>{form.company_name || "Brak firmy"}</span>
          </div>

          <button className="modal-close-button" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <section className="client-summary-section">
          <div className="client-summary-grid">
            <div className="summary-item">
              <span>Email</span>
              <strong>
                <Mail size={14} />
                {form.email || "Brak"}
              </strong>
            </div>

            <div className="summary-item">
              <span>Telefon</span>
              <strong>
                <Phone size={14} />
                {form.phone || "Brak"}
              </strong>
            </div>

            <div className="summary-item">
              <span>Źródło</span>
              <strong>{form.source || "Brak"}</strong>
            </div>

            <div className="summary-item">
              <span>Status</span>
              <strong>{form.status || "Brak"}</strong>
            </div>

            <div className="summary-item">
              <span>Wartość</span>
              <strong>{form.value || "Brak"}</strong>
            </div>

            <div className="summary-item">
              <span>Dodano</span>
              <strong>{formatDate(form.created_at)}</strong>
            </div>
          </div>
        </section>

        <form onSubmit={handleSave}>
          <section className="client-clean-section">
            <div className="clean-section-head">
              <h3>Edycja danych</h3>

              <button className="mini-outline-button" type="submit" disabled={isSaving}>
                {isSaving ? "Zapisywanie..." : "Zapisz"}
              </button>
            </div>

            <div className="client-form-grid">
              <ClientField
                label="Nazwa klienta"
                value={form.full_name}
                placeholder="Nazwa klienta"
                onChange={(value) => updateField("full_name", value)}
              />

              <ClientField
                label="Firma"
                value={form.company_name}
                placeholder="Firma"
                onChange={(value) => updateField("company_name", value)}
              />

              <ClientField
                label="Email"
                type="email"
                value={form.email}
                placeholder="Email"
                onChange={(value) => updateField("email", value)}
              />

              <ClientField
                label="Telefon"
                value={form.phone}
                placeholder="Telefon"
                onChange={(value) => updateField("phone", value)}
              />

              <ClientSelect
                label="Status"
                value={form.status}
                options={clientStatuses}
                onChange={(value) => updateField("status", value)}
              />

              <ClientSelect
                label="Źródło"
                value={form.source}
                options={clientSources}
                onChange={(value) => updateField("source", value)}
              />

              <ClientSelect
                label="Typ kontaktu"
                value={form.contact_type}
                options={contactTypes}
                onChange={(value) => updateField("contact_type", value)}
              />

              <ClientField
                label="Wartość"
                value={form.value}
                placeholder="Wartość"
                onChange={(value) => updateField("value", value)}
              />

              <ClientField
                label="Strona www"
                value={form.website}
                placeholder="https://..."
                onChange={(value) => updateField("website", value)}
              />

              <ClientField
                label="NIP / VAT / Registry"
                value={form.tax_id}
                placeholder="Numer podatkowy"
                onChange={(value) => updateField("tax_id", value)}
              />
            </div>

            <label className="client-form-field client-form-field-wide">
              <span>Adres</span>
              <input
                value={form.address || ""}
                placeholder="Adres"
                onChange={(event) => updateField("address", event.target.value)}
              />
            </label>

            {error && <p className="client-form-error">{error}</p>}
            {message && <p className="client-form-success">{message}</p>}
          </section>

          <section className="client-clean-section">
            <div className="clean-section-head">
              <h3>Notatki</h3>

              <button className="mini-outline-button" type="submit" disabled={isSaving}>
                Zapisz notatkę
              </button>
            </div>

            <label className="client-form-field client-form-field-wide">
              <textarea
                value={form.notes || ""}
                placeholder="Dodaj notatkę widoczną przy kliencie..."
                onChange={(event) => updateField("notes", event.target.value)}
              />
            </label>
          </section>
        </form>

        <section className="client-clean-section">
          <div className="clean-section-head">
            <h3>Logi systemowe</h3>

            <button className="mini-outline-button" type="button">
              Filtruj
            </button>
          </div>

          <div className="technical-logs">
            <div className="technical-log-row">
              <span className="log-time">{formatDate(form.created_at)}</span>
              <span className="log-type">CLIENT_CREATE</span>
              <span className="log-message">Dodano klienta do bazy</span>
              <span className="log-meta">{form.full_name}</span>
            </div>

            <div className="technical-log-row">
              <span className="log-time">{formatDate(form.updated_at)}</span>
              <span className="log-type">CLIENT_UPDATE</span>
              <span className="log-message">Ostatnia aktualizacja klienta</span>
              <span className="log-meta">{form.status}</span>
            </div>
          </div>
        </section>

        <section className="client-clean-section">
          <div className="clean-section-head">
            <h3>Zadania</h3>

            <button className="mini-outline-button" type="button">
              Dodaj zadanie
            </button>
          </div>

          <div className="tasks-row">
            <div className="task-chip">Przygotować ofertę</div>
            <div className="task-chip">Oddzwonić</div>
            <div className="task-chip">Ustalić zakres projektu</div>
          </div>
        </section>

        <div className="client-danger-zone">
          <button className="small-outline-button danger" type="button" onClick={handleDelete}>
            <Trash2 size={14} />
            Usuń klienta
          </button>
        </div>
      </div>
    </div>
  );
}

function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  async function loadClients() {
    setIsLoading(true);
    setPageError("");

    try {
      const data = await getClients();
      setClients(data.clients || []);
    } catch (err) {
      setPageError(err.message || "Nie udało się pobrać klientów.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return clients;
    }

    return clients.filter((client) => {
      const text = `
        ${client.full_name}
        ${client.company_name}
        ${client.email}
        ${client.phone}
        ${client.status}
        ${client.source}
        ${client.notes}
      `.toLowerCase();

      return text.includes(normalizedQuery);
    });
  }, [clients, query]);

  async function handleCreateClient(clientData) {
    const data = await createClient(clientData);

    setClients((current) => [data.client, ...current]);
  }

  async function handleSaveClient(clientData) {
    const data = await updateClient(clientData.id, clientData);

    setClients((current) =>
      current.map((client) => (client.id === data.client.id ? data.client : client))
    );

    setSelectedClient(data.client);
  }

  async function handleDeleteClient(clientId) {
    await deleteClient(clientId);

    setClients((current) => current.filter((client) => client.id !== clientId));
    setSelectedClient(null);
  }

  return (
    <section className="clients-page">
      <div className="clients-toolbar">
        <div className="clients-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Szukaj klienta, firmy, emaila, telefonu..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="clients-toolbar-actions">
          <button className="small-outline-button" type="button">
            Status
          </button>

          <button className="small-outline-button" type="button">
            Źródło
          </button>

          <button
            className="outline-button"
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={16} />
            Dodaj klienta
          </button>
        </div>
      </div>

      {pageError && <p className="client-form-error">{pageError}</p>}

      <div className="clients-table-card">
        <div className="clients-table-head">
          <span>Klient</span>
          <span>Firma</span>
          <span>Status</span>
          <span>Źródło</span>
          <span>Ostatnia aktualizacja</span>
          <span>Wartość</span>
        </div>

        <div className="clients-table-body">
          {isLoading ? (
            <div className="clients-empty-row">
              <h3>Ładowanie klientów...</h3>
              <p>Pobieranie danych z backendu.</p>
            </div>
          ) : filteredClients.length ? (
            filteredClients.map((client) => (
              <button
                className="clients-table-row"
                key={client.id}
                type="button"
                onClick={() => setSelectedClient(client)}
              >
                <span className="client-main-cell">
                  <strong>{client.full_name}</strong>
                  <small>{client.email || "Brak emaila"}</small>
                </span>

                <span>{client.company_name || "Brak"}</span>

                <span>
                  <ClientStatus status={client.status} />
                </span>

                <span>{client.source}</span>

                <span>{formatDate(client.updated_at)}</span>

                <span className="client-value-cell">{client.value || "Brak"}</span>
              </button>
            ))
          ) : (
            <div className="clients-empty-row">
              <h3>Brak klientów</h3>
              <p>Dodaj pierwszego klienta albo zmień frazę wyszukiwania.</p>
            </div>
          )}
        </div>
      </div>

      <ClientModal
        client={selectedClient}
        onClose={() => setSelectedClient(null)}
        onSave={handleSaveClient}
        onDelete={handleDeleteClient}
      />

      {isCreateModalOpen && (
        <NewClientModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateClient}
        />
      )}
    </section>
  );
}

export default ClientsPage;