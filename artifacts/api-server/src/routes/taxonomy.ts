import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  timeSignatures,
  feels,
  genres,
  instrumentTypes,
  contentTypes,
} from "@workspace/db";
import { GetTaxonomyResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/taxonomy", async (req, res): Promise<void> => {
  const [ts, f, g, it, ct] = await Promise.all([
    db.select().from(timeSignatures).orderBy(timeSignatures.sortOrder),
    db.select().from(feels).orderBy(feels.sortOrder),
    db.select().from(genres).orderBy(genres.sortOrder),
    db.select().from(instrumentTypes).orderBy(instrumentTypes.sortOrder),
    db.select().from(contentTypes).orderBy(contentTypes.sortOrder),
  ]);

  res.json(
    GetTaxonomyResponse.parse({
      timeSignatures: ts,
      feels: f,
      genres: g,
      instrumentTypes: it,
      contentTypes: ct,
    }),
  );
});

export default router;
