import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  Eye,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  createTask,
  deleteTask,
  getTasks,
  updateTask,
} from "../api/tasksApi";

const statusOptions = ["Do zrobienia", "Do dokończenia", "Zrobione"];
const priorityOptions = ["Niski", "Normalny", "Wysoki"];

function getStatusClass(status) {
  if (status === "Do zrobienia") {
    return "task-status task-status-red";
  }

  if (status === "Do dokończenia") {
    return "task-status task-status-orange";
  }

  return "task-status task-status-green";
}

function normalizeTask(task) {
  return {
    id: task.id,
    title: task.title || "",
    client: task.client_name || "",
    deadline: task.due_date || "",
    priority: task.priority || "Normalny",
    status: task.status || "Do zrobienia",
    notes: task.note || "",
    createdAt: task.created_at || "",
    updatedAt: task.updated_at || "",
  };
}

function taskToPayload(task) {
  return {
    title: task.title || "",
    client_name: task.client || "",
    due_date: task.deadline || "",
    priority: task.priority || "Normalny",
    status: task.status || "Do zrobienia",
    note: task.notes || "",
  };
}

function sortTasks(tasks, sortConfig) {
  if (!sortConfig.key) {
    return tasks;
  }

  return [...tasks].sort((a, b) => {
    const first = String(a[sortConfig.key] || "").toLowerCase();
    const second = String(b[sortConfig.key] || "").toLowerCase();

    if (first < second) {
      return sortConfig.direction === "asc" ? -1 : 1;
    }

    if (first > second) {
      return sortConfig.direction === "asc" ? 1 : -1;
    }

    return 0;
  });
}

function TaskModal({ task, mode, onClose, onSave, isSaving }) {
  const [form, setForm] = useState(task);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(task);
    setError("");
  }, [task]);

  if (!task) {
    return null;
  }

  const isPreview = mode === "preview";

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError("Podaj nazwę zadania.");
      return;
    }

    try {
      setError("");
      await onSave(form);
      onClose();
    } catch (saveError) {
      setError(saveError.message || "Nie udało się zapisać zadania.");
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="task-modal">
        <div className="task-modal-head">
          <div>
            <p className="eyebrow">
              {isPreview ? "Podgląd zadania" : "Edycja zadania"}
            </p>
            <h2>{form.title || "Nowe zadanie"}</h2>
            <span>{form.client || "Brak przypisanego klienta"}</span>
          </div>

          <button className="modal-close-button" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="task-modal-summary">
          <div>
            <span>Status</span>
            <strong className={getStatusClass(form.status)}>{form.status}</strong>
          </div>

          <div>
            <span>Priorytet</span>
            <strong>{form.priority}</strong>
          </div>

          <div>
            <span>Termin</span>
            <strong>{form.deadline || "Brak terminu"}</strong>
          </div>

          <div>
            <span>Utworzono</span>
            <strong>{form.createdAt || "—"}</strong>
          </div>
        </div>

        <div className="task-modal-form">
          <label className="task-field task-field-wide">
            <span>Tytuł zadania</span>
            <input
              value={form.title}
              disabled={isPreview}
              onChange={(event) => updateField("title", event.target.value)}
            />
          </label>

          <label className="task-field">
            <span>Klient</span>
            <input
              value={form.client}
              disabled={isPreview}
              onChange={(event) => updateField("client", event.target.value)}
            />
          </label>

          <label className="task-field">
            <span>Termin</span>
            <input
              type="date"
              value={form.deadline}
              disabled={isPreview}
              onChange={(event) => updateField("deadline", event.target.value)}
            />
          </label>

          <label className="task-field">
            <span>Status</span>
            <select
              value={form.status}
              disabled={isPreview}
              onChange={(event) => updateField("status", event.target.value)}
            >
              {statusOptions.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>

          <label className="task-field">
            <span>Priorytet</span>
            <select
              value={form.priority}
              disabled={isPreview}
              onChange={(event) => updateField("priority", event.target.value)}
            >
              {priorityOptions.map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
          </label>

          <label className="task-field task-field-wide">
            <span>Notatki</span>
            <textarea
              value={form.notes}
              disabled={isPreview}
              onChange={(event) => updateField("notes", event.target.value)}
            />
          </label>
        </div>

        {error && <p className="client-form-error">{error}</p>}

        {!isPreview && (
          <div className="task-modal-actions">
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
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Zapisywanie..." : "Zapisz zmiany"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });

  const [selectedTask, setSelectedTask] = useState(null);
  const [modalMode, setModalMode] = useState("preview");

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskClient, setNewTaskClient] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");

  const sortedTasks = useMemo(() => {
    return sortTasks(tasks, sortConfig);
  }, [tasks, sortConfig]);

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      setIsLoading(true);
      setPageError("");

      const data = await getTasks();
      const backendTasks = data.tasks || [];

      setTasks(backendTasks.map(normalizeTask));
    } catch (error) {
      setPageError(error.message || "Nie udało się pobrać zadań.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSort(key) {
    setSortConfig((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        key,
        direction: "asc",
      };
    });
  }

  async function addTask() {
    if (!newTaskTitle.trim()) {
      setPageError("Podaj nazwę zadania.");
      return;
    }

    try {
      setIsSaving(true);
      setPageError("");
      setPageSuccess("");

      const payload = {
        title: newTaskTitle.trim(),
        client_name: newTaskClient.trim(),
        due_date: newTaskDeadline,
        priority: "Normalny",
        status: "Do zrobienia",
        note: "",
      };

      const data = await createTask(payload);
      const createdTask = normalizeTask(data.task);

      setTasks((current) => [createdTask, ...current]);
      setNewTaskTitle("");
      setNewTaskClient("");
      setNewTaskDeadline("");
      setPageSuccess("Zadanie zostało dodane.");
    } catch (error) {
      setPageError(error.message || "Nie udało się dodać zadania.");
    } finally {
      setIsSaving(false);
    }
  }

  function openModal(task, mode) {
    setSelectedTask(task);
    setModalMode(mode);
  }

  async function saveTask(updatedTask) {
    setIsSaving(true);

    try {
      const data = await updateTask(updatedTask.id, taskToPayload(updatedTask));
      const savedTask = normalizeTask(data.task);

      setTasks((current) =>
        current.map((task) => (task.id === savedTask.id ? savedTask : task)),
      );

      setPageSuccess("Zadanie zostało zapisane.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeTask(taskId) {
    const confirmed = window.confirm("Czy na pewno chcesz usunąć to zadanie?");

    if (!confirmed) {
      return;
    }

    try {
      setPageError("");
      setPageSuccess("");

      await deleteTask(taskId);

      setTasks((current) => current.filter((task) => task.id !== taskId));
      setPageSuccess("Zadanie zostało usunięte.");
    } catch (error) {
      setPageError(error.message || "Nie udało się usunąć zadania.");
    }
  }

  return (
    <section className="tasks-page">
      {(pageError || pageSuccess) && (
        <div className="settings-global-message">
          {pageError && <p className="client-form-error">{pageError}</p>}
          {pageSuccess && <p className="client-form-success">{pageSuccess}</p>}
        </div>
      )}

      <div className="tasks-create-bar">
        <div className="tasks-create-grid">
          <label className="task-create-field task-create-title">
            <span>Nowe zadanie</span>
            <input
              value={newTaskTitle}
              placeholder="np. Przygotować ofertę"
              onChange={(event) => setNewTaskTitle(event.target.value)}
            />
          </label>

          <label className="task-create-field">
            <span>Klient</span>
            <input
              value={newTaskClient}
              placeholder="np. SDE"
              onChange={(event) => setNewTaskClient(event.target.value)}
            />
          </label>

          <label className="task-create-field">
            <span>Termin</span>
            <input
              type="date"
              value={newTaskDeadline}
              onChange={(event) => setNewTaskDeadline(event.target.value)}
            />
          </label>

          <button
            className="outline-button"
            type="button"
            onClick={addTask}
            disabled={isSaving}
          >
            <Plus size={16} />
            {isSaving ? "Dodawanie..." : "Dodaj zadanie"}
          </button>
        </div>
      </div>

      <div className="tasks-table-card">
        <div className="tasks-table-head">
          <button type="button" onClick={() => handleSort("title")}>
            Zadanie <ArrowDownUp size={13} />
          </button>

          <button type="button" onClick={() => handleSort("client")}>
            Klient <ArrowDownUp size={13} />
          </button>

          <button type="button" onClick={() => handleSort("deadline")}>
            Termin <ArrowDownUp size={13} />
          </button>

          <button type="button" onClick={() => handleSort("priority")}>
            Priorytet <ArrowDownUp size={13} />
          </button>

          <button type="button" onClick={() => handleSort("status")}>
            Status <ArrowDownUp size={13} />
          </button>

          <span>Akcje</span>
        </div>

        <div className="tasks-table-body">
          {isLoading ? (
            <div className="clients-empty-row">
              <div>
                <h3>Ładowanie zadań...</h3>
                <p>Pobieram dane z backendu.</p>
              </div>
            </div>
          ) : sortedTasks.length === 0 ? (
            <div className="clients-empty-row">
              <div>
                <h3>Brak zadań</h3>
                <p>Dodaj pierwsze zadanie w górnym formularzu.</p>
              </div>
            </div>
          ) : (
            sortedTasks.map((task) => (
              <div className="tasks-table-row" key={task.id}>
                <div className="task-title-cell">
                  <strong>{task.title}</strong>
                  <small>{task.createdAt || "Brak daty"}</small>
                </div>

                <span>{task.client || "Bez klienta"}</span>
                <span>{task.deadline || "Brak terminu"}</span>
                <span>{task.priority}</span>

                <span>
                  <strong className={getStatusClass(task.status)}>
                    {task.status}
                  </strong>
                </span>

                <div className="task-row-actions">
                  <button
                    type="button"
                    title="Podgląd"
                    onClick={() => openModal(task, "preview")}
                  >
                    <Eye size={16} />
                  </button>

                  <button
                    type="button"
                    title="Edytuj"
                    onClick={() => openModal(task, "edit")}
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    title="Usuń"
                    onClick={() => removeTask(task.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          mode={modalMode}
          onClose={() => setSelectedTask(null)}
          onSave={saveTask}
          isSaving={isSaving}
        />
      )}
    </section>
  );
}

export default TasksPage;