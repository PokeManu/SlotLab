const express = require('express');
const app = express(); // instanziamo un oggetto express, che rappresenta la nostra applicazione

// in questo modo possiamo definire le rotte, gestire le richieste HTTP, configurazioni
// Porta del server
const PORT = 3000;

// Permette al server di leggere dati in formato JSON
app.use(express.json());

// Rotta base
app.get('/', (req, res) => {
res.send('Server attivo');
});
// Avvia il server

app.listen(PORT, () => {
console.log(`Server in ascolto su http://localhost:${PORT}`);
});