var mqtt = require("mqtt");
const mysql = require("mysql");
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const routes = require("./src/routes/routes.js");

const app = express(); //creamos una instancia de express

//var client = mqtt.connect('mqtt://localhost)
var client = mqtt.connect("mqtt://broker.mqtt-dashboard.com");

app.set("port", 3000);

app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

routes(app);

app.get("/", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.send("Este es el principal");
});

const connection = mysql.createPool({
  connectionLimit: 500,
  host: "localhost",
  user: "root",
  password: "", //el password de ingreso a mysql
  database: "parcialIOT",
  port: 3306,
});

client.on("connect", function () {
  client.subscribe("brayan/SensorMagneticoParcial", function (err) {
    if (err) {
      console.log("error en la subscripcion");
    } else {
      console.log("Subscripcion exitosa");
    }
  });
  client.subscribe("brayan/SensorUltrasonidoParcial", function (err) {
    if (err) {
      console.log("error en la subscripcion");
    } else {
      console.log("Subscripcion exitosa");
    }
  });
});

client.on("message", function (topic, message) {
  // message is Buffer
  json1 = JSON.parse(message.toString());
  console.log(json1);
  let sensor = json1.sensor;
  if (sensor == "Magnetico") {
    connection.getConnection(function (error, tempConn) {
      //conexion a mysql
      if (error) {
        //throw error; //en caso de error en la conexion
      } else {
        console.log("Conexion correcta.");
        const checkUserQuery = `SELECT COUNT(*) AS count FROM datosmagneticoparcial WHERE idnodo = ?`;

        tempConn.query(checkUserQuery, [json1.idnodo], (error, result) => {
          if (error) {
            tempConn.release();
            console.log(
              "Error en la ejecución de la consulta de verificación de usuario."
            );
          } else {
            const userCount = result[0].count;

            if (userCount > 0) {
              // Si el usuario ya existe, devuelve un mensaje de error
              tempConn.release();
              console.log({
                mensaje: "El idnodo ya existe en la base de datos.",
              });
            } else {
              tempConn.query(
                "INSERT INTO datosmagneticoparcial VALUES(null, ?, ?, ?, now())",
                [json1.usuario_id, json1.idnodo, json1.valueMagnetico],
                function (error, result) {
                  //se ejecuta lainserción
                  if (error) {
                    throw error;
                  } else {
                    console.log("datos almacenados"); //mensaje de respuesta en consola
                    var presencia = json1.valueMagnetico;

                    if (presencia == "Puerta abierta") {
                      json2 = { estadoVs: "Puerta abierta" };
                    } else {
                      json2 = { estadoVs: "Puerta cerrada" };
                    }

                    client.publish("brayan/topico2", JSON.stringify(json2));

                    tempConn.query(
                      "INSERT INTO estado VALUES(null, ?, ?, now())",
                      [json1.idnodo, json2.estadoVs],
                      function (error, result) {
                        //se ejecuta lainserción
                        if (error) {
                          throw error;
                          console.log("error al ejecutar el query"); //esto no se esta ejecutando
                        } else {
                          tempConn.release();
                          console.log("datos almacenados"); //mensaje de respuesta en consola
                        }
                        //client.end() //si se habilita esta opción el servicio termina
                      }
                    );
                  }
                  //client.end() //si se habilita esta opción el servicio termina
                }
              );
            }
          }
        });
      }
    });
  } else if (sensor == "Ultrasonido") {
    connection.getConnection(function (error, tempConn) {
      //conexion a mysql
      if (error) {
        //throw error; //en caso de error en la conexion
      } else {
        console.log("Conexion correcta.");
        try {
          const checkUserQuery = `SELECT COUNT(*) AS count FROM datosultrasonidoparcial WHERE idnodo = ?`;

          tempConn.query(checkUserQuery, [json1.idnodo], (error, result) => {
            if (error) {
              tempConn.release();
              console.log(
                "Error en la ejecución de la consulta de verificación de usuario."
              );
            } else {
              const userCount = result[0].count;

              if (userCount > 0) {
                // Si el usuario ya existe, devuelve un mensaje de error
                tempConn.release();
                console.log({
                  mensaje: "El idnodo ya existe en la base de datos.",
                });
              } else {
                tempConn.query(
                  "INSERT INTO datosultrasonidoparcial VALUES(null, ?, ?, ?, ?, now())",
                  [
                    json1.usuario_id,
                    json1.idnodo,
                    json1.valueUltrasonido,
                    json1.presence,
                  ],
                  function (error, result) {
                    //se ejecuta lainserción
                    if (error) {
                      throw error;
                      console.log("error al ejecutar el query"); //esto no se esta ejecutando
                    } else {
                      tempConn.release();
                      console.log("datos almacenados"); //mensaje de respuesta en consola
                    }
                    //client.end() //si se habilita esta opción el servicio termina
                  }
                );
              }
            }
          });
        } catch (errorQuery) {
          console.log("Error en la inserción de datos: " + errorQuery);
        }
      }
    });
  }
  //client.end(); //si se habilita esta opción el servicio termina
});

//Start server
app.listen(app.get("port"), () => {
  console.log(`Servidor funcionando port http://localhost:${app.get("port")}`);
});
