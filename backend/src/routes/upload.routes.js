const express = require("express");
const router = express.Router();
const uploadController = require("../controllers/uploadController");
const upload = require("../middleware/upload");

router.post("/image", upload.single("image"), uploadController.uploadImage); // Upload image
router.post("/video", upload.single("video"), uploadController.uploadVideo); // Upload video
router.post("/multiple", upload.array("files", 10), uploadController.uploadMultiple); // Upload multiple files
router.delete("/:filename", uploadController.deleteFile); // Delete uploaded file
router.get("/:filename", uploadController.getFile); // Get uploaded file

module.exports = router;