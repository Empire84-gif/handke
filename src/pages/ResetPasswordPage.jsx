import { useMemo, useState } from "react";
import { ArrowLeft, Lock } from "lucide-react";

import logo from "../assets/logo.png";
import { resetPassword } from "../api/authApi";

export default function ResetPasswordPage({ onBack }) {
  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") || "";
  }, []);

  const [form, setForm] = useState({
    password: "",
    repeatPassword: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

    if (!token) {
      setError("Brak tokenu resetu hasła.");
      return;
    }

    if (form.password.length < 8) {
      setError("Hasło musi mieć minimum 8 znaków.");
      return;
    }

    if (form.password !== form.repeatPassword) {
      setError("Hasła nie są takie same.");
      return;
    }

    setIsLoading(true);

    try {
      const data = await resetPassword(token, form.password);
      setMessage(data.message || "Hasło zostało zresetowane.");
    } catch (err) {
      setError(err.message || "Nie udało się zresetować hasła.");
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
          <h1>Ustaw nowe hasło</h1>
          <p>Wprowadź nowe hasło administratora.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Nowe hasło</span>
            <div>
              <Lock size={15} />
              <input
                type="password"
                value={form.password}
                placeholder="Minimum 8 znaków"
                onChange={(event) => updateField("password", event.target.value)}
              />
            </div>
          </label>

          <label className="auth-field">
            <span>Powtórz hasło</span>
            <div>
              <Lock size={15} />
              <input
                type="password"
                value={form.repeatPassword}
                placeholder="Powtórz nowe hasło"
                onChange={(event) =>
                  updateField("repeatPassword", event.target.value)
                }
              />
            </div>
          </label>

          {message && <p className="auth-success">{message}</p>}
          {error && <p className="auth-error">{error}</p>}

          <button className="auth-submit-button" type="submit" disabled={isLoading}>
            {isLoading ? "Zapisywanie..." : "Zapisz nowe hasło"}
          </button>

          <button className="auth-text-button" type="button" onClick={onBack}>
            <ArrowLeft size={14} />
            Wróć do logowania
          </button>
        </form>
      </section>
    </main>
  );
}