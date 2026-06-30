require('dotenv').config() //Configura el cambio de puerto de 3000 a el de .env
const express = require('express');
const bodyParser = require('body-parser');
//const { PrismaClient } = require('./generated/prisma');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(); // Configuracion donde busca esquema de schema.prisma
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const LoggerMiddleware = require('./middlewares/logger'); //trae modulo de logger
const errorHandler = require('./middlewares/errorHandler'); //Exportamos funcion de validaciones
const { validateUser } = require('./utils/validation'); //Exportamos funcion de validaciones
const authenticateToken = require('./middlewares/auth');

const fs = require('fs'); //modulo file system para manipular archivos
const path = require('path'); //modulo para extraer rutas
const { error } = require('console');
const usersFilePath = path.join(__dirname, 'users.json');

const app = express();
app.use(bodyParser.json()); //Dentro de app en tienda envio de info en formato JSON
app.use(bodyParser.urlencoded({extended: true})); //confi en true, dar soporte a solicitudes
app.use(LoggerMiddleware);
app.use(errorHandler);

//const PORT = 3000; //definido principio
const PORT = process.env.PORT || 3000;
console.log(PORT)

app.get('/', (req, res) => {
    res.send(`
        <h1>Curso Express.js V4</h1>
        <p>Esto es una aplicacion node.js con express.js</>
        <p>Corre en el puerto: ${PORT}</p>
        `);
});

app.get('/users/:id', (req, res) => {
    const userId = req.params.id;
    res.send(`Mostrar informacion del usuario con ID: ${userId}`); 
}); //El : de users/:id es para valor dinamico
//http://localhost:3005/users/123
//Ejemplo de lo que entrega

app.get('/search', (req,res) => {
    const terms = req.query.termino || 'No especifico';
    const category = req.query.categoria || 'Todas';

    res.send(`
        <h2>Resultados de Busqueda:</h2>
        <p>Termino: ${terms}</p>
        <p>Categoria: ${category}</p>
        `)
});
//http://localhost:3005/search?termino=expressjs&categoria=nodejs
//Ejemplo de lo que entrega

app.post('/form', (req, res) => {
    const name = req.body.nombre || "Anonimo"; //Valor anonimo
    const email = req.body.email || "No proporcionado"; //Valor no dado
    res.json({
        message: "Datos recibidos",
        data: {
            name,
            email
        }
    });
});

app.post('/api/data', (req, res) => {
    const data = req.body;

    if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({error: "No se recibieron datos"});
    }

    res.status(201).json({
        message: "Datos recibidos tipo JSON",
        data
    });
});

//funcion para validad email
function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
//funcion para validad nombre
function validarNombre(nombre) {
    const regex = /^[a-zA-Z]+\s[a-zA-Z]+$/;
    return regex.test(nombre);
}

app.get('/users', (req,res) => {
    fs.readFile(usersFilePath, 'utf-8', (err,data) => {
        if (err) {
            return res.status(500).json({ error: 'Error conexion de datos. '});
        }
        const users = JSON.parse(data);
        res.json(users);
    });

}); //funcion donde obtiene los usuarios de users.json

app.post('/users', (req,res) => {
    const newUser = req.body;
    //validacion de cadena de nombre y correo

    fs.readFile(usersFilePath, 'utf-8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Error en conexion de datos. '});
        }
        const users = JSON.parse(data);

        // //se valida que la informacion del requerimiento sea valida
        // const newUser = req.body;
        // if (!newUser || Object.keys(newUser).length === 0) {
        //     return res.status(400).json({error: 'No se recibieron datos'});
        // }
        // //comprueba no repeticion del indice        
        // const indice = users.findIndex(u => u.id === newUser.id)
        // if (indice !== -1) {
        //     return res.status(500).json({error: 'El indice ya existe'});
        // }
        // //valida si el nombre tiene al menos dos partes
        // if (!validarNombre(newUser.name)) {
        //     return res.status(500).json({error: 'Nombre invalido'});
        // }
        // //valida que la sintaxis del email este bien
        // if (!validarEmail(newUser.email)) {
        //     return res.status(500).json({error: 'email invalido'});
        // }

        //funcion de validar nombre correo y id
        const validation = validateUser(newUser, users);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.errors });
        }

        users.push(newUser);
        fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ error: 'Error al guardar el usuario. '});
            }
            res.status(201).json(newUser);
        });
    });
    

});

app.put('/users/:id', (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const updateUser = req.body;

    fs.readFile(usersFilePath, 'utf8', (err,data) => {
        if (err) {
            return res.status(500).json({ error: 'Error en conexion de datos.' });
        }
        let users = JSON.parse(data);

        //funcion de validar nombre correo y id
        const validation = validateUser(updateUser, users, userId);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.errors });
        }

        users = users.map(user => 
            user.id === userId ? {...user, ...updateUser} : user
        );
        fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ error: 'Error al actualizar el usuario.' });
            }
            res.json(updateUser);
        })
    });
});

app.delete('/users/:id', (req, res) => {
    const userId = parseInt(req.params.id, 10);
    fs.readFile(usersFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Error en conexion de datos.' });
        }
        let users = JSON.parse(data);
        users = users.filter(user => user.id !== userId);
        fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), (err) => {
            if (err) {
            return res.status(500).json({ error: 'Error al eliminar usuario' });
            }
            res.status(204).send;
        });
    });

})

//Prueba de error
app.get('/error', (req, res, next) => {
    next(new Error('Error Intencional'));
});

//Muestra usuarios registrados
app.get('/db-users', async (req, res) => {
    try{
        const users = await prisma.user.findMany();
        res.json(users);

    } catch (error) {
        res.status(500).json({ error: 'Error al comunicarse con la base de datos'});

    }
});

app.get('/protected-route', authenticateToken, (req,res) => {
    res.send('Esta es una ruta protegida.');
});

//Registro con un password encriptado
app.post('/register', async (req, res) => {
    const { email, password, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
            role: 'USER'
        }
    });
    res.status(201).json({ message: 'User registered successfully'});
});

app.listen(PORT, () => {
    console.log(`Server: http://localhost:${PORT}`); //Direcciona directamente al puerto elegido
});