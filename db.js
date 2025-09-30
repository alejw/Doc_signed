const sql = require('mssql');

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true, // Utiliza cifrado si es necesario
        trustServerCertificate: true, // Cambia esto según tu entorno
    },
};
const poolPromise = new sql.ConnectionPool(dbConfig) //aqui creo la conexion a la base de datos
    .connect() //aqui intento conectarme con la funcion connect que se encarga de establecer la conexion
    .then(pool => { //aqui digo que si la conexion es exitosa, imprima un mensaje en consola y retorne el pool de conexiones
        console.log('Conexión a la base de datos establecida');
        return pool;
    })
    .catch(err => { //aqui digo que si la conexion falla, imprima un mensaje de error en consola y termine el proceso
        console.error('Error al conectar a la base de datos:', err);
        process.exit(1);
    });

module.exports = { sql, poolPromise }; //aqui exporto el objeto sql y el pool de conexiones para usarlos en otros archivos
