import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Eye,
  FileText,
  Layers3,
  ListChecks,
  Mail,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  createProject,
  deleteProject as deleteProjectRequest,
  getProjects,
  updateProject as updateProjectRequest,
} from "../api/projectsApi";

import { getClients } from "../api/clientsApi";

import {
  projectStages,
  projectStatuses,
  projectTypes,
} from "../data/projects";

const priorityOptions = ["Normalny", "Wysoki", "Niski"];

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
  if (status === "W trakcie") {
    return "project-status project-status-green";
  }

  if (status === "Do akceptacji" || status === "Oferta wysłana") {
    return "project-status project-status-orange";
  }

  if (status === "Wstrzymany") {
    return "project-status project-status-red";
  }

  if (status === "Zakończony") {
    return "project-status project-status-dark";
  }

  return "project-status";
}

function getPriorityClass(priority) {
  if (priority === "Wysoki") {
    return "project-priority project-priority-high";
  }

  if (priority === "Niski") {
    return "project-priority project-priority-low";
  }

  return "project-priority";
}

function ProjectProgress({ value }) {
  const safeValue = Math.min(Math.max(Number(value) || 0, 0), 100);

  return (
    <div className="project-progress">
      <div className="project-progress-track">
        <span style={{ width: `${safeValue}%` }} />
      </div>
      <strong>{safeValue}%</strong>
    </div>
  );
}

function splitList(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeClientOption(client) {
  return {
    id: client.id,
    name: client.company_name || client.full_name || "",
    person: client.full_name || "",
    email: client.email || "",
  };
}

function normalizeProject(project) {
  return {
    id: project.id,
    name: project.name || "",
    client: project.client_name || "",
    clientPerson: project.client_person || "",
    type: project.type || "CRM",
    status: project.status || "Brief",
    stage: project.stage || "Analiza",
    priority: project.priority || "Normalny",
    progress: Number(project.progress) || 0,
    value: project.value || "",
    startDate: project.start_date || "",
    deadline: project.deadline || "",
    owner: project.owner || "",
    offerNumber: project.offer_number || "",
    description: project.description || "",
    goal: project.goal || "",
    scope: splitList(project.scope),
    technologies: splitList(project.technologies),
    notes: project.notes || "",
    createdAt: project.created_at || "",
    updatedAt: project.updated_at || "",
    tasks: [],
    documents: [],
    payments: [],
    logs: [
      {
        id: 1,
        date: project.created_at ? project.created_at.slice(0, 10) : "",
        type: "Projekt",
        message: "Projekt zapisany w bazie danych.",
        author: project.owner || "System",
      },
    ],
  };
}

function projectToPayload(project) {
  return {
    name: project.name || "",
    client_name: project.client || "",
    client_person: project.clientPerson || "",
    type: project.type || "CRM",
    status: project.status || "Brief",
    stage: project.stage || "Analiza",
    priority: project.priority || "Normalny",
    progress: Number(project.progress) || 0,
    value: project.value || "",
    start_date: project.startDate || "",
    deadline: project.deadline || "",
    owner: project.owner || "",
    offer_number: project.offerNumber || "",
    description: project.description || "",
    goal: project.goal || "",
    scope: Array.isArray(project.scope) ? project.scope.join(", ") : project.scope || "",
    technologies: Array.isArray(project.technologies)
      ? project.technologies.join(", ")
      : project.technologies || "",
    notes: project.notes || "",
  };
}

function NewProjectModal({ clients, onClose, onCreate, isSaving }) {
  const [form, setForm] = useState({
    name: "",
    client: "",
    clientPerson: "",
    type: "CRM",
    status: "Brief",
    stage: "Analiza",
    priority: "Normalny",
    progress: 5,
    value: "",
    startDate: "",
    deadline: "",
    owner: "Karl Handke",
    offerNumber: "Nieutworzona",
    description: "",
    goal: "",
    scope: "",
    technologies: "",
    notes: "",
  });

  const [error, setError] = useState("");

  function handleClientSelect(clientName) {
  const selectedClient = clients.find((client) => client.name === clientName);

  setForm((current) => ({
    ...current,
    client: clientName,
    clientPerson: selectedClient?.person || current.clientPerson,
  }));
}

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setError("Podaj nazwę projektu.");
      return;
    }

    try {
      setError("");
      await onCreate({
        ...form,
        scope: splitList(form.scope),
        technologies: splitList(form.technologies),
      });
      onClose();
    } catch (createError) {
      setError(createError.message || "Nie udało się dodać projektu.");
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="project-edit-modal">
        <div className="project-modal-head">
          <div>
            <p className="eyebrow">Nowy projekt</p>
            <h2>Dodaj projekt do CRM</h2>
            <span>Utwórz projekt i powiąż go później z klientem, ofertą i zadaniami.</span>
          </div>

          <button className="modal-close-button" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="project-edit-grid">
          <label className="project-field project-field-wide">
            <span>Nazwa projektu</span>
            <input
              value={form.name}
              placeholder="np. System CRM dla klienta"
              onChange={(event) => updateField("name", event.target.value)}
            />
          </label>

          <label className="project-field">
  <span>Klient</span>
  <select
    value={form.client}
    onChange={(event) => handleClientSelect(event.target.value)}
  >
    <option value="">Wybierz klienta</option>
    {clients.map((client) => (
      <option value={client.name} key={client.id}>
        {client.name}
      </option>
    ))}
  </select>
</label>

          <label className="project-field">
            <span>Osoba kontaktowa</span>
            <input
              value={form.clientPerson}
              placeholder="Imię i nazwisko"
              onChange={(event) => updateField("clientPerson", event.target.value)}
            />
          </label>

          <label className="project-field">
            <span>Typ projektu</span>
            <select
              value={form.type}
              onChange={(event) => updateField("type", event.target.value)}
            >
              {projectTypes.map((type) => (
                <option value={type} key={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="project-field">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) => updateField("status", event.target.value)}
            >
              {projectStatuses.map((status) => (
                <option value={status} key={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="project-field">
            <span>Etap</span>
            <select
              value={form.stage}
              onChange={(event) => updateField("stage", event.target.value)}
            >
              {projectStages.map((stage) => (
                <option value={stage} key={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </label>

          <label className="project-field">
            <span>Priorytet</span>
            <select
              value={form.priority}
              onChange={(event) => updateField("priority", event.target.value)}
            >
              {priorityOptions.map((priority) => (
                <option value={priority} key={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>

          <label className="project-field">
            <span>Wartość</span>
            <input
              value={form.value}
              placeholder="np. 18 500 zł"
              onChange={(event) => updateField("value", event.target.value)}
            />
          </label>

          <label className="project-field">
            <span>Postęp %</span>
            <input
              type="number"
              min="0"
              max="100"
              value={form.progress}
              onChange={(event) => updateField("progress", event.target.value)}
            />
          </label>

          <label className="project-field">
            <span>Start</span>
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => updateField("startDate", event.target.value)}
            />
          </label>

          <label className="project-field">
            <span>Deadline</span>
            <input
              type="date"
              value={form.deadline}
              onChange={(event) => updateField("deadline", event.target.value)}
            />
          </label>

          <label className="project-field">
            <span>Opiekun</span>
            <input
              value={form.owner}
              onChange={(event) => updateField("owner", event.target.value)}
            />
          </label>

          <label className="project-field">
            <span>Numer oferty</span>
            <input
              value={form.offerNumber}
              onChange={(event) => updateField("offerNumber", event.target.value)}
            />
          </label>

          <label className="project-field project-field-wide">
            <span>Zakres, po przecinku</span>
            <input
              value={form.scope}
              placeholder="np. Panel administracyjny, Baza klientów, PDF"
              onChange={(event) => updateField("scope", event.target.value)}
            />
          </label>

          <label className="project-field project-field-wide">
            <span>Technologie, po przecinku</span>
            <input
              value={form.technologies}
              placeholder="np. React, Flask, SQLite"
              onChange={(event) => updateField("technologies", event.target.value)}
            />
          </label>

          <label className="project-field project-field-wide">
            <span>Opis projektu</span>
            <textarea
              value={form.description}
              placeholder="Krótki opis projektu..."
              onChange={(event) => updateField("description", event.target.value)}
            />
          </label>

          <label className="project-field project-field-wide">
            <span>Cel biznesowy</span>
            <textarea
              value={form.goal}
              placeholder="Jaki problem ma rozwiązać ten projekt?"
              onChange={(event) => updateField("goal", event.target.value)}
            />
          </label>

          <label className="project-field project-field-wide">
            <span>Notatki</span>
            <textarea
              value={form.notes}
              placeholder="Dodatkowe notatki wewnętrzne..."
              onChange={(event) => updateField("notes", event.target.value)}
            />
          </label>
        </div>

        {error && <p className="client-form-error">{error}</p>}

        <div className="project-modal-actions">
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
            {isSaving ? "Dodawanie..." : "Dodaj projekt"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectModal({ project, clients, onClose, onUpdate, onDelete, isSaving }) {
  const [editableProject, setEditableProject] = useState(project);
  const [error, setError] = useState("");

  useEffect(() => {
    setEditableProject(project);
    setError("");
  }, [project]);

  function updateField(field, value) {
    setEditableProject((current) => ({
      ...current,
      [field]: field === "progress" ? Number(value) : value,
    }));
  }

  function handleClientSelect(clientName) {
  const selectedClient = clients.find((client) => client.name === clientName);

  setEditableProject((current) => ({
    ...current,
    client: clientName,
    clientPerson: selectedClient?.person || current.clientPerson,
  }));
}

  async function handleSave() {
    if (!editableProject.name.trim()) {
      setError("Podaj nazwę projektu.");
      return;
    }

    try {
      setError("");
      await onUpdate(editableProject);
    } catch (updateError) {
      setError(updateError.message || "Nie udało się zapisać projektu.");
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="project-modal">
        <div className="project-modal-head">
          <div>
            <p className="eyebrow">{editableProject.type}</p>
            <h2>{editableProject.name}</h2>
            <span>
              {editableProject.client || "Brak klienta"} ·{" "}
              {editableProject.clientPerson || "Brak osoby kontaktowej"}
            </span>
          </div>

          <button className="modal-close-button" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="project-summary-grid">
          <div>
            <span>Status</span>
            <strong className={getStatusClass(editableProject.status)}>
              {editableProject.status}
            </strong>
          </div>

          <div>
            <span>Etap</span>
            <strong>{editableProject.stage}</strong>
          </div>

          <div>
            <span>Deadline</span>
            <strong>{formatDate(editableProject.deadline)}</strong>
          </div>

          <div>
            <span>Wartość</span>
            <strong>{editableProject.value || "Brak"}</strong>
          </div>

          <div>
            <span>Priorytet</span>
            <strong className={getPriorityClass(editableProject.priority)}>
              {editableProject.priority}
            </strong>
          </div>

          <div>
            <span>Postęp</span>
            <ProjectProgress value={editableProject.progress} />
          </div>
        </div>

        <div className="project-modal-layout">
          <section className="project-modal-main">
            <div className="project-clean-section">
              <div className="project-section-head">
                <h3>Podstawowe dane</h3>
              </div>

              <div className="project-edit-grid">
                <label className="project-field project-field-wide">
                  <span>Nazwa projektu</span>
                  <input
                    value={editableProject.name}
                    onChange={(event) => updateField("name", event.target.value)}
                  />
                </label>

                <label className="project-field">
  <span>Klient</span>
  <select
    value={editableProject.client}
    onChange={(event) => handleClientSelect(event.target.value)}
  >
    <option value="">Wybierz klienta</option>
    {clients.map((client) => (
      <option value={client.name} key={client.id}>
        {client.name}
      </option>
    ))}
  </select>
</label>

                <label className="project-field">
                  <span>Osoba kontaktowa</span>
                  <input
                    value={editableProject.clientPerson}
                    onChange={(event) =>
                      updateField("clientPerson", event.target.value)
                    }
                  />
                </label>

                <label className="project-field">
                  <span>Typ projektu</span>
                  <select
                    value={editableProject.type}
                    onChange={(event) => updateField("type", event.target.value)}
                  >
                    {projectTypes.map((type) => (
                      <option value={type} key={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="project-field">
                  <span>Priorytet</span>
                  <select
                    value={editableProject.priority}
                    onChange={(event) =>
                      updateField("priority", event.target.value)
                    }
                  >
                    {priorityOptions.map((priority) => (
                      <option value={priority} key={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="project-clean-section">
              <div className="project-section-head">
                <h3>Podsumowanie projektu</h3>
              </div>

              <div className="project-edit-grid">
                <label className="project-field project-field-wide">
                  <span>Opis</span>
                  <textarea
                    value={editableProject.description}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                  />
                </label>

                <label className="project-field project-field-wide">
                  <span>Cel biznesowy</span>
                  <textarea
                    value={editableProject.goal}
                    onChange={(event) => updateField("goal", event.target.value)}
                  />
                </label>

                <label className="project-field project-field-wide">
                  <span>Notatki</span>
                  <textarea
                    value={editableProject.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="project-clean-section">
              <div className="project-section-head">
                <h3>Etapy realizacji</h3>
              </div>

              <div className="project-stage-timeline">
                {projectStages.map((stage) => {
                  const currentIndex = projectStages.indexOf(editableProject.stage);
                  const stageIndex = projectStages.indexOf(stage);

                  const isDone = stageIndex < currentIndex;
                  const isActive = stageIndex === currentIndex;

                  return (
                    <div
                      className={`project-stage-item ${
                        isDone ? "is-done" : ""
                      } ${isActive ? "is-active" : ""}`}
                      key={stage}
                    >
                      <span>{isDone ? <Check size={12} /> : stageIndex + 1}</span>
                      <strong>{stage}</strong>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="project-clean-section">
              <div className="project-section-head">
                <h3>Zakres</h3>
              </div>

              <div className="project-tags-list">
                {editableProject.scope.length ? (
                  editableProject.scope.map((item) => <span key={item}>{item}</span>)
                ) : (
                  <p className="project-muted-text">Brak dodanego zakresu.</p>
                )}
              </div>
            </div>

            <div className="project-clean-section">
              <div className="project-section-head">
                <h3>Zadania projektu</h3>
              </div>

              <div className="project-mini-table">
                <p className="project-muted-text">
                  Zadania projektowe podepniemy w kolejnym etapie po relacji
                  projekt ↔ zadanie.
                </p>
              </div>
            </div>

            <div className="project-clean-section">
              <div className="project-section-head">
                <h3>Dokumenty</h3>
              </div>

              <div className="project-documents-list">
                <p className="project-muted-text">
                  Dokumenty projektu podepniemy później z modułem Dokumenty.
                </p>
              </div>
            </div>

            <div className="project-clean-section">
              <div className="project-section-head">
                <h3>Płatności</h3>
              </div>

              <div className="project-mini-table">
                <p className="project-muted-text">
                  Płatności projektu podepniemy po zrobieniu backendu płatności.
                </p>
              </div>
            </div>

            <div className="project-clean-section">
              <div className="project-section-head">
                <h3>Log projektu</h3>
              </div>

              <div className="project-technical-logs">
                {editableProject.logs.map((log) => (
                  <div className="project-log-row" key={log.id}>
                    <span>{formatDate(log.date)}</span>
                    <strong>{log.type}</strong>
                    <p>{log.message}</p>
                    <em>{log.author}</em>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="project-modal-side">
            <div className="project-side-card">
              <h3>Zarządzanie</h3>

              <label className="project-field">
                <span>Status</span>
                <select
                  value={editableProject.status}
                  onChange={(event) => updateField("status", event.target.value)}
                >
                  {projectStatuses.map((status) => (
                    <option value={status} key={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="project-field">
                <span>Etap</span>
                <select
                  value={editableProject.stage}
                  onChange={(event) => updateField("stage", event.target.value)}
                >
                  {projectStages.map((stage) => (
                    <option value={stage} key={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </label>

              <label className="project-field">
                <span>Postęp</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editableProject.progress}
                  onChange={(event) => updateField("progress", event.target.value)}
                />
              </label>

              <label className="project-field">
                <span>Deadline</span>
                <input
                  type="date"
                  value={editableProject.deadline}
                  onChange={(event) => updateField("deadline", event.target.value)}
                />
              </label>

              <label className="project-field">
                <span>Start</span>
                <input
                  type="date"
                  value={editableProject.startDate}
                  onChange={(event) => updateField("startDate", event.target.value)}
                />
              </label>

              <label className="project-field">
                <span>Wartość</span>
                <input
                  value={editableProject.value}
                  onChange={(event) => updateField("value", event.target.value)}
                />
              </label>

              <label className="project-field">
                <span>Oferta</span>
                <input
                  value={editableProject.offerNumber}
                  onChange={(event) =>
                    updateField("offerNumber", event.target.value)
                  }
                />
              </label>

              <label className="project-field">
                <span>Opiekun</span>
                <input
                  value={editableProject.owner}
                  onChange={(event) => updateField("owner", event.target.value)}
                />
              </label>

              <label className="project-field">
                <span>Zakres, po przecinku</span>
                <textarea
                  value={editableProject.scope.join(", ")}
                  onChange={(event) =>
                    updateField("scope", splitList(event.target.value))
                  }
                />
              </label>

              <label className="project-field">
                <span>Technologie, po przecinku</span>
                <textarea
                  value={editableProject.technologies.join(", ")}
                  onChange={(event) =>
                    updateField("technologies", splitList(event.target.value))
                  }
                />
              </label>

              {error && <p className="client-form-error">{error}</p>}

              <div className="project-side-actions">
                <button type="button" onClick={handleSave} disabled={isSaving}>
                  <Check size={15} />
                  {isSaving ? "Zapisywanie..." : "Zapisz projekt"}
                </button>

                <button type="button">
                  <ListChecks size={15} />
                  Dodaj zadanie
                </button>

                <button type="button">
                  <FileText size={15} />
                  Dodaj dokument
                </button>

                <button type="button">
                  <Mail size={15} />
                  Pokaż maile
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(editableProject.id)}
                  disabled={isSaving}
                >
                  <Trash2 size={15} />
                  Usuń projekt
                </button>
              </div>
            </div>

            <div className="project-side-card">
              <h3>Informacje</h3>

              <div className="project-side-info">
                <span>Oferta</span>
                <strong>{editableProject.offerNumber || "Brak"}</strong>

                <span>Start</span>
                <strong>{formatDate(editableProject.startDate)}</strong>

                <span>Opiekun</span>
                <strong>{editableProject.owner || "Brak"}</strong>

                <span>Technologie</span>
                <p>{editableProject.technologies.join(", ") || "Brak"}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState([]);
  const [activeStatus, setActiveStatus] = useState("Wszystkie");
  const [selectedProject, setSelectedProject] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
  try {
    setIsLoading(true);
    setPageError("");

    const [projectsData, clientsData] = await Promise.all([
      getProjects(),
      getClients(),
    ]);

    const backendProjects = projectsData.projects || [];
    const backendClients = clientsData.clients || [];

    setProjects(backendProjects.map(normalizeProject));
    setClients(backendClients.map(normalizeClientOption));
  } catch (error) {
    setPageError(error.message || "Nie udało się pobrać projektów.");
  } finally {
    setIsLoading(false);
  }
}

  const stats = useMemo(() => {
    const active = projects.filter((project) => project.status === "W trakcie").length;
    const approval = projects.filter(
      (project) => project.status === "Do akceptacji"
    ).length;
    const paused = projects.filter((project) => project.status === "Wstrzymany").length;

    const totalValue = projects.reduce((sum, project) => {
      const numeric = Number(String(project.value).replace(/\D/g, "")) || 0;
      return sum + numeric;
    }, 0);

    return {
      all: projects.length,
      active,
      approval,
      paused,
      totalValue: `${totalValue.toLocaleString("pl-PL")} zł`,
    };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        !normalizedQuery ||
        project.name.toLowerCase().includes(normalizedQuery) ||
        project.client.toLowerCase().includes(normalizedQuery) ||
        project.type.toLowerCase().includes(normalizedQuery) ||
        project.stage.toLowerCase().includes(normalizedQuery);

      const matchesStatus =
        activeStatus === "Wszystkie" || project.status === activeStatus;

      return matchesSearch && matchesStatus;
    });
  }, [projects, query, activeStatus]);

  async function handleCreateProject(project) {
    try {
      setIsSaving(true);
      setPageError("");
      setPageSuccess("");

      const data = await createProject(projectToPayload(project));
      const createdProject = normalizeProject(data.project);

      setProjects((current) => [createdProject, ...current]);
      setPageSuccess("Projekt został dodany.");
    } catch (error) {
      setPageError(error.message || "Nie udało się dodać projektu.");
      throw error;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateProject(updatedProject) {
    try {
      setIsSaving(true);
      setPageError("");
      setPageSuccess("");

      const data = await updateProjectRequest(
        updatedProject.id,
        projectToPayload(updatedProject)
      );

      const savedProject = normalizeProject(data.project);

      setProjects((current) =>
        current.map((project) =>
          project.id === savedProject.id ? savedProject : project
        )
      );

      setSelectedProject(savedProject);
      setPageSuccess("Projekt został zapisany.");
    } catch (error) {
      setPageError(error.message || "Nie udało się zapisać projektu.");
      throw error;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteProject(projectId) {
    const confirmed = window.confirm("Czy na pewno chcesz usunąć ten projekt?");

    if (!confirmed) {
      return;
    }

    try {
      setIsSaving(true);
      setPageError("");
      setPageSuccess("");

      await deleteProjectRequest(projectId);

      setProjects((current) => current.filter((project) => project.id !== projectId));
      setSelectedProject(null);
      setPageSuccess("Projekt został usunięty.");
    } catch (error) {
      setPageError(error.message || "Nie udało się usunąć projektu.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="projects-page">
      {(pageError || pageSuccess) && (
        <div className="settings-global-message">
          {pageError && <p className="client-form-error">{pageError}</p>}
          {pageSuccess && <p className="client-form-success">{pageSuccess}</p>}
        </div>
      )}

      <div className="projects-hero">
        <div>
          <h2>Projekty</h2>
          <span>
            Centrum realizacji zleceń: etapy, zadania, dokumenty, płatności i log pracy.
          </span>
        </div>

        <button
          className="outline-button"
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus size={15} />
          Nowy projekt
        </button>
      </div>

      <div className="projects-stats-grid">
        <div>
          <span>Wszystkie projekty</span>
          <strong>{stats.all}</strong>
        </div>

        <div>
          <span>Aktywne</span>
          <strong>{stats.active}</strong>
        </div>

        <div>
          <span>Do akceptacji</span>
          <strong>{stats.approval}</strong>
        </div>

        <div>
          <span>Wstrzymane</span>
          <strong>{stats.paused}</strong>
        </div>

        <div>
          <span>Wartość projektów</span>
          <strong>{stats.totalValue}</strong>
        </div>
      </div>

      <div className="projects-toolbar">
        <div className="projects-search">
          <Search size={15} />
          <input
            value={query}
            placeholder="Szukaj projektu, klienta, etapu..."
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <label className="projects-select">
          <span>Status</span>
          <select
            value={activeStatus}
            onChange={(event) => setActiveStatus(event.target.value)}
          >
            <option>Wszystkie</option>
            {projectStatuses.map((status) => (
              <option value={status} key={status}>
                {status}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>
      </div>

      <div className="projects-table-card">
        <div className="projects-table-head">
          <span>Projekt</span>
          <span>Klient</span>
          <span>Etap</span>
          <span>Deadline</span>
          <span>Postęp</span>
          <span>Wartość</span>
          <span>Status</span>
          <span>Akcje</span>
        </div>

        <div className="projects-table-body">
          {isLoading ? (
            <div className="project-empty-row">
              <BriefcaseBusiness size={24} />
              <h3>Ładowanie projektów...</h3>
              <p>Pobieram dane z backendu.</p>
            </div>
          ) : filteredProjects.length ? (
            filteredProjects.map((project) => (
              <div className="projects-table-row" key={project.id}>
                <div className="project-main-cell">
                  <strong>
                    <BriefcaseBusiness size={14} />
                    {project.name}
                  </strong>
                  <small>
                    {project.type} · {project.priority}
                  </small>
                </div>

                <div className="project-client-cell">
                  <strong>{project.client || "Brak klienta"}</strong>
                  <small>{project.clientPerson || "Brak osoby kontaktowej"}</small>
                </div>

                <div className="project-stage-cell">
                  <Layers3 size={14} />
                  {project.stage}
                </div>

                <div className="project-date-cell">
                  <CalendarDays size={14} />
                  {formatDate(project.deadline)}
                </div>

                <ProjectProgress value={project.progress} />

                <div className="project-value-cell">
                  <CircleDollarSign size={14} />
                  {project.value || "Brak"}
                </div>

                <div>
                  <span className={getStatusClass(project.status)}>
                    {project.status}
                  </span>
                </div>

                <div className="project-row-actions">
                  <button
                    type="button"
                    aria-label="Podgląd"
                    onClick={() => setSelectedProject(project)}
                  >
                    <Eye size={16} />
                  </button>

                  <button type="button" aria-label="Zadania">
                    <ListChecks size={16} />
                  </button>

                  <button
                    type="button"
                    aria-label="Usuń projekt"
                    onClick={() => handleDeleteProject(project.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="project-empty-row">
              <BriefcaseBusiness size={24} />
              <h3>Brak projektów</h3>
              <p>Zmień filtr albo dodaj pierwszy projekt.</p>
            </div>
          )}
        </div>
      </div>

      {selectedProject && (
        <ProjectModal
  project={selectedProject}
  clients={clients}
  onClose={() => setSelectedProject(null)}
  onUpdate={handleUpdateProject}
  onDelete={handleDeleteProject}
  isSaving={isSaving}
/>
      )}

      {isCreateModalOpen && (
        <NewProjectModal
  clients={clients}
  onClose={() => setIsCreateModalOpen(false)}
  onCreate={handleCreateProject}
  isSaving={isSaving}
/>
      )}
    </section>
  );
}