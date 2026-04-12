import { Router, type IRouter } from "express";
import healthRouter from "./health";
import taxonomyRouter from "./taxonomy";
import loopsRouter from "./loops";
import exploreRouter from "./explore";
import creatorsRouter from "./creators";
import chordsRouter from "./chords";
import favoritesRouter from "./favorites";
import playlistsRouter from "./playlists";
import practiceRouter from "./practice";
import liveRouter from "./live";

const router: IRouter = Router();

router.use(healthRouter);
router.use(taxonomyRouter);
router.use(loopsRouter);
router.use(exploreRouter);
router.use(creatorsRouter);
router.use(chordsRouter);
router.use(favoritesRouter);
router.use(playlistsRouter);
router.use(practiceRouter);
router.use(liveRouter);

export default router;
