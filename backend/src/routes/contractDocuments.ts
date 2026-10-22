import { Router } from "express";
import { createHash } from "crypto";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { ensureCoreTables } from "../db/bootstrap";
import { employers } from "../db/schema";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

const router = Router();
let ready = false;
const uploadSchema = z.object({
  clientName: z.string().trim().min(1).max(255),
  title: z.string().trim().min(1).max(255),
  category: z.enum(["contract", "insurance"]),
  pdfBase64: z.string().min(16).max(2_800_000).regex(/^[A-Za-z0-9+/]+={0,2}$/),
});
async function owner(req: AuthRequest) {
  if (!req.user || req.user.role !== "employer") throw new AppError(403, "Employer access required.");
  await ensureCoreTables();
  const [employer] = await db.select().from(employers).where(eq(employers.userId, req.user.id)).limit(1);
  if (!employer) throw new AppError(403, "Set up your employer profile first.");
  if (!ready) {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS contract_documents (
      id SERIAL PRIMARY KEY,
      employer_id INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
      client_name VARCHAR(255) NOT NULL, title VARCHAR(255) NOT NULL,
      category VARCHAR(20) NOT NULL CHECK (category IN ('contract','insurance')),
      pdf_base64 TEXT NOT NULL, sha256 VARCHAR(64) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status = 'draft'),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (employer_id, client_name, category, sha256)
    )`);
    ready = true;
  }
  return employer.id;
}
router.use(authMiddleware);
router.get("/employer", async (req: AuthRequest, res, next) => {
  try {
    const id = await owner(req);
    const result = await db.execute(sql`SELECT id, client_name, title, category, status, sha256, created_at
      FROM contract_documents WHERE employer_id = ${id} ORDER BY created_at DESC, id DESC LIMIT 200`);
    res.set("Cache-Control", "no-store").json({ documents: (result as any).rows });
  } catch (e) { next(e); }
});
router.post("/employer", async (req: AuthRequest, res, next) => {
  try {
    const id = await owner(req), data = uploadSchema.parse(req.body);
    const bytes = Buffer.from(data.pdfBase64, "base64");
    if (bytes.length > 2_000_000 || bytes.subarray(0, 5).toString() !== "%PDF-" || !bytes.subarray(-1024).toString().includes("%%EOF"))
      throw new AppError(400, "Choose a valid PDF smaller than 2 MB.");
    const hash = createHash("sha256").update(bytes).digest("hex");
    const result = await db.execute(sql`INSERT INTO contract_documents
      (employer_id, client_name, title, category, pdf_base64, sha256)
      VALUES (${id}, ${data.clientName}, ${data.title}, ${data.category}, ${bytes.toString("base64")}, ${hash})
      ON CONFLICT (employer_id, client_name, category, sha256) DO UPDATE SET title = EXCLUDED.title
      RETURNING id, client_name, title, category, status, sha256, created_at`);
    res.status(201).set("Cache-Control", "no-store").json({ document: (result as any).rows[0] });
  } catch (e) { next(e); }
});
router.get("/employer/:id", async (req: AuthRequest, res, next) => {
  try {
    const ownerId = await owner(req), id = z.coerce.number().int().positive().parse(req.params.id);
    const result = await db.execute(sql`SELECT id, title, pdf_base64, sha256 FROM contract_documents
      WHERE id = ${id} AND employer_id = ${ownerId}`);
    const document = (result as any).rows[0];
    if (!document) throw new AppError(404, "Document not found.");
    res.set("Cache-Control", "no-store").json({ document });
  } catch (e) { next(e); }
});
export default router;
