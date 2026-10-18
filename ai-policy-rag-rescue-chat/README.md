# AI Policy RAG + Rescue Chat

This service answers only from coordinator-approved handling and pickup policies. It does not decide whether food is safe to eat.

## Local setup

1. Copy `.env.example` to a new `.env` file.
2. In `.env`, replace the `MONGODB_URI` placeholders with your MongoDB Atlas connection string. Do not commit or share this file.
3. Install and start Ollama, then download the configured models:
   ```powershell
   ollama pull llama3.2:3b
   ollama pull nomic-embed-text
   ```
4. Index the supplied coordinator-approved policy:
   ```powershell
   npm run import:policy
   npm run index:policy -- <policy-id>
   npm run create:vector-index
   ```
   The script creates the `approved_policy_chunks` Atlas Vector Search index on the `policy_chunks` collection.

## API

- `POST /api/policies/:id/index` indexes a policy only when its status is `APPROVED`.
- `POST /api/rescue-chat` accepts `{ "question": "..." }` and returns `{ "answer": "...", "sources": [...] }`.

Example:

```powershell
curl.exe -X POST http://localhost:3000/api/rescue-chat -H "Content-Type: application/json" -d "{\"question\":\"What is the approved pickup procedure?\"}"
```

## Safety behaviour

- Only document records with `status: "APPROVED"` are indexed or retrieved.
- A policy answer includes a source title and version.
- If no approved information is retrieved, the API responds: `I don't have enough approved information to answer this. Please contact the responsible coordinator.`
- Food-safety determinations are out of scope; the service returns the same missing-information response.
