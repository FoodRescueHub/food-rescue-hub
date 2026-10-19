# AI semantic matching setup

`POST /api/matching/search` accepts `{ "needId": "<active need id>" }` from an authenticated recipient. It uses the logged-in recipient's organization to load the need. The response contains proposal allocations and rejected candidate reasons. The endpoint does not call reservation routes and does not change listing quantity or status.

## Local configuration

- Configure the existing `MONGODB_URI` in `backend/.env` (and the app's existing `JWT_SECRET` for authenticated API use). No new secrets or API keys are required by matching.
- Install/start Ollama, then pull the embedding model with `ollama pull nomic-embed-text`. The backend defaults to `OLLAMA_BASE_URL=http://localhost:11434` and `OLLAMA_EMBEDDING_MODEL=nomic-embed-text`; set these in `backend/.env` only if your local Ollama URL or model differs.
- The `Donation` Mongoose model maps to the existing `donations` collection, has a root-level `embedding` field, and does not declare a time-series collection. Atlas Vector Search must be indexed on that same ordinary `donations` collection using [`donations.vector-search-index.json`](./donations.vector-search-index.json). Confirm the Atlas collection itself is not time-series before creating the index; MongoDB Search/Vector Search is unsupported on time-series collections.
- The index name is `donations_vector_index`, the vector path is `embedding`, and `nomic-embed-text` produces 768 dimensions. The index also defines `status`, `expiryDate`, and `quantity` as filter fields used by the vector query. If you change embedding models, update dimensions to match the model's output.
- New donation creation embeds the food description and stores the vector on the donation document. If Ollama is unavailable, creation still succeeds without an embedding, and that listing won't be found semantically until it is embedded.
- The existing `node scripts/backfillDonationEmbeddings.js` script fills missing vectors directly on donation documents. **Do not run it until the team has reviewed and explicitly scheduled the backfill.** No migration or backfill has been run as part of this change.
- Optionally set `MONGODB_VECTOR_INDEX_NAME` to a different index name (default `donations_vector_index`) and `MATCHING_MAX_CANDIDATES` to a value from 1 to 100 (default 50).
- Run backend unit tests from `backend/` with `npm test`.

No API keys or secrets are embedded in source. The existing `.env` file remains ignored by Git.

## Donation safety fields

The `Donation` schema uses `allergenInfoStatus` (`KNOWN` or `UNKNOWN`), `allergens: string[]`, `pickupStart`, and `pickupEnd`; these pickup field names match the existing `Need` schema. The donor form defaults allergen status to `UNKNOWN`. An empty allergen list is considered clear only when the donor explicitly marks the information `KNOWN`. Legacy/API-created donations without these fields remain valid records, but matching rejects them when allergen safety or a pickup window cannot be established.

Vector Search prefilters for `AVAILABLE` listings with a future expiry and positive quantity. The matching logic also checks those fields against the returned donation documents, then checks allergen status/conflicts, unit compatibility, and future pickup-window overlap. Listing units must match the need's unit (case-insensitive); no unit conversion is inferred. Allocations are read-only proposals and never reserve or decrement inventory. The reservation endpoint remains responsible for rechecking live quantity after coordinator review.