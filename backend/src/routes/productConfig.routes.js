const express = require("express");
const router = express.Router();
const productConfigController = require("@controllers/productConfigurationController");

router.post("/", productConfigController.create);
router.get("/", productConfigController.getAll);
router.get("/:id", productConfigController.getById);
router.put("/:id", productConfigController.update);
router.delete("/:id", productConfigController.delete);

module.exports = router;
