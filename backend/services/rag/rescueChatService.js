const { createChatModel } = require("./ollama");
const { findApprovedPolicyChunks } = require("./policySearchService");

const MISSING_APPROVED_INFORMATION =
  "I don't have enough approved information to answer this. Please contact the responsible coordinator.";

function isFoodSafetyDeterminationQuestion(question) {
  return /\b(food\s+safety|safe\s+to\s+(eat|consume)|safe\s+for\s+(eating|consumption)|edible|spoiled|spoilage)\b/i.test(question);
}

function responseText(response) {
  if (typeof response.content === "string") return response.content.trim();
  return response.content.map((part) => (typeof part === "string" ? part : part.text || "")).join("").trim();
}

function sourcesFromChunks(chunks) {
  const seen = new Set();
  return chunks
    .map(({ metadata }) => ({ title: metadata.documentTitle, version: metadata.documentVersion }))
    .filter((source) => {
      const key = `${source.title}:${source.version}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

async function answerRescueQuestion(question) {
  if (isFoodSafetyDeterminationQuestion(question)) return { answer: MISSING_APPROVED_INFORMATION, sources: [] };
  const chunks = await findApprovedPolicyChunks(question);
  if (!chunks.length) return { answer: MISSING_APPROVED_INFORMATION, sources: [] };

  const context = chunks.map((chunk, index) => `[Approved policy excerpt ${index + 1}]\n${chunk.content}`).join("\n\n");
  const prompt = `Answer using only the approved policy excerpts. Do not use outside knowledge, invent steps, or determine whether food is safe to eat. If the excerpts do not fully answer the question, reply exactly: "${MISSING_APPROVED_INFORMATION}".\n\n${context}\n\nQuestion: ${question}`;
  const answer = responseText(await (await createChatModel()).invoke(prompt));
  if (!answer || answer === MISSING_APPROVED_INFORMATION) return { answer: MISSING_APPROVED_INFORMATION, sources: [] };
  return { answer, sources: sourcesFromChunks(chunks) };
}

module.exports = { answerRescueQuestion, MISSING_APPROVED_INFORMATION, isFoodSafetyDeterminationQuestion };
