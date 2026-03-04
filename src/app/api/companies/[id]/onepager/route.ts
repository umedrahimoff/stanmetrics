import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import pool from "@/lib/db";

const STANBASE_BLUE = rgb(0.08, 0.416, 1); // #146AFF

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (line.length + w.length + 1 > maxChars) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function formatAmount(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const companyId = parseInt(id, 10);
    if (isNaN(companyId)) {
      return NextResponse.json({ error: "Invalid company ID" }, { status: 400 });
    }

    const [companyRes, roundsRes] = await Promise.all([
      pool.query(
        {
          text: `
        SELECT 
          c.id,
          c.name,
          COALESCE(c.short_description->>'en', c.description->>'en', c.short_description->>'ru', c.description->>'ru') as description,
          c.founded,
          c.employees_count,
          COALESCE(co.name->>'en', co.name->>'ru', co.name::text) as country,
          COALESCE(s.name_en, s.name) as stage,
          COALESCE(ci.name->>'en', ci.name->>'ru', ci.name::text) as city,
          c.website,
          (
            SELECT string_agg(COALESCE(i.name_en, i.name), ', ')
            FROM json_array_elements(COALESCE(c.industries, '[]'::json)) elem,
            industries i
            WHERE i.id = (elem::text)::int
          ) as industries,
          o.slug
        FROM companies c
        LEFT JOIN (SELECT organization_id, slug FROM organizations WHERE organization_type = 'App\\Models\\Company' AND deleted_at IS NULL) o ON o.organization_id::bigint = c.id
        LEFT JOIN countries co ON co.id = c.country_id
        LEFT JOIN stages s ON s.id = c.stage_id
        LEFT JOIN cities ci ON ci.id = c.city_id
        WHERE c.id = $1 AND c.deleted_at IS NULL
      `,
          values: [companyId],
        }
      ),
      pool.query(
        {
          text: `
        SELECT 
          r.date,
          r.amount,
          r.valuation,
          COALESCE(s.name_en, s.name) as stage,
          irt.name as round_type,
          (
            SELECT string_agg(n, ', ')
            FROM (
              SELECT i.name as n FROM investment_round_investor iri
              JOIN investors i ON i.id = iri.investor_id AND i.deleted_at IS NULL
              WHERE iri.investment_round_id = r.id
              UNION ALL
              SELECT ei.name as n FROM external_investors ei
              WHERE ei.investment_round_id = r.id
            ) u
          ) as investors
        FROM investment_rounds r
        LEFT JOIN stages s ON s.id = r.stage_id
        LEFT JOIN investment_round_types irt ON irt.id = r.investment_round_type_id
        WHERE r.company_id = $1 AND r.status_id = 1
        ORDER BY r.date DESC NULLS LAST
      `,
          values: [companyId],
        }
      ),
    ]);

    const row = companyRes.rows[0];
    if (!row) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const rounds = roundsRes.rows;
    const totalFunding = rounds.reduce((sum: number, r: { amount: number | null }) => sum + (r.amount || 0), 0);

    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const margin = 50;
    const maxWidth = 495;
    let y = page.getHeight() - margin;

    const section = (title: string, color = rgb(0.1, 0.1, 0.1)) => {
      page.drawText(title, { x: margin, y, size: 11, font: fontBold, color });
      y -= 16;
    };

    const text = (str: string, size = 10) => {
      page.drawText(str, { x: margin, y, size, font, color: rgb(0.3, 0.3, 0.3) });
      y -= size + 2;
    };

    const labelVal = (label: string, value: string | number | null) => {
      if (value == null || value === "") return;
      page.drawText(`${label}: `, { x: margin, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
      const lw = fontBold.widthOfTextAtSize(`${label}: `, 10);
      page.drawText(String(value), { x: margin + lw, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
      y -= 14;
    };

    // Header
    page.drawText("Stanbase", { x: margin, y, size: 14, font: fontBold, color: STANBASE_BLUE });
    y -= 8;
    page.drawText("Central Asia Startups & Investors Database", { x: margin, y, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
    y -= 28;

    // Company name
    const name = String(row.name || "Company");
    page.drawText(name, { x: margin, y, size: 22, font: fontBold, color: rgb(0.05, 0.05, 0.05) });
    y -= 24;

    // Quick info
    const info: string[] = [];
    if (row.industries) info.push(String(row.industries));
    if (row.country) info.push(String(row.country));
    if (row.city) info.push(String(row.city));
    if (row.stage) info.push(String(row.stage));
    if (info.length > 0) {
      page.drawText(info.join(" · "), { x: margin, y, size: 10, font, color: rgb(0.45, 0.45, 0.45) });
      y -= 20;
    }

    // Company details
    section("Company");
    labelVal("Founded", row.founded);
    labelVal("Employees", row.employees_count);
    labelVal("Stage", row.stage);
    labelVal("Country", row.country);
    labelVal("City", row.city);
    labelVal("Industries", row.industries);
    labelVal("Website", row.website);
    if (totalFunding > 0) {
      labelVal("Total funding", formatAmount(totalFunding));
    }
    labelVal("Rounds", rounds.length > 0 ? String(rounds.length) : null);
    y -= 8;

    // About
    const desc = row.description;
    if (desc) {
      section("About");
      wrapText(String(desc).slice(0, 800), 75).slice(0, 12).forEach((line) => text(line, 9));
      y -= 8;
    }

    // Investment rounds
    if (rounds.length > 0) {
      section("Investment rounds");
      rounds.slice(0, 10).forEach((r: { date: string | null; amount: number | null; stage: string | null; round_type: string | null; investors: string | null }) => {
        const dateStr = r.date ? new Date(r.date).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—";
        const parts = [dateStr, formatAmount(r.amount), r.stage || "", r.round_type || ""].filter(Boolean);
        page.drawText(parts.join(" · "), { x: margin, y, size: 9, font, color: rgb(0.35, 0.35, 0.35) });
        y -= 12;
        if (r.investors) {
          page.drawText(`  Investors: ${String(r.investors).slice(0, 70)}${String(r.investors).length > 70 ? "..." : ""}`, {
            x: margin,
            y,
            size: 8,
            font,
            color: rgb(0.5, 0.5, 0.5),
          });
          y -= 11;
        }
      });
      y -= 8;
    }

    // Stanbase link
    const stanbaseUrl = row.slug ? `https://stanbase.tech/companies/${row.slug}` : "https://stanbase.tech";
    section("View full profile");
    page.drawText(stanbaseUrl, { x: margin, y, size: 10, font, color: STANBASE_BLUE });
    y -= 14;
    page.drawText("Stanbase — Central Asia Startups and Investors Database", {
      x: margin,
      y,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await doc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${(name || "company").replace(/[^a-z0-9]/gi, "-")}-onepager.pdf"`,
      },
    });
  } catch (error) {
    console.error("OnePager error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}
