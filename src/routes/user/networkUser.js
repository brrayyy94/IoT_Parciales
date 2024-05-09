const { Router } = require("express");

const router = Router();

const mysql = require("mysql");

// se crea la conexión a mysql
const connection = mysql.createPool({
  connectionLimit: 500,
  host: "localhost",
  user: "root",
  password: "", //el password de ingreso a mysql
  database: "parcialIOT",
  port: 3306,
});

router.get("/", (req, res) => {
  res.status(200).send("Bienvenido a la API de users");
});

router.post("/register", (req, res) => {
  const { user, password, userType } = req.body;

  // Verificar si los campos están vacíos
  if (!user || !password) {
    return res
      .status(400)
      .json({ mensaje: "Los campos usuario y contraseña son obligatorios." });
  }

  connection.getConnection((error, tempConn) => {
    if (error) {
      res.status(500).send("Error al conectar a la base de datos.");
    } else {
      console.log("Conexión correcta.");

      const query = `
          INSERT INTO usuarios (user, password, userType)
          VALUES (?, ?, ?)`;

      tempConn.query(query, [user, password, userType], (error, result) => {
        if (error) {
          res.status(500).send("Error en la ejecución del query.");
        } else {
          tempConn.release();

          res.json({
            mensaje: "Usuario registrado correctamente.",
          });
        }
      });
    }
  });
});

router.post("/login", (req, res) => {
  const { user, password } = req.body; // Obtiene los datos del cuerpo de la petición

  connection.getConnection((error, tempConn) => {
    if (error) {
      res.status(500).send("Error al conectar a la base de datos.");
    } else {
      console.log("Conexión correcta.");

      // Consulta para obtener los usuarios con el email y password proporcionados
      const query = `
            SELECT * FROM usuarios
            WHERE user = ? AND password = ?`;

      tempConn.query(query, [user, password], (error, result) => {
        if (error) {
          res.status(500).send("Error en la ejecución del query.");
        } else {
          tempConn.release(); // Liberar la conexión

          const responseData = {}; // Objeto JSON para almacenar los resultados

          if (result.length > 0) {
            result.forEach((row, index) => {
              responseData[`user${index + 1}`] = row; // Almacena cada registro en el objeto JSON
            });
            res.json(responseData); // Devolver los registros como respuesta JSON
          } else {
            res.status(404).json({
              mensaje: "No se encontraron registros con ese user y password.",
            });
          }
        }
      });
    }
  });
});

module.exports = router;
