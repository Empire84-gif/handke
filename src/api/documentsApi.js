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

export function getDocuments(params = {}) {
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

  return request(`/documents${queryString ? `?${queryString}` : ""}`);
}

export function getDocument(documentId) {
  return request(`/documents/${documentId}`);
}

export function createDocument(document) {
  return request("/documents", {
    method: "POST",
    body: JSON.stringify(document),
  });
}

export function updateDocument(documentId, document) {
  return request(`/documents/${documentId}`, {
    method: "PUT",
    body: JSON.stringify(document),
  });
}

export function deleteDocument(documentId) {
  return request(`/documents/${documentId}`, {
    method: "DELETE",
  });
}

export function getNextDocumentNumber(documentType = "Oferta") {
  const queryParams = new URLSearchParams();

  queryParams.set("type", documentType);

  return request(`/documents/next-number?${queryParams.toString()}`);
}

