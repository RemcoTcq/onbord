"use server";

export async function parseFile(formData) {
  const file = formData.get("file");
  
  if (!file) {
    return { success: false, error: "Aucun fichier fourni." };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const type = file.type;
    const name = file.name.toLowerCase();

    let text = "";

    if (type === "application/pdf" || name.endsWith(".pdf")) {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      
      // Force disabling of font evaluation and worker to minimize dependencies
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(arrayBuffer),
        useWorkerFetch: false,
        isEvalSupported: false,
        disableFontFace: true,
        useSystemFonts: true,
        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`
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
      return { success: false, error: "Format de fichier non supporté. Veuillez utiliser un PDF, DOCX ou TXT." };
    }

    if (!text || text.trim().length === 0) {
      return { success: false, error: "Le fichier semble vide ou le texte n'a pas pu être extrait." };
    }

    return { success: true, text: text.trim() };
  } catch (error) {
    console.error("Erreur lors de l'extraction du fichier:", error);
    return { success: false, error: error.message || "Erreur lors de la lecture du fichier." };
  }
}
