#include <PubSubClient.h>
#include <WiFi.h>
#include <ArduinoJson.h>
#include <HX711.h>
#include <TimeLib.h>
#include <DS3231.h>  // Incluir la librería RTC DS3231
#include "time.h"

// Pines utilizados
#define TRIGGER 26
#define ECHO 27
#define sensor 14

// Constantes
int count = 0;
const float sonido = 34300.0;  // Velocidad del sonido en cm/s
int sensorValueMagnetic;
String magnetic, magnetic_previo, presenciaAux;

// Definir constantes y variables necesarias para establecer la conexión a un servidor MQTT
const char* mqttBroker = "maqiatto.com";
const char* ssid = "iPhone de Brayan";  //ssid de la red inalambrica
const char* password = "brrayyy09";

String arrayEnunciados[] = { "Ingrese el ClientId", "Ingrese el usuario", "Ingrese el password" };
char mqttClientId[] = "e958fe5d-5aac-48a1-90fb-ffce49e989dc";


char ClientId[37] = "";
char mqttUser[38] = "";
char mqttPass[38] = "";

#define mqttPort 1883

//HORA
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 3600;
const int daylightOffset_sec = 3600;

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  for (int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();
}

WiFiClient BClient;
PubSubClient client(BClient);

unsigned long hora() {
  time_t now;
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("Error al obtener la hora");
    return (0);
  }
  time(&now);
  return now;
}

void reconnect() {
  // Loop until we're reconnected

  // Leer un mensaje desde la consola
  Serial.println("Ingrese ClientId");
  if (Serial.available() != 0) {
    Serial.readBytes(ClientId, 37);  // Leer el byte entrante
    ClientId[37] = '\0';
    Serial.print("Recibido: ");
    Serial.println(ClientId);  // Mostrar el byte en la consola
  }
  Serial.println("Ingrese el mqttUser");
  if (Serial.available() != 0) {
    Serial.readBytes(mqttUser, 38);  // Leer el byte entrante
    mqttUser[38] = '\0';
    Serial.print("Recibido: ");
    Serial.println(mqttUser);  // Mostrar el byte en la consola
  }
  Serial.println("Ingrese el mqttPass");
  if (Serial.available() != 0) {
    Serial.readBytes(mqttPass, 38);  // Leer el byte entrante
    mqttPass[38] = '\0';
    Serial.print("Recibido: ");
    Serial.println(mqttPass);
  }

  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");

    // Attempt to connect
    if (client.connect(mqttClientId, mqttUser, mqttPass)) {  // Conectarse al cliente
      Serial.println("connected");                           // Once connected, publish an anouncement.
      // Crear un objeto JSON StaticJsonDocument con capacidad suficiente
      StaticJsonDocument<256> jsonMagnetic;
      StaticJsonDocument<256> jsonDistance;
      String variable;

      unsigned long t_unix_date1 = hora() - 18000;
      // Obtener la fecha y hora en formato legible
      String fecha_hora = String(year(t_unix_date1)) + "/" + String(month(t_unix_date1)) + "/" + String(day(t_unix_date1)) + " " + String(hour(t_unix_date1)) + ":" + String(minute(t_unix_date1)) + ":" + String(second(t_unix_date1));

      // Leer del sensor magnetico
      // Obtener el estado actual de la puerta
      String magnetic = validarPuerta();
      // Comparar con el estado previo
      if (magnetic != magnetic_previo) {  // Si el estado actual es diferente al estado previo
        // Actualizar el estado previo
        magnetic_previo = magnetic;

        // Publicar la información al primer cliente
        jsonMagnetic["id"] = "01";
        jsonMagnetic["sensor"] = "Magnetico";
        jsonMagnetic["value"] = magnetic;
        jsonMagnetic["Fecha y Hora"] = fecha_hora;
        serializeJsonPretty(jsonMagnetic, variable);
        int lonMagnetic = variable.length() + 1;
        Serial.println(variable);
        char datojson1[lonMagnetic];
        variable.toCharArray(datojson1, lonMagnetic);
        client.publish(mqttUser, "/SensorMagneticoParcial", datojson1);

        Serial.println();
      }

      // Leer del sensor de ultrasonido
      // Preparamos el sensor de ultrasonidos
      iniciarTrigger();
      // Obtenemos la distancia
      float distancia = calcularDistancia();
      //teniendo como referencia una altura del techo al suelo de
      //240 cm en el garaje y el auto una altura de 150 cm
      String presenciaCarro = "";
      if (distancia > 90) {
        presenciaCarro = "Ausente";
      } else if (distancia <= 90) {
        presenciaCarro = "Presente";
      }
      if (presenciaCarro != presenciaAux) {
        presenciaAux = presenciaCarro;
        // Publicar la información solo cuando cambie el estado
        jsonDistance["id"] = "01";
        jsonDistance["sensor"] = "Ultrasonido";
        jsonDistance["value"] = distancia;
        jsonDistance["presence"] = presenciaCarro;
        jsonDistance["Fecha y Hora"] = fecha_hora;
        serializeJsonPretty(jsonDistance, variable);
        int lonUltrasonido = variable.length() + 1;
        Serial.println(variable);
        char datojson2[lonUltrasonido];
        variable.toCharArray(datojson2, lonUltrasonido);
        client.publish(mqttUser, "/SensorUltrasonicoParcial", datojson2);
        Serial.println();
      }

      client.disconnect();
      delay(100);
      Serial.println();

    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      // Wait 5 seconds before retrying
      delay(5000);
    }
  }
}

//Metodo para validar si la puerta esta abierta o cerrada
//Devuel variable de tipo cadena
String validarPuerta() {
  sensorValueMagnetic = digitalRead(sensor);
  if (sensorValueMagnetic == HIGH) {
    magnetic = "Puerta abierta";
    delay(100);
  } else {
    magnetic = "Puerta cerrada";
    delay(100);
  }
  return magnetic;
}

// Método que calcula la distancia a la que se encuentra un objeto.
// Devuelve una variable tipo float que contiene la distancia
float calcularDistancia() {
  // La función pulseIn obtiene el tiempo que tarda en cambiar entre estados, en este caso a HIGH
  unsigned long tiempo = pulseIn(ECHO, HIGH);

  // Se obtiene la distancia en cm, hay que convertir el tiempo en segudos ya que está en microsegundos
  // por eso se multiplica por 0.000001
  float distancia = (tiempo * 0.000001) * sonido / 2.0;
  delay(500);

  return distancia;
}

// Método que inicia la secuencia del Trigger para comenzar a medir
void iniciarTrigger() {
  // Ponemos el Triiger en estado bajo y esperamos 2 ms
  digitalWrite(TRIGGER, LOW);
  delayMicroseconds(2);

  // Ponemos el pin Trigger a estado alto y esperamos 10 ms
  digitalWrite(TRIGGER, HIGH);
  delayMicroseconds(10);

  // Comenzamos poniendo el pin Trigger en estado bajo
  digitalWrite(TRIGGER, LOW);
}

void setup() {
  Serial.begin(9600);  //Serial connection
  setup_wifi();        //WiFi connection
  client.setServer(mqttBroker, mqttPort);
  client.setCallback(callback);
  Serial.println("Setup done");
  delay(1500);

  // Modo entrada/salida de los pines
  pinMode(ECHO, INPUT);
  pinMode(TRIGGER, OUTPUT);
  pinMode(sensor, INPUT);


  Serial.println("Iniciando sensores...");
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
}

void setup_wifi() {
  delay(10);
  // Iniciamos la conexión a la red wifi
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}
void loop() {

  if (!client.connected()) {
    reconnect();
  }
  client.loop();
}