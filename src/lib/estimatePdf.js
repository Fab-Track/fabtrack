import jsPDF from "jspdf";
import { format, parseISO } from "date-fns";

// Generates a formatted, paginated PDF of an estimate — mirrors the
// EstimateCustomerView layout. Used so users can download a copy to email/text
// to the customer manually.
export function generateEstimatePDF({ estimate, job, customer, businessInfo, contractText }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageW = 215.9;
  const pageH = 279.4;
  const margin = 18;
  const contentW = pageW - margin * 2;
  const BOTTOM_MARGIN = 20;
  const usableBottom = pageH - BOTTOM_MARGIN;
  const LINE_H = 5.5;

  const estNum = estimate?.estimate_number || "EST-DRAFT";
  const status = estimate?.status || "Draft";
  const lines = estimate?.line_items || [];
  const viewMode = estimate?.view_mode || "summary";

  const subtotal = lines.reduce((s, l) => s + (l.total || 0), 0);
  const discountPct = estimate?.discount_percent || 0;
  const discountAmt = subtotal * (discountPct / 100);
  const afterDiscount = subtotal - discountAmt;
  const markupPct = estimate?.markup_percent || 0;
  const markupAmt = afterDiscount * (markupPct / 100);
  const afterMarkup = afterDiscount + markupAmt;
  const overheadPct = estimate?.overhead_percent || 0;
  const overheadAmt = afterMarkup * (overheadPct / 100);
  const afterOverhead = afterMarkup + overheadAmt;
  const taxPct = estimate?.tax_percent || 0;
  const taxAmt = afterOverhead * (taxPct / 100);
  const total = afterOverhead + taxAmt;

  function drawContinuationHeader() {
    doc.setFillColor(34, 47, 62);
    doc.rect(0, 0, pageW, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("High Country Metal Works", margin, 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(200, 210, 220);
    doc.text(`${estNum}  ·  ESTIMATE — continued`, pageW - margin, 9, { align: "right" });
  }

  function checkBreak(neededSpace = LINE_H) {
    if (y + neededSpace > usableBottom) {
      doc.addPage();
      drawContinuationHeader();
      y = 22;
    }
  }

  let y = 0;

  // Page 1 header
  doc.setFillColor(34, 47, 62);
  doc.rect(0, 0, pageW, 38, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("High Country Metal Works", margin, 16);
  if (businessInfo?.address) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 210, 220);
    doc.text(businessInfo.address, margin, 22);
  }
  if (businessInfo?.phone) {
    doc.text(businessInfo.phone, margin, 27);
  }

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 210, 220);
  doc.text("ESTIMATE", pageW - margin, 11, { align: "right" });
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(estNum, pageW - margin, 19, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(240, 240, 240);
  doc.text(status, pageW - margin, 26, { align: "right" });

  y = 50;

  // Bill To + Dates
  doc.setTextColor(100, 110, 120);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", margin, y);
  const rightColX = margin + contentW * 0.55;
  doc.text("JOB DETAILS", rightColX, y);

  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 40, 50);
  const billStartY = y;
  doc.text(customer?.name || job?.customer_name || "—", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 90, 100);
  if (customer?.email) { y += 5; doc.text(customer.email, margin, y); }
  if (customer?.phone) { y += 4.5; doc.text(customer.phone, margin, y); }
  if (customer?.address) { y += 4.5; doc.text(customer.address, margin, y); }

  let ry = billStartY;
  doc.setFontSize(8.5);
  doc.setTextColor(80, 90, 100);
  if (job?.job_name) { doc.text(`Job: ${job.job_name}`, rightColX, ry); ry += 5; }
  if (estimate?.estimate_date) { doc.text(`Date: ${format(parseISO(estimate.estimate_date), "MMM d, yyyy")}`, rightColX, ry); ry += 5; }
  if (estimate?.expiration_date) { doc.text(`Expires: ${format(parseISO(estimate.expiration_date), "MMM d, yyyy")}`, rightColX, ry); ry += 5; }

  y = Math.max(y, ry) + 10;

  // Divider
  doc.setDrawColor(220, 225, 230);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 7;

  // Line items header
  doc.setFillColor(245, 247, 249);
  doc.rect(margin, y - 3, contentW, 8, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 110, 120);

  if (viewMode === "summary") {
    doc.text("DESCRIPTION", margin + 2, y + 2);
    doc.text("QTY", margin + contentW * 0.72, y + 2, { align: "right" });
    doc.text("AMOUNT", pageW - margin - 2, y + 2, { align: "right" });
  } else {
    doc.text("DESCRIPTION", margin + 2, y + 2);
    doc.text("QTY", margin + contentW * 0.55, y + 2, { align: "right" });
    doc.text("UNIT COST", margin + contentW * 0.72, y + 2, { align: "right" });
    doc.text("AMOUNT", pageW - margin - 2, y + 2, { align: "right" });
  }
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  lines.forEach((line, idx) => {
    const desc = line.description || "—";
    const descLines = doc.splitTextToSize(desc, contentW * 0.55);
    const rowH = descLines.length > 1 ? descLines.length * LINE_H + 2 : 7;
    checkBreak(rowH);

    if (idx % 2 === 1) {
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, y - 3, contentW, rowH, "F");
    }
    doc.setTextColor(30, 40, 50);
    doc.text(descLines, margin + 2, y);

    if (viewMode === "summary") {
      doc.setTextColor(80, 90, 100);
      doc.text(String(line.quantity || 0), margin + contentW * 0.72, y, { align: "right" });
      doc.setTextColor(30, 40, 50);
      doc.text(`$${(line.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, pageW - margin - 2, y, { align: "right" });
    } else {
      doc.setTextColor(80, 90, 100);
      doc.text(`${line.quantity || 0} ${line.unit || ""}`.trim(), margin + contentW * 0.55, y, { align: "right" });
      doc.text(`$${(line.unit_cost || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, margin + contentW * 0.72, y, { align: "right" });
      doc.setTextColor(30, 40, 50);
      doc.text(`$${(line.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, pageW - margin - 2, y, { align: "right" });
    }
    y += rowH;
  });

  checkBreak(10);
  doc.setDrawColor(220, 225, 230);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // Totals
  const totalsX = margin + contentW * 0.58;
  const totalsValX = pageW - margin - 2;

  function totalsRow(label, value, bold = false, color = null) {
    checkBreak(7);
    if (color) doc.setTextColor(...color);
    else doc.setTextColor(80, 90, 100);
    doc.setFontSize(9);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, totalsX, y);
    doc.text(value, totalsValX, y, { align: "right" });
    y += 6;
  }

  totalsRow("Subtotal", `$${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
  if (discountPct > 0) totalsRow(`Discount (${discountPct}%)`, `−$${discountAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, false, [180, 50, 50]);
  if (markupPct > 0) totalsRow(`Markup (${markupPct}%)`, `+$${markupAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
  if (overheadPct > 0) totalsRow(`Overhead (${overheadPct}%)`, `+$${overheadAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
  if (taxPct > 0) totalsRow(`Tax (${taxPct}%)`, `+$${taxAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);

  checkBreak(10);
  doc.setDrawColor(180, 185, 195);
  doc.line(totalsX, y, totalsValX, y);
  y += 4;
  totalsRow("Total", `$${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, true, [30, 40, 50]);

  y += 8;

  // Notes
  if (estimate?.notes) {
    const noteLines = doc.splitTextToSize(estimate.notes, contentW - 8);
    const noteH = noteLines.length * LINE_H + 14;
    checkBreak(noteH);
    doc.setFillColor(248, 249, 250);
    doc.rect(margin, y, contentW, noteH, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 110, 120);
    doc.text("NOTES", margin + 4, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(40, 50, 60);
    doc.text(noteLines, margin + 4, y + 12);
    y += noteH + 8;
  }

  // Terms & Conditions
  checkBreak(14);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 110, 120);
  doc.text("TERMS & CONDITIONS", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(80, 90, 100);
  const termsText = contractText || "";
  if (termsText) {
    const termsLines = doc.splitTextToSize(termsText, contentW);
    termsLines.forEach(line => {
      checkBreak(LINE_H + 1);
      doc.text(line, margin, y);
      y += LINE_H;
    });
  }

  y += 6;

  // Signature block
  checkBreak(24);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 110, 120);
  doc.text("SIGNATURE & AUTHORIZATION", margin, y);
  y += 8;
  doc.setDrawColor(120, 125, 135);
  doc.setLineWidth(0.3);
  const sigW = (contentW - 10) / 2;
  doc.line(margin, y + 12, margin + sigW, y + 12);
  doc.line(margin + sigW + 10, y + 12, margin + contentW, y + 12);
  doc.setFontSize(7);
  doc.setTextColor(100, 110, 120);
  doc.text("Customer Signature", margin, y + 16);
  doc.text("Printed Name", margin + sigW + 10, y + 16);

  const filename = `${estNum}_${job?.job_name?.replace(/\s+/g, "_") || "Estimate"}.pdf`;
  doc.save(filename);
}