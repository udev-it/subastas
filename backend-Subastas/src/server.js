const express = require("express");
const cors = require("cors");
require("dotenv").config(); 
const validacionesRoutes = require("./routes/validacionRoutes.js");


const app = express();


app.use(cors()); 
app.use(express.json()); 

app.use("/api/", validacionesRoutes);

// Ruta inicial para probar el servidor
app.get("/", (req, res) => {
  res.send("Servidor corriendo");
});

// Iniciar el servidor en el puerto definido en .env o 3001 por defecto
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
