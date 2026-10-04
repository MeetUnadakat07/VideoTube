import { Router } from "express";

import { verifyJWT } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/multer.middleware";

const router = Router();
router.use(verifyJWT);

router.route("/").get().post();

router.route("/:videoId").get().delete().patch();

router.route("/toggle/publish/:videoId").patch();

export default router;
