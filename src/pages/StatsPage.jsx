import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  CreditCard,
  RefreshCw,
  TrendingUp,
  UsersRound,
} from "lucide-react";

import { getStats } from "../api/statsApi";

function formatMoney(value) {
  const number = Number(value) || 0;

  return `${number.toLocaleString("pl-PL")} zł`;
}

function getMaxValue(items, key = "total") {
  const values = items.map((item) => Number(item[key]) || 0);
  return Math.max(...values, 1);
}

function getPercent(value, maxValue) {
  if (!maxValue) {
    return 0;
  }

  return Math.min(Math.round((Number(value) / maxValue) * 100), 100);
}

function StatKpiCard({ icon: Icon, label, value, note }) {
  return (
    <div className="stats-kpi-card">
      <div className="stats-kpi-icon">
        <Icon size={16} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{note}</p>
    </div>
  );
}

function BarList({ items, emptyText }) {
  const maxValue = getMaxValue(items);

  if (!items.length) {
    return (
      <div className="stats-health-row">
        <div>
          <strong>Brak danych</strong>
          <span>{emptyText}</span>
        </div>
        <em>0</em>
      </div>
    );
  }

  return (
    <div className="stats-bar-list">
      {items.map((item) => (
        <div className="stats-bar-row" key={item.label || "Brak"}>
          <div className="stats-bar-row-head">
            <span>{item.label || "Brak"}</span>
            <strong>{item.total}</strong>
          </div>

          <div className="stats-bar-track">
            <span style={{ width: `${getPercent(item.total, maxValue)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MonthlyActivity({ items }) {
  const maxValue = Math.max(
    ...items.map(
      (item) =>
        Number(item.clients || 0) +
        Number(item.tasks || 0) +
        Number(item.projects || 0) +
        Number(item.payments || 0),
    ),
    1,
  );

  if (!items.length) {
    return (
      <div className="stats-health-row">
        <div>
          <strong>Brak aktywności miesięcznej</strong>
          <span>Dodaj dane w CRM, aby zobaczyć aktywność.</span>
        </div>
        <em>0</em>
      </div>
    );
  }

  return (
    <div className="stats-bar-list">
      {items.map((item) => {
        const total =
          Number(item.clients || 0) +
          Number(item.tasks || 0) +
          Number(item.projects || 0) +
          Number(item.payments || 0);

        return (
          <div className="stats-bar-row" key={item.label}>
            <div className="stats-bar-row-head">
              <span>{item.label}</span>
              <strong>{total}</strong>
            </div>

            <div className="stats-bar-track">
              <span style={{ width: `${getPercent(total, maxValue)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getProjectStatusClass(status) {
  if (status === "W trakcie" || status === "Zakończony") {
    return "dashboard-pill dashboard-pill-green";
  }

  if (status === "Oferta wysłana" || status === "Do akceptacji") {
    return "dashboard-pill dashboard-pill-orange";
  }

  if (status === "Wstrzymany") {
    return "dashboard-pill dashboard-pill-red";
  }

  return "dashboard-pill";
}

function getPaymentStatusClass(status) {
  if (status === "Opłacone") {
    return "dashboard-pill dashboard-pill-green";
  }

  if (status === "Oczekuje" || status === "Planowane") {
    return "dashboard-pill dashboard-pill-orange";
  }

  if (status === "Po terminie" || status === "Anulowane") {
    return "dashboard-pill dashboard-pill-red";
  }

  return "dashboard-pill";
}

export default function StatsPage() {
  const [stats, setStats] = useState({
    summary: {
      clients_total: 0,
      tasks_total: 0,
      projects_total: 0,
      payments_total: 0,
      paid_value: 0,
      waiting_value: 0,
      overdue_value: 0,
      total_payment_value: 0,
      average_project_progress: 0,
    },
    groups: {
      clients_by_status: [],
      tasks_by_status: [],
      projects_by_status: [],
      payments_by_status: [],
      payments_by_type: [],
    },
    monthly_activity: [],
    recent: {
      projects: [],
      payments: [],
    },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setIsLoading(true);
      setPageError("");

      const data = await getStats();

      setStats({
        summary: data.summary || {},
        groups: data.groups || {},
        monthly_activity: data.monthly_activity || [],
        recent: data.recent || {
          projects: [],
          payments: [],
        },
      });
    } catch (error) {
      setPageError(error.message || "Nie udało się pobrać statystyk.");
    } finally {
      setIsLoading(false);
    }
  }

  const summary = stats.summary || {};
  const groups = stats.groups || {};
  const recent = stats.recent || {};

  const healthItems = useMemo(() => {
    const items = [];

    items.push({
      title: "Średni postęp projektów",
      note: "Na podstawie pola postępu w projektach.",
      value: `${summary.average_project_progress || 0}%`,
    });

    items.push({
      title: "Płatności oczekujące",
      note: "Kwota płatności ze statusem Oczekuje.",
      value: formatMoney(summary.waiting_value),
    });

    items.push({
      title: "Płatności po terminie",
      note: "Kwota płatności ze statusem Po terminie.",
      value: formatMoney(summary.overdue_value),
    });

    return items;
  }, [summary]);

  return (
    <section className="stats-page">
      {(pageError || isLoading) && (
        <div className="settings-global-message">
          {pageError && <p className="client-form-error">{pageError}</p>}
          {isLoading && (
            <p className="client-form-success">Ładowanie statystyk z backendu...</p>
          )}
        </div>
      )}

      <div className="stats-hero">
        <div>
          <h2>Statystyki</h2>
          <span>
            Podsumowanie danych CRM: klienci, projekty, zadania, płatności i aktywność.
          </span>
        </div>

        <button className="outline-button" type="button" onClick={loadStats}>
          <RefreshCw size={15} />
          Odśwież statystyki
        </button>
      </div>

      <div className="stats-kpi-grid">
        <StatKpiCard
          icon={UsersRound}
          label="Klienci"
          value={summary.clients_total || 0}
          note="Łączna liczba klientów w bazie."
        />

        <StatKpiCard
          icon={BriefcaseBusiness}
          label="Projekty"
          value={summary.projects_total || 0}
          note={`Średni postęp: ${summary.average_project_progress || 0}%.`}
        />

        <StatKpiCard
          icon={CheckCircle2}
          label="Zadania"
          value={summary.tasks_total || 0}
          note="Wszystkie zapisane zadania."
        />

        <StatKpiCard
          icon={CreditCard}
          label="Płatności"
          value={summary.payments_total || 0}
          note={`Łączna wartość: ${formatMoney(summary.total_payment_value)}.`}
        />

        <StatKpiCard
          icon={TrendingUp}
          label="Wpłacono"
          value={formatMoney(summary.paid_value)}
          note={`Oczekuje: ${formatMoney(summary.waiting_value)}.`}
        />
      </div>

      <div className="stats-layout">
        <main className="stats-main-column">
          <section className="stats-panel">
            <div className="stats-panel-head">
              <div>
                <h3>Projekty według statusu</h3>
                <p>Rozkład projektów po aktualnych statusach.</p>
              </div>
              <BarChart3 size={18} />
            </div>

            <BarList
              items={groups.projects_by_status || []}
              emptyText="Dodaj projekty, aby zobaczyć rozkład statusów."
            />
          </section>

          <section className="stats-panel">
            <div className="stats-panel-head">
              <div>
                <h3>Płatności według statusu</h3>
                <p>Ile płatności znajduje się w danym stanie.</p>
              </div>
              <CreditCard size={18} />
            </div>

            <BarList
              items={groups.payments_by_status || []}
              emptyText="Dodaj płatności, aby zobaczyć rozkład statusów."
            />
          </section>

          <section className="stats-panel">
            <div className="stats-panel-head">
              <div>
                <h3>Aktywność miesięczna</h3>
                <p>Liczba dodanych klientów, zadań, projektów i płatności według miesiąca.</p>
              </div>
              <TrendingUp size={18} />
            </div>

            <MonthlyActivity items={stats.monthly_activity || []} />
          </section>

          <section className="stats-panel">
            <div className="stats-panel-head">
              <div>
                <h3>Ostatnie projekty</h3>
                <p>Najnowsze projekty w bazie CRM.</p>
              </div>
              <BriefcaseBusiness size={18} />
            </div>

            <div className="stats-health-list">
              {(recent.projects || []).length ? (
                recent.projects.map((project) => (
                  <div className="stats-health-row" key={project.id}>
                    <div>
                      <strong>{project.name}</strong>
                      <span>
                        {project.client_name || "Brak klienta"} ·{" "}
                        {project.stage || "Brak etapu"} · {project.progress || 0}%
                      </span>
                    </div>

                    <em className={getProjectStatusClass(project.status)}>
                      {project.status || "Brak"}
                    </em>
                  </div>
                ))
              ) : (
                <div className="stats-health-row">
                  <div>
                    <strong>Brak projektów</strong>
                    <span>Dodaj pierwszy projekt, aby pojawił się tutaj.</span>
                  </div>
                  <em>0</em>
                </div>
              )}
            </div>
          </section>
        </main>

        <aside className="stats-side-column">
          <section className="stats-panel">
            <div className="stats-panel-head">
              <div>
                <h3>Kondycja CRM</h3>
                <p>Najważniejsze wskaźniki operacyjne.</p>
              </div>
              <CheckCircle2 size={18} />
            </div>

            <div className="stats-health-list">
              {healthItems.map((item) => (
                <div className="stats-health-row" key={item.title}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.note}</span>
                  </div>
                  <em>{item.value}</em>
                </div>
              ))}
            </div>
          </section>

          <section className="stats-panel">
            <div className="stats-panel-head">
              <div>
                <h3>Klienci według statusu</h3>
                <p>Segmentacja klientów z modułu Klienci.</p>
              </div>
              <UsersRound size={18} />
            </div>

            <BarList
              items={groups.clients_by_status || []}
              emptyText="Dodaj klientów, aby zobaczyć segmentację."
            />
          </section>

          <section className="stats-panel">
            <div className="stats-panel-head">
              <div>
                <h3>Zadania według statusu</h3>
                <p>Podział zadań na aktualne stany.</p>
              </div>
              <CheckCircle2 size={18} />
            </div>

            <BarList
              items={groups.tasks_by_status || []}
              emptyText="Dodaj zadania, aby zobaczyć statystyki."
            />
          </section>

          <section className="stats-panel">
            <div className="stats-panel-head">
              <div>
                <h3>Typy płatności</h3>
                <p>Zaliczki, etapy, korekty i inne typy.</p>
              </div>
              <CreditCard size={18} />
            </div>

            <BarList
              items={groups.payments_by_type || []}
              emptyText="Dodaj płatności, aby zobaczyć typy."
            />
          </section>

          <section className="stats-panel">
            <div className="stats-panel-head">
              <div>
                <h3>Ostatnie płatności</h3>
                <p>Najnowsze pozycje z rejestru płatności.</p>
              </div>
              <CreditCard size={18} />
            </div>

            <div className="stats-health-list">
              {(recent.payments || []).length ? (
                recent.payments.map((payment) => (
                  <div className="stats-health-row" key={payment.id}>
                    <div>
                      <strong>{payment.title}</strong>
                      <span>
                        {payment.client_name || "Brak klienta"} ·{" "}
                        {payment.amount || "0"} {payment.currency || ""}
                      </span>
                    </div>

                    <em className={getPaymentStatusClass(payment.status)}>
                      {payment.status || "Brak"}
                    </em>
                  </div>
                ))
              ) : (
                <div className="stats-health-row">
                  <div>
                    <strong>Brak płatności</strong>
                    <span>Dodaj pierwszą płatność ręcznie.</span>
                  </div>
                  <em>0</em>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}