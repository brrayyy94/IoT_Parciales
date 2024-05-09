const nodoMagnetico = require('./nodos/networkMagnetico.js');
const nodoUltrasonido  = require('./nodos/networkUltrasonido.js');
const user = require('./user/networkUser.js');

const routes = (server) => {
    server.use('/nodos', nodoMagnetico);
    server.use('/nodos', nodoUltrasonido);
    server.use('/user', user);
};

module.exports = routes;