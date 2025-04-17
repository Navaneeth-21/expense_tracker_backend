// src/controllers/propertiesController.js
const pool = require("../config/db");
const { uploadFile } = require("../utils/fileUpload");
const { fixedProperties } = require("../data/properties"); // Ensure this is imported for validation

exports.getProperties = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Fetch laundry settings for the user
    const laundrySettingsResult = await pool.query(
      `
      SELECT property_id, bed_sheets, quilt_covers, pillow_covers, small_towels, big_towels
      FROM property_laundry_settings
      WHERE user_id = $1
      `,
      [userId]
    );

    // Map laundry settings to a dictionary for easy lookup
    const laundrySettingsMap = laundrySettingsResult.rows.reduce((map, row) => {
      map[row.property_id] = {
        bed_sheets: row.bed_sheets,
        quilt_covers: row.quilt_covers,
        pillow_covers: row.pillow_covers,
        small_towels: row.small_towels,
        big_towels: row.big_towels,
      };
      return map;
    }, {});

    // Merge fixedProperties with laundry settings
    const propertiesWithLaundry = fixedProperties.map((property) => ({
      property_id: property.id,
      name: property.name,
      location: property.location,
      image_url: property.images,
      description: property.description,
      rating: property.rating,
      caretaker: property.caretaker,
      ...laundrySettingsMap[property.id] || {
        bed_sheets: 0,
        quilt_covers: 0,
        pillow_covers: 0,
        small_towels: 0,
        big_towels: 0,
      },
    }));

    res.json({ success: true, data: propertiesWithLaundry });
  } catch (error) {
    // console.error("Error fetching properties:", error); // Uncomment for debugging
    res.status(500).json({ error: "Failed to fetch properties" });
  }
};

exports.addProperty = async (req, res) => {
  res.status(403).json({ error: "Adding new properties is not allowed. Properties are fixed." });
};

exports.removeProperty = async (req, res) => {
  res.status(403).json({ error: "Removing properties is not allowed. Properties are fixed." });
};

exports.setLaundryParams = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { propertyId } = req.params;
    const { bed_sheets, quilt_covers, pillow_covers, small_towels, big_towels } = req.body;

    const checkProperty = fixedProperties.find((p) => p.id === parseInt(propertyId));
    if (!checkProperty) {
      return res.status(404).json({ error: "Property not found" });
    }

    await pool.query(
      `
      INSERT INTO property_laundry_settings (property_id, user_id, bed_sheets, quilt_covers, pillow_covers, small_towels, big_towels)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (property_id, user_id)
      DO UPDATE SET bed_sheets = $3, quilt_covers = $4, pillow_covers = $5, small_towels = $6, big_towels = $7, updated_at = CURRENT_TIMESTAMP
      `,
      [propertyId, userId, parseInt(bed_sheets) || 0, parseInt(quilt_covers) || 0, parseInt(pillow_covers) || 0, parseInt(small_towels) || 0, parseInt(big_towels) || 0]
    );

    res.json({ success: true, message: "Laundry parameters updated" });
  } catch (error) {
    // console.error("Error setting laundry parameters:", error); // Uncomment for debugging
    res.status(500).json({ error: "Failed to set laundry parameters" });
  }
};

exports.getLaundrySettings = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { propertyId } = req.params;

    // Validate if the property exists in fixedProperties
    const checkProperty = fixedProperties.find((p) => p.id === parseInt(propertyId));
    if (!checkProperty) {
      return res.status(404).json({ error: "Property not found" });
    }

    // Query the laundry settings for the property and user
    const result = await pool.query(
      `
      SELECT bed_sheets, quilt_covers, pillow_covers, small_towels, big_towels
      FROM property_laundry_settings
      WHERE property_id = $1 AND user_id = $2
      `,
      [propertyId, userId]
    );

    // If no settings are found, return default values
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          bed_sheets: 0,
          quilt_covers: 0,
          pillow_covers: 0,
          small_towels: 0,
          big_towels: 0,
        },
      });
    }

    // Return the laundry settings
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    // console.error("Error fetching laundry settings:", error); // Uncomment for debugging
    res.status(500).json({ error: "Failed to fetch laundry settings" });
  }
};

exports.addCheckIn = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { propertyId } = req.params;
    const { guest_name, check_in_date, check_out_date } = req.body;
    const guestIdFile = req.files?.guest_id_file; // This is an array
    const signedFormFile = req.files?.signed_form_file; // This is an array

    // console.log("req.files:", req.files);
    // console.log("guestIdFile:", guestIdFile);
    // console.log("signedFormFile:", signedFormFile);

    const checkProperty = fixedProperties.find((p) => p.id === parseInt(propertyId));
    if (!checkProperty) {
      return res.status(404).json({ error: "Property not found" });
    }

    let guestIdFileUrl = null;
    let signedFormFileUrl = null;

    // Take the first file from the array (if it exists)
    if (guestIdFile && guestIdFile.length > 0) {
      guestIdFileUrl = await uploadFile(guestIdFile[0], "check_ins/guest_ids");
    }
    if (signedFormFile && signedFormFile.length > 0) {
      signedFormFileUrl = await uploadFile(signedFormFile[0], "check_ins/signed_forms");
    }

    const result = await pool.query(
      `
      INSERT INTO check_ins (property_id, user_id, guest_name, check_in_date, check_out_date, guest_id_file_url, signed_form_file_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING check_in_id
      `,
      [propertyId, userId, guest_name, check_in_date, check_out_date || null, guestIdFileUrl, signedFormFileUrl]
    );

    const checkInId = result.rows[0].check_in_id;
    res.json({ success: true, data: { check_in_id: checkInId } });
  } catch (error) {
    // console.error("Error adding check-in:", error); // Uncomment for debugging
    res.status(500).json({ error: "Failed to add check-in" });
  }
};

exports.getCheckIns = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { propertyId } = req.params;

    const checkProperty = fixedProperties.find((p) => p.id === parseInt(propertyId));
    if (!checkProperty) {
      return res.status(404).json({ error: "Property not found" });
    }

    const result = await pool.query(
      `
      SELECT ci.*
      FROM check_ins ci
      WHERE ci.property_id = $1 AND ci.user_id = $2
      `,
      [propertyId, userId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    // console.error("Error fetching check-ins:", error); // Uncomment for debugging
    res.status(500).json({ error: "Failed to fetch check-ins" });
  }
};