export const initialEmails = [
  {
    id: 1,
    direction: "inbox",
    fromName: "Anna Kowal",
    fromEmail: "kontakt@kowalmed.pl",
    to: "office@hansacareers.ee",
    subject: "Zapytanie o system dla kliniki",
    client: "Kowal Med Clinic",
    clientStatus: "Powiązany",
    status: "Nieprzeczytany",
    priority: "Wysoki",
    folder: "Odebrane",
    date: "2026-05-12 09:42",
    preview:
      "Dzień dobry, interesuje nas system do obsługi pacjentów, dokumentów oraz przypomnień mailowych.",
    body:
      "Dzień dobry,\n\ninteresuje nas system do obsługi pacjentów, dokumentów oraz przypomnień mailowych. Chcielibyśmy, aby system pozwalał zarządzać bazą klientów, wizytami, dokumentami PDF oraz automatycznymi powiadomieniami.\n\nCzy możemy umówić krótką rozmowę i omówić zakres wdrożenia?\n\nPozdrawiam,\nAnna Kowal",
    attachments: [
      {
        id: 1,
        name: "opis-procesu.pdf",
        size: "428 KB",
        type: "PDF",
      },
    ],
    notes: "Dobry lead. Wysłać krótką odpowiedź i zaproponować termin rozmowy.",
    tags: ["Nowy lead", "Klinika", "Automatyzacje"],
  },
  {
    id: 2,
    direction: "inbox",
    fromName: "Piotr Zieliński",
    fromEmail: "piotr@zielinski.co",
    to: "office@hansacareers.ee",
    subject: "Re: Oferta CRM",
    client: "Zieliński Consulting",
    clientStatus: "Powiązany",
    status: "Do odpowiedzi",
    priority: "Normalny",
    folder: "Odebrane",
    date: "2026-05-11 16:18",
    preview:
      "Dziękuję za ofertę. Mam kilka pytań dotyczących integracji z fakturami oraz raportami.",
    body:
      "Dzień dobry,\n\ndziękuję za przesłaną ofertę. Mam kilka pytań dotyczących integracji z fakturami, raportami oraz eksportem danych.\n\nCzy możemy rozszerzyć zakres o dodatkowy panel statystyk?\n\nPozdrawiam,\nPiotr Zieliński",
    attachments: [],
    notes: "Przygotować rozszerzenie oferty o moduł raportów.",
    tags: ["Oferta", "Do wyceny"],
  },
  {
    id: 3,
    direction: "sent",
    fromName: "SDE",
    fromEmail: "office@hansacareers.ee",
    to: "marta@lunabeauty.pl",
    subject: "Oferta wdrożenia prostego CRM dla salonu",
    client: "Luna Beauty Studio",
    clientStatus: "Powiązany",
    status: "Wysłany",
    priority: "Normalny",
    folder: "Wysłane",
    date: "2026-05-10 13:05",
    preview:
      "W załączniku przesyłam propozycję wdrożenia prostego systemu CRM dla salonu beauty.",
    body:
      "Dzień dobry,\n\nw załączniku przesyłam propozycję wdrożenia prostego systemu CRM dla salonu beauty. System może obejmować bazę klientów, historię kontaktu, zadania, płatności oraz automatyzacje.\n\nW razie pytań pozostaję do dyspozycji.\n\nPozdrawiam,\nKarl Handke\nSDE",
    attachments: [
      {
        id: 1,
        name: "oferta-luna-beauty.pdf",
        size: "312 KB",
        type: "PDF",
      },
    ],
    notes: "Oferta wysłana. Czekać na odpowiedź.",
    tags: ["Wysłane", "Oferta"],
  },
  {
    id: 4,
    direction: "inbox",
    fromName: "Nieznany kontakt",
    fromEmail: "kontakt@nowafirma.pl",
    to: "office@hansacareers.ee",
    subject: "Automatyzacja procesu ofertowania",
    client: "",
    clientStatus: "Nieprzypisany",
    status: "Do przypisania",
    priority: "Normalny",
    folder: "Odebrane",
    date: "2026-05-09 10:31",
    preview:
      "Szukamy firmy, która przygotuje dla nas generator ofert oraz prosty panel do obsługi klientów.",
    body:
      "Dzień dobry,\n\nszukamy firmy, która przygotuje dla nas generator ofert oraz prosty panel do obsługi klientów. Zależy nam na automatyzacji pracy handlowca i ograniczeniu ręcznego przygotowywania dokumentów.\n\nProszę o informację, czy realizują Państwo takie wdrożenia.\n\nPozdrawiam",
    attachments: [],
    notes: "Nowy kontakt. Trzeba przypisać albo utworzyć klienta.",
    tags: ["Nowy", "Generator ofert"],
  },
];

export const emailTemplates = [
  {
    id: "reply-lead",
    name: "Odpowiedź na zapytanie",
    subject: "Re: Zapytanie o system",
    body:
      "Dzień dobry,\n\ndziękuję za wiadomość. Tak, możemy przygotować dedykowany system dopasowany do Państwa procesu.\n\nProponuję krótką rozmowę, podczas której ustalimy zakres, najważniejsze funkcje oraz orientacyjny czas wdrożenia.\n\nPozdrawiam,\nKarl Handke\nSDE",
  },
  {
    id: "send-offer",
    name: "Wysłanie oferty",
    subject: "Oferta wdrożenia systemu",
    body:
      "Dzień dobry,\n\nw załączniku przesyłam ofertę wdrożenia systemu. Dokument zawiera zakres funkcji, orientacyjny czas realizacji oraz warunki współpracy.\n\nW razie pytań pozostaję do dyspozycji.\n\nPozdrawiam,\nKarl Handke\nSDE",
  },
  {
    id: "payment-reminder",
    name: "Przypomnienie o płatności",
    subject: "Przypomnienie o płatności",
    body:
      "Dzień dobry,\n\nprzesyłam krótkie przypomnienie dotyczące płatności za realizowany projekt.\n\nW razie potrzeby mogę ponownie przesłać dokument lub dane do przelewu.\n\nPozdrawiam,\nKarl Handke\nSDE",
  },
];