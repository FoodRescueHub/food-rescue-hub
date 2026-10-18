const { getRagConfig } = require("../../config/rag");

async function createEmbeddingModel() {
  const { OllamaEmbeddings } = await import("@langchain/ollama");
  const config = getRagConfig();
  return new OllamaEmbeddings({
    model: config.OLLAMA_EMBEDDING_MODEL,
    baseUrl: config.OLLAMA_BASE_URL,
  });
}

async function createChatModel() {
  const { ChatOllama } = await import("@langchain/ollama");
  const config = getRagConfig();
  return new ChatOllama({
    model: config.OLLAMA_CHAT_MODEL,
    baseUrl: config.OLLAMA_BASE_URL,
    temperature: 0,
  });
}

module.exports = { createEmbeddingModel, createChatModel };
