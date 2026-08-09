"use client";

import { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { DownloadIcon, FileJsonIcon, FileTextIcon } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { DAY_NAMES_FULL, type HeatCell } from "@/components/scheduling-views";

function exportCSV(heatmap: HeatCell[], minHour: number, maxHour: number, totalMembers: number) {
  const headers = ["Jour", "Heure", "Membres disponibles", "Ratio", "Ratio %"];
  const rows: string[][] = [];

  for (let day = 0; day < 7; day++) {
    for (let hour = minHour; hour < maxHour; hour++) {
      const cell = heatmap.find((c) => c.day === day && c.hour === hour);
      const count = cell?.count ?? 0;
      const ratio = totalMembers > 0 ? count / totalMembers : 0;
      rows.push([DAY_NAMES_FULL[day], `${hour}:00`, String(count), ratio.toFixed(2), `${Math.round(ratio * 100)}%`]);
    }
  }

  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `heatmap-disponibilites-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPDF(
  heatmap: HeatCell[],
  minHour: number,
  maxHour: number,
  totalMembers: number,
  groupName?: string,
  recommendations?: { day: number; startTime: string; endTime: string; available: number; percent: number }[]
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(18);
  doc.text("Heatmap des disponibilites", 14, 15);
  doc.setFontSize(10);
  doc.text(
    `Genere le ${new Date().toLocaleDateString("fr-FR")}${groupName ? ` · Groupe : ${groupName}` : ""}`,
    14,
    22
  );

  const tableBody: (string | number)[][] = [];
  const dayLabels = ["Jour", ...Array.from({ length: maxHour - minHour }, (_, i) => `${minHour + i}:00`)];
  tableBody.push(dayLabels);

  for (let day = 0; day < 7; day++) {
    const row: (string | number)[] = [DAY_NAMES_FULL[day]];
    for (let hour = minHour; hour < maxHour; hour++) {
      const cell = heatmap.find((c) => c.day === day && c.hour === hour);
      const count = cell?.count ?? 0;
      const pct = totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0;
      row.push(`${count} (${pct}%)`);
    }
    tableBody.push(row);
  }

  autoTable(doc, {
    startY: 28,
    head: [dayLabels],
    body: tableBody.slice(1),
    theme: "grid",
    headStyles: { fillColor: [30, 30, 30], fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: Object.fromEntries(
      Array.from({ length: maxHour - minHour + 1 }, (_, i) => [String(i), { cellWidth: 18 }])
    ) as Record<string, { cellWidth?: number }>,
  });

  if (recommendations && recommendations.length > 0) {
    const startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text("Creneaux recommandes", 14, startY);

    const recoBody = recommendations.slice(0, 6).map((r) => [
      `#${recommendations.indexOf(r) + 1}`,
      `${DAY_NAMES_FULL[r.day]} ${r.startTime}-${r.endTime}`,
      `${Math.round(r.available)} presents`,
      `${Math.round(r.percent)}%`,
    ]);

    autoTable(doc, {
      startY: startY + 5,
      head: [["#", "Creneau", "Presents", "Cohorte"]],
      body: recoBody,
      theme: "striped",
      headStyles: { fillColor: [30, 30, 30], fontSize: 9 },
      styles: { fontSize: 9 },
    });
  }

  doc.save(`heatmap-disponibilites-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function AdminExportBar({
  heatmap,
  minHour,
  maxHour,
  totalMembers,
  groupName,
  recommendation,
}: {
  heatmap: HeatCell[];
  minHour: number;
  maxHour: number;
  totalMembers: number;
  groupName?: string;
  recommendation?: { day: number; startTime: string; endTime: string; available: number; percent: number }[];
}) {
  const handleCSV = useCallback(() => exportCSV(heatmap, minHour, maxHour, totalMembers), [heatmap, minHour, maxHour, totalMembers]);
  const handlePDF = useCallback(
    () => exportPDF(heatmap, minHour, maxHour, totalMembers, groupName, recommendation),
    [heatmap, minHour, maxHour, totalMembers, groupName, recommendation]
  );

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={handleCSV}>
        <FileJsonIcon className="mr-2 size-4" />
        Exporter CSV
      </Button>
      <Button variant="outline" size="sm" onClick={handlePDF}>
        <FileTextIcon className="mr-2 size-4" />
        Exporter PDF
      </Button>
    </div>
  );
}
