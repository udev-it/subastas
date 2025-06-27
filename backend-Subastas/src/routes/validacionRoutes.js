const express = require("express");
const router = express.Router();
const { getTablaValidaciones } = require("../Controllers/validacionController");

router.get("/criterios-postor/:id_postor", getTablaValidaciones);

module.exports = router;
