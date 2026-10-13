import jsPDF from "jspdf";
import { format, parseISO } from "date-fns";
import { money } from "@/lib/costGroups";

// PDF of the customer estimate. Takes the allow-listed customer doc
// (see buildCustomerDoc) so it can never contain internal costing.
export function generateEstimatePDF(d) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const W = 215.9, M = 18, bottom = 262;
  const colX = { loc: 98, qty: 150, amt: W - M };
  let y = 24;

  const brk = (need) => { if (y + need > bottom) { doc.addPage(); y = 24; } };
  const txt = (t, x, o) => doc.text(String(t), x, y, o);

  doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  txt(d.business.name, M);
  doc.setFont("courier", "normal"); doc.setFontSize(10);
  txt(d.estimate_number, W - M, { align: "right" });
  y += 5;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(100);
  txt(d.business.address || "", M);
  txt(`Valid ${d.valid_days} days`, W - M, { align: "right" });
  doc.setTextColor(0);
  y += 10;

  doc.setFillColor(244, 242, 238); doc.rect(M, y - 4.5, W - M * 2, 7, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(100);
  txt("DESCRIPTION", M + 2); txt("INSTALL LOCATION", colX.loc); txt("QTY", colX.qty, { align: "right" }); txt("AMOUNT", colX.amt, { align: "right" });
  doc.setTextColor(0);
  y += 8;

  d.lines.forEach((l) => {
    const desc = doc.splitTextToSize(l.description || "", 76);
    brk(8 + desc.length * 4);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
    txt(`${l.name}${l.color ? " — " + l.color : ""}`, M + 2);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    txt(l.location || "—", colX.loc);
    txt(`${l.qty} ${l.unit}`.trim(), colX.qty, { align: "right" });
    doc.setFont("helvetica", "bold"); txt(money(l.amount), colX.amt, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(90);
    desc.forEach((ln) => { y += 4; txt(ln, M + 2); });
    doc.setTextColor(0);
    y += 3;
    doc.setDrawColor(225); doc.line(M, y, W - M, y);
    y += 6;
  });

  brk(60);
  const row = (label, val, bold, size = 10) => {
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size);
    txt(label, 120); txt(val, colX.amt, { align: "right" }); y += size > 10 ? 8 : 6;
  };
  y += 2;
  row("Subtotal", money(d.subtotal));
  row("Total", money(d.total), true, 13);
  row(`${d.deposit_pct}% deposit to schedule`, money(d.deposit));
  row(`Balance on completion · ${d.terms}`, money(d.balance));

  y += 6; brk(40);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); txt("Project Agreement", M); y += 5;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.splitTextToSize(`By signing, you accept this estimate and the ${d.business.name} Project Agreement, including the ${d.deposit_pct}% deposit required to schedule your project.`, W - M * 2)
    .forEach((ln) => { txt(ln, M); y += 4.5; });
  y += 4;
  if (d.signed) {
    const drawn = d.signed.signature?.startsWith("svg:");
    doc.setFont("helvetica", "bold");
    txt(`Signed by ${d.signed.printed_name}${drawn ? "" : ` (${d.signed.signature})`}`, M); y += 5;
    doc.setFont("helvetica", "normal");
    txt(`Signed ${format(parseISO(d.signed.approved_at), "MMMM d, yyyy")}`, M);
  } else {
    doc.setDrawColor(150);
    doc.line(M, y + 8, M + 80, y + 8); doc.line(M + 100, y + 8, W - M, y + 8);
    doc.setFontSize(8); doc.setTextColor(100);
    y += 12; txt("Printed name", M); txt("Signature", M + 100);
  }

  doc.save(`${d.estimate_number || "estimate"}.pdf`);
}