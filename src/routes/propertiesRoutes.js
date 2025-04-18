// src/routes/propertiesRoutes.js
const express = require("express");
const router = express.Router();
const {
  getProperties,
  addProperty,
  removeProperty,
  setLaundryParams,
  addCheckIn,
  getCheckIns,
  getLaundrySettings, // Add the new controller
} = require("../controllers/propertiesController");
const { upload } = require("../utils/fileUpload");

// Routes
router.get("/", getProperties);
router.post("/", upload.fields([{ name: "image" }]), addProperty);
router.delete("/:propertyId", removeProperty);
router.get("/:propertyId/laundry", getLaundrySettings); // Add the new GET route
router.post("/:propertyId/laundry", setLaundryParams);
router.post(
  "/:propertyId/check-in",
  upload.fields([{ name: "guest_id_file" }, { name: "signed_form_file" }]),
  addCheckIn
);
router.get("/:propertyId/check-ins", getCheckIns);

module.exports = router;