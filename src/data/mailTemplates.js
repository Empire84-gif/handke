export const mailTemplates = [
  {
    id: "needs-details",
    name: "Prośba o szczegółowy opis potrzeb",
    category: "Sprzedaż",
    language: "PL",
    subject: "Prośba o doprecyzowanie zakresu projektu",
    description:
      "Do użycia, gdy klient napisał ogólnie i trzeba zebrać więcej informacji przed wyceną.",
    body:
      "Dzień dobry,\n\n" +
      "dziękujemy za kontakt i zainteresowanie współpracą.\n\n" +
      "Abyśmy mogli rzetelnie ocenić zakres projektu oraz przygotować konkretną propozycję, prosimy o krótkie opisanie Państwa potrzeb:\n\n" +
      "• jaki problem ma rozwiązać system,\n" +
      "• jakie procesy mają zostać zautomatyzowane,\n" +
      "• kto będzie korzystał z systemu,\n" +
      "• jakie funkcje są najważniejsze na start,\n" +
      "• czy system ma być połączony z innymi narzędziami,\n" +
      "• czy posiadają Państwo już gotową specyfikację, makiety lub przykłady podobnych rozwiązań.\n\n" +
      "Po otrzymaniu tych informacji będziemy mogli określić, czy projekt pasuje do naszego zakresu usług oraz zaproponować kolejne kroki.\n\n" +
      "Pozdrawiam,\n" +
      "Karl Handke\n" +
      "Handke Holding OÜ",
  },
  {
    id: "decline-out-of-scope",
    name: "Odmowa — poza zakresem usług",
    category: "Odmowa",
    language: "PL",
    subject: "Odpowiedź dotycząca zapytania",
    description:
      "Do użycia, gdy zapytanie nie pasuje do zakresu usług firmy.",
    body:
      "Dzień dobry,\n\n" +
      "dziękujemy za przesłaną wiadomość i zainteresowanie współpracą.\n\n" +
      "Po wstępnej analizie zapytania musimy poinformować, że opisany zakres nie mieści się obecnie w obszarze usług, którymi zajmuje się nasza firma.\n\n" +
      "Specjalizujemy się przede wszystkim w projektowaniu i wdrażaniu dedykowanych systemów internetowych, automatyzacji procesów biznesowych, paneli CRM, generatorów dokumentów, rozwiązań SaaS oraz narzędzi wspierających pracę firm.\n\n" +
      "Z tego względu nie będziemy mogli podjąć się realizacji tego zlecenia.\n\n" +
      "Dziękujemy za kontakt i życzymy powodzenia w dalszej realizacji projektu.\n\n" +
      "Pozdrawiam,\n" +
      "Karl Handke\n" +
      "Handke Holding OÜ",
  },
  {
    id: "accept-discussion",
    name: "Projekt pasuje — propozycja rozmowy",
    category: "Sprzedaż",
    language: "PL",
    subject: "Możliwość realizacji projektu",
    description:
      "Do użycia, gdy zapytanie wygląda dobrze i chcesz umówić rozmowę.",
    body:
      "Dzień dobry,\n\n" +
      "dziękujemy za przesłane informacje.\n\n" +
      "Po wstępnej analizie zapytania widzimy, że projekt wpisuje się w zakres usług, którymi zajmuje się nasza firma. Chętnie omówimy szczegóły i sprawdzimy, w jaki sposób możemy przygotować rozwiązanie dopasowane do Państwa procesu.\n\n" +
      "Proponujemy krótką rozmowę, podczas której możemy ustalić:\n\n" +
      "• główny cel systemu,\n" +
      "• najważniejsze funkcje,\n" +
      "• zakres automatyzacji,\n" +
      "• przewidywany etap wdrożenia,\n" +
      "• orientacyjny budżet i czas realizacji.\n\n" +
      "Proszę o przesłanie kilku dogodnych terminów rozmowy albo informację, kiedy najlepiej się z Państwem skontaktować.\n\n" +
      "Pozdrawiam,\n" +
      "Karl Handke\n" +
      "Handke Holding OÜ",
  },
  {
    id: "send-offer",
    name: "Wysłanie oferty",
    category: "Oferta",
    language: "PL",
    subject: "Oferta wdrożenia systemu",
    description:
      "Do użycia przy wysyłaniu oferty PDF do klienta.",
    body:
      "Dzień dobry,\n\n" +
      "w załączniku przesyłam ofertę dotyczącą wdrożenia systemu.\n\n" +
      "Dokument zawiera proponowany zakres prac, możliwe funkcje, orientacyjny czas realizacji oraz warunki współpracy.\n\n" +
      "W razie pytań pozostaję do dyspozycji. Chętnie omówię ofertę i doprecyzuję zakres wdrożenia.\n\n" +
      "Pozdrawiam,\n" +
      "Karl Handke\n" +
      "Handke Holding OÜ",
  },
  {
    id: "follow-up",
    name: "Follow-up po braku odpowiedzi",
    category: "Follow-up",
    language: "PL",
    subject: "Przypomnienie w sprawie projektu",
    description:
      "Do użycia kilka dni po wysłaniu oferty albo wiadomości bez odpowiedzi.",
    body:
      "Dzień dobry,\n\n" +
      "chciałem krótko wrócić do naszej wcześniejszej korespondencji dotyczącej projektu.\n\n" +
      "Czy są Państwo nadal zainteresowani omówieniem wdrożenia? Jeśli tak, chętnie odpowiem na pytania, doprecyzuję zakres lub przygotuję kolejne kroki.\n\n" +
      "Pozdrawiam,\n" +
      "Karl Handke\n" +
      "Handke Holding OÜ",
  },
  {
    id: "technical-summary",
    name: "Podsumowanie ustaleń po rozmowie",
    category: "Projekt",
    language: "PL",
    subject: "Podsumowanie ustaleń dotyczących projektu",
    description:
      "Do użycia po rozmowie z klientem, żeby potwierdzić zakres.",
    body:
      "Dzień dobry,\n\n" +
      "dziękuję za rozmowę. Poniżej przesyłam krótkie podsumowanie najważniejszych ustaleń dotyczących projektu:\n\n" +
      "• cel systemu: \n" +
      "• główne moduły: \n" +
      "• procesy do automatyzacji: \n" +
      "• dokumenty / pliki do generowania: \n" +
      "• integracje zewnętrzne: \n" +
      "• dodatkowe uwagi: \n\n" +
      "Na podstawie tych informacji możemy przygotować doprecyzowaną ofertę lub specyfikację wdrożenia.\n\n" +
      "Pozdrawiam,\n" +
      "Karl Handke\n" +
      "Handke Holding OÜ",
  },
];