const API_URL = "http://localhost:5000/api";

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

export function getPayments(params = {}) {
  const queryParams = new URLSearchParams();

  if (params.query) {
    queryParams.set("query", params.query);
  }

  if (params.status && params.status !== "Wszystkie") {
    queryParams.set("status", params.status);
  }

  if (params.type && params.type !== "Wszystkie") {
    queryParams.set("type", params.type);
  }

  const queryString = queryParams.toString();

  return request(`/payments${queryString ? `?${queryString}` : ""}`);
}

export function getPayment(paymentId) {
  return request(`/payments/${paymentId}`);
}

export function createPayment(payment) {
  return request("/payments", {
    method: "POST",
    body: JSON.stringify(payment),
  });
}

export function updatePayment(paymentId, payment) {
  return request(`/payments/${paymentId}`, {
    method: "PUT",
    body: JSON.stringify(payment),
  });
}

export function deletePayment(paymentId) {
  return request(`/payments/${paymentId}`, {
    method: "DELETE",
  });
}