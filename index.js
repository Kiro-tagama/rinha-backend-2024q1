const express = require('express')
const {Pool} = require('pg')
const app = express()
const port = 3030

const client = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'rinha',
  password: '123',
  port: 5432
})

app.use(express.json())

/* */
app.get('/clientes/:id/extrato', (req, res, next) => {
  var id = parseInt(req.params.id)
  if (isNaN(id)) return res.status(422).json('422 id');
  
  client.query('SELECT * FROM clientes WHERE id = $1', [id], async (err, result) => {
    if (result.rows.length === 0){
      return res.status(404).json('404') 
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
      return res.status(200).json(extrato);
    }
  });
})

app.post('/clientes/:id/transacoes', (req, res) => {
  var id = parseInt(req.params.id)
  var {valor, tipo, descricao} = req.body

  if (isNaN(id)) return res.status(422).json('422 id');

  if (
    tipo != ('c' || 'd') ||
    descricao.length < 1 ||
    descricao.length > 10
  ) return res.status(422).json('422 body')

  client.query('SELECT * FROM clientes WHERE id = $1', [id], async (err, result) => {
    if (result.rows.length === 0){
      return res.status(404).json('404') 
    }else{
      const saldoAtual = await client.query('SELECT * FROM saldos WHERE cliente_id = $1', [id])
      const novoSaldo = tipo === 'd'? saldoAtual.rows[0].valor - valor : saldoAtual.rows[0].valor + valor;

      if (novoSaldo < -result.rows[0].limite){ 
        return res.status(422).json("422 extrapolou");
      }else{
        await client.query('INSERT INTO transacoes (cliente_id, valor, tipo, descricao) VALUES ($1, $2, $3, $4)', [id, valor, tipo, descricao]);
        await client.query('UPDATE saldos SET valor = valor + $1 WHERE cliente_id = $2', [tipo === 'c' ? valor : -valor, id]);

        return res.status(200).json({ limite: result.rows[0].limite, saldo: novoSaldo});
      }
    }
  });
})

app.delete('/clientes/:id/extrato', async (req, res) => {
  await client.query('DELETE FROM transacoes;UPDATE saldos SET valor = 0;')
  return res.status(200).json('200')
})
/* */
app.listen(port, () => {})