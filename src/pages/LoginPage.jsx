import { useState } from "react";
import { Lock, Mail, ShieldCheck } from "lucide-react";

import logo from "../assets/logo.png";
import { loginUser } from "../api/authApi";

export default function LoginPage({ onLogin, onForgotPassword }) {
  const [form, setForm] = useState({
    email: "office@handkeholding.com",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const data = await loginUser(form.email, form.password);
      onLogin(data.user);
    } catch (err) {
      setError(err.message || "Nie udało się zalogować.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-logo">
          <img src={logo} alt="Logo" />
        </div>

        <div className="auth-head">
          <div className="auth-icon">
            <ShieldCheck size={18} />
          </div>

          <h1>Logowanie do CRM</h1>
          <p>Wprowadź dane administratora, aby przejść do panelu.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <div>
              <Mail size={15} />
              <input
                type="email"
                value={form.email}
                placeholder="office@handkeholding.com"
                onChange={(event) => updateField("email", event.target.value)}
              />
            </div>
          </label>

          <label className="auth-field">
            <span>Hasło</span>
            <div>
              <Lock size={15} />
              <input
                type="password"
                value={form.password}
                placeholder="Wpisz hasło"
                onChange={(event) => updateField("password", event.target.value)}
              />
            </div>
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-submit-button" type="submit" disabled={isLoading}>
            {isLoading ? "Logowanie..." : "Zaloguj"}
          </button>

          <button
            className="auth-text-button"
            type="button"
            onClick={onForgotPassword}
          >
            Nie pamiętasz hasła?
          </button>
        </form>

        <p className="auth-note">
          Domyślnie po pierwszym uruchomieniu: <strong>admin123</strong>. Po
          zalogowaniu zmień hasło w ustawieniach.
        </p>
      </section>
    </main>
  );
}