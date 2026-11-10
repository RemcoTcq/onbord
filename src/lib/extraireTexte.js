// Extraction du texte d'un fichier — module SERVEUR, sans "use server".
//
// Sortie de actions/parse-file.js (import d'une offre par fichier) pour servir
// aussi la base de connaissances (actions/knowledge.js). Même parseurs : pdfjs
// pour le PDF, mammoth pour Word, UTF-8 pour le texte.

/**
 * @param {ArrayBuffer} arrayBuffer
 * @param {{ type?: string, name?: string }} fichier
 * @returns {Promise<{ texte?: string, code?: "format"|"vide" }>}
 */
export async function extraireTexte(arrayBuffer, { type = "", name = "" } = {}) {
  const nom = String(name).toLowerCase();
  let texte = "";

  if (type === "application/pdf" || nom.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.js");
    // Ni police ni worker : le moins de dépendances possible côté serveur.
    const pdf = await pdfjs.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true,
      useSystemFonts: true,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
    }).promise;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      texte += content.items.map((item) => item.str).join(" ") + "\n";
    }
  } else if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || nom.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    texte = (await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) })).value;
  } else if (type === "text/plain" || type === "text/markdown" || nom.endsWith(".txt") || nom.endsWith(".md")) {
    texte = Buffer.from(arrayBuffer).toString("utf-8");
  } else {
    return { code: "format" };
  }

  texte = texte.trim();
  return texte ? { texte } : { code: "vide" };
}
