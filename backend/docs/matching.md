# AI semantic matching setup

`POST /api/matching/search` accepts `{ "needId": "<active need id>" }` from an authenticated recipient. It uses the logged-in recipient's organization to load the need. The response contains proposal allocations and rejected candidate reasons. The endpoint does not call reservation routes and does not change listing quantity or status.

## Local configuration

- Configure the existing `MONGODB_URI` in `backend/.env` (and the app's existing `JWT_SECRET` for authenticated API use). No new secrets or API keys are required by matching.
- Install/start Ollama, then pull the embedding model with `ollama pull nomic-embed-text`. The backend defaults to `OLLAMA_BASE_URL=http://localhost:11434` and `OLLAMA_EMBEDDING_MODEL=nomic-embed-text`; set these in `backend/.env` only if your local Ollama URL or model differs.
- In MongoDB Atlas, create a Vector Search index on the `donations` collection using [`donations.vector-search-index.json`](./donations.vector-search-index.json). Its default name is `donations_vector_index`, vector field is `embedding`, and its dimensions are 768 for `nomic-embed-text`. If you change embedding models, update the index dimensions to match the model's actual output. Keep `status`, `expiryDate`, and `quantity` indexed as filter fields.
- Run `node scripts/backfillDonationEmbeddings.js` from `backend/` after MongoDB and Ollama are available. This fills embeddings for existing donations. Newly created donations attempt embedding on creation; if Ollama is unavailable, creation still succeeds and the listing must be backfilled before semantic search can find it.
- Optionally set `MONGODB_VECTOR_INDEX_NAME` to a non-default index name and `MATCHING_MAX_CANDIDATES` to a value from 1 to 100 (default 50).
- Run the backend unit tests from `backend/` with `npm test`.

No API keys or secrets are embedded in source. The existing `.env` file remains ignored by Git.

## Donation safety fields

The existing donor form and `Donation` schema now use `allergenInfoStatus` (`KNOWN` or `UNKNOWN`), `allergens: string[]`, `pickupStart`, and `pickupEnd`; these pickup field names match the existing `Need` schema. The form defaults allergen status to `UNKNOWN`. An empty allergen list is considered clear only when the donor explicitly marks the information `KNOWN`. Legacy/API-created donations without these fields remain valid records, but matching rejects them when allergen safety or a pickup window cannot be established.

Pickup windows must overlap during a future portion of both windows. Listing units must match the need's unit (case-insensitive); no unit conversion is inferred. Allocations are read-only proposals and never reserve or decrement inventory. The existing reservation endpoint remains responsible for rechecking live quantity after coordinator review.
