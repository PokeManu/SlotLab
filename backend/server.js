const express = require('express');
const cors = require('cors');
const db = require('./db/db')


const app = express(); // instanziamo un oggetto express, che rappresenta la nostra applicazione

//Middleware

app.use(cors());

// Permette al server di leggere dati in formato JSON
app.use(express.json());

app.get('/api/impostazioni', (req, res) => {
    db.all("SELECT * FROM impostazioni", [], (err, rows) => {
        if (err) return res.status(500).json({ errore: err.message });
        res.json(rows);
    });
});
// in questo modo possiamo definire le rotte, gestire le richieste HTTP, configurazioni
// Porta del server
const PORT = 3000;


// Rotta base
app.get('/', (req, res) => {
res.send('Server attivo');
});
// Avvia il server

app.listen(PORT, () => {
console.log(`Server in ascolto su http://localhost:${PORT}`);
});