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

  //rutas para ultrasonido (get, post, delete, put)
router.get("/magnetico/admin", (req, res) => {
  var json1 = {}; //variable para almacenar cada registro que se lea, en  formato json
  var arreglo = []; //variable para almacenar todos los datos, en formato arreglo de json
  connection.getConnection(function (error, tempConn) {
    //conexion a mysql
    if (error) {
      throw error; //si no se pudo conectar
    } else {
      console.log("Conexion correcta.");
      //ejecución de la consulta
      tempConn.query(
        "SELECT * FROM datosmagneticoparcial",
        function (error, result) {
          var resultado = result; //se almacena el resultado de la consulta en la variable resultado
          if (error) {
            res.status(500).send(error.message);
          } else {
            tempConn.release(); //se librea la conexión
            for (i = 0; i < resultado.length; i++) {
              //se lee el resultado y se arma el json
              json1 = {
                id: resultado[i].id,
                usuario_id: resultado[i].usuario_id,
                idnodo: resultado[i].idnodo,
                estadoPuerta: resultado[i].estadoPuerta,
                fechahora: resultado[i].fechahora,
              };
              console.log(json1); //se muestra el json en la consola
              arreglo.push(json1); //se añade el json al arreglo
            }
            res.json(arreglo); //se retorna el arreglo
          }
        }
      );
    }
  });
});

// Ruta GET para obtener datos de `datosUltrasonido` filtrados por `idnodo`
router.get("/magnetico/:idnodo", (req, res) => {
  const { idnodo } = req.params;

  connection.getConnection((error, tempConn) => {
    if (error) {
      console.error(error.message);
      res.status(500).send("Error al conectar a la base de datos.");
    } else {
      console.log("Conexión correcta.");

      const query = `
        SELECT * FROM datosmagneticoparcial
        WHERE DATE(fechahora) = CURDATE() AND idnodo = ?`;

      tempConn.query(query, [idnodo], (error, result) => {
        if (error) {
          console.error(error.message);
          res.status(500).send("Error en la ejecución del query.");
        } else {
          tempConn.release();

          if (result.length > 0) {
            res.json(result);
          } else {
            res.status(404).json({
              mensaje: "No se encontraron registros para hoy con ese idnodo.",
            });
          }
        }
      });
    }
  });
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

  module.exports = router;