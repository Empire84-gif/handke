const API_ORIGIN = "http://localhost:5000";

export function getLogoSrc(logoPath, fallbackLogo) {
  if (!logoPath) {
    return fallbackLogo;
  }

  if (logoPath.startsWith("http")) {
    return logoPath;
  }

  return `${API_ORIGIN}${logoPath}`;
}

export function buildIssuerFromSettings(settings = {}) {
  return {
    companyName: settings.company_name || "Handke Holding OÜ",
    brandName: settings.brand_name || "SDE",
    addressLine1: settings.address_line_1 || "",
    addressLine2: settings.address_line_2 || "",
    country: settings.address_line_3 || "",
    registrationNumber: settings.registry_code || "",
    vatEu: settings.vat_eu || "",
    phone: settings.phone || "",
    email: settings.email || "",
    website: settings.website || "",
    address: [
      settings.address_line_1,
      settings.address_line_2,
      settings.address_line_3,
    ]
      .filter(Boolean)
      .join(", "),
    beneficiary: settings.company_name || "Handke Holding OÜ",
    iban: "",
    swift: "",
    bank: "",
  };
}