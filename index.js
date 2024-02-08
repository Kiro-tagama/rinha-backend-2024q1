const express = require('express')
const {Client} = require('pg')
const app = express()
const port = 3030

const client = new Client({
  user: 'admin',
  host: 'localhost',
  database: 'rinha',
  password: '123',
  port: 5432
})
client.connect().then(() => console.log("conectado")).catch((err) => console.log(err))

app.use(express.json())

/* */
app.get('/clientes/:id/extrato', (req, res) => {
  var id = req.params.id
  
  client.query('SELECT * FROM clientes WHERE id = $1', [id], (err, result) => {
    if (result.rows.length === 0){res.status(404).json(result.rows[0])}

    client.query('SELECT * FROM transacoes WHERE client_id = $1', [id], (err, trans) => {
      const extrato = {
        saldo: {
          total: result.rows[0].saldo,
          data_extrato: new Date().toISOString(),
          limite: result.rows[0].limite
        },
        ultimas_transacoes: trans && trans.rows ? trans.rows : []
      };
      res.status(200).json(extrato);
    })

  });

})
app.post('/clientes/:id/transacoes', (req, res) => {
  var id = req.params.id
  var valor = req.body.valor

})
/* */
app.listen(port, () => {})