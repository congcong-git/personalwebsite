// 生成占位简历 PDF（合法结构，含正确 xref 偏移）。
// 这是占位文件，部署前请替换为你的真实简历 PDF。
import fs from "node:fs";
import path from "node:path";

const lines = [
  "BT /F1 28 Tf 72 760 Td (xuniw) Tj ET",
  "BT /F1 16 Tf 72 728 Td (Resume / 个人简历) Tj ET",
  "BT /F1 12 Tf 72 690 Td (----------------------------------------) Tj ET",
  "BT /F1 12 Tf 72 660 Td (Position: Automation Palletizing / Robotics Engineer) Tj ET",
  "BT /F1 12 Tf 72 642 Td (Skills:    Algorithms, Robotics, Next.js, Node.js, MySQL) Tj ET",
  "BT /F1 12 Tf 72 624 Td (Email:    you@example.com) Tj ET",
  "BT /F1 11 Tf 72 590 Td (TODO: replace this placeholder with your real resume PDF.) Tj ET",
  "BT /F1 11 Tf 72 572 Td (Please replace with your real resume PDF before deploy.) Tj ET",
];

function buildPdf() {
  const objects = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push(
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>"
  );
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const stream = lines.join("\n");
  objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.forEach((off) => {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return pdf;
}

const out = path.join(process.cwd(), "public", "resume.pdf");
fs.writeFileSync(out, buildPdf(), "latin1");
console.log("written:", out);
