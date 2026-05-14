import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileText,
  Mail,
  Plus,
  RefreshCw,
  TrendingUp,
  UsersRound,
} from "lucide-react";

import { getDashboard } from "../api/dashboardApi";

function formatMoney(value) {
  const number = Number(value) || 0;

  return `${number.toLocaleString("pl-PL")} zł`;
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "Brak daty";
  }

  const cleanDate = String(dateValue).slice(0, 10);
  const [year, month, day] = cleanDate.split("-");

  if (!year || !month || !day) {
    return dateValue;
  }

  return `${day}.${month}.${year}`;
}

function getStatusClass(status) {
  if (
    status === "Opłacone" ||
    status === "Zrobione" ||
    status === "W trakcie"
  ) {
    return "dashboard-pill dashboard-pill-green";
  }

  if (
    status === "Oczekuje" ||
    status === "Planowane" ||
    status === "Oferta wysłana" ||
    status === "Do dokończenia"
  ) {
    return "dashboard-pill dashboard-pill-orange";
  }

  if (
    status === "Po terminie" ||
    status === "Anulowane" ||
    status === "Wstrzymany" ||
    status === "Do zrobienia"
  ) {
    return "dashboard-pill dashboard-pill-red";
  }

  return "dashboard-pill";
}

function DashboardKpiCard({ label, value, note, icon: Icon }) {
  return (
    <div className="dashboard-kpi-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>
        {Icon && <Icon size={13} />}
        {note}
      </p>
    </div>
  );
}

function ProjectProgress({ value }) {
  const safeValue = Math.min(Math.max(Number(value) || 0, 0), 100);

  return (
    <div className="dashboard-progress">
      <div className="dashboard-progress-track">
        <span style={{ width: `${safeValue}%` }} />
      </div>
      <strong>{safeValue}%</strong>
    </div>
  );
}

export default function DashboardPage({ setActiveMenu }) {
  const [dashboard, setDashboard] = useState({
    stats: {
      clients_total: 0,
      tasks_total: 0,
      tasks_open: 0,
      projects_total: 0,
      projects_active: 0,
      payments_total: 0,
      payments_waiting: 0,
      payments_overdue: 0,
      paid_value: 0,
      waiting_value: 0,
    },
    latest: {
      clients: [],
      tasks: [],
      projects: [],
      payments: [],
    },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setIsLoading(true);
      setPageError("");

      const data = await getDashboard();

      setDashboard({
        stats: data.stats || {},
        latest: data.latest || {
          clients: [],
          tasks: [],
          projects: [],
          payments: [],
        },
      });
    } catch (error) {
      setPageError(error.message || "Nie udało się pobrać dashboardu.");
    } finally {
      setIsLoading(false);
    }
  }

  const stats = dashboard.stats || {};
  const latest = dashboard.latest || {};

  const attentionItems = useMemo(() => {
    const items = [];

    if (Number(stats.payments_overdue) > 0) {
      items.push({
        id: "payments-overdue",
        icon: AlertCircle,
        title: "Płatności po terminie",
        description: `${stats.payments_overdue} płatności wymaga reakcji.`,
        status: "Pilne",
        statusClass: "dashboard-pill dashboard-pill-red",
      });
    }

    if (Number(stats.payments_waiting) > 0) {
      items.push({
        id: "payments-waiting",
        icon: CreditCard,
        title: "Płatności oczekujące",
        description: `${stats.payments_waiting} płatności czeka na opłacenie.`,
        status: "Finanse",
        statusClass: "dashboard-pill dashboard-pill-orange",
      });
    }

    if (Number(stats.tasks_open) > 0) {
      items.push({
        id: "tasks-open",
        icon: CheckCircle2,
        title: "Otwarte zadania",
        description: `${stats.tasks_open} zadań nie jest jeszcze zakończonych.`,
        status: "Zadania",
        statusClass: "dashboard-pill",
      });
    }

    if (Number(stats.projects_active) > 0) {
      items.push({
        id: "projects-active",
        icon: BriefcaseBusiness,
        title: "Aktywne projekty",
        description: `${stats.projects_active} projektów jest aktualnie w trakcie.`,
        status: "Projekty",
        statusClass: "dashboard-pill dashboard-pill-green",
      });
    }

    return items.slice(0, 4);
  }, [stats]);

  function goTo(menuName) {
    if (typeof setActiveMenu === "function") {
      setActiveMenu(menuName);
    }
  }

  return (
    <section className="dashboard-page">
      {(pageError || isLoading) && (
        <div className="settings-global-message">
          {pageError && <p className="client-form-error">{pageError}</p>}
          {isLoading && <p className="client-form-success">Ładowanie danych dashboardu...</p>}
        </div>
      )}

      <div className="dashboard-hero">
        <div>
          <h2>Dashboard</h2>
          <span>
            Najważniejsze liczby, ostatnie projekty, zadania i płatności z Twojego CRM.
          </span>
        </div>

        <button className="outline-button" type="button" onClick={loadDashboard}>
          <RefreshCw size={15} />
          Odśwież dane
        </button>
      </div>

      <div className="dashboard-kpi-grid">
        <DashboardKpiCard
          label="Klienci"
          value={stats.clients_total || 0}
          note="Łącznie w bazie"
          icon={UsersRound}
        />

        <DashboardKpiCard
          label="Projekty"
          value={stats.projects_total || 0}
          note={`${stats.projects_active || 0} aktywnych`}
          icon={BriefcaseBusiness}
        />

        <DashboardKpiCard
          label="Zadania"
          value={stats.tasks_total || 0}
          note={`${stats.tasks_open || 0} otwartych`}
          icon={CheckCircle2}
        />

        <DashboardKpiCard
          label="Płatności"
          value={stats.payments_total || 0}
          note={`${stats.payments_waiting || 0} oczekujących`}
          icon={CreditCard}
        />

        <DashboardKpiCard
          label="Wpłacono"
          value={formatMoney(stats.paid_value)}
          note={`${formatMoney(stats.waiting_value)} oczekuje`}
          icon={TrendingUp}
        />
      </div>

      <div className="dashboard-layout">
        <main className="dashboard-main-column">
          <section className="dashboard-panel">
            <div className="dashboard-panel-head">
              <div>
                <h3>Wymaga uwagi</h3>
                <p>Najważniejsze rzeczy do sprawdzenia na podstawie danych w CRM.</p>
              </div>

              <button type="button" onClick={() => goTo("Zadania")}>
                Przejdź do zadań <ArrowRight size={13} />
              </button>
            </div>

            <div className="dashboard-attention-list">
              {attentionItems.length ? (
                attentionItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div className="dashboard-attention-row" key={item.id}>
                      <div className="dashboard-attention-icon">
                        <Icon size={16} />
                      </div>

                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.description}</span>
                      </div>

                      <em className={item.statusClass}>{item.status}</em>
                    </div>
                  );
                })
              ) : (
                <div className="dashboard-attention-row">
                  <div className="dashboard-attention-icon">
                    <CheckCircle2 size={16} />
                  </div>

                  <div>
                    <strong>Brak pilnych alertów</strong>
                    <span>Nie widzę płatności po terminie ani otwartych pilnych spraw.</span>
                  </div>

                  <em className="dashboard-pill dashboard-pill-green">OK</em>
                </div>
              )}
            </div>
          </section>

          <section className="dashboard-panel">
            <div className="dashboard-panel-head">
              <div>
                <h3>Ostatnie projekty</h3>
                <p>Najnowsze projekty zapisane w bazie danych.</p>
              </div>

              <button type="button" onClick={() => goTo("Projekty")}>
                Projekty <ArrowRight size={13} />
              </button>
            </div>

            <div className="dashboard-projects-table">
              <div className="dashboard-projects-head">
                <span>Projekt</span>
                <span>Etap</span>
                <span>Status</span>
                <span>Postęp</span>
                <span>Deadline</span>
              </div>

              {(latest.projects || []).length ? (
                latest.projects.map((project) => (
                  <div className="dashboard-project-row" key={project.id}>
                    <div>
                      <strong>{project.name}</strong>
                      <small>{project.client_name || "Brak klienta"}</small>
                    </div>

                    <span>{project.stage || "Brak etapu"}</span>

                    <em className={getStatusClass(project.status)}>
                      {project.status || "Brak"}
                    </em>

                    <ProjectProgress value={project.progress} />

                    <span>{formatDate(project.deadline)}</span>
                  </div>
                ))
              ) : (
                <div className="dashboard-project-row">
                  <div>
                    <strong>Brak projektów</strong>
                    <small>Dodaj pierwszy projekt w module Projekty.</small>
                  </div>
                  <span>—</span>
                  <em className="dashboard-pill">Brak</em>
                  <ProjectProgress value={0} />
                  <span>—</span>
                </div>
              )}
            </div>
          </section>

          <section className="dashboard-panel">
            <div className="dashboard-panel-head">
              <div>
                <h3>Ostatnia aktywność</h3>
                <p>Ostatnio dodane rekordy w najważniejszych modułach.</p>
              </div>
            </div>

            <div className="dashboard-activity-list">
              {(latest.clients || []).slice(0, 2).map((client) => (
                <div className="dashboard-activity-row" key={`client-${client.id}`}>
                  <span>{formatDate(client.created_at)}</span>
                  <strong>Klient</strong>
                  <p>
                    Dodano klienta: {client.full_name}
                    {client.company_name ? ` · ${client.company_name}` : ""}
                  </p>
                  <em>{client.status || "Nowy"}</em>
                </div>
              ))}

              {(latest.tasks || []).slice(0, 2).map((task) => (
                <div className="dashboard-activity-row" key={`task-${task.id}`}>
                  <span>{formatDate(task.created_at)}</span>
                  <strong>Zadanie</strong>
                  <p>
                    {task.title}
                    {task.client_name ? ` · ${task.client_name}` : ""}
                  </p>
                  <em>{task.status || "Brak"}</em>
                </div>
              ))}

              {(latest.payments || []).slice(0, 2).map((payment) => (
                <div className="dashboard-activity-row" key={`payment-${payment.id}`}>
                  <span>{formatDate(payment.created_at)}</span>
                  <strong>Płatność</strong>
                  <p>
                    {payment.title} · {payment.amount || "0"} {payment.currency || ""}
                  </p>
                  <em>{payment.status || "Brak"}</em>
                </div>
              ))}

              {!(latest.clients || []).length &&
                !(latest.tasks || []).length &&
                !(latest.payments || []).length && (
                  <div className="dashboard-activity-row">
                    <span>—</span>
                    <strong>CRM</strong>
                    <p>Brak aktywności do pokazania.</p>
                    <em>Start</em>
                  </div>
                )}
            </div>
          </section>
        </main>

        <aside className="dashboard-side-column">
          <section className="dashboard-panel">
            <div className="dashboard-panel-head compact">
              <h3>Zadania</h3>
              <p>Ostatnio dodane zadania.</p>
            </div>

            <div className="dashboard-tasks-list">
              {(latest.tasks || []).length ? (
                latest.tasks.map((task) => (
                  <div className="dashboard-task-row" key={task.id}>
                    <div>
                      <strong>{task.title}</strong>
                      <span>
                        {task.client_name || "Bez klienta"} ·{" "}
                        {task.due_date ? formatDate(task.due_date) : "Brak terminu"}
                      </span>
                    </div>

                    <em className={getStatusClass(task.status)}>{task.status}</em>
                  </div>
                ))
              ) : (
                <div className="dashboard-task-row">
                  <div>
                    <strong>Brak zadań</strong>
                    <span>Dodaj pierwsze zadanie.</span>
                  </div>

                  <em className="dashboard-pill">Pusto</em>
                </div>
              )}
            </div>
          </section>

          <section className="dashboard-panel">
            <div className="dashboard-panel-head compact">
              <h3>Płatności</h3>
              <p>Ostatnie pozycje w rejestrze płatności.</p>
            </div>

            <div className="dashboard-payments-list">
              {(latest.payments || []).length ? (
                latest.payments.map((payment) => (
                  <div className="dashboard-payment-row" key={payment.id}>
                    <div>
                      <strong>{payment.title}</strong>
                      <span>
                        {payment.client_name || "Brak klienta"} ·{" "}
                        {payment.amount || "0"} {payment.currency || ""}
                      </span>
                    </div>

                    <em className={getStatusClass(payment.status)}>
                      {payment.status}
                    </em>
                  </div>
                ))
              ) : (
                <div className="dashboard-payment-row">
                  <div>
                    <strong>Brak płatności</strong>
                    <span>Dodaj pierwszą płatność ręcznie.</span>
                  </div>

                  <em className="dashboard-pill">Pusto</em>
                </div>
              )}
            </div>
          </section>

          <section className="dashboard-panel">
            <div className="dashboard-panel-head compact">
              <h3>Szybkie akcje</h3>
              <p>Przejdź do najważniejszych modułów.</p>
            </div>

            <div className="dashboard-quick-actions">
              <button type="button" onClick={() => goTo("Klienci")}>
                <UsersRound size={15} />
                Klienci
              </button>

              <button type="button" onClick={() => goTo("Projekty")}>
                <BriefcaseBusiness size={15} />
                Projekty
              </button>

              <button type="button" onClick={() => goTo("Zadania")}>
                <CheckCircle2 size={15} />
                Zadania
              </button>

              <button type="button" onClick={() => goTo("Płatności")}>
                <CreditCard size={15} />
                Płatności
              </button>

              <button type="button" onClick={() => goTo("Dokumenty")}>
                <FileText size={15} />
                Dokumenty
              </button>

              <button type="button" onClick={() => goTo("Maile")}>
                <Mail size={15} />
                Maile
              </button>
            </div>
          </section>

          <section className="dashboard-focus-card">
            <div>
              <Clock3 size={16} />
              <strong>Stan CRM</strong>
            </div>

            <p>
              Backendowo działają już: klienci, zadania, projekty, płatności i
              dashboard. Kolejny logiczny etap to dokumenty albo statystyki.
            </p>
          </section>
        </aside>
      </div>
    </section>
  );
}