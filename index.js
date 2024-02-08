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
client.connect()
.then(() => console.log("conectado"))
.catch((err) => console.log(err))

app.use(express.json())

/* */
app.get('/clientes/:id/extrato', (req, res, next) => {
  var id = req.params.id
  
  client.query('SELECT * FROM clientes WHERE id = $1', [id], async (err, result) => {
    if (result.rows.length === 0){
      res.status(404).json('404') 
    }else{
      const saldo = await client.query('SELECT * FROM saldos WHERE cliente_id = $1', [id]);
      const trans = await client.query('SELECT * FROM transacoes WHERE cliente_id = $1', [id]);
      
      const extrato = {
        saldo: {
          total: saldo ? saldo.rows[0].valor : 0,
          data_extrato: new Date().toISOString(),
          limite: result.rows[0].limite
        },
        ultimas_transacoes: trans && trans.rows ? trans.rows : []
      };
      res.status(200).json(extrato);
    }
  });
})

app.post('/clientes/:id/transacoes', (req, res) => {
  var id = req.params.id
  var {valor,tipo,descricao} = req.body

  client.query('SELECT * FROM clientes WHERE id = $1', [id], async (err, result) => {
    if (result.rows.length === 0){
      res.status(404).json('404') 
    }else{
      // se a transação pedida for compativel faz a transação se n retorna erro 
      const querySaldo = await client.query('SELECT * FROM saldos WHERE cliente_id = $1', [id]);
      const saldo = querySaldo? querySaldo.rows[0].valor : 0;
      const limite = result.rows[0].limite;


      const resposta = {
        limite : limite,
        saldo : saldo-valor
      }
      res.status(200).json(resposta);
    }
  });
})

app.delete('/clientes/:id/transacoes'|'/clientes/:id/extrato', (req, res) => {
  client.query(
    'DELETE FROM transacoes;UPDATE saldos SET valor = 0;'
  )
})
/* */
app.listen(port, () => {})