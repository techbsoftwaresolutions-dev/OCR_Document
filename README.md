# SmartDoc OCR — Full-stack React + Node.js

A local-first OCR document extraction and autofill application. The React UI uploads image or PDF documents to an Express API. Tesseract.js performs **real OCR** on image files and scanned PDFs. Rule-based extraction selects fields for PAN, Aadhaar, resumes, invoices and more. After processing, users can preview the original image or PDF, review/edit/save extracted fields in SQLite, and delete the document and its original file.

## Requirements

### Automatic document fields

Uploads default to automatic detection. The analyser uses recognised document details plus unfamiliar labelled values, multiline values, repeated fields, and text tables to create an editable form. PDF column spacing is retained for table discovery. Fields absent from the document are omitted; additional fields can be added manually. Confirmed records retain saved values.

Extraction is local and rule-based, not a general-purpose AI reader. Arbitrary prose, handwriting, unusual layouts, and poor scans may need manual review. It does not infer legally or administratively mandatory fields. Supported uploads remain PDF, JPG, PNG, and WEBP, with the configured page/file limits.

- **Node.js 22.13+**, preferably the latest Node.js 22/24 LTS (this project uses the built-in `node:sqlite` module). An experimental SQLite warning can appear with Node 22.
- npm and Visual Studio Code on Windows/macOS/Linux.
- Internet connectivity for **first npm installation** and Tesseract language models on first OCR execution. Once cached, the OCR runs locally.
- No paid OCR APIs or Python installation required.

## Quick start (Windows PowerShell or VS Code terminal)

```powershell
cd smartdoc-ocr
Copy-Item backend\.env.example backend\.env
```

Edit `backend/.env` to set a **new, unpredictable `JWT_SECRET` at least 32 characters long**. For local development, generate one with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

```powershell
npm install
npm --prefix backend run db:migrate
npm --prefix backend run db:seed
npm run dev
```

Visit **http://localhost:5173**. Demo login: `demo@smartdoc.local` / `Demo@12345`. API health: http://localhost:5000/api/health.

**Alternative: launch terminals separately**

```powershell
cd backend
npm run db:migrate
npm run db:seed
npm run dev
```

```powershell
cd frontend
npm run dev
```

## Workflow

1. Login or register.
2. Open **Upload documents**. Select an image/PDF and choose auto-detect or a document category.
3. The API checks the actual file signature and performs OCR/text extraction.
4. The result appears in Document History and the review screen.
5. Edit fields and click **Confirm & save**.
6. Create an Applicant Profile and merge extracted documents; field conflicts are reported and existing fields are preserved.
7. Export the applicant profile as JSON or CSV.

## Modules included

- Registration, login, password hashes, 12-hour bearer tokens, per-user data access
- Dashboard with actual document statistics, status counts and type chart
- Responsive sidebar, breadcrumbs, light/dark mode, filtering and search
- Multiple-file uploads (up to 5), file-size and signature checks, upload progress
- Tesseract.js OCR with Sharp preprocessing; PDF embedded-text extraction and scanned PDF page rendering
- PAN, Aadhaar, resume, driving licence, RC registration certificate, vehicle insurance policy, electricity/utility bills, bank statements, receipts, voter ID, passport, certificate, invoice and generic rule-based extraction
- Editable review forms, category-specific original previews, sanitized raw OCR text, review status, SQLite persistence
- Applicant profiles, merge with field provenance and conflict warnings, JSON/CSV exports
- API health check and backend parsing tests

## API endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/logout` | Client must discard its bearer token |
| POST | `/api/documents/upload` | Multipart `files`, optional `category` |
| POST | `/api/documents/:id/process` | Process temporary uploaded content |
| GET | `/api/documents/:id/original` | Authenticated original image/PDF preview |
| GET | `/api/documents` | List documents |
| GET | `/api/documents/:id` | Get document and parsed fields |
| PATCH | `/api/documents/:id` | Save `fields` JSON object |
| DELETE | `/api/documents/:id` | Delete document |
| GET | `/api/extractions/:documentId` | Get extraction |
| PATCH | `/api/extractions/:documentId` | Save corrected fields |
| POST | `/api/extractions/:documentId/reprocess` | Returns request to re-upload (raw files not retained) |
| POST | `/api/profiles` | Create profile |
| GET | `/api/profiles` | List profiles |
| GET | `/api/profiles/:id` | Profile details |
| PATCH | `/api/profiles/:id` | Edit profile |
| POST | `/api/profiles/:id/merge-documents` | Merge `{ "documentIds": [1, 2] }` |
| GET | `/api/profiles/:id/export/json` | Export JSON |
| GET | `/api/profiles/:id/export/csv` | Export CSV |
| GET | `/api/dashboard/stats` | Actual document counters |
| GET | `/api/health` | Health check |

Protected endpoints require an `Authorization: Bearer <JWT>` header. Responses normally use `{ "success": true, "data": ... }` or `{ "success": false, "error": {"message":"..."} }`.

### OCR configuration and limitations

- `MAX_UPLOAD_MB`: maximum upload size (default 10 MB per file).
- `MAX_PDF_PAGES`: scanned-PDF page limit (default 5). Native PDF parsing also limits pages.
- Supported file types: JPEG, PNG, WEBP, PDF. Actual signatures validated.
- PDF rendering uses `pdf-to-img`; very large/complex PDFs may run slowly or fail. OCR uses one reused worker serially to avoid excessive concurrent memory usage.
- The first OCR call might download an English model. Do not assume fully offline execution without first caching the models.
- Rule-based parsers are **best effort** and not a substitute for human review. Scanned/rotated/handwritten/multicolumn documents can have mistakes. Generic fallback covers unknown formats.
- OCR is **not** identity verification, PAN verification, UIDAI authentication or document authenticity validation.
- Original files are stored locally under `backend/storage/originals` and served only through the authenticated preview endpoint. They remain until the document is deleted; deleting a document also deletes its original file. The storage directory is git-ignored. Older records created before original-file storage need to be uploaded again to enable previews.
- A pending upload can still be processed after a backend restart because the original is available from local storage. Keep the storage directory private and include it in protected backups only if your retention policy allows.
- Aadhaar-like 12-digit strings are redacted from stored raw text; the parser saves only the last 4 digits. For actual personal records, additional legal, security, and retention assessments are required.

### Security and production caveats

This is a **working educational local prototype**, not a certified identity-document vault. Do not deploy to the public internet or upload real sensitive identity documents without additional security engineering. In particular: use HTTPS, secure audit/retention policies, encrypted databases/backups, account/session revocation, hardened file scanner/PDF sandbox, request/CPU quotas, explicit user consent, DPA/legal review, and security testing. The current bearer JWT logout deletes the browser token; there is no server-side JWT revocation list. Browser token is stored in localStorage, so production environments should consider secure httpOnly cookies with CSRF protections.

## Tests and validation

```powershell
npm test
npm run build
```

These commands test the parsing library and build React respectively. Run end-to-end OCR with fictional documents you generated yourself. The `.txt` files in `samples` contain **synthetic example text for parser demonstrations**, not uploadable images. Create a screenshot of fictional text or a fictional PDF to exercise the upload UI. Do not use real Aadhaar/PAN data for development.

## Troubleshooting

- **`JWT_SECRET` error**: Set backend `.env` as described.
- **Port already in use**: Close other programs on 5000/5173 or change backend PORT and Vite proxy together.
- **`node:sqlite` module unavailable**: Upgrade Node to 22.13+ or Node 24 LTS.
- **OCR slow on first execution**: Language-model download/caching may be taking place.
- **PDF failed**: Try a smaller PDF, fewer pages, or a PNG/JPEG; check terminal for native rendering errors.
- **Unexpected blank fields**: Select document type manually, correct form values, and save.
- **Authentication error**: Sign out and in again; restart API if you changed JWT_SECRET.
- **`npm install` fails**: Confirm Node/npm versions and network; use `npm install` in each folder to identify the failing package.

## Architecture

`React/Vite → Axios → Express + JWT → MIME magic-byte validation → pdf-parse / pdf-to-img + Sharp + Tesseract.js → rule-based classification → editable forms → node:sqlite database → profile merging / exports`

No cloud API keys are necessary.

## Scope not implemented

Server-side document preview/retention, printable PDF export, deep resume entity extraction, server-side background job scheduling, database migration history/versioning, advanced OCR field confidence per field, uploading cancel during OCR, advanced settings, full endpoint integration tests, accessible modal workflows, and server-side JWT revocation are **not fully implemented**. Statuses are available but OCR processing currently happens in a request rather than a durable job queue. These are appropriate next-stage features.
