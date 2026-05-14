import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Download,
  Eye,
  File,
  Inbox,
  Link2,
  Mail,
  MailOpen,
  Paperclip,
  Pencil,
  Plus,
  Reply,
  Search,
  Send,
  Star,
  Trash2,
  Upload,
  UserPlus,
  X,
} from "lucide-react";

import {
  createMail,
  deleteMail as deleteMailRequest,
  getMails,
  sendMail,
  syncMails,
  updateMail as updateMailRequest,
} from "../api/mailsApi";

import { mailTemplates } from "../data/mailTemplates";
import { mailSignatures } from "../data/mailSignatures";
import logo from "../assets/logo.png";

const mailModuleTabs = [
  "Skrzynka",
  "Szablony",
  "Stopki",
  "Automatyzacje",
  "Ustawienia",
];

const filterTabs = [
  "Wszystkie",
  "Odebrane",
  "Nieprzeczytane",
  "Do odpowiedzi",
  "Wysłane",
  "Robocze",
  "Do przypisania",
  "Zarchiwizowane",
];

const statusOptions = [
  "Nieprzeczytany",
  "Przeczytany",
  "Do odpowiedzi",
  "Odpowiedziany",
  "Do przypisania",
  "Wysłany",
  "Robocza",
  "Zarchiwizowany",
];

const priorityOptions = ["Niski", "Normalny", "Wysoki"];

function splitTags(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return String(value)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function tagsToString(tags) {
  if (Array.isArray(tags)) {
    return tags.join(", ");
  }

  return tags || "";
}

function normalizeEmail(mail) {
  const attachmentName = mail.attachment_name || "";

  return {
    id: mail.id,
    direction: mail.direction || "inbox",
    fromName: mail.from_name || "",
    fromEmail: mail.from_email || "",
    to: mail.to_email || "",
    subject: mail.subject || "",
    client: mail.client_name || "",
    project: mail.project_name || "",
    clientStatus: mail.client_status || "Nieprzypisany",
    status: mail.status || "Do odpowiedzi",
    priority: mail.priority || "Normalny",
    folder: mail.folder || "Odebrane",
    date: mail.created_at || "",
    preview: mail.preview || "",
    body: mail.body || "",
    notes: mail.notes || "",
    tags: splitTags(mail.tags),
    attachmentName,
    attachments: attachmentName
      ? [
          {
            id: 1,
            name: attachmentName,
            size: "—",
            type: attachmentName.split(".").pop()?.toUpperCase() || "PLIK",
          },
        ]
      : [],
    createdAt: mail.created_at || "",
    updatedAt: mail.updated_at || "",
  };
}

function emailToPayload(email) {
  const firstAttachment = email.attachments?.[0];

  return {
    direction: email.direction || "inbox",
    from_name: email.fromName || "",
    from_email: email.fromEmail || "",
    to_email: email.to || "",
    subject: email.subject || "",
    client_name: email.client || "",
    project_name: email.project || "",
    client_status: email.clientStatus || "Nieprzypisany",
    status: email.status || "Do odpowiedzi",
    priority: email.priority || "Normalny",
    folder: email.folder || "Odebrane",
    preview: email.preview || "",
    body: email.body || "",
    notes: email.notes || "",
    tags: tagsToString(email.tags),
    has_attachment: Boolean(firstAttachment || email.attachmentName),
    attachment_name: firstAttachment?.name || email.attachmentName || "",
  };
}


function getStatusClass(status) {
  if (status === "Nieprzeczytany" || status === "Do odpowiedzi") {
    return "mail-status mail-status-red";
  }

  if (status === "Do przypisania" || status === "Robocza") {
    return "mail-status mail-status-orange";
  }

  if (status === "Wysłany" || status === "Odpowiedziany") {
    return "mail-status mail-status-green";
  }

  return "mail-status";
}

function getDirectionIcon(direction) {
  if (direction === "sent") {
    return <Send size={14} />;
  }

  return <Inbox size={14} />;
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "Brak daty";
  }

  const [datePart, timePart = ""] = dateValue.split(" ");
  const [year, month, day] = datePart.split("-");

  if (!year || !month || !day) {
    return dateValue;
  }

  return `${day}.${month}.${year}${timePart ? `, ${timePart}` : ""}`;
}

function getDefaultSignature() {
  return mailSignatures.find((signature) => signature.isDefault) || mailSignatures[0];
}

function createSignatureText(signature) {
  if (!signature) {
    return "";
  }

  return [
    "",
    "",
    "—",
    signature.senderName,
    signature.companyName,
    signature.role,
    "",
    `E-mail: ${signature.email}`,
    `Tel: ${signature.phone}`,
    "",
    signature.addressLine1,
    signature.addressLine2,
    signature.addressLine3,
    "",
    `Registry code: ${signature.registryCode}`,
    `VAT EU: ${signature.vatEu}`,
  ]
    .filter((line) => line !== undefined && line !== null)
    .join("\n");
}

function AttachmentList({ attachments = [] }) {
  if (!attachments.length) {
    return <p className="mail-muted-text">Brak załączników.</p>;
  }

  return (
    <div className="mail-attachments-list">
      {attachments.map((attachment) => (
        <div className="mail-attachment-row" key={attachment.id || attachment.name}>
          <div>
            <File size={15} />
            <span>{attachment.name}</span>
          </div>

          <small>
            {attachment.type || "Plik"} · {attachment.size}
          </small>

          <button type="button" aria-label="Pobierz załącznik">
            <Download size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}

function ComposeModal({
  mode,
  sourceEmail,
  templateToUse,
  onClose,
  onSendDraft,
  onClearTemplate,
  isSaving,
}) {
  const isReply = mode === "reply";
  const defaultSignature = getDefaultSignature();

  const initialSubject = templateToUse?.subject || (isReply ? `Re: ${sourceEmail.subject}` : "");

  const initialBody = templateToUse?.body
  ? `${templateToUse.body}${createSignatureText(defaultSignature)}`
  : isReply
    ? `Dzień dobry,\n\n\n\nPozdrawiam${createSignatureText(defaultSignature)}\n\n---\nOryginalna wiadomość:\n${sourceEmail.body}`
    : `Dzień dobry,\n\n\n\nPozdrawiam${createSignatureText(defaultSignature)}`;

  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    to: isReply ? sourceEmail.fromEmail : "",
    cc: "",
    bcc: "",
    client: isReply ? sourceEmail.client : "",
    subject: initialSubject,
    template: templateToUse?.id || "",
    signature: defaultSignature?.id || "",
    addSignature: true,
    saveToClientHistory: true,
    createFollowUp: false,
    body: initialBody,
  });

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function applyTemplate(templateId) {
    const template = mailTemplates.find((item) => item.id === templateId);

    if (!template) {
      updateField("template", "");
      return;
    }

    const signature = mailSignatures.find((item) => item.id === form.signature);

    setForm((current) => ({
      ...current,
      template: templateId,
      subject: template.subject,
      body: current.addSignature
        ? `${template.body}${createSignatureText(signature)}`
        : template.body,
    }));

    if (onClearTemplate) {
      onClearTemplate();
    }
  }

  function removeSignatureFromBody(body) {
  return body.replace(/\n\n—\nKarl Handke[\s\S]*?(?=\n\n---\nOryginalna wiadomość:|$)/g, "");
}

function toggleSignature() {
  const signature = mailSignatures.find((item) => item.id === form.signature);

  setForm((current) => {
    const shouldAddSignature = !current.addSignature;

    return {
      ...current,
      addSignature: shouldAddSignature,
      body: shouldAddSignature
        ? `${current.body}${createSignatureText(signature)}`
        : removeSignatureFromBody(current.body),
    };
  });
}

  function toggleSignature() {
    const signature = mailSignatures.find((item) => item.id === form.signature);

    setForm((current) => {
      const shouldAddSignature = !current.addSignature;

      return {
        ...current,
        addSignature: shouldAddSignature,
        body: shouldAddSignature
          ? `${current.body}${createSignatureText(signature)}`
          : current.body.replace(/\n\n—[\s\S]*$/g, ""),
      };
    });
  }

  function insertCompanyData() {
    const signature = mailSignatures.find((item) => item.id === form.signature);

    if (!signature) {
      return;
    }

    const companyData = [
      "",
      "Dane firmy:",
      signature.companyName,
      signature.email,
      signature.phone,
      signature.addressLine1,
      signature.addressLine2,
      signature.addressLine3,
      `Registry code: ${signature.registryCode}`,
      `VAT EU: ${signature.vatEu}`,
    ].join("\n");

    updateField("body", `${form.body}\n${companyData}`);
  }

  function insertClientPlaceholder() {
    const clientText = [
      "",
      "Informacje od klienta:",
      "• cel projektu:",
      "• najważniejsze funkcje:",
      "• procesy do automatyzacji:",
      "• integracje:",
      "• dodatkowe uwagi:",
    ].join("\n");

    updateField("body", `${form.body}\n${clientText}`);
  }

  function handleFiles(event) {
    const selectedFiles = Array.from(event.target.files || []).map((file, index) => ({
      id: `${file.name}-${index}-${Date.now()}`,
      name: file.name,
      size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      type: file.name.split(".").pop()?.toUpperCase() || "PLIK",
      rawFile: file,
    }));

    setFiles((current) => [...current, ...selectedFiles]);
    event.target.value = "";
  }

  function removeFile(fileId) {
    setFiles((current) => current.filter((file) => file.id !== fileId));
  }

  async function handleSubmit(type) {
    if (!form.subject.trim()) {
      setError("Podaj temat wiadomości.");
      return;
    }

    try {
      setError("");

      await onSendDraft({
        ...form,
        id: Date.now(),
        type,
        attachments: files,
      });

      if (onClearTemplate) {
        onClearTemplate();
      }

      onClose();
    } catch (submitError) {
      setError(submitError.message || "Nie udało się zapisać wiadomości.");
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="mail-compose-modal">
        <div className="mail-modal-head">
          <div>
            <p className="eyebrow">{isReply ? "Odpowiedź" : "Nowa wiadomość"}</p>
            <h2>{isReply ? sourceEmail.subject : "Utwórz wiadomość email"}</h2>
            <span>
              Przygotuj wiadomość, wybierz szablon, dodaj stopkę i załączniki.
            </span>
          </div>

          <button className="modal-close-button" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="mail-compose-grid">
          <label className="mail-field mail-field-wide">
            <span>Do</span>
            <input
              value={form.to}
              placeholder="adres@email.com"
              onChange={(event) => updateField("to", event.target.value)}
            />
          </label>

          <label className="mail-field">
            <span>DW</span>
            <input
              value={form.cc}
              placeholder="opcjonalnie"
              onChange={(event) => updateField("cc", event.target.value)}
            />
          </label>

          <label className="mail-field">
            <span>UDW</span>
            <input
              value={form.bcc}
              placeholder="opcjonalnie"
              onChange={(event) => updateField("bcc", event.target.value)}
            />
          </label>

          <label className="mail-field">
            <span>Klient</span>
            <input
              value={form.client}
              placeholder="np. Luna Beauty Studio"
              onChange={(event) => updateField("client", event.target.value)}
            />
          </label>

          <label className="mail-field">
            <span>Szablon wiadomości</span>
            <select
              value={form.template}
              onChange={(event) => applyTemplate(event.target.value)}
            >
              <option value="">Wybierz szablon</option>
              {mailTemplates.map((template) => (
                <option value={template.id} key={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>

          <label className="mail-field">
            <span>Stopka</span>
            <select
              value={form.signature}
              onChange={(event) => applySignature(event.target.value)}
            >
              {mailSignatures.map((signature) => (
                <option value={signature.id} key={signature.id}>
                  {signature.name}
                </option>
              ))}
            </select>
          </label>

          <label className="mail-field mail-field-wide">
            <span>Temat</span>
            <input
              value={form.subject}
              placeholder="Temat wiadomości"
              onChange={(event) => updateField("subject", event.target.value)}
            />
          </label>

          <div className="mail-compose-tools mail-field-wide">
            <button type="button" onClick={insertClientPlaceholder}>
              Wstaw pytania do klienta
            </button>

            <button type="button" onClick={insertCompanyData}>
              Wstaw dane firmy
            </button>

            <button type="button" onClick={toggleSignature}>
              {form.addSignature ? "Usuń stopkę" : "Dodaj stopkę"}
            </button>
          </div>

          <label className="mail-field mail-field-wide">
            <span>Treść wiadomości</span>
            <textarea
              value={form.body}
              onChange={(event) => updateField("body", event.target.value)}
            />
          </label>
        </div>

        <div className="mail-compose-options">
          <label>
            <input
              type="checkbox"
              checked={form.saveToClientHistory}
              onChange={() =>
                updateField("saveToClientHistory", !form.saveToClientHistory)
              }
            />
            <span>Zapisz wiadomość w historii klienta</span>
          </label>

          <label>
            <input
              type="checkbox"
              checked={form.createFollowUp}
              onChange={() => updateField("createFollowUp", !form.createFollowUp)}
            />
            <span>Utwórz zadanie follow-up po wysłaniu</span>
          </label>
        </div>

        <div className="mail-compose-attachments">
          <div className="clean-section-head">
            <h3>Załączniki</h3>

            <label className="small-outline-button">
              <Upload size={14} />
              Dodaj pliki
              <input type="file" multiple hidden onChange={handleFiles} />
            </label>
          </div>

          {files.length ? (
            <div className="mail-attachments-list">
              {files.map((file) => (
                <div className="mail-attachment-row" key={file.id}>
                  <div>
                    <File size={15} />
                    <span>{file.name}</span>
                  </div>

                  <small>
                    {file.type} · {file.size}
                  </small>

                  <button
                    type="button"
                    aria-label="Usuń załącznik"
                    onClick={() => removeFile(file.id)}
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mail-muted-text">
              Nie dodano jeszcze żadnych załączników. Możesz dodać PDF, ofertę,
              fakturę, brief lub inny plik.
            </p>
          )}
        </div>

        {error && <p className="client-form-error">{error}</p>}

        <div className="mail-modal-actions">
          <button
            className="small-outline-button"
            type="button"
            onClick={() => handleSubmit("draft")}
            disabled={isSaving}
          >
            <Pencil size={14} />
            Zapisz roboczą
          </button>

          <button
            className="outline-button"
            type="button"
            onClick={() => handleSubmit("send")}
            disabled={isSaving}
          >
            <Send size={15} />
            Wyślij wiadomość
          </button>
        </div>
      </div>
    </div>
  );
}

function MailPreviewModal({
  email,
  onClose,
  onReply,
  onChangeEmail,
  onSaveEmail,
  onArchive,
  onDelete,
  isSaving,
}) {
  const [editableEmail, setEditableEmail] = useState(email);
  const [error, setError] = useState("");

  function updateField(field, value) {
    const updatedEmail = {
      ...editableEmail,
      [field]: value,
    };

    setEditableEmail(updatedEmail);
    onChangeEmail(updatedEmail);
  }

  async function handleSave() {
    if (!editableEmail.subject.trim()) {
      setError("Podaj temat wiadomości.");
      return;
    }

    try {
      setError("");
      await onSaveEmail(editableEmail);
    } catch (saveError) {
      setError(saveError.message || "Nie udało się zapisać wiadomości.");
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="mail-preview-modal">
        <div className="mail-modal-head">
          <div>
            <p className="eyebrow">{editableEmail.folder}</p>
            <h2>{editableEmail.subject}</h2>
            <span>
              {editableEmail.fromName} · {formatDate(editableEmail.date)}
            </span>
          </div>

          <button className="modal-close-button" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="mail-preview-summary">
          <div>
            <span>Nadawca</span>
            <strong>{editableEmail.fromName}</strong>
            <p>{editableEmail.fromEmail}</p>
          </div>

          <div>
            <span>Odbiorca</span>
            <strong>{editableEmail.to}</strong>
            <p>{editableEmail.direction === "sent" ? "Wysłane z CRM" : "Odebrane"}</p>
          </div>

          <div>
            <span>Klient</span>
            <strong>{editableEmail.client || "Nieprzypisany"}</strong>
            <p>{editableEmail.clientStatus}</p>
          </div>

          <div>
            <span>Status</span>
            <strong className={getStatusClass(editableEmail.status)}>
              {editableEmail.status}
            </strong>
          </div>
        </div>

        <div className="mail-preview-grid">
          <section className="mail-preview-main">
            <div className="client-clean-section">
              <div className="clean-section-head">
                <h3>Treść wiadomości</h3>

                <div className="mail-inline-actions">
                  <button type="button" onClick={() => onReply(editableEmail)}>
                    <Reply size={15} />
                    Odpowiedz
                  </button>

                  <button type="button" onClick={() => onArchive(editableEmail.id)}>
                    <Archive size={15} />
                    Archiwizuj
                  </button>
                </div>
              </div>

              <div className="mail-body-box">
                {editableEmail.body.split("\n").map((line, index) => (
                  <p key={`${line}-${index}`}>{line || "\u00A0"}</p>
                ))}
              </div>
            </div>

            <div className="client-clean-section">
              <div className="clean-section-head">
                <h3>Załączniki</h3>
                <span className="mail-small-counter">
                  {editableEmail.attachments.length} plików
                </span>
              </div>

              <AttachmentList attachments={editableEmail.attachments} />
            </div>

            <div className="client-clean-section">
              <div className="clean-section-head">
                <h3>Notatka wewnętrzna</h3>
              </div>

              <label className="mail-field mail-field-wide">
                <textarea
                  value={editableEmail.notes}
                  placeholder="Dodaj notatkę widoczną tylko w CRM..."
                  onChange={(event) => updateField("notes", event.target.value)}
                />
              </label>
            </div>
          </section>

          <aside className="mail-preview-side">
            <div className="mail-side-card">
              <h3>Zarządzanie</h3>

              <label className="mail-field">
                <span>Status</span>
                <select
                  value={editableEmail.status}
                  onChange={(event) => updateField("status", event.target.value)}
                >
                  {statusOptions.map((status) => (
                    <option value={status} key={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mail-field">
                <span>Priorytet</span>
                <select
                  value={editableEmail.priority}
                  onChange={(event) => updateField("priority", event.target.value)}
                >
                  {priorityOptions.map((priority) => (
                    <option value={priority} key={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mail-field">
                <span>Przypisany klient</span>
                <input
                  value={editableEmail.client}
                  placeholder="Nazwa klienta"
                  onChange={(event) => updateField("client", event.target.value)}
                />
              </label>

              {error && <p className="client-form-error">{error}</p>}

              <div className="mail-side-actions">
                <button type="button" onClick={handleSave} disabled={isSaving}>
                  <Pencil size={15} />
                  {isSaving ? "Zapisywanie..." : "Zapisz zmiany"}
                </button>

                <button type="button">
                  <Link2 size={15} />
                  Przypisz do klienta
                </button>

                <button type="button">
                  <UserPlus size={15} />
                  Utwórz klienta
                </button>

                <button type="button" onClick={() => onDelete(editableEmail.id)}>
                  <Trash2 size={15} />
                  Usuń wiadomość
                </button>
              </div>
            </div>

            <div className="mail-side-card">
              <h3>Tagi</h3>

              <div className="mail-tags">
                {editableEmail.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>

            <div className="mail-side-card">
              <h3>Integracja skrzynki</h3>
              <p>
                Docelowo ten moduł będzie pobierał pocztę przez IMAP i wysyłał
                wiadomości przez SMTP. React zostaje tylko interfejsem, a dane
                dostępowe do skrzynki powinny być zapisane bezpiecznie po stronie
                backendu.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function MailTemplatesSection({ onUseTemplate }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    mailTemplates[0]?.id || ""
  );

  const selectedTemplate = mailTemplates.find(
    (template) => template.id === selectedTemplateId
  );

  return (
    <section className="mail-section-panel">
      <div className="mail-section-head">
        <div>
          <h3>Szablony odpowiedzi</h3>
          <p>
            Gotowe wiadomości do obsługi zapytań, odmów, follow-upów i wysyłki ofert.
          </p>
        </div>

        <button className="outline-button" type="button">
          <Plus size={15} />
          Nowy szablon
        </button>
      </div>

      <div className="mail-templates-layout">
        <div className="mail-templates-list">
          {mailTemplates.map((template) => (
            <button
              type="button"
              key={template.id}
              className={`mail-template-card ${
                selectedTemplateId === template.id ? "active" : ""
              }`}
              onClick={() => setSelectedTemplateId(template.id)}
            >
              <div>
                <strong>{template.name}</strong>
                <span>{template.description}</span>
              </div>

              <small>{template.category}</small>
            </button>
          ))}
        </div>

        {selectedTemplate && (
          <div className="mail-template-preview">
            <div className="mail-template-preview-head">
              <div>
                <span>
                  {selectedTemplate.category} · {selectedTemplate.language}
                </span>
                <h3>{selectedTemplate.name}</h3>
                <p>{selectedTemplate.description}</p>
              </div>

              <button
                className="small-outline-button"
                type="button"
                onClick={() => onUseTemplate(selectedTemplate)}
              >
                <Send size={14} />
                Użyj szablonu
              </button>
            </div>

            <div className="mail-template-subject">
              <span>Temat</span>
              <strong>{selectedTemplate.subject}</strong>
            </div>

            <div className="mail-template-body">
              {selectedTemplate.body.split("\n").map((line, index) => (
                <p key={`${line}-${index}`}>{line || "\u00A0"}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function MailSignaturesSection() {
  const signature = getDefaultSignature();

  if (!signature) {
    return null;
  }

  return (
    <section className="mail-section-panel">
      <div className="mail-section-head">
        <div>
          <h3>Stopki mailowe</h3>
          <p>
            Subtelna stopka firmowa dodawana do wiadomości wysyłanych z CRM.
          </p>
        </div>

        <button className="outline-button" type="button">
          <Plus size={15} />
          Nowa stopka
        </button>
      </div>

      <div className="mail-signature-layout">
        <div className="mail-signature-settings">
          <div className="mail-signature-card active">
            <div>
              <strong>{signature.name}</strong>
              <span>Domyślna stopka dla wiadomości wychodzących</span>
            </div>

            <small>Aktywna</small>
          </div>

          <div className="mail-signature-info-grid">
            <div>
              <span>Nadawca</span>
              <strong>{signature.senderName}</strong>
            </div>

            <div>
              <span>Firma</span>
              <strong>{signature.companyName}</strong>
            </div>

            <div>
              <span>Email</span>
              <strong>{signature.email}</strong>
            </div>

            <div>
              <span>Telefon</span>
              <strong>{signature.phone}</strong>
            </div>

            <div>
              <span>Registry code</span>
              <strong>{signature.registryCode}</strong>
            </div>

            <div>
              <span>VAT EU</span>
              <strong>{signature.vatEu}</strong>
            </div>
          </div>
        </div>

        <div className="mail-signature-preview-card">
          <div className="mail-signature-preview-head">
            <span>Podgląd stopki</span>
            <strong>Wersja subtelna / jedna linia</strong>
          </div>

          <div className="email-signature-line">
            <div className="email-signature-left">
              <strong>{signature.senderName}</strong>
              <span>{signature.companyName}</span>
              <span>{signature.role}</span>
              <span>{signature.email}</span>
              <span>{signature.phone}</span>
              <span>
                {signature.addressLine2}, {signature.addressLine3}
              </span>
              <span>
                Reg. {signature.registryCode} · VAT EU {signature.vatEu}
              </span>
            </div>

            <div className="email-signature-logo">
              <img src={logo} alt={signature.companyName} />
            </div>
          </div>

          <p className="mail-signature-note">
  Ta stopka jest obecnie wysyłana jako wersja tekstowa. Logo widoczne jest tylko
  w podglądzie CRM. Wersję HTML z logo dodamy później jako osobny etap.
</p>
        </div>
      </div>
    </section>
  );
}

function MailAutomationsSection() {
  const automations = [
    {
      name: "Nowy adres email",
      description:
        "Jeżeli mail przyjdzie od nieznanego adresu, oznacz jako „Do przypisania”.",
      active: true,
    },
    {
      name: "Brak odpowiedzi po ofercie",
      description:
        "Po wysłaniu oferty utwórz zadanie follow-up po 3 dniach.",
      active: true,
    },
    {
      name: "Mail z załącznikiem PDF",
      description:
        "Jeżeli wiadomość zawiera PDF, oznacz ją tagiem „Dokument”.",
      active: false,
    },
    {
      name: "Nieprzeczytane dłużej niż 48h",
      description:
        "Jeżeli mail jest nieprzeczytany dłużej niż 48 godzin, oznacz jako „Do odpowiedzi”.",
      active: true,
    },
  ];

  return (
    <section className="mail-section-panel">
      <div className="mail-section-head">
        <div>
          <h3>Automatyzacje mailowe</h3>
          <p>
            Reguły, które pomogą pilnować odpowiedzi, klientów, ofert i follow-upów.
          </p>
        </div>

        <button className="outline-button" type="button">
          <Plus size={15} />
          Nowa reguła
        </button>
      </div>

      <div className="mail-automation-list">
        {automations.map((automation) => (
          <div className="mail-automation-row" key={automation.name}>
            <div>
              <strong>{automation.name}</strong>
              <span>{automation.description}</span>
            </div>

            <button
              type="button"
              className={`settings-toggle ${automation.active ? "is-active" : ""}`}
            >
              <span />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function MailSettingsSection() {
  return (
    <section className="mail-section-panel">
      <div className="mail-section-head">
        <div>
          <h3>Ustawienia skrzynki</h3>
          <p>
            Przygotowanie pod późniejsze podłączenie skrzynki Zone.ee przez IMAP i SMTP.
          </p>
        </div>

        <button className="outline-button" type="button">
          Zapisz ustawienia
        </button>
      </div>

      <div className="mail-settings-grid">
        <label className="mail-field">
          <span>Adres email</span>
          <input value="office@handkeholding.com" readOnly />
        </label>

        <label className="mail-field">
          <span>Nazwa nadawcy</span>
          <input value="Karl Handke / Handke Holding OÜ" readOnly />
        </label>

        <label className="mail-field">
          <span>IMAP host</span>
          <input placeholder="np. mail.zone.ee" />
        </label>

        <label className="mail-field">
          <span>IMAP port</span>
          <input placeholder="993" />
        </label>

        <label className="mail-field">
          <span>SMTP host</span>
          <input placeholder="np. smtp.zone.ee" />
        </label>

        <label className="mail-field">
          <span>SMTP port</span>
          <input placeholder="465 / 587" />
        </label>

        <label className="mail-field">
          <span>Szyfrowanie</span>
          <select defaultValue="SSL/TLS">
            <option>SSL/TLS</option>
            <option>STARTTLS</option>
          </select>
        </label>

        <label className="mail-field">
          <span>Status połączenia</span>
          <input value="Niepodłączone — frontend przygotowany" readOnly />
        </label>
      </div>

      <p className="mail-settings-warning">
        Hasło do skrzynki nie powinno być zapisywane w React. Docelowo dane
        dostępowe muszą być obsłużone po stronie backendu.
      </p>
    </section>
  );
}


export default function MailsPage() {
  const [emails, setEmails] = useState([]);
  const [activeModuleTab, setActiveModuleTab] = useState("Skrzynka");
  const [activeFilter, setActiveFilter] = useState("Wszystkie");
  const [query, setQuery] = useState("");
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [composeMode, setComposeMode] = useState(null);
  const [replySource, setReplySource] = useState(null);
  const [templateToUse, setTemplateToUse] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadEmails();
  }, []);

  async function loadEmails() {
    try {
      setIsLoading(true);
      setPageError("");

      const data = await getMails();
      const backendMails = data.mails || [];

      setEmails(backendMails.map(normalizeEmail));
    } catch (error) {
      setPageError(error.message || "Nie udało się pobrać maili.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSyncMails() {
  try {
    setIsSyncing(true);
    setPageError("");
    setPageSuccess("");

    const data = await syncMails(25);

    await loadEmails();

    setPageSuccess(data.message || "Skrzynka została zsynchronizowana.");
  } catch (error) {
    setPageError(error.message || "Nie udało się zsynchronizować skrzynki.");
  } finally {
    setIsSyncing(false);
  }
}

  const stats = useMemo(() => {
    return {
      all: emails.length,
      unread: emails.filter((email) => email.status === "Nieprzeczytany").length,
      toReply: emails.filter((email) => email.status === "Do odpowiedzi").length,
      unlinked: emails.filter((email) => email.status === "Do przypisania").length,
    };
  }, [emails]);

  const filteredEmails = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return emails.filter((email) => {
      const matchesSearch =
        !normalizedQuery ||
        email.fromName.toLowerCase().includes(normalizedQuery) ||
        email.fromEmail.toLowerCase().includes(normalizedQuery) ||
        email.subject.toLowerCase().includes(normalizedQuery) ||
        email.preview.toLowerCase().includes(normalizedQuery) ||
        email.client.toLowerCase().includes(normalizedQuery);

      const matchesFilter =
        activeFilter === "Wszystkie" ||
        email.folder === activeFilter ||
        email.status === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [emails, activeFilter, query]);

  function updateEmail(updatedEmail) {
    setEmails((current) =>
      current.map((email) => (email.id === updatedEmail.id ? updatedEmail : email)),
    );

    setSelectedEmail((current) =>
      current?.id === updatedEmail.id ? updatedEmail : current,
    );
  }

  async function saveEmail(updatedEmail) {
    try {
      setIsSaving(true);
      setPageError("");
      setPageSuccess("");

      const data = await updateMailRequest(updatedEmail.id, emailToPayload(updatedEmail));
      const savedEmail = normalizeEmail(data.mail);

      setEmails((current) =>
        current.map((email) => (email.id === savedEmail.id ? savedEmail : email)),
      );

      setSelectedEmail(savedEmail);
      setPageSuccess("Mail został zapisany.");
    } catch (error) {
      setPageError(error.message || "Nie udało się zapisać maila.");
      throw error;
    } finally {
      setIsSaving(false);
    }
  }

  async function archiveEmail(emailId) {
    const email = emails.find((item) => item.id === emailId);

    if (!email) {
      return;
    }

    try {
      await saveEmail({
        ...email,
        status: "Zarchiwizowany",
        folder: "Zarchiwizowane",
      });

      setSelectedEmail(null);
    } catch (error) {
      // komunikat jest ustawiany w saveEmail
    }
  }

  async function deleteEmail(emailId) {
    const confirmed = window.confirm("Czy na pewno chcesz usunąć tę wiadomość?");

    if (!confirmed) {
      return;
    }

    try {
      setIsSaving(true);
      setPageError("");
      setPageSuccess("");

      await deleteMailRequest(emailId);

      setEmails((current) => current.filter((email) => email.id !== emailId));
      setSelectedEmail(null);
      setPageSuccess("Mail został usunięty.");
    } catch (error) {
      setPageError(error.message || "Nie udało się usunąć maila.");
    } finally {
      setIsSaving(false);
    }
  }

  function openReply(email) {
    setTemplateToUse(null);
    setReplySource(email);
    setComposeMode("reply");
  }

  function openNewMessage() {
    setReplySource(null);
    setTemplateToUse(null);
    setComposeMode("new");
  }

  function useTemplateInComposer(template) {
    setReplySource(null);
    setTemplateToUse(template);
    setComposeMode("new");
  }

 async function handleSendDraft(message) {
  const now = new Date();
  const isSend = message.type === "send";
  const firstAttachment = message.attachments?.[0];

  const newEmail = {
    direction: "sent",
    fromName: "Handke Holding OÜ",
    fromEmail: "office@handkeholding.com",
    to: message.to,
    cc: message.cc || "",
    bcc: message.bcc || "",
    subject: message.subject || "Bez tematu",
    client: message.client,
    project: "",
    clientStatus: message.client ? "Powiązany" : "Nieprzypisany",
    status: isSend ? "Wysłany" : "Robocza",
    priority: "Normalny",
    folder: isSend ? "Wysłane" : "Robocze",
    date: now.toISOString().slice(0, 16).replace("T", " "),
    preview: message.body.slice(0, 120),
    body: message.body,
    attachments: message.attachments || [],
    attachmentName: firstAttachment?.name || "",
    notes: message.createFollowUp
      ? "Po wysłaniu utworzono zadanie follow-up."
      : "",
    tags: [isSend ? "Wysłane" : "Robocza"],
  };

  try {
    setIsSaving(true);
    setPageError("");
    setPageSuccess("");

    let data;

    if (isSend) {
      data = await sendMail({
        to_email: newEmail.to,
        cc: newEmail.cc,
        bcc: newEmail.bcc,
        subject: newEmail.subject,
        body: newEmail.body,
        client_name: newEmail.client,
        project_name: newEmail.project,
        client_status: newEmail.clientStatus,
        priority: newEmail.priority,
        notes: newEmail.notes,
        tags: tagsToString(newEmail.tags),
        attachments: newEmail.attachments,
      });
    } else {
      data = await createMail(emailToPayload(newEmail));
    }

    const createdEmail = normalizeEmail(data.mail);

    setEmails((current) => [createdEmail, ...current]);

    setPageSuccess(
      isSend
        ? "Wiadomość została wysłana."
        : "Wiadomość robocza została zapisana."
    );
  } catch (error) {
    setPageError(
      error.message ||
        (isSend
          ? "Nie udało się wysłać wiadomości."
          : "Nie udało się zapisać wiadomości.")
    );

    throw error;
  } finally {
    setIsSaving(false);
  }
}

  return (
    <section className="mails-page">
      {(pageError || pageSuccess) && (
        <div className="settings-global-message">
          {pageError && <p className="client-form-error">{pageError}</p>}
          {pageSuccess && <p className="client-form-success">{pageSuccess}</p>}
        </div>
      )}

      <div className="mails-hero">
        <div>
          <h2>Centrum maili</h2>
          <span>
            Obsługa skrzynki firmowej, odpowiedzi, szablonów, stopek, załączników
            i komunikacji z klientami.
          </span>
        </div>

        <div className="mails-hero-actions">
          <button
  className="small-outline-button"
  type="button"
  onClick={handleSyncMails}
  disabled={isSyncing}
>
  <MailOpen size={15} />
  {isSyncing ? "Synchronizacja..." : "Synchronizuj"}
</button>

          <button className="outline-button" type="button" onClick={openNewMessage}>
            <Plus size={15} />
            Nowa wiadomość
          </button>
        </div>
      </div>

      <div className="mail-module-tabs">
        {mailModuleTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`mail-module-tab ${activeModuleTab === tab ? "active" : ""}`}
            onClick={() => setActiveModuleTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeModuleTab === "Skrzynka" && (
        <>
          <div className="mail-stats-grid">
            <div>
              <span>Wszystkie wiadomości</span>
              <strong>{stats.all}</strong>
            </div>

            <div>
              <span>Nieprzeczytane</span>
              <strong>{stats.unread}</strong>
            </div>

            <div>
              <span>Do odpowiedzi</span>
              <strong>{stats.toReply}</strong>
            </div>

            <div>
              <span>Do przypisania</span>
              <strong>{stats.unlinked}</strong>
            </div>
          </div>

          <div className="mails-toolbar">
            <div className="mails-search">
              <Search size={15} />
              <input
                value={query}
                placeholder="Szukaj po nadawcy, temacie, kliencie..."
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="mails-filter-tabs">
              {filterTabs.map((tab) => (
                <button
                  className={`mail-filter-tab ${
                    activeFilter === tab ? "active" : ""
                  }`}
                  type="button"
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="mails-table-card">
            <div className="mails-table-head">
              <span>Nadawca / odbiorca</span>
              <span>Temat</span>
              <span>Klient</span>
              <span>Data</span>
              <span>Status</span>
              <span>Akcje</span>
            </div>

            <div className="mails-table-body">
              {isLoading ? (
                <div className="mail-empty-row">
                  <Mail size={22} />
                  <h3>Ładowanie wiadomości...</h3>
                  <p>Pobieram dane z backendu.</p>
                </div>
              ) : filteredEmails.length ? (
                filteredEmails.map((email) => (
                  <div className="mails-table-row" key={email.id}>
                    <div className="mail-person-cell">
                      <strong>
                        {getDirectionIcon(email.direction)}
                        {email.direction === "sent"
                          ? email.to || "Brak odbiorcy"
                          : email.fromName || email.fromEmail || "Brak nadawcy"}
                      </strong>
                      <small>{email.fromEmail || email.to || "Brak adresu"}</small>
                    </div>

                    <button
                      className="mail-subject-cell"
                      type="button"
                      onClick={() => setSelectedEmail(email)}
                    >
                      <strong>
                        {email.attachments.length > 0 && <Paperclip size={13} />}
                        {email.subject}
                      </strong>

                      <small>{email.preview || email.body || "Brak podglądu"}</small>

                      {email.priority === "Wysoki" && (
                        <span>
                          <Star size={11} />
                          Wysoki priorytet
                        </span>
                      )}
                    </button>

                    <div className="mail-client-cell">
                      <strong>{email.client || "Nieprzypisany"}</strong>
                      <small>{email.clientStatus}</small>
                    </div>

                    <div className="mail-date-cell">{formatDate(email.date)}</div>

                    <div>
                      <span className={getStatusClass(email.status)}>
                        {email.status}
                      </span>
                    </div>

                    <div className="mail-row-actions">
                      <button
                        type="button"
                        title="Podgląd"
                        aria-label="Podgląd"
                        onClick={() => setSelectedEmail(email)}
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        type="button"
                        title="Odpowiedz"
                        aria-label="Odpowiedz"
                        onClick={() => openReply(email)}
                      >
                        <Reply size={16} />
                      </button>

                      <button
                        type="button"
                        title="Archiwizuj"
                        aria-label="Archiwizuj"
                        onClick={() => archiveEmail(email.id)}
                      >
                        <Archive size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="mail-empty-row">
                  <Mail size={22} />
                  <h3>Brak wiadomości</h3>
                  <p>Zmień filtr albo dodaj pierwszą wiadomość.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeModuleTab === "Szablony" && (
        <MailTemplatesSection onUseTemplate={useTemplateInComposer} />
      )}

      {activeModuleTab === "Stopki" && <MailSignaturesSection />}

      {activeModuleTab === "Automatyzacje" && <MailAutomationsSection />}

      {activeModuleTab === "Ustawienia" && <MailSettingsSection />}

      {selectedEmail && (
        <MailPreviewModal
          email={selectedEmail}
          onClose={() => setSelectedEmail(null)}
          onReply={openReply}
          onChangeEmail={updateEmail}
          onSaveEmail={saveEmail}
          onArchive={archiveEmail}
          onDelete={deleteEmail}
          isSaving={isSaving}
        />
      )}

      {composeMode && (
        <ComposeModal
          mode={composeMode}
          sourceEmail={replySource}
          templateToUse={templateToUse}
          onClose={() => {
            setComposeMode(null);
            setReplySource(null);
            setTemplateToUse(null);
          }}
          onSendDraft={handleSendDraft}
          onClearTemplate={() => setTemplateToUse(null)}
          isSaving={isSaving}
        />
      )}
    </section>
  );
}
