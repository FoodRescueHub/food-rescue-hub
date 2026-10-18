# Approved Policy RAG

The RAG API is integrated into this backend.

- `POST /api/policies/:id/index` indexes only an `APPROVED` policy. It can use either a `PolicyDocument` or Member 7's `HandlingPolicy` record.
- `POST /api/rescue-chat` accepts `{ "question": "..." }` and returns an answer with sources.
- Food-safety determinations and questions without approved policy context return the coordinator escalation response.

Before running, copy `.env.example` to `.env`, configure MongoDB and Ollama, then run:

```powershell
npm run create:vector-index
npm run dev
```

The Atlas Vector Search definition is in `atlas/approved_policy_chunks.vector-index.json`.
