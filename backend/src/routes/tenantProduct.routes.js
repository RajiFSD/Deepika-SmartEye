const express = require("express");
const router = express.Router();
const tenantProductController = require("@controllers/tenantProductController");

router.post("/", tenantProductController.create);
router.get("/", tenantProductController.getAll);
router.get("/:id", tenantProductController.getById);
router.put("/:id", tenantProductController.update);
router.delete("/:id", tenantProductController.delete);

module.exports = router;
