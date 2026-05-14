import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";

import logo from "../assets/logo.png";
import { forgotPassword } from "../api/authApi";

export default function ForgotPasswordPage({ onBack }) {
  const [email, setEmail] = useState("office@handkeholding.com");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setError("");
    setIsLoading(true);

    try {
      const data = await forgotPassword(email);
      setMessage(data.message || "Link resetujący został przygotowany.");
    } catch (err) {
      setError(err.message || "Nie udało się przygotować resetu hasła.");
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
          <h1>Reset hasła</h1>
          <p>
            Podaj adres email administratora. W trybie developerskim link pojawi
            się w terminalu backendu.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <div>
              <Mail size={15} />
              <input
                type="email"
                value={email}
                placeholder="office@handkeholding.com"
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </label>

          {message && <p className="auth-success">{message}</p>}
          {error && <p className="auth-error">{error}</p>}

          <button className="auth-submit-button" type="submit" disabled={isLoading}>
            {isLoading ? "Przygotowywanie..." : "Przygotuj link resetu"}
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