const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Wystąpił błąd połączenia z serwerem.");
  }

  return data;
}

export function getSettings() {
  return request("/settings");
}

export function updateSettings(settings) {
  return request("/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

export async function uploadSettingsLogo(file) {
  const formData = new FormData();
  formData.append("logo", file);

  const response = await fetch(`${API_URL}/settings/logo`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Nie udało się przesłać logo.");
  }

  return data;
}