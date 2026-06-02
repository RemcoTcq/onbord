const fs = require('fs');

async function test() {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.js");
    console.log("pdfjs loaded");
    // just dummy check if DOMMatrix is used immediately
    console.log("Success");
  } catch (e) {
    console.error(e);
  }
}

test();
