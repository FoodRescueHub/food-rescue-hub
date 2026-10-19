import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { env } from "../config/env.js";

export function createEmbeddingModel() {
  return new OllamaEmbeddings({
    model: env.OLLAMA_EMBEDDING_MODEL,
    baseUrl: env.OLLAMA_BASE_URL
  });
}

export function createChatModel() {
  return new ChatOllama({
    model: env.OLLAMA_CHAT_MODEL,
    baseUrl: env.OLLAMA_BASE_URL,
    temperature: 0
  });
}
