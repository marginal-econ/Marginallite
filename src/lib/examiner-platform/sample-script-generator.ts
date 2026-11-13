/**
 * Client-side synthetic script generator for Cambridge 0455 demonstration scripts.
 * Renders an authentic Cambridge examination booklet layout with ruled lines,
 * student handwriting simulation, annotations, and economic diagrams onto a canvas,
 * exporting a high-resolution JPEG Data URL.
 */
export function generateSampleScriptPage(
  candidateCode: string,
  pageNumber: number,
  paperTitle: string,
  content: string,
): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Page background: authentic exam paper tone
  ctx.fillStyle = "#faf9f6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Top header rule
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(60, 50, canvas.width - 120, 5);

  // Examination board header
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 18px 'Courier New', monospace";
  ctx.fillText("CAMBRIDGE ASSESSMENT INTERNATIONAL EDUCATION", 60, 85);

  ctx.font = "13px 'Courier New', monospace";
  ctx.fillStyle = "#475569";
  ctx.fillText(`0455 ECONOMICS · CANDIDATE SCRIPT · ${paperTitle.toUpperCase()}`, 60, 110);
  ctx.fillText(
    `CANDIDATE: ${candidateCode}             PAGE ${pageNumber} OF 3             CENTER NO: UK084`,
    60,
    135,
  );

  // Header separator line
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 155);
  ctx.lineTo(canvas.width - 60, 155);
  ctx.stroke();

  // Ruled lines (standard exam answer booklet)
  const lineSpacing = 36;
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  for (let y = 195; y < canvas.height - 80; y += lineSpacing) {
    ctx.beginPath();
    ctx.moveTo(60, y);
    ctx.lineTo(canvas.width - 60, y);
    ctx.stroke();
  }

  // Red left margin line
  ctx.strokeStyle = "#f87171";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(140, 155);
  ctx.lineTo(140, canvas.height - 60);
  ctx.stroke();

  // Handwritten answer content
  ctx.fillStyle = "#1e3a8a"; // dark blue ballpoint pen ink
  ctx.font = "italic 19px 'Georgia', serif";

  const paragraphs = content.split("\n");
  let currentY = 215;

  for (const para of paragraphs) {
    if (!para.trim()) {
      currentY += lineSpacing * 0.7;
      continue;
    }

    if (para.startsWith("[DIAGRAM:")) {
      // Draw diagram block
      ctx.fillStyle = "#eff6ff";
      ctx.fillRect(160, currentY - 15, 620, 190);
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(160, currentY - 15, 620, 190);

      // Axes
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(210, currentY + 150);
      ctx.lineTo(730, currentY + 150); // X-axis
      ctx.moveTo(210, currentY + 150);
      ctx.lineTo(210, currentY + 10); // Y-axis
      ctx.stroke();

      // MSC curve
      ctx.strokeStyle = "#dc2626";
      ctx.beginPath();
      ctx.moveTo(230, currentY + 140);
      ctx.lineTo(580, currentY + 25);
      ctx.stroke();

      // MPC curve
      ctx.strokeStyle = "#2563eb";
      ctx.beginPath();
      ctx.moveTo(300, currentY + 140);
      ctx.lineTo(650, currentY + 35);
      ctx.stroke();

      // Labels
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("Price (P)", 170, currentY + 15);
      ctx.fillText("Quantity (Q)", 715, currentY + 165);
      ctx.fillText("MSC = MPC + MEC", 585, currentY + 25);
      ctx.fillText("MPC (Supply)", 655, currentY + 40);
      ctx.fillText("Deadweight Loss", 390, currentY + 70);

      ctx.fillStyle = "#1e3a8a";
      ctx.font = "italic 19px 'Georgia', serif";
      currentY += 220;
      continue;
    }

    // Word wrapping
    const words = para.split(" ");
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > 950 && line) {
        ctx.fillText(line, 160, currentY);
        currentY += lineSpacing;
        line = w;
      } else {
        line = test;
      }
    }
    if (line) {
      ctx.fillText(line, 160, currentY);
      currentY += lineSpacing;
    }
  }

  // Footer
  ctx.font = "12px 'Courier New', monospace";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("UCLES 2024 · 0455 Economics · All rights reserved", 60, canvas.height - 30);

  return canvas.toDataURL("image/jpeg", 0.88);
}
