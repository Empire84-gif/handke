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

export function getMails(params = {}) {
  const queryParams = new URLSearchParams();

  if (params.query) {
    queryParams.set("query", params.query);
  }

  if (params.status && params.status !== "Wszystkie") {
    queryParams.set("status", params.status);
  }

  if (params.folder && params.folder !== "Wszystkie") {
    queryParams.set("folder", params.folder);
  }

  if (params.direction && params.direction !== "Wszystkie") {
    queryParams.set("direction", params.direction);
  }

  const queryString = queryParams.toString();

  return request(`/mails${queryString ? `?${queryString}` : ""}`);
}

export function getMail(mailId) {
  return request(`/mails/${mailId}`);
}

export function createMail(mail) {
  return request("/mails", {
    method: "POST",
    body: JSON.stringify(mail),
  });
}

export function updateMail(mailId, mail) {
  return request(`/mails/${mailId}`, {
    method: "PUT",
    body: JSON.stringify(mail),
  });
}

export function deleteMail(mailId) {
  return request(`/mails/${mailId}`, {
    method: "DELETE",
  });
}