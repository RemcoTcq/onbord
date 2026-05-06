"use server";

if (typeof global.DOMMatrix === 'undefined') {
  global.DOMMatrix = class DOMMatrix {
    constructor() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; }
  };
}

const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");

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
      const parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      text = data.text;
      await parser.destroy();
    } else if (
      type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
      name.endsWith(".docx")
    ) {
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
