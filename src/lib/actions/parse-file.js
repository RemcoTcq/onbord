"use server";

export async function parseFile(formData) {
  const file = formData.get("file");
  
  if (!file) {
    throw new Error("Aucun fichier fourni.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const type = file.type;
  const name = file.name.toLowerCase();

  let text = "";

  try {
    if (type === "application/pdf" || name.endsWith(".pdf")) {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(arrayBuffer),
        useWorkerFetch: false,
        isEvalSupported: false,
        disableFontFace: true
      });
      const pdf = await loadingTask.promise;

      let extractedText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(" ");
        extractedText += pageText + "\n";
      }
      text = extractedText;
    } else if (
      type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
      name.endsWith(".docx")
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (type === "text/plain" || name.endsWith(".txt")) {
      text = buffer.toString("utf-8");
    } else {
      throw new Error("Format de fichier non supporté. Veuillez utiliser un PDF, DOCX ou TXT.");
    }

    if (!text || text.trim().length === 0) {
      throw new Error("Le fichier semble vide ou le texte n'a pas pu être extrait.");
    }

    return text.trim();
  } catch (error) {
    console.error("Erreur lors de l'extraction du fichier:", error);
    throw new Error(error.message || "Erreur lors de la lecture du fichier.");
  }
}
