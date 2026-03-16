const axios = require("axios");

async function translateText(text, targetLang) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single`;

    const res = await axios.get(url, {
      params: {
        client: "gtx",
        sl: "auto", // auto-detect source language
        tl: targetLang, // target language e.g. "hi", "te", "ta"
        dt: "t",
        q: text,
      },
    });

    const translated = res.data[0].map((chunk) => chunk[0]).join("");

    return translated;
  } catch (err) {
    console.error("Translation error:", err.message);
    throw new Error("Translation failed");
  }
}

module.exports = translateText;
