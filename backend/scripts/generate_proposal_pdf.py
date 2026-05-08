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
AMBER        = colors.HexColor("#F59E0B")
AMBER_DARK   = colors.HexColor("#92400E")
AMBER_LIGHT  = colors.HexColor("#FFFBEB")
AMBER_MID    = colors.HexColor("#FDE68A")
SLATE_950    = colors.HexColor("#020617")
SLATE_900    = colors.HexColor("#0F172A")
SLATE_800    = colors.HexColor("#1E293B")
SLATE_700    = colors.HexColor("#334155")
SLATE_500    = colors.HexColor("#64748B")
SLATE_400    = colors.HexColor("#94A3B8")
SLATE_200    = colors.HexColor("#E2E8F0")
SLATE_100    = colors.HexColor("#F1F5F9")
SLATE_50     = colors.HexColor("#F8FAFC")
EMERALD      = colors.HexColor("#10B981")
EMERALD_DARK = colors.HexColor("#065F46")
EMERALD_LIGHT= colors.HexColor("#D1FAE5")
PURPLE       = colors.HexColor("#7C3AED")
BLUE         = colors.HexColor("#1D4ED8")
BLUE_LIGHT   = colors.HexColor("#EFF6FF")
BLUE_BORDER  = colors.HexColor("#BFDBFE")
BLUE_TEXT    = colors.HexColor("#1E40AF")
RED_BG       = colors.HexColor("#FEF2F2")
RED_BORDER   = colors.HexColor("#FECACA")
RED_TEXT     = colors.HexColor("#DC2626")
WHITE        = colors.white

W, H = A4  # 595.27 × 841.89 pt
MARGIN = 26

# ─── Helpers ──────────────────────────────────────────────────────────────────

def brl(cents: int) -> str:
    v = cents / 100
    s = f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {s}"

def draw_rrect(c, x, y, w, h, r, fill=None, stroke=None, sw=0.8):
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
    if fill:   c.setFillColor(fill)
    if stroke: c.setStrokeColor(stroke); c.setLineWidth(sw)
    mode = (1 if fill else 0) + (2 if stroke else 0)
    if   mode == 1: c.drawPath(p, fill=1, stroke=0)
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
    sw = c.stringWidth(text, c._fontname, c._fontsize)
    c.drawString(cx - sw / 2, y, text)

def section_label(cv, text, x, y):
    cv.setFillColor(SLATE_500)
    cv.setFont("Helvetica-Bold", 7)
    cv.drawString(x, y, text)
    # sublinhado âmbar
    tw = cv.stringWidth(text, "Helvetica-Bold", 7)
    cv.setFillColor(AMBER)
    cv.rect(x, y - 4, min(tw, 60), 1.5, fill=1, stroke=0)

def divider(cv, y):
    cv.setStrokeColor(SLATE_200)
    cv.setLineWidth(0.5)
    cv.line(MARGIN, y, W - MARGIN, y)

# ─── Gerador principal ────────────────────────────────────────────────────────

def generate_proposal_pdf(p: dict) -> bytes:
    buf = io.BytesIO()
    cv  = canvas.Canvas(buf, pagesize=A4)
    cv.setTitle(f"Proposta {p.get('proposal_code','Sul Placas')} – {p['client_name']}")

    # ── Parâmetros de pagamento (dinâmicos) ───────────────────────────────────
    total_cash   = p["total_cash_cents"]
    rate_12x     = p.get("rate_12x", 112) / 100      # ex: 112 → 1.12
    rate_18x     = p.get("rate_18x", 116) / 100
    months_12x   = p.get("months_12x", 12)
    months_18x   = p.get("months_18x", 18)
    total_12x    = round(total_cash * rate_12x)
    inst_12x     = round(total_12x / months_12x)
    total_18x    = round(total_cash * rate_18x)
    inst_18x     = round(total_18x / months_18x)
    pct_12x      = int((rate_12x - 1) * 100)
    pct_18x      = int((rate_18x - 1) * 100)

    proposal_code = p.get("proposal_code", "")
    client_email  = p.get("email", "")

    # ═════════════════════════════════════════════════════════════════════════
    # 1. HEADER  (fundo escuro com gradiente simulado)
    # ═════════════════════════════════════════════════════════════════════════
    HDR_H = 118
    cv.setFillColor(SLATE_950)
    cv.rect(0, H - HDR_H, W, HDR_H, fill=1, stroke=0)

    # blob decorativo direito
    cv.setFillColor(colors.HexColor("#111827"))
    cv.ellipse(W - 60, H - HDR_H + 10, W + 90, H + 50, fill=1, stroke=0)

    # linha âmbar inferior do header
    cv.setFillColor(AMBER)
    cv.rect(0, H - HDR_H, W, 3, fill=1, stroke=0)

    # Pílula logo
    PX, PY, PW, PH, PR = MARGIN, H - 54, 138, 30, 15
    draw_rrect(cv, PX, PY, PW, PH, PR, fill=AMBER)
    draw_sun(cv, PX + 20, PY + PH / 2, r=9)
    cv.setFillColor(SLATE_800)
    cv.setFont("Helvetica-Bold", 13.5)
    cv.drawString(PX + 36, PY + 9, "Sul Placas")

    # Título
    cv.setFillColor(WHITE)
    cv.setFont("Helvetica-Bold", 19)
    cv.drawString(MARGIN, H - 78, "Proposta Comercial")
    cv.setFillColor(SLATE_400)
    cv.setFont("Helvetica", 9)
    cv.drawString(MARGIN, H - 92, "Aquecimento Solar para Piscinas")

    # Código + validade (canto direito)
    if proposal_code:
        cv.setFillColor(AMBER)
        cv.setFont("Helvetica-Bold", 9)
        cv.drawRightString(W - MARGIN, H - 64, proposal_code)
    cv.setFillColor(SLATE_400)
    cv.setFont("Helvetica", 7.5)
    cv.drawRightString(W - MARGIN, H - 78, f"Válida até: {p.get('expires_at_str', '—')}")
    cv.setFillColor(colors.HexColor("#F59E0B"))
    cv.setFont("Helvetica-Bold", 7)
    cv.drawRightString(W - MARGIN, H - 91, "★ Parcelamento por tempo limitado")

    # ═════════════════════════════════════════════════════════════════════════
    # 2. FAIXA CLIENTE
    # ═════════════════════════════════════════════════════════════════════════
    CL_Y  = H - HDR_H - 3   # cola no header
    CL_H  = 52
    cv.setFillColor(AMBER_LIGHT)
    cv.rect(0, CL_Y - CL_H, W, CL_H, fill=1, stroke=0)
    cv.setFillColor(AMBER)
    cv.rect(0, CL_Y - CL_H, 4, CL_H, fill=1, stroke=0)

    cv.setFillColor(SLATE_500)
    cv.setFont("Helvetica", 7)
    cv.drawString(16, CL_Y - 14, "PROPOSTA EXCLUSIVA PARA")
    cv.setFillColor(SLATE_800)
    cv.setFont("Helvetica-Bold", 15)
    cv.drawString(16, CL_Y - 30, p["client_name"])

    # Contatos
    contact_parts = [f"📱 {p['whatsapp']}"]
    if client_email:
        contact_parts.append(f"✉  {client_email}")
    cv.setFillColor(SLATE_500)
    cv.setFont("Helvetica", 8)
    cv.drawString(16, CL_Y - 44, "  •  ".join(contact_parts))

    # Dimensões (lado direito)
    cv.setFillColor(SLATE_500)
    cv.setFont("Helvetica", 8)
    dim_line = f"{p['length_m']}m × {p['width_m']}m  •  {p['area_m2']} m²  •  {p['region_label']}"
    cv.drawRightString(W - MARGIN, CL_Y - 28, dim_line)

    # ═════════════════════════════════════════════════════════════════════════
    # 3. CARDS DE PAGAMENTO
    # ═════════════════════════════════════════════════════════════════════════
    cursor = CL_Y - CL_H - 22
    section_label(cv, "CONDIÇÕES DE PAGAMENTO", MARGIN, cursor)
    cursor -= 10

    CARD_H = 84
    GAP    = 9
    TW     = W - MARGIN * 2
    CW     = (TW - 2 * GAP) / 3

    cards = [
        {
            "label": "À VISTA",
            "main":  brl(total_cash),
            "sub":   "Melhor custo-benefício",
            "hl":    True,
            "badge": "✓ RECOMENDADO",
        },
        {
            "label": f"{months_12x}× CARTÃO",
            "main":  brl(inst_12x),
            "sub":   f"Total {brl(total_12x)} (+{pct_12x}%)",
            "hl":    False,
            "badge": None,
        },
        {
            "label": f"{months_18x}× CARTÃO",
            "main":  brl(inst_18x),
            "sub":   f"Total {brl(total_18x)} (+{pct_18x}%)",
            "hl":    False,
            "badge": None,
        },
    ]

    cursor -= CARD_H
    for i, card in enumerate(cards):
        cx = MARGIN + i * (CW + GAP)
        cy = cursor

        if card["hl"]:
            # Card âmbar destacado
            draw_rrect(cv, cx, cy, CW, CARD_H, 10, fill=AMBER)
            # Sombra simulada
            cv.setFillColor(colors.HexColor("#B45309"))
            cv.setFont("Helvetica-Bold", 6.5)
            cv.drawString(cx + 11, cy + CARD_H - 16, card["label"])
            cv.setFillColor(SLATE_900)
            cv.setFont("Helvetica-Bold", 16)
            cv.drawString(cx + 11, cy + CARD_H - 40, card["main"])
            cv.setFillColor(colors.HexColor("#44403C"))
            cv.setFont("Helvetica", 7)
            cv.drawString(cx + 11, cy + 15, card["sub"])
            # Badge RECOMENDADO
            BW = 82
            draw_rrect(cv, cx + CW - BW - 8, cy + CARD_H - 14, BW, 12, 6, fill=EMERALD)
            cv.setFillColor(WHITE)
            cv.setFont("Helvetica-Bold", 5.8)
            cv.drawString(cx + CW - BW - 2, cy + CARD_H - 9.5, card["badge"])
        else:
            draw_rrect(cv, cx, cy, CW, CARD_H, 10,
                       fill=SLATE_50, stroke=SLATE_200, sw=0.7)
            cv.setFillColor(SLATE_500)
            cv.setFont("Helvetica-Bold", 6.5)
            cv.drawString(cx + 11, cy + CARD_H - 16, card["label"])
            cv.setFillColor(SLATE_800)
            cv.setFont("Helvetica-Bold", 16)
            cv.drawString(cx + 11, cy + CARD_H - 40, card["main"])
            cv.setFillColor(SLATE_500)
            cv.setFont("Helvetica", 7)
            cv.drawString(cx + 11, cy + 15, card["sub"])

    # ═════════════════════════════════════════════════════════════════════════
    # 4. DETALHAMENTO DO ORÇAMENTO
    # ═════════════════════════════════════════════════════════════════════════
    cursor -= 28
    section_label(cv, "DETALHAMENTO DO ORÇAMENTO", MARGIN, cursor)
    cursor -= 14

    # Monta linhas da tabela
    base_cents = (
        p["total_cash_cents"]
        - p.get("excess_area_cents", 0)
        - p.get("displacement_cents", 0)
        - sum(u.get("priceCents", 0) for u in p.get("upsells", []))
    )
    rows = [["Item", "Descrição", "Valor"]]
    rows.append(["Sistema Base", f"Piscina até {p.get('base_area_limit', 18)} m² (incluso)", brl(base_cents)])

    if p.get("excess_area_cents", 0) > 0:
        base_limit = p.get("base_area_limit", 18)
        excess_m2  = round(p["area_m2"] - base_limit, 2)
        excess_unit = round(p.get("excess_per_m2_cents", 18000) / 100)
        rows.append(["Excedente de Área", f"+{excess_m2} m² × R$ {excess_unit},00/m²", brl(p["excess_area_cents"])])

    if p.get("displacement_cents", 0) > 0:
        rows.append(["Deslocamento", p["region_label"], brl(p["displacement_cents"])])

    # Upsells genéricos
    for u in p.get("upsells", []):
        rows.append([u.get("name", "Adicional"), u.get("description", ""), brl(u.get("priceCents", 0))])

    rows.append(["TOTAL À VISTA", "", brl(total_cash)])

    TBL_W  = W - MARGIN * 2
    col_w  = [TBL_W * 0.24, TBL_W * 0.53, TBL_W * 0.23]
    tbl    = Table(rows, colWidths=col_w)
    tbl.setStyle(TableStyle([
        # Cabeçalho
        ("BACKGROUND",    (0, 0),  (-1, 0),  SLATE_800),
        ("TEXTCOLOR",     (0, 0),  (-1, 0),  WHITE),
        ("FONTNAME",      (0, 0),  (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0),  (-1, 0),  8),
        ("TOPPADDING",    (0, 0),  (-1, 0),  7),
        ("BOTTOMPADDING", (0, 0),  (-1, 0),  7),
        # Corpo
        ("FONTNAME",      (0, 1),  (-1, -2), "Helvetica"),
        ("FONTSIZE",      (0, 1),  (-1, -2), 8),
        ("TEXTCOLOR",     (0, 1),  (-1, -2), SLATE_500),
        ("TOPPADDING",    (0, 1),  (-1, -2), 6),
        ("BOTTOMPADDING", (0, 1),  (-1, -2), 6),
        ("ROWBACKGROUNDS",(0, 1),  (-1, -2), [WHITE, SLATE_50]),
        # Linha de total
        ("BACKGROUND",    (0, -1), (-1, -1), AMBER_LIGHT),
        ("FONTNAME",      (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE",      (0, -1), (-1, -1), 9.5),
        ("TEXTCOLOR",     (0, -1), (-1, -1), AMBER_DARK),
        ("TOPPADDING",    (0, -1), (-1, -1), 8),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 8),
        # Grid
        ("GRID",          (0, 0),  (-1, -1), 0.4, SLATE_200),
        ("LINEABOVE",     (0, -1), (-1, -1), 1.5, AMBER),
        # Alinhamento coluna de valor
        ("ALIGN",         (2, 0),  (2, -1),  "RIGHT"),
        ("FONTNAME",      (2, 1),  (2, -1),  "Helvetica-Bold"),
        ("TEXTCOLOR",     (2, 1),  (2, -2),  SLATE_700),
    ]))

    _, tbl_h = tbl.wrap(TBL_W, 400)
    tbl.drawOn(cv, MARGIN, cursor - tbl_h)
    cursor -= tbl_h

    # ═════════════════════════════════════════════════════════════════════════
    # 5. BLOCO "MAXIMIZE O USO DA SUA PISCINA"
    # ═════════════════════════════════════════════════════════════════════════
    cursor -= 22
    section_label(cv, "POR QUE VALER A PENA", MARGIN, cursor)
    cursor -= 12

    EMO_H = 82
    draw_rrect(cv, MARGIN, cursor - EMO_H, W - MARGIN * 2, EMO_H, 10,
               fill=BLUE_LIGHT, stroke=BLUE_BORDER, sw=0.8)

    cv.setFillColor(BLUE_TEXT)
    cv.setFont("Helvetica-Bold", 9.5)
    cv.drawString(MARGIN + 14, cursor - 16, "Maximize o uso da sua piscina")

    BAR_X = MARGIN + 14
    BAR_W = W - MARGIN * 2 - 28

    cv.setFillColor(BLUE_TEXT)
    cv.setFont("Helvetica", 8)
    cv.drawString(BAR_X, cursor - 30, "Sem aquecimento: ~90 dias/ano de uso")
    draw_rrect(cv, BAR_X, cursor - 41, BAR_W, 7, 3, fill=colors.HexColor("#FEE2E2"))
    draw_rrect(cv, BAR_X, cursor - 41, BAR_W * 0.33, 7, 3, fill=colors.HexColor("#EF4444"))

    cv.setFont("Helvetica", 8)
    cv.drawString(BAR_X, cursor - 55, "Com Sul Placas: até 270 dias/ano — 3× mais lazer!")
    draw_rrect(cv, BAR_X, cursor - 66, BAR_W, 7, 3, fill=EMERALD_LIGHT)
    draw_rrect(cv, BAR_X, cursor - 66, BAR_W * 0.99, 7, 3, fill=EMERALD)

    cursor -= EMO_H

    # ═════════════════════════════════════════════════════════════════════════
    # 6. GARANTIAS / SOCIAL PROOF
    # ═════════════════════════════════════════════════════════════════════════
    cursor -= 20
    section_label(cv, "NOSSOS DIFERENCIAIS", MARGIN, cursor)
    cursor -= 12

    BADGE_H = 44
    badges  = [
        ("10+ Anos",       "de experiência",   "☀"),
        ("500+",           "instalações",       "🏠"),
        ("Garantia 2 anos","satisfação total",  "✓"),
        ("Suporte",        "pós-instalação",    "🔧"),
    ]
    n       = len(badges)
    gap     = 7
    bw      = (W - MARGIN * 2 - gap * (n - 1)) / n

    for i, (val, sub, icon) in enumerate(badges):
        bx = MARGIN + i * (bw + gap)
        by = cursor - BADGE_H
        draw_rrect(cv, bx, by, bw, BADGE_H, 8, fill=SLATE_50, stroke=SLATE_200, sw=0.6)
        # ícone âmbar
        cv.setFillColor(AMBER_LIGHT)
        cv.circle(bx + 14, by + BADGE_H - 14, 9, fill=1, stroke=0)
        cv.setFillColor(AMBER_DARK)
        cv.setFont("Helvetica-Bold", 7)
        text_center(cv, icon, bx + 14, by + BADGE_H - 17)
        # texto
        cv.setFillColor(SLATE_800)
        cv.setFont("Helvetica-Bold", 9)
        cv.drawString(bx + 26, by + BADGE_H - 16, val)
        cv.setFillColor(SLATE_500)
        cv.setFont("Helvetica", 7.5)
        cv.drawString(bx + 26, by + BADGE_H - 28, sub)

    cursor -= BADGE_H

    # ═════════════════════════════════════════════════════════════════════════
    # 7. URGÊNCIA
    # ═════════════════════════════════════════════════════════════════════════
    cursor -= 16
    URG_H = 28
    draw_rrect(cv, MARGIN, cursor - URG_H, W - MARGIN * 2, URG_H, 8,
               fill=RED_BG, stroke=RED_BORDER, sw=0.8)
    cv.setFillColor(RED_TEXT)
    cv.setFont("Helvetica-Bold", 8.5)
    exp = p.get("expires_at_str", "—")
    cv.drawString(MARGIN + 14, cursor - 17, f"⚠  Condições de parcelamento válidas até: {exp}")
    cursor -= URG_H

    # ═════════════════════════════════════════════════════════════════════════
    # 8. CTA
    # ═════════════════════════════════════════════════════════════════════════
    cursor -= 14
    CTA_H = 28
    draw_rrect(cv, MARGIN, cursor - CTA_H, W - MARGIN * 2, CTA_H, 14, fill=AMBER)
    cv.setFillColor(SLATE_900)
    cv.setFont("Helvetica-Bold", 10.5)
    text_center(cv, "✓  Aprovar proposta via WhatsApp", W / 2, cursor - 18)
    cursor -= CTA_H

    # ═════════════════════════════════════════════════════════════════════════
    # 9. NOTA DE RODAPÉ ANTES DO FOOTER
    # ═════════════════════════════════════════════════════════════════════════
    cursor -= 10
    cv.setFillColor(SLATE_400)
    cv.setFont("Helvetica", 6.5)
    note = "Proposta gerada automaticamente. Valores sujeitos a confirmação técnica após vistoria. Não possui valor fiscal."
    text_center(cv, note, W / 2, cursor)

    # ═════════════════════════════════════════════════════════════════════════
    # 10. FOOTER
    # ═════════════════════════════════════════════════════════════════════════
    cv.setFillColor(SLATE_950)
    cv.rect(0, 0, W, 36, fill=1, stroke=0)
    cv.setFillColor(AMBER)
    cv.rect(0, 36, W, 2, fill=1, stroke=0)

    cv.setFillColor(SLATE_400)
    cv.setFont("Helvetica", 7)
    cv.drawString(MARGIN, 14, "Sul Placas Aquecimento Solar  •  sulplacas.com.br")

    if proposal_code:
        cv.setFillColor(SLATE_500)
        cv.setFont("Helvetica", 7)
        text_center(cv, proposal_code, W / 2, 14)

    cv.setFillColor(SLATE_500)
    cv.setFont("Helvetica", 7)
    cv.drawRightString(W - MARGIN, 14, f"Gerada em {p.get('created_at_str', '')}")

    cv.save()
    buf.seek(0)
    return buf.read()


# ─── Entrypoint ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if "--stdin" in sys.argv:
        raw  = sys.stdin.buffer.read()
        data = json.loads(raw.decode("utf-8"))

        # Monta upsells genéricos a partir dos campos legados + lista nova
        upsells = data.get("upsells", [])
        if not upsells:
            # Retrocompatibilidade com campos antigos
            if data.get("thermalCover"):
                upsells.append({
                    "name": "Capa Térmica",
                    "description": "Reduz 70% da evaporação",
                    "priceCents": data.get("thermalCoverPriceCents", 60000),
                })
            if data.get("wifiController"):
                upsells.append({
                    "name": "Controlador Wi-Fi",
                    "description": "Controle pelo celular",
                    "priceCents": data.get("wifiControllerPriceCents", 45000),
                })

        proposal = {
            "proposal_code":      data.get("proposalCode", ""),
            "client_name":        data["clientName"],
            "whatsapp":           data["whatsapp"],
            "email":              data.get("email", ""),
            "city":               data.get("city", ""),
            "length_m":           data["lengthM"],
            "width_m":            data["widthM"],
            "area_m2":            data["areaM2"],
            "region_label":       data["regionLabel"],
            "total_cash_cents":   data["totalCashCents"],
            "excess_area_cents":  data["excessAreaCents"],
            "displacement_cents": data["displacementCents"],
            "base_area_limit":    data.get("baseAreaLimit", 18),
            "excess_per_m2_cents":data.get("excessPerM2Cents", 18000),
            "upsells":            upsells,
            "rate_12x":           data.get("rate12x", 112),
            "rate_18x":           data.get("rate18x", 116),
            "months_12x":         data.get("months12x", 12),
            "months_18x":         data.get("months18x", 18),
            "expires_at_str":     data["expiresAtStr"],
            "created_at_str":     data.get("createdAtStr", ""),
        }
        pdf_bytes = generate_proposal_pdf(proposal)
        sys.stdout.buffer.write(pdf_bytes)

    else:
        # Modo dev: gera exemplo em /tmp
        sample = {
            "proposal_code":       "ORC-2025-0042",
            "client_name":         "Lucas Ramon",
            "whatsapp":            "(51) 99999-0000",
            "email":               "lucas@email.com",
            "city":                "Porto Alegre",
            "length_m":            6,
            "width_m":             4,
            "area_m2":             24,
            "region_label":        "Porto Alegre",
            "total_cash_cents":    558000,
            "excess_area_cents":   108000,
            "displacement_cents":  0,
            "base_area_limit":     18,
            "excess_per_m2_cents": 18000,
            "upsells": [
                {"name": "Capa Térmica",      "description": "Reduz 70% da evaporação", "priceCents": 60000},
                {"name": "Controlador Wi-Fi", "description": "Controle pelo celular",   "priceCents": 45000},
            ],
            "rate_12x":      112,
            "rate_18x":      116,
            "months_12x":    12,
            "months_18x":    18,
            "expires_at_str": "19/05/2025",
            "created_at_str": "12/05/2025",
        }
        out = "/tmp/proposta_sulplacas_teste.pdf"
        with open(out, "wb") as f:
            f.write(generate_proposal_pdf(sample))
        print(f"PDF gerado: {out}")
