const express = require("express");
const router = express.Router();
const productScanResultController = require("@controllers/productScanResultController");

router.post("/", productScanResultController.create);
router.get("/", productScanResultController.getAll);
router.get("/:id", productScanResultController.getById);
router.delete("/:id", productScanResultController.delete);

module.exports = router;
