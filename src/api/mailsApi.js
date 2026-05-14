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

export function syncMails(limit = 25) {
  return request("/mails/sync", {
    method: "POST",
    body: JSON.stringify({
      limit,
    }),
  });
}

export async function sendMail(mail) {
  const formData = new FormData();

  formData.append("to_email", mail.to_email || "");
  formData.append("cc", mail.cc || "");
  formData.append("bcc", mail.bcc || "");
  formData.append("subject", mail.subject || "");
  formData.append("body", mail.body || "");
  formData.append("client_name", mail.client_name || "");
  formData.append("project_name", mail.project_name || "");
  formData.append("client_status", mail.client_status || "Nieprzypisany");
  formData.append("priority", mail.priority || "Normalny");
  formData.append("notes", mail.notes || "");
  formData.append("tags", mail.tags || "Wysłane, SMTP");

  (mail.attachments || []).forEach((attachment) => {
    if (attachment?.rawFile) {
      formData.append("attachments", attachment.rawFile);
    }
  });

  const response = await fetch(`${API_URL}/mails/send`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Nie udało się wysłać wiadomości.");
  }

  return data;
}


export function getMailAttachments(mailId) {
  return request(`/mails/${mailId}/attachments`);
}

export async function downloadMailAttachment(attachmentId, filename = "attachment") {
  const response = await fetch(`${API_URL}/mails/attachments/${attachmentId}/download`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Nie udało się pobrać załącznika.");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  link.remove();
  window.URL.revokeObjectURL(url);
}