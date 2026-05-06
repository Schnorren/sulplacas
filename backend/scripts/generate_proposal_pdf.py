"""
scripts/generate_proposal_pdf.py
Sul Placas — Gerador de Proposta PDF
Uso desenvolvimento : python generate_proposal_pdf.py
Uso servidor (NestJS): python generate_proposal_pdf.py --stdin
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle
import io, math, sys, json

# ─── Paleta ───────────────────────────────────────────────────────────────────
AMBER       = colors.HexColor("#F59E0B")
AMBER_DARK  = colors.HexColor("#B45309")
AMBER_LIGHT = colors.HexColor("#FEF3C7")
SLATE_950   = colors.HexColor("#020617")
SLATE_800   = colors.HexColor("#1E293B")
SLATE_600   = colors.HexColor("#475569")
SLATE_200   = colors.HexColor("#E2E8F0")
EMERALD     = colors.HexColor("#10B981")
BLUE_LIGHT  = colors.HexColor("#EFF6FF")
BLUE_BORDER = colors.HexColor("#BFDBFE")
BLUE_TEXT   = colors.HexColor("#1E40AF")
RED_BG      = colors.HexColor("#FEF2F2")
RED_BORDER  = colors.HexColor("#FECACA")
RED_TEXT    = colors.HexColor("#DC2626")
WHITE       = colors.white

W, H = A4  # 595.27 × 841.89 pt

# ─── Helpers ──────────────────────────────────────────────────────────────────

def brl(cents: int) -> str:
    v = cents / 100
    s = f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {s}"

def draw_rrect(c, x, y, w, h, r, fill=None, stroke=None, sw=0.8):
    """Retângulo com cantos arredondados."""
    p = c.beginPath()
    p.moveTo(x + r, y)
    p.lineTo(x + w - r, y)
    p.arcTo(x + w - r, y, x + w, y + r, -90, 90)
    p.lineTo(x + w, y + h - r)
    p.arcTo(x + w - r, y + h - r, x + w, y + h, 0, 90)
    p.lineTo(x + r, y + h)
    p.arcTo(x, y + h - r, x + r, y + h, 90, 90)
    p.lineTo(x, y + r)
    p.arcTo(x, y, x + r, y + r, 180, 90)
    p.close()
    if fill: c.setFillColor(fill)
    if stroke: c.setStrokeColor(stroke); c.setLineWidth(sw)
    mode = (1 if fill else 0) + (2 if stroke else 0)
    # mode: 1=fill, 2=stroke, 3=both
    if mode == 1:   c.drawPath(p, fill=1, stroke=0)
    elif mode == 2: c.drawPath(p, fill=0, stroke=1)
    elif mode == 3: c.drawPath(p, fill=1, stroke=1)

def draw_sun(c, cx, cy, r=9):
    c.setFillColor(WHITE)
    c.circle(cx, cy, r * 0.52, fill=1, stroke=0)
    c.setStrokeColor(WHITE)
    c.setLineWidth(1.6)
    for deg in range(0, 360, 45):
        rad = math.radians(deg)
        x1 = cx + math.cos(rad) * r * 0.68
        y1 = cy + math.sin(rad) * r * 0.68
        x2 = cx + math.cos(rad) * r * 1.05
        y2 = cy + math.sin(rad) * r * 1.05
        c.line(x1, y1, x2, y2)

def text_center(c, text, cx, y):
    w = c.stringWidth(text, c._fontname, c._fontsize)
    c.drawString(cx - w / 2, y, text)

# ─── Gerador principal ────────────────────────────────────────────────────────

def generate_proposal_pdf(p: dict) -> bytes:
    """
    p (dict) — campos esperados:
      client_name, whatsapp, length_m, width_m, area_m2, region_label
      total_cash_cents, excess_area_cents, displacement_cents
      thermal_cover (bool), wifi_controller (bool)
      thermal_cover_price_cents, wifi_controller_price_cents
      expires_at_str
    """
    buf = io.BytesIO()
    cv  = canvas.Canvas(buf, pagesize=A4)
    cv.setTitle(f"Proposta Sul Placas – {p['client_name']}")

    # ── Cálculos com upsells ─────────────────────────────────────────────────
    extras = (
        (p.get("thermal_cover_price_cents", 60000) if p.get("thermal_cover") else 0) +
        (p.get("wifi_controller_price_cents", 45000) if p.get("wifi_controller") else 0)
    )
    total_cash = p["total_cash_cents"] + extras
    total_12x  = round(total_cash * 1.12)
    inst_12x   = round(total_12x / 12)
    total_18x  = round(total_cash * 1.16)
    inst_18x   = round(total_18x / 18)

    # ════════════════════════════════════════════════════════════════════════
    # 1. HEADER
    # ════════════════════════════════════════════════════════════════════════
    HDR_H = 112
    cv.setFillColor(SLATE_950)
    cv.rect(0, H - HDR_H, W, HDR_H, fill=1, stroke=0)
    # acento âmbar inferior
    cv.setFillColor(AMBER)
    cv.rect(0, H - HDR_H, W, 3, fill=1, stroke=0)
    # blob decorativo
    cv.setFillColor(colors.HexColor("#111827"))
    cv.ellipse(W - 50, H - HDR_H + 5, W + 80, H + 40, fill=1, stroke=0)

    # Pílula logo
    PX, PY, PW, PH, PR = 26, H - 58, 138, 30, 15
    draw_rrect(cv, PX, PY, PW, PH, PR, fill=AMBER)
    draw_sun(cv, PX + 20, PY + PH / 2, r=9)
    cv.setFillColor(SLATE_800)
    cv.setFont("Helvetica-Bold", 13.5)
    cv.drawString(PX + 36, PY + 9, "Sul Placas")

    cv.setFillColor(WHITE)
    cv.setFont("Helvetica-Bold", 18)
    cv.drawString(26, H - 80, "Proposta Comercial")
    cv.setFillColor(colors.HexColor("#94A3B8"))
    cv.setFont("Helvetica", 9)
    cv.drawString(26, H - 94, "Aquecimento Solar para Piscinas")

    cv.setFillColor(colors.HexColor("#64748B"))
    cv.setFont("Helvetica", 8)
    cv.drawRightString(W - 26, H - 70, f"Válida até: {p.get('expires_at_str','48h')}")
    cv.setFillColor(AMBER)
    cv.setFont("Helvetica-Bold", 8)
    cv.drawRightString(W - 26, H - 82, "Parcelamento por tempo limitado")

    # ════════════════════════════════════════════════════════════════════════
    # 2. FAIXA CLIENTE
    # ════════════════════════════════════════════════════════════════════════
    CL_Y = H - HDR_H - 50
    cv.setFillColor(AMBER_LIGHT)
    cv.rect(0, CL_Y, W, 44, fill=1, stroke=0)
    cv.setFillColor(AMBER)
    cv.rect(0, CL_Y, 4, 44, fill=1, stroke=0)

    cv.setFillColor(SLATE_600)
    cv.setFont("Helvetica", 7.5)
    cv.drawString(18, CL_Y + 30, "PROPOSTA EXCLUSIVA PARA")
    cv.setFillColor(SLATE_800)
    cv.setFont("Helvetica-Bold", 16)
    cv.drawString(18, CL_Y + 11, p["client_name"])
    cv.setFillColor(SLATE_600)
    cv.setFont("Helvetica", 8.5)
    cv.drawRightString(W - 18, CL_Y + 29, f"WhatsApp: {p['whatsapp']}")
    cv.drawRightString(W - 18, CL_Y + 13, f"{p['length_m']}m × {p['width_m']}m  •  {p['area_m2']} m²  •  {p['region_label']}")

    # ════════════════════════════════════════════════════════════════════════
    # 3. CARDS DE PAGAMENTO
    # ════════════════════════════════════════════════════════════════════════
    SEC1_Y = CL_Y - 28
    cv.setFillColor(SLATE_600)
    cv.setFont("Helvetica-Bold", 7.5)
    cv.drawString(26, SEC1_Y, "CONDIÇÕES DE PAGAMENTO")
    cv.setFillColor(AMBER); cv.rect(26, SEC1_Y - 4, 44, 1.5, fill=1, stroke=0)

    CARD_Y = SEC1_Y - 90
    CARD_H = 80
    GAP    = 9
    TW     = W - 52
    CW     = (TW - 2 * GAP) / 3

    cards = [
        {"label": "À VISTA",      "main": brl(total_cash), "sub": "Melhor custo-benefício", "hl": True,  "badge": "✓ RECOMENDADO"},
        {"label": "12× CARTÃO",   "main": brl(inst_12x),   "sub": f"Total {brl(total_12x)} (12%)", "hl": False, "badge": None},
        {"label": "18× CARTÃO",   "main": brl(inst_18x),   "sub": f"Total {brl(total_18x)} (16%)", "hl": False, "badge": None},
    ]
    for i, card in enumerate(cards):
        cx = 26 + i * (CW + GAP)
        cy = CARD_Y
        if card["hl"]:
            draw_rrect(cv, cx, cy, CW, CARD_H, 9, fill=AMBER)
            cv.setFillColor(SLATE_800)
            cv.setFont("Helvetica-Bold", 6.5)
            cv.drawString(cx + 10, cy + CARD_H - 16, card["label"])
            cv.setFont("Helvetica-Bold", 15.5)
            cv.drawString(cx + 10, cy + CARD_H - 40, card["main"])
            cv.setFillColor(colors.HexColor("#44403c"))
            cv.setFont("Helvetica", 7)
            cv.drawString(cx + 10, cy + 14, card["sub"])
            # badge verde
            BW = 80
            draw_rrect(cv, cx + CW - BW - 8, cy + CARD_H - 13, BW, 11, 5, fill=EMERALD)
            cv.setFillColor(WHITE)
            cv.setFont("Helvetica-Bold", 5.8)
            cv.drawString(cx + CW - BW - 3, cy + CARD_H - 9, card["badge"])
        else:
            draw_rrect(cv, cx, cy, CW, CARD_H, 9,
                       fill=colors.HexColor("#F8FAFC"), stroke=SLATE_200, sw=0.7)
            cv.setFillColor(SLATE_600)
            cv.setFont("Helvetica-Bold", 6.5)
            cv.drawString(cx + 10, cy + CARD_H - 16, card["label"])
            cv.setFillColor(SLATE_800)
            cv.setFont("Helvetica-Bold", 15.5)
            cv.drawString(cx + 10, cy + CARD_H - 40, card["main"])
            cv.setFillColor(SLATE_600)
            cv.setFont("Helvetica", 7)
            cv.drawString(cx + 10, cy + 14, card["sub"])

    # ════════════════════════════════════════════════════════════════════════
    # 4. DETALHAMENTO
    # ════════════════════════════════════════════════════════════════════════
    DET_Y = CARD_Y - 30
    cv.setFillColor(SLATE_600); cv.setFont("Helvetica-Bold", 7.5)
    cv.drawString(26, DET_Y, "DETALHAMENTO DO ORÇAMENTO")
    cv.setFillColor(AMBER); cv.rect(26, DET_Y - 4, 52, 1.5, fill=1, stroke=0)

    base_cents = p["total_cash_cents"] - p.get("excess_area_cents", 0) - p.get("displacement_cents", 0)
    rows = [["Item", "Descrição", "Valor"]]
    rows.append(["Sistema Base", "Piscina até 18m² (incluso)", brl(base_cents)])
    if p.get("excess_area_cents", 0) > 0:
        excess_m2 = round(p["area_m2"] - 18, 2)
        rows.append(["Excedente", f"+{excess_m2} m² × R$ 180,00/m²", brl(p["excess_area_cents"])])
    if p.get("displacement_cents", 0) > 0:
        rows.append(["Deslocamento", p["region_label"], brl(p["displacement_cents"])])
    if p.get("thermal_cover"):
        rows.append(["Capa Térmica", "Reduz 70% da evaporação", brl(p["thermal_cover_price_cents"])])
    if p.get("wifi_controller"):
        rows.append(["Controlador Wi-Fi", "Controle pelo celular", brl(p["wifi_controller_price_cents"])])
    rows.append(["TOTAL À VISTA", "", brl(total_cash)])

    TBL_W = W - 52
    col_w = [TBL_W * 0.22, TBL_W * 0.55, TBL_W * 0.23]
    tbl = Table(rows, colWidths=col_w)
    tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0),  SLATE_800),
        ("TEXTCOLOR",     (0,0), (-1,0),  WHITE),
        ("FONTNAME",      (0,0), (-1,0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0,0), (-1,0),  8),
        ("TOPPADDING",    (0,0), (-1,0),  7),
        ("BOTTOMPADDING", (0,0), (-1,0),  7),
        ("FONTNAME",      (0,1), (-1,-2), "Helvetica"),
        ("FONTSIZE",      (0,1), (-1,-2), 8),
        ("TEXTCOLOR",     (0,1), (-1,-2), SLATE_600),
        ("TOPPADDING",    (0,1), (-1,-2), 6),
        ("BOTTOMPADDING", (0,1), (-1,-2), 6),
        ("ROWBACKGROUNDS",(0,1), (-1,-2), [WHITE, colors.HexColor("#F8FAFC")]),
        ("BACKGROUND",    (0,-1),(-1,-1), AMBER_LIGHT),
        ("FONTNAME",      (0,-1),(-1,-1), "Helvetica-Bold"),
        ("FONTSIZE",      (0,-1),(-1,-1), 9),
        ("TEXTCOLOR",     (0,-1),(-1,-1), AMBER_DARK),
        ("TOPPADDING",    (0,-1),(-1,-1), 7),
        ("BOTTOMPADDING", (0,-1),(-1,-1), 7),
        ("GRID",          (0,0), (-1,-1), 0.4, SLATE_200),
        ("LINEABOVE",     (0,-1),(-1,-1), 1.5, AMBER),
        ("ALIGN",         (2,0), (2,-1),  "RIGHT"),
    ]))
    tbl_w2, tbl_h = tbl.wrap(TBL_W, 300)
    TBL_TOP = DET_Y - 20
    tbl.drawOn(cv, 26, TBL_TOP - tbl_h)

    # ════════════════════════════════════════════════════════════════════════
    # 5. BLOCO EMOCIONAL
    # ════════════════════════════════════════════════════════════════════════
    EMO_TOP = TBL_TOP - tbl_h - 26
    EMO_H   = 78
    draw_rrect(cv, 26, EMO_TOP - EMO_H, W - 52, EMO_H, 10,
               fill=BLUE_LIGHT, stroke=BLUE_BORDER, sw=0.8)

    cv.setFillColor(BLUE_TEXT); cv.setFont("Helvetica-Bold", 9)
    cv.drawString(42, EMO_TOP - 17, "Maximize o uso da sua piscina")

    cv.setFillColor(BLUE_TEXT); cv.setFont("Helvetica", 8.5)
    cv.drawString(42, EMO_TOP - 30, "Sem aquecimento: ~90 dias/ano de uso")
    BAR_X = 42; BAR_W = W - 112
    # barra vermelha (33%)
    draw_rrect(cv, BAR_X, EMO_TOP - 43, BAR_W, 7, 3, fill=colors.HexColor("#FEE2E2"))
    draw_rrect(cv, BAR_X, EMO_TOP - 43, BAR_W * 0.33, 7, 3, fill=colors.HexColor("#EF4444"))

    cv.setFillColor(BLUE_TEXT); cv.setFont("Helvetica", 8.5)
    cv.drawString(42, EMO_TOP - 57, "Com Sul Placas: ate 270 dias/ano - 3x mais lazer para sua familia!")
    # barra verde (99%)
    draw_rrect(cv, BAR_X, EMO_TOP - 69, BAR_W, 7, 3, fill=colors.HexColor("#D1FAE5"))
    draw_rrect(cv, BAR_X, EMO_TOP - 69, BAR_W * 0.99, 7, 3, fill=EMERALD)

    # ════════════════════════════════════════════════════════════════════════
    # 6. SOCIAL PROOF — 3 badges
    # ════════════════════════════════════════════════════════════════════════
    SP_TOP = EMO_TOP - EMO_H - 20
    SP_H   = 38
    badges = [("10+ Anos", "de experiência"), ("500+", "instalações"), ("Garantia 2 anos", "satisfação")]
    badge_w = (W - 52 - 18) / 3
    for i, (val, sub) in enumerate(badges):
        bx = 26 + i * (badge_w + 9)
        draw_rrect(cv, bx, SP_TOP - SP_H, badge_w, SP_H, 8,
                   fill=colors.HexColor("#F8FAFC"), stroke=SLATE_200, sw=0.6)
        cv.setFillColor(SLATE_800); cv.setFont("Helvetica-Bold", 9)
        cv.drawString(bx + 10, SP_TOP - 16, val)
        cv.setFillColor(SLATE_600); cv.setFont("Helvetica", 7.5)
        cv.drawString(bx + 10, SP_TOP - 29, sub)

    # ════════════════════════════════════════════════════════════════════════
    # 7. BLOCO DE URGÊNCIA
    # ════════════════════════════════════════════════════════════════════════
    URG_TOP = SP_TOP - SP_H - 20
    draw_rrect(cv, 26, URG_TOP - 26, W - 52, 26, 8,
               fill=RED_BG, stroke=RED_BORDER, sw=0.8)
    cv.setFillColor(RED_TEXT); cv.setFont("Helvetica-Bold", 8.5)
    exp = p.get("expires_at_str", "48 horas apos o envio")
    cv.drawString(40, URG_TOP - 16, f"Condicoes de parcelamento validas ate: {exp}")

    # ════════════════════════════════════════════════════════════════════════
    # 8. CTA VISUAL
    # ════════════════════════════════════════════════════════════════════════
    CTA_TOP = URG_TOP - 26 - 18
    draw_rrect(cv, 26, CTA_TOP - 26, W - 52, 26, 13, fill=AMBER)
    cv.setFillColor(SLATE_950); cv.setFont("Helvetica-Bold", 10)
    text_center(cv, "Aprovar proposta via WhatsApp", W / 2, CTA_TOP - 17)

    # ════════════════════════════════════════════════════════════════════════
    # 9. FOOTER
    # ════════════════════════════════════════════════════════════════════════
    cv.setFillColor(SLATE_950); cv.rect(0, 0, W, 34, fill=1, stroke=0)
    cv.setFillColor(AMBER);     cv.rect(0, 34, W, 2, fill=1, stroke=0)
    cv.setFillColor(colors.HexColor("#64748B")); cv.setFont("Helvetica", 7)
    cv.drawString(26, 13, "Sul Placas Aquecimento Solar  •  sulplacas.com.br")
    cv.drawRightString(W - 26, 13, "Proposta comercial personalizada. Nao possui valor fiscal.")

    cv.save()
    buf.seek(0)
    return buf.read()


# ─── Entrypoint ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if "--stdin" in sys.argv:
        # Modo servidor (NestJS): JSON via stdin → PDF bytes via stdout
        raw  = sys.stdin.buffer.read()
        data = json.loads(raw.decode("utf-8"))
        proposal = {
            "client_name":                 data["clientName"],
            "whatsapp":                    data["whatsapp"],
            "city":                        data.get("city", ""),
            "length_m":                    data["lengthM"],
            "width_m":                     data["widthM"],
            "area_m2":                     data["areaM2"],
            "region_label":                data["regionLabel"],
            "total_cash_cents":            data["totalCashCents"],
            "excess_area_cents":           data["excessAreaCents"],
            "displacement_cents":          data["displacementCents"],
            "thermal_cover":               data["thermalCover"],
            "wifi_controller":             data["wifiController"],
            "thermal_cover_price_cents":   data["thermalCoverPriceCents"],
            "wifi_controller_price_cents": data["wifiControllerPriceCents"],
            "expires_at_str":              data["expiresAtStr"],
            "signature_name":              data.get("signatureName", ""),
            "signed_at_str":               data.get("signedAtStr", ""),
        }
        pdf_bytes = generate_proposal_pdf(proposal)
        sys.stdout.buffer.write(pdf_bytes)

    else:
        # Modo dev: gera exemplo em /tmp
        sample = {
            "client_name": "Lucas Ramon", "whatsapp": "(51) 99999-0000",
            "city": "Porto Alegre", "length_m": 6, "width_m": 4, "area_m2": 24,
            "region_label": "Porto Alegre e arredores",
            "total_cash_cents": 498000, "excess_area_cents": 108000,
            "displacement_cents": 0,
            "thermal_cover": False, "thermal_cover_price_cents": 60000,
            "wifi_controller": False, "wifi_controller_price_cents": 30000,
            "expires_at_str": "12/05/2025",
            "signature_name": "", "signed_at_str": "",
        }
        out = "/tmp/proposta_sulplacas_teste.pdf"
        pdf = generate_proposal_pdf(sample)
        with open(out, "wb") as f:
            f.write(pdf)
        print(f"PDF gerado: {out}  ({len(pdf)} bytes)")
