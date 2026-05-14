import { useEffect, useMemo, useState } from "react";
import { Lock, Upload } from "lucide-react";

import logo from "../assets/logo.png";
import { changePassword } from "../api/authApi";
import {
  getSettings,
  updateSettings,
  uploadSettingsLogo,
} from "../api/settingsApi";

const API_ORIGIN = "http://localhost:5000";

const defaultSettings = {
  app_name: "SDE CRM",
  company_name: "Handke Holding OÜ",
  brand_name: "SDE",
  email: "office@handkeholding.com",
  phone: "+372 5617 1770",
  website: "https://www.hansacareers.ee",
  address_line_1: "Harju maakond, Kesklinna linnaosa",
  address_line_2: "Sakala tn 7-2, 10141 Tallinn",
  address_line_3: "Republic of Estonia",
  registry_code: "17387477",
  vat_eu: "EE102932869",
  logo_path: "",
  default_currency: "PLN",
  theme_mode: "Jasny",
  interface_density: "Kompaktowa",
  primary_color: "#111111",
  button_style: "Outline",
  default_client_status: "Nowy lead",
  default_client_source: "Ręcznie dodany",
  default_contact_type: "Email",
  no_contact_after_days: "7 dni",
  log_client_created: 1,
  log_status_changes: 1,
  log_data_edits: 1,
  combine_notes_and_logs: 1,
  default_history_view: "Wszystko",
};

function normalizeSettings(settings) {
  return {
    ...defaultSettings,
    ...(settings || {}),
    log_client_created: Number(settings?.log_client_created ?? 1),
    log_status_changes: Number(settings?.log_status_changes ?? 1),
    log_data_edits: Number(settings?.log_data_edits ?? 1),
    combine_notes_and_logs: Number(settings?.combine_notes_and_logs ?? 1),
  };
}

function getLogoSrc(logoPath) {
  if (!logoPath) {
    return logo;
  }

  if (logoPath.startsWith("http")) {
    return logoPath;
  }

  return `${API_ORIGIN}${logoPath}`;
}

function SettingsField({
  label,
  value,
  placeholder,
  type = "text",
  onChange,
}) {
  return (
    <label className="settings-field">
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

function SettingsSelect({ label, value, options, onChange }) {
  return (
    <label className="settings-field">
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

function SettingsToggle({ title, description, active = false, onToggle }) {
  return (
    <div className="settings-toggle-row">
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>

      <button
        className={active ? "settings-toggle is-active" : "settings-toggle"}
        type="button"
        aria-label={title}
        onClick={onToggle}
      >
        <span />
      </button>
    </div>
  );
}

function SettingsCard({ title, description, children, action }) {
  return (
    <section className="settings-card">
      <div className="settings-card-head">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>

        {action}
      </div>

      {children}
    </section>
  );
}

function SecuritySettings() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    repeatPassword: "",
  });

  const [message, setMessage] = useState("");
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

    setMessage("");
    setError("");

    if (!form.currentPassword) {
      setError("Podaj obecne hasło.");
      return;
    }

    if (form.newPassword.length < 8) {
      setError("Nowe hasło musi mieć minimum 8 znaków.");
      return;
    }

    if (form.newPassword !== form.repeatPassword) {
      setError("Nowe hasła nie są takie same.");
      return;
    }

    setIsSaving(true);

    try {
      const data = await changePassword(form.currentPassword, form.newPassword);

      setMessage(data.message || "Hasło zostało zmienione.");

      setForm({
        currentPassword: "",
        newPassword: "",
        repeatPassword: "",
      });
    } catch (err) {
      setError(err.message || "Nie udało się zmienić hasła.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SettingsCard
      title="Bezpieczeństwo"
      description="Zmień hasło administratora używane do logowania do prywatnego CRM."
      action={<Lock size={18} />}
    >
      <form className="settings-security-form" onSubmit={handleSubmit}>
        <div className="settings-form-grid three">
          <label className="settings-field">
            <span>Obecne hasło</span>
            <input
              type="password"
              value={form.currentPassword}
              placeholder="Wpisz obecne hasło"
              onChange={(event) =>
                updateField("currentPassword", event.target.value)
              }
            />
          </label>

          <label className="settings-field">
            <span>Nowe hasło</span>
            <input
              type="password"
              value={form.newPassword}
              placeholder="Minimum 8 znaków"
              onChange={(event) =>
                updateField("newPassword", event.target.value)
              }
            />
          </label>

          <label className="settings-field">
            <span>Powtórz nowe hasło</span>
            <input
              type="password"
              value={form.repeatPassword}
              placeholder="Powtórz nowe hasło"
              onChange={(event) =>
                updateField("repeatPassword", event.target.value)
              }
            />
          </label>
        </div>

        {error && <p className="settings-auth-error">{error}</p>}
        {message && <p className="settings-auth-success">{message}</p>}

        <div className="settings-security-actions">
          <button className="outline-button" type="submit" disabled={isSaving}>
            {isSaving ? "Zapisywanie..." : "Zmień hasło"}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
}

function SettingsPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");

  const logoSrc = useMemo(() => {
    return getLogoSrc(settings.logo_path);
  }, [settings.logo_path]);

  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      setSettingsError("");

      try {
        const data = await getSettings();
        setSettings(normalizeSettings(data.settings));
      } catch (err) {
        setSettingsError(err.message || "Nie udało się pobrać ustawień.");
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, []);

  function updateSetting(field, value) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toggleSetting(field) {
    setSettings((current) => ({
      ...current,
      [field]: current[field] ? 0 : 1,
    }));
  }

  async function handleSaveSettings() {
    setSettingsMessage("");
    setSettingsError("");
    setIsSavingSettings(true);

    try {
      const data = await updateSettings(settings);
      setSettings(normalizeSettings(data.settings));
      setSettingsMessage(data.message || "Ustawienia zostały zapisane.");
    } catch (err) {
      setSettingsError(err.message || "Nie udało się zapisać ustawień.");
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setSettingsMessage("");
    setSettingsError("");
    setIsUploadingLogo(true);

    try {
      const data = await uploadSettingsLogo(file);
      setSettings(normalizeSettings(data.settings));
      setSettingsMessage(data.message || "Logo zostało zapisane.");
    } catch (err) {
      setSettingsError(err.message || "Nie udało się przesłać logo.");
    } finally {
      setIsUploadingLogo(false);
      event.target.value = "";
    }
  }

  if (isLoading) {
    return (
      <section className="settings-page">
        <div className="settings-intro">
          <div>
            <p className="eyebrow">Konfiguracja</p>
            <h2>Ładowanie ustawień...</h2>
            <span>Pobieranie danych firmy z backendu.</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="settings-page">
      <div className="settings-intro">
        <div>
          <p className="eyebrow">Konfiguracja</p>
          <h2>Ustawienia aplikacji</h2>
          <span>
            Kompaktowa konfiguracja Twojego prywatnego CRM — dane firmy,
            branding, klienci, logi, bezpieczeństwo i eksport.
          </span>
        </div>

        <button
          className="outline-button"
          type="button"
          onClick={handleSaveSettings}
          disabled={isSavingSettings}
        >
          {isSavingSettings ? "Zapisywanie..." : "Zapisz zmiany"}
        </button>
      </div>

      {(settingsMessage || settingsError) && (
        <div className="settings-global-message">
          {settingsMessage && (
            <p className="settings-auth-success">{settingsMessage}</p>
          )}

          {settingsError && (
            <p className="settings-auth-error">{settingsError}</p>
          )}
        </div>
      )}

      <div className="settings-grid">
        <SettingsCard
          title="Profil aplikacji"
          description="Podstawowe dane używane później w dokumentach, ofertach i mailach."
          action={
            <button className="small-outline-button" type="button">
              Edytuj
            </button>
          }
        >
          <div className="settings-form-grid three">
            <SettingsField
              label="Nazwa aplikacji"
              value={settings.app_name}
              placeholder="np. SDE CRM"
              onChange={(value) => updateSetting("app_name", value)}
            />

            <SettingsField
              label="Nazwa firmy"
              value={settings.company_name}
              placeholder="np. Handke Holding OÜ"
              onChange={(value) => updateSetting("company_name", value)}
            />

            <SettingsSelect
              label="Domyślna waluta"
              value={settings.default_currency}
              options={["PLN", "EUR", "USD"]}
              onChange={(value) => updateSetting("default_currency", value)}
            />

            <SettingsField
              label="Email kontaktowy"
              value={settings.email}
              placeholder="kontakt@firma.com"
              onChange={(value) => updateSetting("email", value)}
            />

            <SettingsField
              label="Telefon"
              value={settings.phone}
              placeholder="+372 0000 0000"
              onChange={(value) => updateSetting("phone", value)}
            />

            <SettingsField
              label="Strona www"
              value={settings.website}
              placeholder="https://..."
              onChange={(value) => updateSetting("website", value)}
            />
          </div>
        </SettingsCard>

        <SettingsCard
          title="Dane rejestrowe"
          description="Dane firmy używane w ofertach, umowach, stopkach mailowych i dokumentach."
        >
          <div className="settings-form-grid two">
            <SettingsField
              label="Pełna nazwa firmy"
              value={settings.company_name}
              placeholder="Pełna nazwa firmy"
              onChange={(value) => updateSetting("company_name", value)}
            />

            <SettingsField
              label="Registry code"
              value={settings.registry_code}
              placeholder="Numer rejestrowy"
              onChange={(value) => updateSetting("registry_code", value)}
            />

            <SettingsField
              label="VAT EU"
              value={settings.vat_eu}
              placeholder="VAT EU"
              onChange={(value) => updateSetting("vat_eu", value)}
            />

            <SettingsField
              label="Brand / nazwa handlowa"
              value={settings.brand_name}
              placeholder="np. SDE"
              onChange={(value) => updateSetting("brand_name", value)}
            />

            <SettingsField
              label="Adres — linia 1"
              value={settings.address_line_1}
              placeholder="Adres"
              onChange={(value) => updateSetting("address_line_1", value)}
            />

            <SettingsField
              label="Adres — linia 2"
              value={settings.address_line_2}
              placeholder="Adres"
              onChange={(value) => updateSetting("address_line_2", value)}
            />

            <SettingsField
              label="Kraj"
              value={settings.address_line_3}
              placeholder="Kraj"
              onChange={(value) => updateSetting("address_line_3", value)}
            />
          </div>
        </SettingsCard>

        <SettingsCard
          title="Branding"
          description="Wygląd aplikacji, logo i ogólny styl interfejsu."
        >
          <div className="settings-brand-row">
            <div className="settings-logo-preview">
              <img src={logoSrc} alt="Logo" />
            </div>

            <div className="settings-brand-info">
              <strong>{settings.app_name || "SDE CRM"}</strong>
              <span>Logo używane w aplikacji, dokumentach i stopkach mailowych.</span>
            </div>

            <label className="small-outline-button settings-upload-button">
              <Upload size={14} />
              {isUploadingLogo ? "Wysyłanie..." : "Zmień logo"}
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg"
                hidden
                onChange={handleLogoUpload}
                disabled={isUploadingLogo}
              />
            </label>
          </div>

          <div className="settings-form-grid two">
            <SettingsSelect
              label="Motyw"
              value={settings.theme_mode}
              options={["Jasny"]}
              onChange={(value) => updateSetting("theme_mode", value)}
            />

            <SettingsSelect
              label="Gęstość interfejsu"
              value={settings.interface_density}
              options={["Kompaktowa", "Normalna"]}
              onChange={(value) => updateSetting("interface_density", value)}
            />

            <SettingsField
              label="Kolor główny"
              value={settings.primary_color}
              placeholder="#111111"
              onChange={(value) => updateSetting("primary_color", value)}
            />

            <SettingsSelect
              label="Styl przycisków"
              value={settings.button_style}
              options={["Outline", "Pełny"]}
              onChange={(value) => updateSetting("button_style", value)}
            />
          </div>
        </SettingsCard>

        <SettingsCard
          title="Klienci"
          description="Domyślne ustawienia dla nowych klientów w bazie."
        >
          <div className="settings-form-grid two">
            <SettingsSelect
              label="Domyślny status"
              value={settings.default_client_status}
              options={[
                "Nowy lead",
                "Do kontaktu",
                "W rozmowie",
                "Oferta wysłana",
                "Aktywny klient",
              ]}
              onChange={(value) => updateSetting("default_client_status", value)}
            />

            <SettingsSelect
              label="Domyślne źródło"
              value={settings.default_client_source}
              options={[
                "Ręcznie dodany",
                "Strona www",
                "Polecenie",
                "Email",
                "Telefon",
              ]}
              onChange={(value) => updateSetting("default_client_source", value)}
            />

            <SettingsSelect
              label="Typ kontaktu"
              value={settings.default_contact_type}
              options={["Email", "Telefon", "Spotkanie", "Inne"]}
              onChange={(value) => updateSetting("default_contact_type", value)}
            />

            <SettingsField
              label="Brak kontaktu po"
              value={settings.no_contact_after_days}
              placeholder="np. 7 dni"
              onChange={(value) => updateSetting("no_contact_after_days", value)}
            />
          </div>

          <div className="settings-toggle-list">
            <SettingsToggle
              title="Log po dodaniu klienta"
              description="System automatycznie zapisze zdarzenie w historii klienta."
              active={Boolean(settings.log_client_created)}
              onToggle={() => toggleSetting("log_client_created")}
            />
          </div>
        </SettingsCard>

        <SettingsCard
          title="Notatki i logi"
          description="Zasady historii aktywności przy kliencie."
        >
          <div className="settings-toggle-list">
            <SettingsToggle
              title="Zapisuj zmiany statusu"
              description="Każda zmiana statusu klienta trafi do timeline."
              active={Boolean(settings.log_status_changes)}
              onToggle={() => toggleSetting("log_status_changes")}
            />

            <SettingsToggle
              title="Zapisuj edycje danych"
              description="System zapisze informację, gdy zmienisz dane klienta."
              active={Boolean(settings.log_data_edits)}
              onToggle={() => toggleSetting("log_data_edits")}
            />

            <SettingsToggle
              title="Pokazuj notatki i logi razem"
              description="W jednym widoku zobaczysz ręczne notatki i automatyczne zdarzenia."
              active={Boolean(settings.combine_notes_and_logs)}
              onToggle={() => toggleSetting("combine_notes_and_logs")}
            />
          </div>

          <div className="settings-form-grid one compact-top">
            <SettingsSelect
              label="Domyślny widok historii"
              value={settings.default_history_view}
              options={["Wszystko", "Tylko notatki", "Tylko logi systemowe"]}
              onChange={(value) => updateSetting("default_history_view", value)}
            />
          </div>
        </SettingsCard>

        <SecuritySettings />

        <SettingsCard
          title="Dane i eksport"
          description="Przygotowane pod eksport i kopie zapasowe danych."
        >
          <div className="settings-actions-row">
            <button className="small-outline-button" type="button">
              Eksport klientów
            </button>

            <button className="small-outline-button" type="button">
              Eksport projektów
            </button>

            <button className="small-outline-button" type="button">
              Eksport płatności
            </button>

            <button className="small-outline-button" type="button">
              Eksport logów
            </button>

            <button className="small-outline-button danger" type="button">
              Reset danych testowych
            </button>
          </div>

          <p className="settings-muted-note">
            Eksport i kopie zapasowe podepniemy później, gdy wszystkie moduły
            będą zapisywane w prawdziwej bazie danych.
          </p>
        </SettingsCard>
      </div>
    </section>
  );
}

export default SettingsPage;