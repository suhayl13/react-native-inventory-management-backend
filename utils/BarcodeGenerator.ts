import bwipjs from "bwip-js";
import { PDFDocument, rgb } from "pdf-lib";
import fs from "fs";

async function generateBarcodePDF(barcodes: { value: string; label?: string }[]) {
  const pdfDoc = await PDFDocument.create();

  for (const item of barcodes) {
    const page = pdfDoc.addPage([200, 100]); // width, height in points

    // Generate PNG barcode as buffer
    const png = await bwipjs.toBuffer({
      bcid: "code128",        // Barcode type
      text: item.value,       // Barcode value
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: "center",
    });

    // Embed barcode into PDF
    const pngImage = await pdfDoc.embedPng(png);
    page.drawImage(pngImage, {
      x: 20,
      y: 20,
      width: 160,
      height: 50,
    });

    // Optional label (e.g. product name)
    if (item.label) {
      page.drawText(item.label, {
        x: 20,
        y: 75,
        size: 12,
        color: rgb(0, 0, 0),
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync("barcodes.pdf", pdfBytes);

  console.log("✅ barcodes.pdf generated");
}
