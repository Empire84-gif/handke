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

export function getClients(params = {}) {
  const queryParams = new URLSearchParams();

  if (params.query) {
    queryParams.set("query", params.query);
  }

  if (params.status && params.status !== "Wszystkie") {
    queryParams.set("status", params.status);
  }

  const queryString = queryParams.toString();

  return request(`/clients${queryString ? `?${queryString}` : ""}`);
}

export function getClient(clientId) {
  return request(`/clients/${clientId}`);
}

export function createClient(client) {
  return request("/clients", {
    method: "POST",
    body: JSON.stringify(client),
  });
}

export function updateClient(clientId, client) {
  return request(`/clients/${clientId}`, {
    method: "PUT",
    body: JSON.stringify(client),
  });
}

export function deleteClient(clientId) {
  return request(`/clients/${clientId}`, {
    method: "DELETE",
  });
}