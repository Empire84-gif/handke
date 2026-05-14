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

export function getProjects(params = {}) {
  const queryParams = new URLSearchParams();

  if (params.query) {
    queryParams.set("query", params.query);
  }

  if (params.status && params.status !== "Wszystkie") {
    queryParams.set("status", params.status);
  }

  const queryString = queryParams.toString();

  return request(`/projects${queryString ? `?${queryString}` : ""}`);
}

export function getProject(projectId) {
  return request(`/projects/${projectId}`);
}

export function createProject(project) {
  return request("/projects", {
    method: "POST",
    body: JSON.stringify(project),
  });
}

export function updateProject(projectId, project) {
  return request(`/projects/${projectId}`, {
    method: "PUT",
    body: JSON.stringify(project),
  });
}

export function deleteProject(projectId) {
  return request(`/projects/${projectId}`, {
    method: "DELETE",
  });
}