import { Router } from "express";
import {
  createMessages,
  getAllMessages,
  getMessage,
  user,
  userUrl,
} from "./message.service.js";
import { auth } from "../../common/middleware/auth.middleware.js";
import { checkRole } from "../../common/middleware/checkRole.js";
import { upload } from "../../common/middleware/multer.js";
const router = Router();
// get all messages
router.get("/get_all_message", auth, checkRole(["1"]), async (req, res) => {
  let data = await getAllMessages();
  res.json(data);
});
// add messages
router.post("/create_message", upload().single("image"), async (req, res) => {
  let data = await createMessages(req.body, req.file);
  res.json(data);
});
//user url
router.get("/user-url", auth, async (req, res) => {
  let data = await userUrl(req.user);
  res.json(data);
});
//user messages
router.get("/user", auth, async (req, res) => {
  let data = await user(req.body);
  res.json(data);
});
//user get messages
router.get("/get-Message", auth, async (req, res) => {
  let data = await getMessage(req.user);
  res.json(data);
});
export default router;
