const { Router } = require("express");
const mqtt = require("mqtt");

const router = Router();

const mysql = require("mysql");

var client = mqtt.connect("mqtt://broker.mqtt-dashboard.com");

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

router.get("/allNodos", (req, res) => {
  // Consulta SQL para obtener todos los nodos existentes
  const queryNodos = `
  SELECT DISTINCT idnodo
  FROM (
      SELECT idnodo FROM datosmagneticoparcial
      UNION
      SELECT idnodo FROM datosultrasonidoparcial
  ) AS nodos;
  `;

  // Ejecutar ambas consultas en paralelo
  connection.query(queryNodos, (errorNodos, resultsNodos) => {
    if (errorNodos) {
      console.error("Error al obtener los nodos:", errorNodos);
      res.status(500).json({ error: "Error al obtener los nodos" });
      return;
    }
    // Crear el JSON combinado
    const datos = {
      nodos: resultsNodos, // Array de nodos
    };
    // Enviar el JSON combinado como respuesta
    res.json(datos);
  });
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
            client.publish(
              "brayan/login",
              JSON.stringify({ id: result[0].id })
            );
            result.forEach((row, index) => {
              responseData[`user${index + 1}`] = row; // Almacena cada registro en el objeto JSON
            });
            res.json(responseData); // Devolver los registros como respuesta JSON
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

router.get("/estadoPuerta", (req, res) => {
  connection.getConnection((error, tempConn) => {
    if (error) {
      console.error(error.message);
      res.status(500).send("Error al conectar a la base de datos.");
    } else {
      console.log("Conexión correcta.");

      const query = `
            SELECT * FROM estado
            WHERE DATE(fechahora) = CURDATE()`;

      tempConn.query(query, (error, result) => {
        if (error) {
          console.error(error.message);
          res.status(500).send("Error en la ejecución del query.");
        } else {
          tempConn.release();

          if (result.length > 0) {
            res.json(result);
          } else {
            res.status(404).json({
              mensaje: "No se encontraron registros para hoy",
            });
          }
        }
      });
    }
  });
});

router.get("/:id", (req, res) => {
  const { id } = req.params;

  // Función para realizar consultas SQL
  function realizarConsulta(query, params) {
    return new Promise((resolve, reject) => {
      connection.query(query, params, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  // Consulta para obtener datos del usuario
  const queryUsuario = `SELECT id, user, password FROM usuarios WHERE id = ?`;
  realizarConsulta(queryUsuario, [id])
    .then((resultUsuario) => {
      const usuario = resultUsuario[0];

      // Consulta para obtener nodos asociados al usuario
      const queryNodos = `
        SELECT idnodo 
        FROM (
          SELECT idnodo FROM datosultrasonidoparcial WHERE usuario_id = ?
          UNION
          SELECT idnodo FROM datosmagneticoparcial WHERE usuario_id = ?
        ) AS nodos_unicos`;
      return realizarConsulta(queryNodos, [id, id]).then((resultNodos) => {
        const nodos = resultNodos.map((nodo) => ({ idnodo: nodo.idnodo }));
        return { usuario, nodos };
      });
    })
    .then((data) => {
      res.json(data);
    })
    .catch((error) => {
      console.error("Error en la consulta:", error);
      res.status(500).json({ mensaje: "Error en la consulta SQL." });
    });
});

//trae los datos de los nodos asociados a un usuario
// router.get("/:id", (req, res) => {
//   const { id } = req.params;

//   // Función para realizar consultas SQL
//   function realizarConsulta(query, params) {
//     return new Promise((resolve, reject) => {
//       connection.query(query, params, (error, result) => {
//         if (error) {
//           reject(error);
//         } else {
//           resolve(result);
//         }
//       });
//     });
//   }

//   // Consulta para obtener datos del usuario, nodos y datos asociados
//   const queryDatosUsuario = `
//   SELECT
//     u.id AS usuario_id, u.user, u.password,
//     d.idnodo,
//     dul.usuario_id AS dul_usuario_id, dul.idnodo AS dul_id, dul.distancia AS dul_distancia, dul.presencia AS dul_presencia, dul.fechahora AS dul_fechahora,
//     dmp.usuario_id AS dmp_usuario_id, dmp.idnodo AS dmp_id, dmp.estadoPuerta AS dmp_estadoPuerta, dmp.fechahora AS dmp_fechahora
// FROM usuarios u
// LEFT JOIN (
//     SELECT DISTINCT idnodo, usuario_id FROM (
//         SELECT idnodo, usuario_id FROM datosultrasonidoparcial
//         UNION ALL
//         SELECT idnodo, usuario_id FROM datosmagneticoparcial
//     ) AS nodos_distintos
// ) d ON u.id = d.usuario_id
// LEFT JOIN datosultrasonidoparcial dul ON d.idnodo = dul.idnodo
// LEFT JOIN datosmagneticoparcial dmp ON d.idnodo = dmp.idnodo
// WHERE u.id = ?`;

//   realizarConsulta(queryDatosUsuario, [id])
//     .then((result) => {
//       const nodos = {};

//       // Organizar los datos por nodo
//       result.forEach((row) => {
//         const idnodo = row.idnodo;
//         if (!nodos[idnodo]) {
//           nodos[idnodo] = {
//             usuario_id: row.usuario_id,
//             user: row.user,
//             password: row.password,
//             idnodo: row.idnodo,
//             datos_ultrasonido: [],
//             datos_magnetico: [],
//           };
//         }

//         // Agregar los datos correspondientes al tipo de sensor
//         if (row.dul_id) {
//           nodos[idnodo].datos_ultrasonido.push({
//             dul_id: row.dul_id,
//             dul_distancia: row.dul_distancia,
//             dul_presencia: row.dul_presencia,
//             dul_fechahora: row.dul_fechahora,
//           });
//         }

//         if (row.dmp_id) {
//           nodos[idnodo].datos_magnetico.push({
//             dmp_id: row.dmp_id,
//             estadoPuerta: row.dmp_estadoPuerta,
//             dmp_fechahora: row.dmp_fechahora,
//           });
//         }
//       });

//       // Convertir el objeto de nodos a un arreglo
//       const nodosArray = Object.values(nodos);

//       res.json(nodosArray);
//     })
//     .catch((error) => {
//       console.error("Error en la consulta:", error);
//       res.status(500).json({ mensaje: "Error en la consulta SQL." });
//     });
// });

module.exports = router;
