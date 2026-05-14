import base64
from html import escape
from io import BytesIO
from pathlib import Path

from flask import Blueprint, jsonify, request, send_file, session
from playwright.sync_api import sync_playwright

from utils.db import get_connection

pdf_bp = Blueprint("pdf", __name__, url_prefix="/api/pdf")


def require_auth():
    return session.get("user_id") is not None


def safe_text(value):
    if value is None:
        return ""

    return escape(str(value))


def format_date(date_value):
    if not date_value:
        return "—"

    parts = str(date_value).split("-")

    if len(parts) != 3:
        return safe_text(date_value)

    year, month, day = parts
    return f"{day}.{month}.{year}"


def format_money(value, currency):
    try:
        number = float(value or 0)
    except (TypeError, ValueError):
        number = 0

    formatted = f"{number:,.2f}".replace(",", " ")
    return f"{formatted} {safe_text(currency)}"


def calculate_item(item, vat_mode):
    qty = float(item.get("qty") or 0)
    unit_price = float(item.get("unitPrice") or 0)

    vat_rate = float(item.get("vatRate") or 0) if vat_mode == "standard" else 0

    net = qty * unit_price
    vat = net * (vat_rate / 100)
    gross = net + vat

    return {
        "qty": qty,
        "unit_price": unit_price,
        "vat_rate": vat_rate,
        "net": net,
        "vat": vat,
        "gross": gross,
    }


def get_mime_type(file_path):
    extension = file_path.suffix.lower()

    mime_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
    }

    return mime_types.get(extension, "image/png")


def get_settings_logo_path():
    connection = get_connection()

    settings = connection.execute("""
        SELECT logo_path
        FROM settings
        WHERE id = 1
        LIMIT 1
    """).fetchone()

    connection.close()

    if not settings:
        return ""

    return settings["logo_path"] or ""


def get_uploaded_logo_file_path():
    logo_path = get_settings_logo_path()

    if not logo_path:
        return None

    filename = Path(str(logo_path)).name

    if not filename:
        return None

    backend_root = Path(__file__).resolve().parent.parent
    uploaded_logo_path = backend_root / "uploads" / "logo" / filename

    if uploaded_logo_path.exists():
        return uploaded_logo_path

    return None


def get_fallback_logo_file_path():
    project_root = Path(__file__).resolve().parents[2]
    fallback_logo_path = project_root / "src" / "assets" / "logo.png"

    if fallback_logo_path.exists():
        return fallback_logo_path

    return None


def get_logo_data_uri():
    logo_file_path = get_uploaded_logo_file_path()

    if not logo_file_path:
        logo_file_path = get_fallback_logo_file_path()

    if not logo_file_path:
        return ""

    mime_type = get_mime_type(logo_file_path)
    encoded_logo = base64.b64encode(logo_file_path.read_bytes()).decode("utf-8")

    return f"data:{mime_type};base64,{encoded_logo}"


def get_labels(language):
    labels = {
        "pl": {
            "invoice": "Faktura",
            "customer": "Nabywca",
            "seller": "Sprzedawca",
            "invoice_number": "Numer faktury",
            "reference_number": "Numer referencyjny",
            "date": "Data wystawienia",
            "payment_date": "Termin płatności",
            "item_no": "Lp.",
            "description": "Opis usługi",
            "qty": "Ilość",
            "unit_price": "Cena netto",
            "net": "Netto",
            "vat_rate": "VAT",
            "vat_amount": "Kwota VAT",
            "total": "Razem",
            "net_amount": "Kwota netto",
            "gross_amount": "Kwota brutto",
            "amount_words": "Kwota słownie",
            "issued_by": "Fakturę wystawił",
            "bank_details": "Dane bankowe",
            "contact": "Kontakt",
            "reverse_charge": "Odwrotne obciążenie VAT – art. 196 Dyrektywy 2006/112/WE",
            "no_vat": "VAT nie został naliczony",
            "beneficiary": "Beneficiary name",
            "registration_number": "Registration number",
        },
        "en": {
            "invoice": "Invoice",
            "customer": "Customer",
            "seller": "Seller",
            "invoice_number": "Invoice number",
            "reference_number": "Reference number",
            "date": "Date",
            "payment_date": "Payment date",
            "item_no": "No.",
            "description": "Service Description",
            "qty": "Qty",
            "unit_price": "Unit Price",
            "net": "Net",
            "vat_rate": "VAT Rate",
            "vat_amount": "VAT Amount",
            "total": "Total",
            "net_amount": "Net amount",
            "gross_amount": "Gross amount",
            "amount_words": "Amount in words",
            "issued_by": "Invoice issued by",
            "bank_details": "Bank details",
            "contact": "Contact",
            "reverse_charge": "VAT reverse charge – Article 196 of Directive 2006/112/EC",
            "no_vat": "VAT not charged",
            "beneficiary": "Beneficiary name",
            "registration_number": "Registration number",
        },
    }

    return labels.get(language, labels["en"])


def build_invoice_html(invoice, items, issuer):
    language = invoice.get("language") or "en"
    vat_mode = invoice.get("vatMode") or "reverse-charge"
    currency = invoice.get("currency") or "EUR"
    labels = get_labels(language)
    logo_data_uri = get_logo_data_uri()

    calculated_items = []
    totals = {
        "net": 0,
        "vat": 0,
        "gross": 0,
    }

    for index, item in enumerate(items, start=1):
        calculated = calculate_item(item, vat_mode)

        totals["net"] += calculated["net"]
        totals["vat"] += calculated["vat"]
        totals["gross"] += calculated["gross"]

        calculated_items.append({
            "index": index,
            "description": item.get("description") or "—",
            "qty": item.get("qty") or 0,
            "unit_price": calculated["unit_price"],
            "vat_rate": calculated["vat_rate"],
            "net": calculated["net"],
            "vat": calculated["vat"],
            "gross": calculated["gross"],
        })

    rows_html = ""

    for item in calculated_items:
        rows_html += f"""
          <tr>
            <td>{item["index"]}</td>
            <td class="description">{safe_text(item["description"])}</td>
            <td>{safe_text(item["qty"])}</td>
            <td>{format_money(item["unit_price"], currency)}</td>
            <td>{format_money(item["net"], currency)}</td>
            <td>{item["vat_rate"]:.0f}%</td>
            <td>{format_money(item["vat"], currency)}</td>
            <td class="row-total">{format_money(item["gross"], currency)}</td>
          </tr>
        """

    note_html = ""

    if vat_mode == "reverse-charge":
        note_html += f"<p>{labels['reverse_charge']}</p>"

    if vat_mode == "no-vat":
        note_html += f"<p>{labels['no_vat']}</p>"

    if invoice.get("note"):
        note_html += f"<p>{safe_text(invoice.get('note'))}</p>"

    logo_html = ""
    if logo_data_uri:
        logo_html = f'<img class="invoice-logo" src="{logo_data_uri}" alt="Logo" />'

    return f"""
<!doctype html>
<html lang="{safe_text(language)}">
<head>
  <meta charset="utf-8" />
  <style>
    @page {{
      size: A4;
      margin: 0;
    }}

    * {{
      box-sizing: border-box;
    }}

    body {{
      margin: 0;
      background: #ffffff;
      color: #111111;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10px;
      line-height: 1.35;
    }}

    .paper {{
      width: 210mm;
      min-height: 297mm;
      padding: 18mm 18mm 14mm;
      background: #ffffff;
    }}

    .top {{
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding-bottom: 23px;
      border-bottom: 1.5px solid #111111;
    }}

    .invoice-label {{
      margin: 0 0 4px;
      font-size: 10px;
      color: #686868;
      font-weight: 600;
    }}

    .invoice-title {{
      margin: 0;
      font-size: 24px;
      line-height: 1;
      letter-spacing: -0.06em;
      font-weight: 800;
      color: #111111;
    }}

    .invoice-logo {{
      width: 112px;
      height: auto;
      display: block;
      margin-top: -2px;
    }}

    .intro {{
      display: grid;
      grid-template-columns: 1fr 210px;
      gap: 130px;
      padding: 28px 0 30px;
      border-bottom: 1.5px solid #111111;
    }}

    .meta-grid {{
      justify-self: end;
      width: 240px;
    }}

    .customer-block span,
    .meta-row span {{
      display: block;
      margin-bottom: 4px;
      color: #6f6f6f;
      font-size: 8.5px;
      font-weight: 700;
    }}

    .customer-block strong {{
      display: block;
      font-size: 11px;
      margin-bottom: 5px;
    }}

    .customer-block p {{
      margin: 4px 0;
      color: #777777;
    }}

    .meta-grid {{
       display: grid;
  grid-template-columns: 1fr;
  gap: 9px;
  justify-self: end;
  width: 210px;
  transform: translateX(35px);
    }}

    .meta-row strong {{
      display: block;
      font-size: 11px;
      font-weight: 800;
    }}

    table {{
      width: 100%;
      border-collapse: collapse;
      margin-top: 13px;
      border-bottom: 1.5px solid #111111;
    }}

    thead th {{
      padding: 0 0 10px;
      border-bottom: 1.5px solid #111111;
      font-size: 7.6px;
      font-weight: 800;
      color: #111111;
      text-align: left;
    }}

    tbody td {{
      padding: 16px 0 14px;
      font-size: 9px;
      color: #111111;
      vertical-align: top;
    }}

    th:nth-child(1),
    td:nth-child(1) {{
      width: 36px;
    }}

    th:nth-child(2),
    td:nth-child(2) {{
      width: 300px;
      padding-right: 18px;
    }}

    th:nth-child(3),
    td:nth-child(3) {{
      width: 48px;
    }}

    th:nth-child(4),
    td:nth-child(4),
    th:nth-child(5),
    td:nth-child(5),
    th:nth-child(6),
    td:nth-child(6),
    th:nth-child(7),
    td:nth-child(7),
    th:nth-child(8),
    td:nth-child(8) {{
      text-align: right;
      padding-left: 12px;
    }}

    td.description {{
      font-weight: 400;
    }}

    .row-total {{
      font-weight: 800;
    }}

    .summary-area {{
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 40px;
      padding-top: 22px;
      min-height: 148px;
    }}

    .summary-box {{
      grid-column: 2;
    }}

    .summary-row {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 30px;
      padding: 4px 0;
      font-size: 11px;
    }}

    .summary-row strong {{
      font-size: 11px;
      font-weight: 800;
    }}

    .summary-row.gross {{
      margin-top: 4px;
      padding-top: 8px;
      border-top: 1.5px solid #111111;
    }}

    .amount-words {{
      margin-top: 8px;
      color: #777777;
      font-size: 10px;
    }}

    .tax-note {{
      margin-top: 12px;
      color: #777777;
      font-size: 10px;
    }}

    .tax-note p {{
      margin: 5px 0;
    }}

    .footer {{
  display: grid;
  grid-template-columns: 1fr 1fr 1.12fr;
  gap: 36px;
  margin-top: 320px;
  padding-top: 18px;
  border-top: 1.5px solid #111111;
}}

    .footer-block strong {{
      display: block;
      margin-bottom: 7px;
      font-size: 11px;
      font-weight: 800;
    }}

    .footer-block p {{
      margin: 3px 0;
      color: #666666;
      font-size: 9px;
    }}
  </style>
</head>
<body>
  <main class="paper">
    <section class="top">
      <div>
        <p class="invoice-label">{labels["invoice"]}</p>
        <h1 class="invoice-title">{safe_text(invoice.get("invoiceNumber") or "—")}</h1>
      </div>

      {logo_html}
    </section>

    <section class="intro">
      <div class="customer-block">
        <span>{labels["customer"]}</span>
        <strong>{safe_text(invoice.get("customerName") or "—")}</strong>
        <p>{safe_text(invoice.get("customerAddress") or "—")}</p>
        {"<p>" + safe_text(invoice.get("customerVat")) + "</p>" if invoice.get("customerVat") else ""}
      </div>

      <div class="meta-grid">
        <div class="meta-row">
          <span>{labels["invoice_number"]}</span>
          <strong>{safe_text(invoice.get("invoiceNumber") or "—")}</strong>
        </div>

        <div class="meta-row">
          <span>{labels["reference_number"]}</span>
          <strong>{safe_text(invoice.get("referenceNumber") or "—")}</strong>
        </div>

        <div class="meta-row">
          <span>{labels["date"]}</span>
          <strong>{format_date(invoice.get("issueDate"))}</strong>
        </div>

        <div class="meta-row">
          <span>{labels["payment_date"]}</span>
          <strong>{format_date(invoice.get("paymentDate"))}</strong>
        </div>
      </div>
    </section>

    <table>
      <thead>
        <tr>
          <th>{labels["item_no"]}</th>
          <th>{labels["description"]}</th>
          <th>{labels["qty"]}</th>
          <th>{labels["unit_price"]}</th>
          <th>{labels["net"]}</th>
          <th>{labels["vat_rate"]}</th>
          <th>{labels["vat_amount"]}</th>
          <th>{labels["total"]}</th>
        </tr>
      </thead>

      <tbody>
        {rows_html}
      </tbody>
    </table>

    <section class="summary-area">
      <div class="summary-box">
        <div class="summary-row">
          <span>{labels["net_amount"]}:</span>
          <strong>{format_money(totals["net"], currency)}</strong>
        </div>

        <div class="summary-row">
          <span>{labels["vat_amount"]}:</span>
          <strong>{format_money(totals["vat"], currency)}</strong>
        </div>

        <div class="summary-row gross">
          <span>{labels["gross_amount"]}:</span>
          <strong>{format_money(totals["gross"], currency)}</strong>
        </div>

        <p class="amount-words">
          {labels["amount_words"]}: {safe_text(invoice.get("amountInWords") or "—")}
        </p>

        <div class="tax-note">
          {note_html}
        </div>
      </div>
    </section>

    <section class="footer">
      <div class="footer-block">
        <strong>{labels["seller"]}</strong>
        <p>{safe_text(issuer.get("companyName") or "Handke Holding OÜ")}</p>
        <p>{safe_text(issuer.get("addressLine1") or "")}</p>
        <p>{safe_text(issuer.get("addressLine2") or "")}</p>
        <p>{safe_text(issuer.get("country") or "")}</p>
        <p>{labels["registration_number"]}: {safe_text(issuer.get("registrationNumber") or "")}</p>
        <p>VAT EU: {safe_text(issuer.get("vatEu") or "")}</p>
      </div>

      <div class="footer-block">
        <strong>{labels["contact"]}</strong>
        <p>Telephone: {safe_text(issuer.get("phone") or "")}</p>
        <p>E-mail: {safe_text(issuer.get("email") or "")}</p>
        <p>{safe_text(issuer.get("website") or "")}</p>
        <p>{labels["issued_by"]}: {safe_text(invoice.get("issuedBy") or "")}</p>
      </div>

      <div class="footer-block">
        <strong>{labels["bank_details"]}</strong>
        <p>{labels["beneficiary"]}: {safe_text(issuer.get("beneficiary") or "")}</p>
        <p>IBAN: {safe_text(issuer.get("iban") or "")}</p>
        <p>Swift/BIC: {safe_text(issuer.get("swift") or "")}</p>
        <p>{safe_text(issuer.get("bank") or "")}</p>
      </div>
    </section>
  </main>
</body>
</html>
    """


@pdf_bp.post("/invoice")
def generate_invoice_pdf():
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    data = request.get_json(silent=True) or {}

    invoice = data.get("invoice") or {}
    items = data.get("items") or []
    issuer = data.get("issuer") or {}

    html = build_invoice_html(invoice, items, issuer)

    invoice_number = str(invoice.get("invoiceNumber") or "invoice")
    filename = f"invoice-{invoice_number.replace('/', '-').replace(' ', '-')}.pdf"

    pdf_buffer = BytesIO()

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(
            viewport={
                "width": 1240,
                "height": 1754,
            }
        )

        page.set_content(html, wait_until="networkidle")

        pdf_bytes = page.pdf(
            format="A4",
            print_background=True,
            margin={
                "top": "0mm",
                "right": "0mm",
                "bottom": "0mm",
                "left": "0mm",
            },
        )

        browser.close()

    pdf_buffer.write(pdf_bytes)
    pdf_buffer.seek(0)

    return send_file(
        pdf_buffer,
        as_attachment=True,
        download_name=filename,
        mimetype="application/pdf",
    )


def build_offer_html(language, offer, modules, issuer, texts):
    logo_data_uri = get_logo_data_uri()

    logo_html = ""
    if logo_data_uri:
        logo_html = f'<img class="offer-logo" src="{logo_data_uri}" alt="Logo" />'

    issuer_address_lines = [
        issuer.get("addressLine1") or "",
        issuer.get("addressLine2") or "",
        issuer.get("country") or "",
    ]

    if not any(issuer_address_lines) and issuer.get("address"):
        issuer_address_lines = [issuer.get("address") or ""]

    issuer_address_html = "".join(
        f"<p>{safe_text(line)}</p>"
        for line in issuer_address_lines
        if line
    )

    modules_html = ""

    for module in modules:
        modules_html += f"""
          <div class="module-row">
            <span></span>
            <p>{safe_text(module.get("name") or "")}</p>
          </div>
        """

    intro_html = "".join(
        f"<p>{safe_text(paragraph)}</p>"
        for paragraph in texts.get("introParagraphs", [])
    )

    features_html = "".join(
        f"<p>{safe_text(paragraph)}</p>"
        for paragraph in texts.get("featuresParagraphs", [])
    )

    automation_html = "".join(
        f"<p>{safe_text(paragraph)}</p>"
        for paragraph in texts.get("automationParagraphs", [])
    )

    summary_html = "".join(
        f"<p>{safe_text(paragraph)}</p>"
        for paragraph in texts.get("summaryParagraphs", [])
    )

    if offer.get("notes"):
        summary_html += f"<p>{safe_text(offer.get('notes'))}</p>"

    return f"""
<!doctype html>
<html lang="{safe_text(language)}">
<head>
  <meta charset="utf-8" />

  <style>
    @import url("https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap");

    @page {{
      size: A4;
      margin: 0;
    }}

    * {{
      box-sizing: border-box;
    }}

    body {{
      margin: 0;
      background: #ffffff;
      color: #111111;
      font-family: "Outfit", Arial, Helvetica, sans-serif;
      font-size: 10px;
      line-height: 1.48;
    }}

    .paper {{
      width: 210mm;
      min-height: 297mm;
      padding: 17mm 18mm 15mm;
      background: #ffffff;
    }}

    .top {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 23px;
      border-bottom: 1.5px solid #111111;
    }}

    .top-left {{
      min-width: 0;
      max-width: 132mm;
    }}

    .document-label {{
      margin: 0 0 5px;
      font-size: 10px;
      color: #686868;
      font-weight: 700;
    }}

    .offer-title {{
      margin: 0;
      font-size: 24px;
      line-height: 1;
      letter-spacing: -0.06em;
      font-weight: 800;
    }}

    .project-name {{
      margin-top: 8px;
      color: #666666;
      font-size: 11px;
      font-weight: 600;
    }}

    .offer-logo {{
      width: 108px;
      max-height: 58px;
      height: auto;
      object-fit: contain;
      display: block;
      margin-top: 0;
    }}

    .meta {{
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(52mm, 0.72fr);
      column-gap: 34mm;
      row-gap: 22px;
      padding: 28px 0 24px;
      border-bottom: 1px solid #dcdcdc;
    }}

    .meta-block {{
      min-width: 0;
    }}

    .meta-issuer {{
      max-width: 76mm;
    }}

    .meta-client {{
      padding-left: 13mm;
    }}

    .meta-block span,
    .dates span {{
      display: block;
      margin-bottom: 5px;
      color: #6f6f6f;
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }}

    .meta-block strong,
    .dates strong {{
      display: block;
      font-size: 11px;
      font-weight: 800;
      line-height: 1.35;
    }}

    .meta-block p {{
      margin: 4px 0 0;
      color: #666666;
      font-size: 9px;
      line-height: 1.42;
    }}

    .dates {{
      grid-column: 1 / -1;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 18px;
      margin-top: 8px;
      padding-top: 18px;
      border-top: 1px solid #dcdcdc;
    }}

    .section {{
      padding-top: 15px;
      margin-top: 0;
      border-bottom: 1px solid #e1e1e1;
      padding-bottom: 13px;
      break-inside: avoid;
    }}

    .section:last-of-type {{
      border-bottom: none;
    }}

    .section h3,
    .price-section h3,
    .summary-section h3 {{
      margin: 0 0 8px;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: -0.03em;
    }}

    .section p,
    .price-section p,
    .summary-section p {{
      margin: 0 0 8px;
      color: #333333;
      font-size: 9.45px;
      line-height: 1.58;
    }}

    .section p:last-child,
    .price-section p:last-child,
    .summary-section p:last-child {{
      margin-bottom: 0;
    }}

    .page-break {{
      break-before: page;
      padding-top: 18mm;
    }}

    .modules {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 34px;
      margin-top: 9px;
    }}

    .module-row {{
      display: flex;
      align-items: flex-start;
      gap: 9px;
      min-height: 18px;
    }}

    .module-row span {{
      width: 5.5px;
      height: 5.5px;
      border-radius: 999px;
      background: #111111;
      margin-top: 5px;
      flex: 0 0 auto;
    }}

    .module-row p {{
      margin: 0;
      font-size: 9.5px;
      color: #222222;
    }}

    .price-section {{
      padding-top: 19px;
      padding-bottom: 15px;
      border-bottom: 1px solid #e1e1e1;
    }}

    .price-box {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin: 9px 0 10px;
    }}

    .price-card {{
      border: 1px solid #d8d8d8;
      border-radius: 14px;
      padding: 10px 12px;
      min-height: 58px;
    }}

    .price-card span {{
      display: block;
      color: #777777;
      font-size: 8.5px;
      font-weight: 800;
      margin-bottom: 4px;
    }}

    .price-card strong {{
      display: block;
      font-size: 14px;
      line-height: 1.1;
      font-weight: 800;
    }}

    .summary-section {{
      padding-top: 17px;
      padding-bottom: 8px;
      border-bottom: none;
    }}

    .footer {{
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 34px;
      margin-top: 380px;
      padding-top: 17px;
      border-top: 1.5px solid #111111;
      break-inside: avoid;
    }}

    .footer-block strong {{
      display: block;
      margin-bottom: 7px;
      font-size: 10.5px;
      font-weight: 800;
    }}

    .footer-block p {{
      margin: 3px 0;
      color: #666666;
      font-size: 8.8px;
      line-height: 1.4;
    }}
  </style>
</head>

<body>
  <main class="paper">
    <section class="top">
      <div class="top-left">
        <p class="document-label">{safe_text(texts.get("documentName") or "Offer")}</p>
        <h1 class="offer-title">{safe_text(offer.get("offerNumber") or "—")}</h1>
        <div class="project-name">{safe_text(offer.get("projectName") or "—")}</div>
      </div>

      {logo_html}
    </section>

    <section class="meta">
      <div class="meta-block meta-issuer">
        <span>{safe_text(texts.get("issuerLabel") or "Issuer")}</span>
        <strong>{safe_text(issuer.get("companyName") or "Handke Holding OÜ")}</strong>
        {issuer_address_html}
        <p>{safe_text(issuer.get("email") or "")}</p>
        <p>{safe_text(issuer.get("phone") or "")}</p>
      </div>

      <div class="meta-block meta-client">
        <span>{safe_text(texts.get("previewClient") or "Client")}</span>
        <strong>{safe_text(offer.get("clientCompany") or "—")}</strong>
        <p>{safe_text(offer.get("clientName") or "—")}</p>
      </div>

      <div class="dates">
        <div>
          <span>{safe_text(texts.get("previewDate") or "Date")}</span>
          <strong>{format_date(offer.get("offerDate"))}</strong>
        </div>

        <div>
          <span>{safe_text(texts.get("previewValidUntil") or "Valid until")}</span>
          <strong>{format_date(offer.get("validUntil"))}</strong>
        </div>

        <div>
          <span>{safe_text(texts.get("previewImplementationTime") or "Implementation time")}</span>
          <strong>{safe_text(offer.get("implementationTime") or "—")}</strong>
        </div>
      </div>
    </section>

    <section class="section">
      <h3>{safe_text(texts.get("introTitle") or "Introduction")}</h3>
      {intro_html}
    </section>

    <section class="section">
      <h3>{safe_text(texts.get("clientNeedTitle") or "Client needs")}</h3>
      <p>{safe_text(offer.get("clientProblem") or "—")}</p>
    </section>

    <section class="section">
      <h3>{safe_text(texts.get("solutionTitle") or "Proposed solution")}</h3>
      <p>{safe_text(offer.get("solution") or "—")}</p>
      <p>{safe_text(texts.get("solutionExtra") or "")}</p>
    </section>

    <section class="section">
      <h3>{safe_text(texts.get("scopeTitle") or "Scope")}</h3>
      <div class="modules">
        {modules_html}
      </div>
    </section>

    <section class="section page-break">
      <h3>{safe_text(texts.get("featuresTitle") or "Features")}</h3>
      {features_html}
    </section>

    <section class="section">
      <h3>{safe_text(texts.get("automationTitle") or "Automations")}</h3>
      {automation_html}
    </section>

    <section class="price-section">
      <h3>{safe_text(texts.get("priceTitle") or "Price")}</h3>

      <div class="price-box">
        <div class="price-card">
          <span>{safe_text(texts.get("projectValue") or "Project value")}</span>
          <strong>{safe_text(offer.get("projectPrice") or "—")}</strong>
        </div>

        <div class="price-card">
          <span>{safe_text(texts.get("previewImplementationTime") or "Implementation time")}</span>
          <strong>{safe_text(offer.get("implementationTime") or "—")}</strong>
        </div>
      </div>

      <p>{safe_text(offer.get("paymentTerms") or "—")}</p>
    </section>

    <section class="summary-section">
      <h3>{safe_text(texts.get("summaryTitle") or "Summary")}</h3>
      {summary_html}
    </section>

    <section class="footer">
      <div class="footer-block">
        <strong>{safe_text(issuer.get("companyName") or "Handke Holding OÜ")}</strong>
        {issuer_address_html}
      </div>

      <div class="footer-block">
        <strong>Contact</strong>
        <p>{safe_text(issuer.get("email") or "")}</p>
        <p>{safe_text(issuer.get("phone") or "")}</p>
        <p>{safe_text(issuer.get("website") or "")}</p>
      </div>

      <div class="footer-block">
        <strong>Offer</strong>
        <p>{safe_text(offer.get("offerNumber") or "")}</p>
        <p>{format_date(offer.get("offerDate"))}</p>
      </div>
    </section>
  </main>
</body>
</html>
    """


@pdf_bp.post("/offer")
def generate_offer_pdf():
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    data = request.get_json(silent=True) or {}

    language = data.get("language") or "pl"
    offer = data.get("offer") or {}
    modules = data.get("modules") or []
    issuer = data.get("issuer") or {}
    texts = data.get("texts") or {}

    html = build_offer_html(language, offer, modules, issuer, texts)

    offer_number = str(offer.get("offerNumber") or "offer")
    filename = f"offer-{offer_number.replace('/', '-').replace(' ', '-')}.pdf"

    pdf_buffer = BytesIO()

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(
            viewport={
                "width": 1240,
                "height": 1754,
            }
        )

        page.set_content(html, wait_until="networkidle")

        pdf_bytes = page.pdf(
            format="A4",
            print_background=True,
            margin={
                "top": "0mm",
                "right": "0mm",
                "bottom": "0mm",
                "left": "0mm",
            },
        )

        browser.close()

    pdf_buffer.write(pdf_bytes)
    pdf_buffer.seek(0)

    return send_file(
        pdf_buffer,
        as_attachment=True,
        download_name=filename,
        mimetype="application/pdf",
    )