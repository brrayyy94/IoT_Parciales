const { Router } = require('express');

const router = Router();

const mysql = require('mysql');

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
    res.status(200).send("Bienvenido a la API de nodos");
});

router.post("/magnetico", (req, res) => {
    var json1 = req.body;
    console.log(json1);
  
    connection.getConnection(function (error, tempConn) {
      if (error) {
        console.error(error.message);
        res.status(500).send("Error al conectar a la base de datos.");
      } else {
        console.log("Conexión correcta.");
        // Consulta para verificar si el usuario ya existe
        const checkUserQuery = `SELECT COUNT(*) AS count FROM datosmagneticoparcial WHERE idnodo = ?`;
  
        tempConn.query(checkUserQuery, [json1.idnodo], (error, result) => {
          if (error) {
            tempConn.release();
            res
              .status(500)
              .send(
                "Error en la ejecución de la consulta de verificación de usuario."
              );
          } else {
            const userCount = result[0].count;
  
            if (userCount > 0) {
              // Si el usuario ya existe, devuelve un mensaje de error
              tempConn.release();
              res.status(400).json({
                mensaje: "El idnodo ya existe en la base de datos.",
              });
            } else {
              tempConn.query(
                "INSERT INTO datosmagneticoparcial VALUES(null, ?, ?, ?, now())",
                [json1.usuario_id, json1.idnodo, json1.estadoPuerta],
                function (error, result) {
                  if (error) {
                    console.error(error.message);
                    res.status(500).send("Error al insertar los datos.");
                  } else {
                    tempConn.release();
                    res.status(200).send("Datos almacenados correctamente.");
                  }
                }
              );
            }
          }
        });
      }
    });
  });