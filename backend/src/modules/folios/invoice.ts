import PDFDocument from "pdfkit";
import type { Response } from "express";

interface InvoiceData {
  property: { name: string; address: string; currency: string };
  reservation: {
    id: string;
    check_in: string | Date;
    check_out: string | Date;
    room_number: string;
    room_type_name: string;
    guest_name: string;
    guest_email: string | null;
  };
  folio: { id: string; balance: string; status: string };
  lineItems: Array<{ description: string; amount: string; posted_at: string | Date }>;
  payments: Array<{ method: string; amount: string; status: string; created_at: string | Date }>;
}

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Streams a simple, professional invoice PDF directly to the HTTP response.
 * Kept deliberately plain (no external assets/fonts) so it renders
 * identically regardless of the server's environment.
 */
export function streamInvoicePdf(res: Response, data: InvoiceData): void {
  const { property, reservation, folio, lineItems, payments } = data;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="invoice-${reservation.id.slice(0, 8)}.pdf"`);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.pipe(res);

  // Header
  doc.fontSize(18).fillColor("#0F6E56").text(property.name, { continued: false });
  doc.fontSize(9).fillColor("#5F5E5A").text(property.address);
  doc.moveDown(1.5);
  doc.fontSize(16).fillColor("#111111").text("Invoice", { align: "right" });
  doc.fontSize(9).fillColor("#5F5E5A").text(`Reservation ref: ${reservation.id}`, { align: "right" });
  doc.text(`Folio status: ${folio.status}`, { align: "right" });
  doc.moveDown(1.5);

  // Guest / stay details
  doc.fontSize(11).fillColor("#111111").text("Billed to:", { underline: false });
  doc.fontSize(10).fillColor("#333333").text(reservation.guest_name);
  if (reservation.guest_email) doc.text(reservation.guest_email);
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#333333").text(
    `Room ${reservation.room_number} (${reservation.room_type_name})  ·  ${formatDate(reservation.check_in)} to ${formatDate(reservation.check_out)}`
  );
  doc.moveDown(1);

  // Line items table
  const tableTop = doc.y;
  doc.fontSize(10).fillColor("#FFFFFF");
  doc.rect(50, tableTop, 495, 20).fill("#0F6E56");
  doc.fillColor("#FFFFFF").text("Description", 58, tableTop + 5, { width: 320 });
  doc.text("Amount", 420, tableTop + 5, { width: 115, align: "right" });

  let y = tableTop + 24;
  doc.fillColor("#111111").fontSize(9.5);
  lineItems.forEach((item, i) => {
    if (i % 2 === 1) {
      doc.rect(50, y - 3, 495, 18).fill("#F7F7F4");
      doc.fillColor("#111111");
    }
    doc.text(item.description, 58, y, { width: 320 });
    doc.text(`${property.currency} ${Number(item.amount).toLocaleString()}`, 420, y, { width: 115, align: "right" });
    y += 18;
  });

  payments.forEach((p) => {
    doc.fillColor("#0F6E56");
    doc.text(`Payment received (${p.method.toLowerCase()}) — ${p.status}`, 58, y, { width: 320 });
    doc.text(`- ${property.currency} ${Number(p.amount).toLocaleString()}`, 420, y, { width: 115, align: "right" });
    doc.fillColor("#111111");
    y += 18;
  });

  y += 8;
  doc.moveTo(50, y).lineTo(545, y).strokeColor("#DDDDDD").stroke();
  y += 10;

  doc.fontSize(11).fillColor(Number(folio.balance) > 0 ? "#993C1D" : "#0F6E56");
  doc.text(
    `Balance ${Number(folio.balance) > 0 ? "due" : "paid in full"}: ${property.currency} ${Number(folio.balance).toLocaleString()}`,
    350,
    y,
    { width: 185, align: "right" }
  );

  doc.moveDown(3);
  doc.fontSize(8).fillColor("#888780").text(
    "Thank you for staying with us. This invoice was generated automatically and is valid without a signature.",
    50,
    doc.y,
    { width: 495, align: "center" }
  );

  doc.end();
}
