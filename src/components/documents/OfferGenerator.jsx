import { useMemo, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { createDocument, getNextDocumentNumber } from "../../api/documentsApi";
import { downloadOfferPdf } from "../../api/pdfApi";

const fallbackOfferIssuer = {
  companyName: "Handke Holding OÜ",
  email: "office@handkeholding.com",
  website: "www.handkeholding.com",
  phone: "+372 5617 1770",
  address: "Sakala tn 7-2, 10141 Tallinn, Estonia",
};

const offerStatuses = ["Roboczy", "Wysłany", "Zaakceptowany", "Odrzucony"];

const defaultModules = [
  {
    id: 1,
    namePl: "Dedykowany panel administracyjny",
    nameEn: "Dedicated admin panel",
    included: true,
  },
  {
    id: 2,
    namePl: "CRM i baza klientów",
    nameEn: "CRM and customer database",
    included: true,
  },
  {
    id: 3,
    namePl: "Zadania, przypomnienia i statusy",
    nameEn: "Tasks, reminders and statuses",
    included: true,
  },
  {
    id: 4,
    namePl: "Generator dokumentów PDF",
    nameEn: "PDF document generator",
    included: true,
  },
  {
    id: 5,
    namePl: "Generator ofert i faktur",
    nameEn: "Offer and invoice generator",
    included: true,
  },
  {
    id: 6,
    namePl: "Rozbudowane statystyki i raporty",
    nameEn: "Advanced statistics and reports",
    included: true,
  },
  {
    id: 7,
    namePl: "Powiadomienia e-mail",
    nameEn: "E-mail notifications",
    included: true,
  },
  {
    id: 8,
    namePl: "Powiadomienia SMS",
    nameEn: "SMS notifications",
    included: false,
  },
  {
    id: 9,
    namePl: "Integracje z zewnętrznymi usługami",
    nameEn: "External service integrations",
    included: false,
  },
  {
    id: 10,
    namePl: "AI asystent i automatyczne podsumowania",
    nameEn: "AI assistant and automatic summaries",
    included: false,
  },
];

const offerTexts = {
  pl: {
    documentName: "Oferta",
    generatorTitle: "Generator oferty",
    generatorDescription:
      "Przygotuj profesjonalną ofertę na system SaaS, automatyzacje, dokumenty, statystyki i powiadomienia.",
    languagePl: "Polski",
    languageEn: "English",

    formOfferData: "Dane oferty",
    offerNumber: "Numer oferty",
    offerDate: "Data oferty",
    validUntil: "Ważna do",
    price: "Cena",
    implementationTime: "Czas realizacji",
    projectName: "Nazwa projektu",
    status: "Status oferty",

    client: "Klient",
    contactPerson: "Osoba kontaktowa",
    clientCompany: "Firma klienta",

    projectDescription: "Opis projektu",
    clientNeed: "Problem / potrzeba klienta",
    proposedSolution: "Proponowane rozwiązanie",
    paymentTerms: "Warunki płatności",
    notes: "Uwagi",

    scopeModules: "Zakres modułów",
    addCustomModule: "Dodaj własny moduł...",
    add: "Dodaj",

    issuerLabel: "Wystawca oferty",
    previewClient: "Klient",
    previewDate: "Data",
    previewValidUntil: "Ważna do",
    previewImplementationTime: "Czas realizacji",

    introTitle: "1. Wprowadzenie",
    clientNeedTitle: "2. Potrzeba klienta",
    solutionTitle: "3. Proponowane rozwiązanie",
    scopeTitle: "4. Zakres wdrożenia",
    featuresTitle: "5. Możliwe funkcje systemu",
    automationTitle: "6. Statystyki, raporty i automatyzacje",
    priceTitle: "7. Wynagrodzenie i warunki",
    summaryTitle: "8. Podsumowanie",

    projectValue: "Wartość projektu",

    introParagraphs: [
      "Dziękujemy za zainteresowanie współpracą. Tworzymy nowoczesne systemy internetowe, aplikacje SaaS oraz automatyzacje biznesowe, które pomagają firmom uporządkować pracę, ograniczyć ręczne czynności i lepiej zarządzać procesami.",
      "Nasza oferta obejmuje zarówno gotowe rozwiązania produktowe, które można wdrożyć szybciej w określonych modelach biznesowych, jak i dedykowane systemy tworzone na zamówienie — projektowane od podstaw pod konkretne potrzeby, procesy i sposób działania klienta.",
      "Jeżeli gotowy system nie odpowiada w pełni wymaganiom firmy, przygotowujemy rozwiązanie indywidualne. W takim modelu aplikacja powstaje wokół realnej pracy klienta: jego klientów, dokumentów, płatności, komunikacji, raportów, zadań i codziennych obowiązków operacyjnych. Celem jest stworzenie narzędzia, które porządkuje firmę i realnie wspiera jej rozwój.",
    ],

    solutionExtra:
      "Celem systemu jest uporządkowanie pracy, ograniczenie ręcznych czynności, skrócenie czasu obsługi klientów oraz stworzenie narzędzia, które wspiera rozwój firmy zamiast go blokować.",

    featuresParagraphs: [
      "System może obejmować dedykowany panel administracyjny, bazę klientów, zadania, dokumenty, generatory PDF, płatności, raporty, statystyki, automatyczne logi, powiadomienia e-mail, powiadomienia SMS oraz integracje z zewnętrznymi usługami.",
      "Każdy moduł może zostać zaprojektowany indywidualnie, zgodnie z tym, jak firma faktycznie pracuje. Dzięki temu system nie jest zbiorem przypadkowych funkcji, ale narzędziem dopasowanym do konkretnego procesu biznesowego.",
    ],

    automationParagraphs: [
      "System może zawierać rozbudowany moduł statystyk, który pozwala analizować liczbę klientów, aktywność, zadania, projekty, dokumenty, płatności, wysłane oferty, wystawione faktury i skuteczność procesów.",
      "Możliwe jest również wdrożenie automatyzacji, takich jak tworzenie zadań, generowanie dokumentów, przypomnienia, automatyczne logi, powiadomienia e-mail i SMS oraz raporty okresowe.",
    ],

    summaryParagraphs: [
      "Dedykowany system SaaS może stać się centralnym narzędziem pracy firmy — miejscem, w którym znajdują się klienci, projekty, zadania, dokumenty, faktury, płatności, raporty, powiadomienia i automatyzacje.",
      "To może być zarówno wdrożenie gotowego produktu, jak i indywidualny system zaprojektowany pod konkretną firmę, jej procesy, jej klientów i jej ambicje rozwoju.",
    ],
  },

  en: {
    documentName: "Offer",
    generatorTitle: "Offer generator",
    generatorDescription:
      "Prepare a professional offer for a SaaS system, automations, documents, statistics and notifications.",
    languagePl: "Polski",
    languageEn: "English",

    formOfferData: "Offer details",
    offerNumber: "Offer number",
    offerDate: "Offer date",
    validUntil: "Valid until",
    price: "Price",
    implementationTime: "Implementation time",
    projectName: "Project name",
    status: "Offer status",

    client: "Client",
    contactPerson: "Contact person",
    clientCompany: "Client company",

    projectDescription: "Project description",
    clientNeed: "Client problem / need",
    proposedSolution: "Proposed solution",
    paymentTerms: "Payment terms",
    notes: "Notes",

    scopeModules: "Scope of modules",
    addCustomModule: "Add custom module...",
    add: "Add",

    issuerLabel: "Offer issued by",
    previewClient: "Client",
    previewDate: "Date",
    previewValidUntil: "Valid until",
    previewImplementationTime: "Implementation time",

    introTitle: "1. Introduction",
    clientNeedTitle: "2. Client needs",
    solutionTitle: "3. Proposed solution",
    scopeTitle: "4. Scope of implementation",
    featuresTitle: "5. Possible system features",
    automationTitle: "6. Statistics, reports and automations",
    priceTitle: "7. Price and terms",
    summaryTitle: "8. Summary",

    projectValue: "Project value",

    introParagraphs: [
      "Thank you for your interest in working with us. We create modern web systems, SaaS applications and business automations that help companies organize their work, reduce manual tasks and manage their processes more effectively.",
      "Our offer includes both ready-made product solutions that can be implemented faster for specific business models, as well as custom systems built on request — designed from the ground up around the client's individual needs, processes and way of working.",
      "If an existing product does not fully match the company's requirements, we prepare a dedicated solution. In this model, the application is designed around the client's real workflow: customers, documents, payments, communication, reports, tasks and daily operational responsibilities. The goal is to create a tool that brings structure to the business and supports its growth.",
    ],

    solutionExtra:
      "The goal of the system is to organize daily work, reduce manual tasks, shorten customer handling time and create a tool that supports business growth instead of limiting it.",

    featuresParagraphs: [
      "The system may include a dedicated admin panel, customer database, tasks, documents, PDF generators, payments, reports, statistics, automatic logs, e-mail notifications, SMS notifications and integrations with external services.",
      "Each module can be designed individually, according to how the company actually works. This means the system is not a random set of features, but a tool tailored to a specific business process.",
    ],

    automationParagraphs: [
      "The system may include an advanced statistics module that allows the company to analyze customers, activity, tasks, projects, documents, payments, sent offers, issued invoices and process effectiveness.",
      "It is also possible to implement automations such as task creation, document generation, reminders, automatic logs, e-mail and SMS notifications, and periodic reports.",
    ],

    summaryParagraphs: [
      "A dedicated SaaS system can become the central operating tool of the company — a place where customers, projects, tasks, documents, invoices, payments, reports, notifications and automations are connected in one workflow.",
      "This can be either the implementation of a ready-made product or a custom system designed around a specific company, its processes, its customers and its growth ambitions.",
    ],
  },
};

function formatOfferDate(dateValue) {
  if (!dateValue) {
    return "—";
  }

  const [year, month, day] = String(dateValue).split("-");

  if (!year || !month || !day) {
    return dateValue;
  }

  return `${day}.${month}.${year}`;
}

function getModuleName(module, language) {
  if (module.custom) {
    return module.name;
  }

  return language === "pl" ? module.namePl : module.nameEn;
}

function cleanAmount(value) {
  return String(value || "")
    .replace(/\bEUR\b/gi, "")
    .replace(/\bPLN\b/gi, "")
    .replace(/\bUSD\b/gi, "")
    .trim();
}

function detectCurrency(value) {
  const normalizedValue = String(value || "").toUpperCase();

  if (normalizedValue.includes("PLN")) {
    return "PLN";
  }

  if (normalizedValue.includes("USD")) {
    return "USD";
  }

  return "EUR";
}

function OfferField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="offer-field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function OfferSelect({ label, value, onChange, children }) {
  return (
    <label className="offer-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function OfferTextarea({ label, value, onChange, placeholder }) {
  return (
    <label className="offer-field offer-field-wide">
      <span>{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function OfferGenerator({ issuer, logoSrc, onSavedToRegister }) {
  const [language, setLanguage] = useState("pl");

  const [offer, setOffer] = useState({
    offerNumber: "OF/2026/001",
    offerDate: "2026-05-13",
    validUntil: "2026-05-27",
    status: "Roboczy",
    clientName: "",
    clientCompany: "",
    projectName: "Dedykowany system SaaS dla firmy",
    projectPrice: "od 7 500 EUR",
    implementationTime: "4–8 tygodni",
    paymentTerms:
      "40% zaliczki, 40% po akceptacji wersji roboczej, 20% po wdrożeniu",
    clientProblem:
      "Firma potrzebuje uporządkowanego systemu do obsługi klientów, dokumentów, zadań, płatności i codziennych procesów operacyjnych.",
    solution:
      "Proponujemy zaprojektowanie i wdrożenie dedykowanego systemu internetowego, który zostanie dopasowany do realnego sposobu pracy firmy, a nie do ograniczeń gotowego, masowego oprogramowania.",
    notes:
      "Zakres może zostać rozszerzony lub podzielony na etapy po analizie dokładnych potrzeb klienta.",
  });

  const activeIssuer = issuer || fallbackOfferIssuer;
  const [modules, setModules] = useState(defaultModules);
  const [customModule, setCustomModule] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSavingOffer, setIsSavingOffer] = useState(false);
  const [offerMessage, setOfferMessage] = useState("");
  const [offerError, setOfferError] = useState("");

  const t = offerTexts[language];

  const includedModules = useMemo(() => {
    return modules.filter((module) => module.included);
  }, [modules]);

  function updateOffer(field, value) {
    setOffer((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toggleModule(moduleId) {
    setModules((current) =>
      current.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              included: !module.included,
            }
          : module,
      ),
    );
  }

  function addModule() {
    if (!customModule.trim()) {
      return;
    }

    setModules((current) => [
      ...current,
      {
        id: Date.now(),
        name: customModule.trim(),
        custom: true,
        included: true,
      },
    ]);

    setCustomModule("");
  }

  function removeModule(moduleId) {
    setModules((current) => current.filter((module) => module.id !== moduleId));
  }

  function buildOfferPdfPayload(currentOffer = offer) {
    return {
      language,
      offer: currentOffer,
      issuer: activeIssuer,
      modules: includedModules.map((module) => ({
        id: module.id,
        name: getModuleName(module, language),
      })),
      texts: {
        documentName: t.documentName,
        issuerLabel: t.issuerLabel,
        previewClient: t.previewClient,
        previewDate: t.previewDate,
        previewValidUntil: t.previewValidUntil,
        previewImplementationTime: t.previewImplementationTime,
        introTitle: t.introTitle,
        clientNeedTitle: t.clientNeedTitle,
        solutionTitle: t.solutionTitle,
        scopeTitle: t.scopeTitle,
        featuresTitle: t.featuresTitle,
        automationTitle: t.automationTitle,
        priceTitle: t.priceTitle,
        summaryTitle: t.summaryTitle,
        projectValue: t.projectValue,
        introParagraphs: t.introParagraphs,
        solutionExtra: t.solutionExtra,
        featuresParagraphs: t.featuresParagraphs,
        automationParagraphs: t.automationParagraphs,
        summaryParagraphs: t.summaryParagraphs,
      },
    };
  }

  function buildRegisterContent() {
    const moduleList = includedModules
      .map((module, index) => {
        return `${index + 1}. ${getModuleName(module, language)}`;
      })
      .join("\n");

    return [
      `Język oferty: ${language === "pl" ? "Polski" : "English"}`,
      `Problem / potrzeba klienta:\n${offer.clientProblem || "—"}`,
      `Proponowane rozwiązanie:\n${offer.solution || "—"}`,
      `Zakres modułów:\n${moduleList || "Brak wybranych modułów"}`,
      `Czas realizacji: ${offer.implementationTime || "—"}`,
      `Warunki płatności:\n${offer.paymentTerms || "—"}`,
    ].join("\n\n");
  }

  async function handleDownloadOfferPdf() {
    try {
      setIsDownloading(true);
      setOfferError("");
      setOfferMessage("");

      await downloadOfferPdf(buildOfferPdfPayload());

      setOfferMessage("PDF oferty został wygenerowany.");
    } catch (error) {
      setOfferError(error.message || "Nie udało się wygenerować PDF oferty.");
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleSaveOfferToRegister() {
    try {
      setIsSavingOffer(true);
      setOfferError("");
      setOfferMessage("");

      const numberData = await getNextDocumentNumber("Oferta");
      const generatedNumber = numberData.document_number || offer.offerNumber;

     const offerWithNumber = {
  ...offer,
  offerNumber: generatedNumber,
};

const offerPdfPayload = buildOfferPdfPayload(offerWithNumber);

const data = await createDocument({
  document_type: "Oferta",
  document_number: generatedNumber,
  title: `Oferta ${generatedNumber} — ${
    offer.projectName || "Dedykowany system SaaS"
  }`,
  client_name: offer.clientCompany || offer.clientName || "",
  contact_person: offer.clientName || "",
  project_name: offer.projectName || "",
  status: offer.status || "Roboczy",
  amount: cleanAmount(offer.projectPrice),
  currency: detectCurrency(offer.projectPrice),
  issue_date: offer.offerDate || "",
  due_date: "",
  valid_until: offer.validUntil || "",
  content: buildRegisterContent(),
  notes: offer.notes || "",
  payload_json: JSON.stringify(offerPdfPayload),
});

      setOffer(offerWithNumber);
      setOfferMessage(`Oferta ${generatedNumber} została zapisana w rejestrze.`);

      if (onSavedToRegister) {
        onSavedToRegister(data.document);
      }
    } catch (error) {
      setOfferError(error.message || "Nie udało się zapisać oferty w rejestrze.");
    } finally {
      setIsSavingOffer(false);
    }
  }

  return (
    <div className="offer-generator">
      <div className="offer-generator-head">
        <div>
          <h3>{t.generatorTitle}</h3>
          <p>{t.generatorDescription}</p>

          {offerError && <p className="client-form-error">{offerError}</p>}
          {offerMessage && <p className="client-form-success">{offerMessage}</p>}
        </div>

        <div className="invoice-mode-pills">
          <button
            type="button"
            className="mode-pill"
            onClick={handleDownloadOfferPdf}
            disabled={isDownloading || isSavingOffer}
          >
            {isDownloading ? "Generowanie..." : "Pobierz PDF"}
          </button>

          <button
            type="button"
            className="mode-pill"
            onClick={handleSaveOfferToRegister}
            disabled={isDownloading || isSavingOffer}
          >
            {isSavingOffer ? "Zapisywanie..." : "Zapisz w rejestrze"}
          </button>

          <button
            type="button"
            className={language === "pl" ? "mode-pill active" : "mode-pill"}
            onClick={() => setLanguage("pl")}
            disabled={isDownloading || isSavingOffer}
          >
            {t.languagePl}
          </button>

          <button
            type="button"
            className={language === "en" ? "mode-pill active" : "mode-pill"}
            onClick={() => setLanguage("en")}
            disabled={isDownloading || isSavingOffer}
          >
            {t.languageEn}
          </button>
        </div>
      </div>

      <div className="offer-workspace">
        <div className="offer-form-panel">
          <section className="offer-form-block">
            <div className="offer-form-head">
              <h4>{t.formOfferData}</h4>
            </div>

            <div className="offer-form-grid two">
              <OfferField
                label={t.offerNumber}
                value={offer.offerNumber}
                onChange={(value) => updateOffer("offerNumber", value)}
              />

              <OfferSelect
                label={t.status}
                value={offer.status}
                onChange={(value) => updateOffer("status", value)}
              >
                {offerStatuses.map((status) => (
                  <option value={status} key={status}>
                    {status}
                  </option>
                ))}
              </OfferSelect>

              <OfferField
                label={t.offerDate}
                type="date"
                value={offer.offerDate}
                onChange={(value) => updateOffer("offerDate", value)}
              />

              <OfferField
                label={t.validUntil}
                type="date"
                value={offer.validUntil}
                onChange={(value) => updateOffer("validUntil", value)}
              />

              <OfferField
                label={t.price}
                value={offer.projectPrice}
                onChange={(value) => updateOffer("projectPrice", value)}
              />

              <OfferField
                label={t.implementationTime}
                value={offer.implementationTime}
                onChange={(value) => updateOffer("implementationTime", value)}
              />

              <OfferField
                label={t.projectName}
                value={offer.projectName}
                onChange={(value) => updateOffer("projectName", value)}
              />
            </div>
          </section>

          <section className="offer-form-block">
            <div className="offer-form-head">
              <h4>{t.client}</h4>
            </div>

            <div className="offer-form-grid two">
              <OfferField
                label={t.contactPerson}
                value={offer.clientName}
                placeholder="np. Jan Kowalski"
                onChange={(value) => updateOffer("clientName", value)}
              />

              <OfferField
                label={t.clientCompany}
                value={offer.clientCompany}
                placeholder="np. Kowalski Consulting"
                onChange={(value) => updateOffer("clientCompany", value)}
              />
            </div>
          </section>

          <section className="offer-form-block">
            <div className="offer-form-head">
              <h4>{t.projectDescription}</h4>
            </div>

            <div className="offer-form-grid one">
              <OfferTextarea
                label={t.clientNeed}
                value={offer.clientProblem}
                onChange={(value) => updateOffer("clientProblem", value)}
              />

              <OfferTextarea
                label={t.proposedSolution}
                value={offer.solution}
                onChange={(value) => updateOffer("solution", value)}
              />

              <OfferTextarea
                label={t.paymentTerms}
                value={offer.paymentTerms}
                onChange={(value) => updateOffer("paymentTerms", value)}
              />

              <OfferTextarea
                label={t.notes}
                value={offer.notes}
                onChange={(value) => updateOffer("notes", value)}
              />
            </div>
          </section>

          <section className="offer-form-block">
            <div className="offer-form-head">
              <h4>{t.scopeModules}</h4>
            </div>

            <div className="offer-modules-list">
              {modules.map((module) => (
                <div
                  className={
                    module.included
                      ? "offer-module-row is-selected"
                      : "offer-module-row"
                  }
                  key={module.id}
                >
                  <button
                    type="button"
                    className="offer-module-toggle"
                    onClick={() => toggleModule(module.id)}
                  >
                    {module.included && <Check size={13} />}
                  </button>

                  <span>{getModuleName(module, language)}</span>

                  <button
                    type="button"
                    className="offer-module-remove"
                    onClick={() => removeModule(module.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="offer-add-module">
              <input
                value={customModule}
                placeholder={t.addCustomModule}
                onChange={(event) => setCustomModule(event.target.value)}
              />

              <button type="button" onClick={addModule}>
                <Plus size={15} />
                {t.add}
              </button>
            </div>
          </section>
        </div>

        <div className="offer-preview-panel">
          <div className="offer-paper">
            <div className="offer-paper-head">
              <div className="offer-paper-title">
                <p>{t.documentName}</p>
                <h2>{offer.offerNumber || "—"}</h2>
                <span>{offer.projectName || "Dedykowany system SaaS"}</span>
              </div>

             <img src={logoSrc} alt="Logo" />
            </div>

            <div className="offer-meta-grid">
  <div className="offer-meta-issuer">
    <span>{t.issuerLabel}</span>
    <strong>{activeIssuer.companyName}</strong>

    {activeIssuer.addressLine1 && <p>{activeIssuer.addressLine1}</p>}
    {activeIssuer.addressLine2 && <p>{activeIssuer.addressLine2}</p>}
    {activeIssuer.country && <p>{activeIssuer.country}</p>}

    {activeIssuer.email && <p>{activeIssuer.email}</p>}
    {activeIssuer.website && <p>{activeIssuer.website}</p>}
    {activeIssuer.phone && <p>{activeIssuer.phone}</p>}
  </div>

  <div className="offer-meta-client">
    <span>{t.previewClient}</span>
    <strong>{offer.clientCompany || "—"}</strong>
    <p>{offer.clientName || "—"}</p>
  </div>

  <div className="offer-date-row">
    <div>
      <span>{t.previewDate}</span>
      <strong>{formatOfferDate(offer.offerDate)}</strong>
    </div>

    <div>
      <span>{t.previewValidUntil}</span>
      <strong>{formatOfferDate(offer.validUntil)}</strong>
    </div>

    <div>
      <span>{t.previewImplementationTime}</span>
      <strong>{offer.implementationTime || "—"}</strong>
    </div>
  </div>
</div>

            <section className="offer-preview-section">
              <h3>{t.introTitle}</h3>

              {t.introParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>

            <section className="offer-preview-section">
              <h3>{t.clientNeedTitle}</h3>
              <p>{offer.clientProblem || "—"}</p>
            </section>

            <section className="offer-preview-section">
              <h3>{t.solutionTitle}</h3>
              <p>{offer.solution || "—"}</p>
              <p>{t.solutionExtra}</p>
            </section>

            <section className="offer-preview-section">
              <h3>{t.scopeTitle}</h3>

              <div className="offer-preview-modules">
                {includedModules.map((module) => (
                  <div className="offer-preview-module" key={module.id}>
                    <span />
                    <p>{getModuleName(module, language)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="offer-preview-section">
              <h3>{t.featuresTitle}</h3>

              {t.featuresParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>

            <section className="offer-preview-section">
              <h3>{t.automationTitle}</h3>

              {t.automationParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>

            <section className="offer-preview-section">
              <h3>{t.priceTitle}</h3>

              <div className="offer-price-box">
                <div>
                  <span>{t.projectValue}</span>
                  <strong>{offer.projectPrice || "—"}</strong>
                </div>

                <div>
                  <span>{t.previewImplementationTime}</span>
                  <strong>{offer.implementationTime || "—"}</strong>
                </div>
              </div>

              <p>{offer.paymentTerms || "—"}</p>
            </section>

            <section className="offer-preview-section">
              <h3>{t.summaryTitle}</h3>

              {t.summaryParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}

              {offer.notes && <p>{offer.notes}</p>}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OfferGenerator;