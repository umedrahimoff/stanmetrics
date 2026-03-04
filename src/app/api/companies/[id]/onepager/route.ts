import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import pool from "@/lib/db";

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

    const result = await pool.query(
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
        COALESCE(c.short_description->>'en', c.description->>'en', c.short_description->>'ru', c.description->>'ru') as short_desc,
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
    );

    const row = result.rows[0];
    if (!row) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]); // A4
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const margin = 50;
    let y = page.getHeight() - margin;

    const stanbaseBlue = rgb(0.0, 0.533, 0.8);

    // Stanbase header
    page.drawText("Stanbase", {
      x: margin,
      y,
      size: 12,
      font: fontBold,
      color: stanbaseBlue,
    });
    y -= 30;

    // Company name
    const name = String(row.name || "Company");
    page.drawText(name, {
      x: margin,
      y,
      size: 24,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 30;

    // Company info
    const info: string[] = [];
    if (row.industries) info.push(String(row.industries));
    if (row.country) info.push(String(row.country));
    if (row.city) info.push(String(row.city));
    if (row.stage) info.push(String(row.stage));
    if (info.length > 0) {
      page.drawText(info.join(" · "), {
        x: margin,
        y,
        size: 10,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= 20;
    }

    // Details
    const details: { label: string; value: string }[] = [];
    if (row.founded) details.push({ label: "Founded", value: String(row.founded) });
    if (row.employees_count != null) details.push({ label: "Employees", value: String(row.employees_count) });
    if (row.website) details.push({ label: "Website", value: String(row.website) });

    details.forEach((d) => {
      page.drawText(`${d.label}: `, { x: margin, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
      const labelWidth = fontBold.widthOfTextAtSize(`${d.label}: `, 10);
      page.drawText(d.value, { x: margin + labelWidth, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
      y -= 16;
    });
    y -= 10;

    // Description
    const desc = row.description || row.short_desc;
    if (desc) {
      const descStr = String(desc).slice(0, 500);
      const words = descStr.split(/\s+/);
      const lines: string[] = [];
      let line = "";
      for (const w of words) {
        if (line.length + w.length + 1 > 75) {
          if (line) lines.push(line);
          line = w;
        } else {
          line = line ? `${line} ${w}` : w;
        }
      }
      if (line) lines.push(line);
      page.drawText("About", { x: margin, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
      y -= 14;
      lines.slice(0, 8).forEach((line) => {
        page.drawText(line, { x: margin, y, size: 9, font, color: rgb(0.3, 0.3, 0.3) });
        y -= 12;
      });
      y -= 10;
    }

    // Stanbase link
    const stanbaseUrl = row.slug ? `https://stanbase.tech/companies/${row.slug}` : "https://stanbase.tech";
    page.drawText("View on Stanbase:", { x: margin, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    y -= 14;
    page.drawText(stanbaseUrl, {
      x: margin,
      y,
      size: 10,
      font,
      color: stanbaseBlue,
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
