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

export function getTasks(params = {}) {
  const queryParams = new URLSearchParams();

  if (params.query) {
    queryParams.set("query", params.query);
  }

  if (params.status && params.status !== "Wszystkie") {
    queryParams.set("status", params.status);
  }

  const queryString = queryParams.toString();

  return request(`/tasks${queryString ? `?${queryString}` : ""}`);
}

export function getTask(taskId) {
  return request(`/tasks/${taskId}`);
}

export function createTask(task) {
  return request("/tasks", {
    method: "POST",
    body: JSON.stringify(task),
  });
}

export function updateTask(taskId, task) {
  return request(`/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(task),
  });
}

export function deleteTask(taskId) {
  return request(`/tasks/${taskId}`, {
    method: "DELETE",
  });
}