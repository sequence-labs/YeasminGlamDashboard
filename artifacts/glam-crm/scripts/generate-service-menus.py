#!/usr/bin/env python3
"""Generate the static GLAMBYEASMIN general and Florida service menus."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from PIL import Image
from reportlab.lib.colors import Color, HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[3]
PUBLIC_DIR = ROOT / "artifacts" / "glam-crm" / "public" / "service-menus"
OUTPUT_DIR = ROOT / "output" / "pdf"
TMP_DIR = ROOT / "tmp" / "pdfs" / "service-menus"
EDITORIAL_IMAGE = PUBLIC_DIR / "bridal-editorial.png"

PAGE_W, PAGE_H = letter
IVORY = HexColor("#F5F0E8")
PAPER = HexColor("#FCFAF6")
OXBLOOD = HexColor("#74263A")
OXBLOOD_DARK = HexColor("#421923")
CHAMPAGNE = HexColor("#B89A62")
TAUPE = HexColor("#756A61")
INK = HexColor("#241E1A")
HAIRLINE = HexColor("#D9CEC0")
WHITE_WASH = Color(1, 1, 1, alpha=0.88)


def register_fonts() -> None:
    fonts = {
        "GlamSans": "/System/Library/Fonts/Supplemental/Arial.ttf",
        "GlamSans-Bold": "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "GlamSerif": "/System/Library/Fonts/Supplemental/Georgia.ttf",
        "GlamSerif-Bold": "/System/Library/Fonts/Supplemental/Georgia Bold.ttf",
        "GlamSerif-Italic": "/System/Library/Fonts/Supplemental/Georgia Italic.ttf",
    }
    for name, path in fonts.items():
        pdfmetrics.registerFont(TTFont(name, path))


def paragraph_style(name: str, **overrides) -> ParagraphStyle:
    values = {
        "fontName": "GlamSans",
        "fontSize": 8.2,
        "leading": 11.2,
        "textColor": INK,
        "alignment": TA_LEFT,
        "spaceAfter": 0,
        "allowWidows": 0,
        "allowOrphans": 0,
    }
    values.update(overrides)
    return ParagraphStyle(name, **values)


BODY = paragraph_style("Body")
BODY_SMALL = paragraph_style("BodySmall", fontSize=7.5, leading=10.1, textColor=TAUPE)
BODY_LIGHT = paragraph_style("BodyLight", fontSize=8, leading=10.8, textColor=TAUPE)
SERIF_NOTE = paragraph_style("SerifNote", fontName="GlamSerif-Italic", fontSize=9.5, leading=13, textColor=OXBLOOD_DARK)


def draw_paragraph(c: canvas.Canvas, text: str, x: float, top: float, width: float, style: ParagraphStyle = BODY) -> float:
    para = Paragraph(text, style)
    _, height = para.wrap(width, PAGE_H)
    para.drawOn(c, x, top - height)
    return top - height


def crop_image(c: canvas.Canvas, image_path: Path, x: float, y: float, width: float, height: float) -> None:
    with Image.open(image_path) as image:
        source_w, source_h = image.size
    scale = max(width / source_w, height / source_h)
    draw_w = source_w * scale
    draw_h = source_h * scale
    c.saveState()
    path = c.beginPath()
    path.rect(x, y, width, height)
    c.clipPath(path, stroke=0, fill=0)
    c.drawImage(ImageReader(str(image_path)), x + (width - draw_w) / 2, y + (height - draw_h) / 2, draw_w, draw_h, mask="auto")
    c.restoreState()


def draw_brand(c: canvas.Canvas, edition: str, page_number: int) -> None:
    c.setFillColor(OXBLOOD)
    c.setFont("GlamSans-Bold", 8)
    c.drawString(44, PAGE_H - 32, "G L A M B Y E A S M I N")
    c.setFillColor(TAUPE)
    c.setFont("GlamSans", 6.8)
    c.drawRightString(PAGE_W - 44, PAGE_H - 32, f"{edition.upper()} EDITION")
    c.setStrokeColor(HAIRLINE)
    c.setLineWidth(0.5)
    c.line(44, 31, PAGE_W - 44, 31)
    c.setFillColor(TAUPE)
    c.setFont("GlamSans", 6.5)
    c.drawString(44, 19, "BRIDAL SERVICES & PRICING")
    c.drawRightString(PAGE_W - 44, 19, f"0{page_number}")


def draw_price(c: canvas.Canvas, amount: str, x: float, baseline: float, size: float = 20) -> None:
    c.setFillColor(OXBLOOD)
    c.setFont("GlamSerif", size)
    c.drawRightString(x, baseline, amount)


def draw_service_block(
    c: canvas.Canvas,
    x: float,
    top: float,
    width: float,
    title: str,
    price: str,
    body: str,
    note: str | None = None,
) -> float:
    c.setFillColor(OXBLOOD_DARK)
    c.setFont("GlamSerif-Bold", 11.6)
    c.drawString(x, top, title)
    draw_price(c, price, x + width, top - 1, 15)
    c.setStrokeColor(CHAMPAGNE)
    c.setLineWidth(0.7)
    c.line(x, top - 8, x + 30, top - 8)
    bottom = draw_paragraph(c, body, x, top - 18, width, BODY)
    if note:
        bottom = draw_paragraph(c, note, x, bottom - 5, width, BODY_SMALL)
    return bottom


def draw_cover_intro(c: canvas.Canvas, edition: str) -> float:
    image_y = PAGE_H - 268
    crop_image(c, EDITORIAL_IMAGE, 0, image_y, PAGE_W, 224)
    c.setFillColor(WHITE_WASH)
    c.roundRect(36, PAGE_H - 222, 290, 130, 5, stroke=0, fill=1)
    c.setFillColor(OXBLOOD)
    c.setFont("GlamSans-Bold", 7.4)
    c.drawString(52, PAGE_H - 112, "BRIDAL ARTISTRY, THOUGHTFULLY TAILORED")
    c.setFillColor(OXBLOOD_DARK)
    c.setFont("GlamSerif", 28)
    c.drawString(52, PAGE_H - 146, "Services & Pricing")
    c.setFillColor(TAUPE)
    c.setFont("GlamSans", 8.8)
    c.drawString(52, PAGE_H - 168, f"{edition} collection")
    c.setStrokeColor(CHAMPAGNE)
    c.setLineWidth(1)
    c.line(52, PAGE_H - 185, 126, PAGE_H - 185)
    return image_y - 24


def draw_page_one(c: canvas.Canvas, edition: str) -> None:
    c.setFillColor(IVORY)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    draw_brand(c, edition, 1)
    top = draw_cover_intro(c, edition)

    c.setFillColor(OXBLOOD)
    c.setFont("GlamSans-Bold", 7.3)
    c.drawString(44, top, "THE BRIDAL ESSENTIALS")
    top -= 29
    gap = 28
    column_w = (PAGE_W - 88 - gap) / 2
    left_x = 44
    right_x = left_x + column_w + gap

    left = draw_service_block(
        c,
        left_x,
        top,
        column_w,
        "Bridal Makeup",
        "$400",
        "Luxury skin prep with under-eye patches and professional products for a flawless, long-lasting finish. Lashes are included. Every look is customized to enhance your features and create your dream bridal look.",
    )
    left = draw_service_block(
        c,
        left_x,
        left - 26,
        column_w,
        "Bridal Set Up",
        "$50",
        "Dupatta or veil placement and jewelry placement for a polished bridal finish.",
    )
    draw_service_block(
        c,
        left_x,
        left - 26,
        column_w,
        "Makeup Trial",
        "$150",
        "A personalized trial to perfect your makeup to your liking for your big day.",
    )

    right = draw_service_block(
        c,
        right_x,
        top,
        column_w,
        "Bridal Hair",
        "$300",
        "Hairstyling based on your desired look, from a polished bun to romantic waves. Hair padding, bobby pins, and safety pins are included for a secure finish.",
        "Please arrive with clean, washed, completely dry hair. Hair extensions must be provided by the bride. Recommended brand: Bellami.",
    )
    right = draw_service_block(
        c,
        right_x,
        right - 24,
        column_w,
        "Synthetic Bun Extension",
        "$15",
        "Optional add-on for a fuller bridal bun.",
    )
    draw_service_block(
        c,
        right_x,
        right - 24,
        column_w,
        "Bridal Hijab Set Up",
        "$50",
        "Secure, elegant hijab styling customized to your bridal look. Gel, hairspray, and strong-hold techniques keep everything beautifully in place throughout the day.",
        "Please bring your preferred hijab and under cap. Cotton or jersey fabrics are recommended for the best hold.",
    )


def draw_package_panel(c: canvas.Canvas, x: float, top: float, width: float, title: str, price: str, kicker: str, body: str) -> float:
    c.setFillColor(PAPER)
    c.setStrokeColor(HAIRLINE)
    c.setLineWidth(0.7)
    c.roundRect(x, top - 112, width, 112, 8, stroke=1, fill=1)
    c.setFillColor(CHAMPAGNE)
    c.setFont("GlamSans-Bold", 6.5)
    c.drawString(x + 16, top - 19, kicker.upper())
    c.setFillColor(OXBLOOD_DARK)
    c.setFont("GlamSerif-Bold", 12.2)
    c.drawString(x + 16, top - 40, title)
    draw_price(c, price, x + width - 16, top - 40, 17)
    draw_paragraph(c, body, x + 16, top - 56, width - 32, BODY_LIGHT)
    return top - 112


def draw_detail_row(c: canvas.Canvas, x: float, top: float, width: float, label: str, value: str, body: str) -> float:
    c.setFillColor(OXBLOOD_DARK)
    c.setFont("GlamSans-Bold", 8)
    c.drawString(x, top, label.upper())
    c.setFillColor(OXBLOOD)
    c.setFont("GlamSerif-Bold", 11.5)
    c.drawRightString(x + width, top, value)
    bottom = draw_paragraph(c, body, x, top - 14, width, BODY_SMALL)
    c.setStrokeColor(HAIRLINE)
    c.setLineWidth(0.45)
    c.line(x, bottom - 10, x + width, bottom - 10)
    return bottom - 24


def draw_page_two(c: canvas.Canvas, edition: str, bundle_price: int) -> None:
    c.setFillColor(IVORY)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    draw_brand(c, edition, 2)

    c.setFillColor(OXBLOOD)
    c.setFont("GlamSans-Bold", 7.3)
    c.drawString(44, PAGE_H - 74, "CURATED EXPERIENCES")
    c.setFillColor(OXBLOOD_DARK)
    c.setFont("GlamSerif", 25)
    c.drawString(44, PAGE_H - 105, "Packages for a seamless celebration")
    c.setFillColor(TAUPE)
    c.setFont("GlamSans", 8)
    c.drawString(44, PAGE_H - 124, "Thoughtfully combined services for a polished, stress-free bridal experience.")

    top = PAGE_H - 151
    gap = 16
    panel_w = (PAGE_W - 88 - gap) / 2
    draw_package_panel(
        c,
        44,
        top,
        panel_w,
        "Signature Bridal Package",
        "$700",
        "Complete bridal experience",
        "Includes Bridal Makeup, Hairstyling, and Complete Bridal Setup for your special day.",
    )
    draw_package_panel(
        c,
        44 + panel_w + gap,
        top,
        panel_w,
        "Bridal Bundle",
        f"${bundle_price} / event",
        "Three or more bridal services",
        "Bundle your bridal events and save. Book 3 or more bridal services and enjoy $25 off each day.",
    )

    offer_top = top - 136
    c.setFillColor(OXBLOOD)
    c.roundRect(44, offer_top - 91, PAGE_W - 88, 91, 8, stroke=0, fill=1)
    c.setFillColor(HexColor("#E8D6BA"))
    c.setFont("GlamSans-Bold", 6.8)
    c.drawString(60, offer_top - 20, "SPECIAL BRIDAL OFFER")
    c.setFillColor(PAPER)
    c.setFont("GlamSerif-Bold", 13)
    c.drawString(60, offer_top - 42, "Bridal Makeup Package")
    c.setFont("GlamSerif", 17)
    c.drawRightString(PAGE_W - 60, offer_top - 42, "$700 / event")
    offer_style = paragraph_style("Offer", fontSize=8.1, leading=10.8, textColor=PAPER)
    draw_paragraph(
        c,
        "Book 2 or more bridal events and receive a <b>free Bridal Makeup Trial</b> - a $150 value. Your trial gives us the opportunity to perfect your dream look before the big day.",
        60,
        offer_top - 55,
        PAGE_W - 120,
        offer_style,
    )

    details_top = offer_top - 122
    c.setFillColor(OXBLOOD)
    c.setFont("GlamSans-Bold", 7.3)
    c.drawString(44, details_top, "TRAVEL & TIMING")
    details_top -= 24
    detail_gap = 30
    detail_w = (PAGE_W - 88 - detail_gap) / 2
    left = draw_detail_row(c, 44, details_top, detail_w, "Travel fee", "10-15 mi  /  $50", "Travel fees are separate from service pricing and are confirmed at booking.")
    left = draw_detail_row(c, 44, left, detail_w, "Travel fee", "20+ mi  /  $100", "Further distances are discussed and quoted during consultation. Clients may travel to the artist to avoid a travel fee.")
    right_x = 44 + detail_w + detail_gap
    right = draw_detail_row(c, right_x, details_top, detail_w, "Early morning", "3:00-5:00 AM  /  $200", "Applied when services begin during this time window.")
    draw_detail_row(c, right_x, right, detail_w, "Early morning", "6:00-7:00 AM  /  $75", "Applied when services begin during this time window.")

    note_y = min(left, right) - 4
    c.setFillColor(HexColor("#EEE4D8"))
    c.roundRect(44, note_y - 58, PAGE_W - 88, 58, 8, stroke=0, fill=1)
    c.setFillColor(OXBLOOD)
    c.setFont("GlamSans-Bold", 6.8)
    c.drawString(60, note_y - 18, "A NOTE ON STYLE")
    draw_paragraph(
        c,
        "I specialize in full glam makeup looks. If you are looking for completely natural glam, I may not be the right artist for you.",
        60,
        note_y - 27,
        PAGE_W - 120,
        SERIF_NOTE,
    )


def build_pdf(edition: str, bundle_price: int, output_path: Path) -> None:
    c = canvas.Canvas(str(output_path), pagesize=letter, pageCompression=1, initialFontName="GlamSans")
    c.setTitle(f"GLAMBYEASMIN Services & Pricing - {edition}")
    c.setAuthor("GLAMBYEASMIN")
    c.setSubject("Bridal services and pricing")
    draw_page_one(c, edition)
    c.showPage()
    draw_page_two(c, edition, bundle_price)
    c.showPage()
    c.save()


def render_share_assets(slug: str, pdf_path: Path) -> None:
    prefix = TMP_DIR / slug
    subprocess.run(["pdftoppm", "-png", "-r", "180", str(pdf_path), str(prefix)], check=True)
    pages = [Image.open(path).convert("RGB") for path in sorted(TMP_DIR.glob(f"{slug}-*.png"))]
    if len(pages) != 2:
        raise RuntimeError(f"Expected 2 rendered pages for {slug}; found {len(pages)}")

    for index, page in enumerate(pages, start=1):
        page.save(PUBLIC_DIR / f"{slug}-page-{index}.png", quality=95)

    gap = 28
    composite = Image.new("RGB", (pages[0].width, sum(page.height for page in pages) + gap), "#F5F0E8")
    y = 0
    for page in pages:
        composite.paste(page, (0, y))
        y += page.height + gap
    composite.save(PUBLIC_DIR / f"{slug}-share.png", optimize=True)
    for page in pages:
        page.close()


def main() -> None:
    register_fonts()
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    TMP_DIR.mkdir(parents=True, exist_ok=True)

    editions = [
        ("General", 600, "glambyeasmin-services-general"),
        ("Florida", 675, "glambyeasmin-services-florida"),
    ]
    for edition, bundle_price, slug in editions:
        output_pdf = OUTPUT_DIR / f"{slug}.pdf"
        public_pdf = PUBLIC_DIR / f"{slug}.pdf"
        build_pdf(edition, bundle_price, output_pdf)
        shutil.copy2(output_pdf, public_pdf)
        render_share_assets(slug, output_pdf)
        print(f"Generated {output_pdf}")


if __name__ == "__main__":
    main()
