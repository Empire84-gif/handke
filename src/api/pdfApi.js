const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function downloadInvoicePdf(payload) {
  const response = await fetch(`${API_URL}/pdf/invoice`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Nie udało się wygenerować PDF.");
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get("Content-Disposition") || "";

  let filename = "invoice.pdf";

  const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);

  if (filenameMatch?.[1]) {
    filename = filenameMatch[1];
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadOfferPdf(payload) {
  const response = await fetch(`${API_URL}/pdf/offer`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Nie udało się wygenerować PDF oferty.");
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get("Content-Disposition") || "";

  let filename = "offer.pdf";

  const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);

  if (filenameMatch?.[1]) {
    filename = filenameMatch[1];
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  link.remove();
  window.URL.revokeObjectURL(url);
}