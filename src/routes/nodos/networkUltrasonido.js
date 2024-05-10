const { Router } = require("express");

const router = Router();

const mysql = require("mysql");

//presencia es Ausente/Presente
//distancia es en cm

// se crea la conexión a mysql
const connection = mysql.createPool({
  connectionLimit: 500,
  host: "localhost",
  user: "root",
  password: "", //el password de ingreso a mysql
  database: "parcialIOT",
  port: 3306,
});

//rutas para ultrasonido (get, post, delete, put)
router.get("/ultrasonido", (req, res) => {
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
        "SELECT * FROM datosultrasonidoparcial where id = 1",
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
                distancia: resultado[i].distancia,
                presencia: resultado[i].presencia,
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
router.get("/ultrasonido/:idnodo", (req, res) => {
  const { idnodo } = req.params;

  connection.getConnection((error, tempConn) => {
    if (error) {
      console.error(error.message);
      res.status(500).send("Error al conectar a la base de datos.");
    } else {
      console.log("Conexión correcta.");

      const query = `
          SELECT * FROM datosultrasonidoparcial
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

router.post("/ultrasonido", (req, res) => {
  var json1 = req.body;
  console.log(json1);

  connection.getConnection(function (error, tempConn) {
    if (error) {
      console.error(error.message);
      res.status(500).send("Error al conectar a la base de datos.");
    } else {
      console.log("Conexión correcta.");
      // Consulta para verificar si el usuario ya existe
      const checkUserQuery = `SELECT COUNT(*) AS count FROM datosultrasonidoparcial WHERE idnodo = ?`;

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
              "INSERT INTO datosultrasonidoparcial VALUES(null, ?, ?, ?, ?, now())",
              [
                json1.usuario_id,
                json1.idnodo,
                json1.distancia,
                json1.presencia,
              ],
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

router.delete("/ultrasonido/admin", (req, res) => {
  var json1 = req.body; // Se recibe el JSON con los datos
  console.log(json1); // Se muestra en consola

  connection.getConnection(function (error, tempConn) {
    // Conexión a MySQL
    try {
      if (error) {
        throw error; // En caso de error en la conexión
      }

      console.log("Conexión correcta.");

      tempConn.query(
        "DELETE FROM datosultrasonidoparcial WHERE idnodo = ?",
        [json1.idnodo],
        function (error, result) {
          // Se ejecuta la eliminación
          if (error) {
            throw error; // Lanzar error si la eliminación falla
          } else {
            // Se libera la conexión solo después de la operación exitosa
            tempConn.release();
            res.status(200).send(`Datos eliminados`);
          }
        }
      );
    } catch (error) {
      // Manejo de errores
      console.error(error.message);
      res.status(500).send(error.message); // Enviar respuesta de error al cliente
    }
  });
});

router.put("/ultrasonido/admin", (req, res) => {
  var json1 = req.body;
  console.log(json1);

  connection.getConnection(function (error, tempConn) {
    if (error) {
      console.error(error.message);
      res.status(500).send("Error al conectar a la base de datos.");
    } else {
      console.log("Conexión correcta.");

      tempConn.query(
        "UPDATE datosultrasonidoparcial SET distancia = ?, presencia = ?  WHERE idnodo = ?",
        [json1.distancia, json1.presencia, json1.idnodo],
        function (error, result) {
          if (error) {
            console.error(error.message);
            res.status(500).send("Error al actualizar los datos.");
          } else {
            tempConn.release();
            res.status(200).send("Datos actualizados correctamente.");
          }
        }
      );
    }
  });
});

module.exports = router;
