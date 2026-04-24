// ============================================================================
// Report Export Utility — Client-branded exports with BrandFlow credit
// Enterprise plan reports have NO BrandFlow branding
// ============================================================================

export interface ReportExportOptions {
  clientName: string;
  clientLogo?: string;
  reportTitle: string;
  dateRange: string;
  plan: string; // starter | growth | enterprise
  platformName?: string;
}

/**
 * Generate HTML header and footer for report exports
 * - Starter/Growth plans: Client branding + small BrandFlow credit at bottom
 * - Enterprise plans: Full client branding, NO BrandFlow credit
 */
export function generateReportBranding(options: ReportExportOptions) {
  const isEnterprise = options.plan === "enterprise";
  const showBrandflow = !isEnterprise;
  const brandName = options.platformName || "BrandFlow";

  const header = `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:24px 32px;border-bottom:2px solid #e5e7eb;background:#ffffff;">
      <div>
        <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0;">${options.clientName}</h1>
        <p style="font-size:13px;color:#6b7280;margin:4px 0 0 0;">${options.reportTitle}</p>
        <p style="font-size:11px;color:#9ca3af;margin:2px 0 0 0;">${options.dateRange}</p>
      </div>
      ${options.clientLogo ? `<img src="${options.clientLogo}" style="height:48px;width:auto;border-radius:8px;" alt="${options.clientName}" />` : `<div style="width:48px;height:48px;background:linear-gradient(135deg,#d97706,#b45309);border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:18px;">${options.clientName.charAt(0).toUpperCase()}</div>`}
    </div>
  `;

  const footer = showBrandflow
    ? `
    <div style="padding:16px 32px;text-align:center;border-top:1px solid #f3f4f6;background:#fafafa;">
      <p style="font-size:10px;color:#d1d5db;margin:0;">
        Powered by <strong style="color:#d97706;">${brandName}</strong> — Pakistan&apos;s #1 Brand Management Portal
      </p>
    </div>
  `
    : `
    <div style="padding:16px 32px;text-align:center;border-top:1px solid #f3f4f6;background:#fafafa;">
      <p style="font-size:10px;color:#e5e7eb;margin:0;"> </p>
    </div>
  `;

  return { header, footer, showBrandflow };
}

/**
 * Generate a full HTML page for print/export with branding
 */
export function generatePrintableReport(
  contentHtml: string,
  options: ReportExportOptions
): string {
  const { header, footer } = generateReportBranding(options);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${options.reportTitle} — ${options.clientName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #374151; line-height: 1.6; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; font-weight: 600; }
        td { font-size: 13px; }
        tr:hover td { background: #f9fafb; }
        .section-title { font-size: 16px; font-weight: 700; color: #111827; margin: 24px 0 12px 32px; }
        .content { padding: 24px 32px; }
        .stat-card { display: inline-block; padding: 16px 24px; margin: 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; }
        .stat-value { font-size: 24px; font-weight: 700; color: #111827; }
        .stat-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
    </head>
    <body>
      ${header}
      <div class="content">
        ${contentHtml}
      </div>
      ${footer}
    </body>
    </html>
  `;
}

/**
 * Open a print dialog with branded report content
 */
export function printReport(contentHtml: string, options: ReportExportOptions) {
  const html = generatePrintableReport(contentHtml, options);
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
}
