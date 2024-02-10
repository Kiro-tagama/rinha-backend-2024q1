const express = require('express')
const {Pool} = require('pg')
const app = express()
const port = 9999

const client = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'rinha',
  password: '123',
  port: 5432,
  //max: 65,
  //idleTimeoutMillis: 0,
	//connectionTimeoutMillis: 10000,
})

app.use(express.json())

/* */
app.get('/clientes/:id/extrato', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(422).json('422 id');
    
    
    const clienteQuery = await client.query('SELECT * FROM clientes WHERE id = $1', [id]);
    if (clienteQuery.rows.length === 0) return res.status(404).json('404');

    const saldoQuery = await client.query('SELECT * FROM saldos WHERE cliente_id = $1', [id]);
    const transacoesQuery = await client.query('SELECT * FROM transacoes WHERE cliente_id = $1', [id]);

    const extrato = {
      saldo: {
        total: saldoQuery.rows.length > 0 ? saldoQuery.rows[0].valor : 0,
        data_extrato: new Date().toISOString(),
        limite: clienteQuery.rows[0].limite,
      },
      ultimas_transacoes: transacoesQuery.rows,
    };

    return res.status(200).json(extrato);
  } catch (error) {
    console.error('Erro ao buscar extrato:', error);
    return res.status(500).json('500');
  }
})

app.post('/clientes/:id/transacoes', async (req, res) => {
  try {
    var id = req.params.id
    var {valor, tipo, descricao} = req.body

    if (isNaN(id) || !valor || !tipo || !descricao || !['c', 'd'].includes(tipo) || valor <= 0 || !Number.isInteger(valor) || descricao.length < 1 || descricao.length > 10) {
      return res.status(422).json('422');
    }

    const clienteQuery = await client.query('SELECT * FROM clientes WHERE id = $1', [id]);
    if (clienteQuery.rows.length === 0) return res.status(404).json("404");

    const saldoAtualQuery = await client.query('SELECT * FROM saldos WHERE cliente_id = $1', [id]);
    const novoSaldo = tipo === 'd'? saldoAtualQuery.rows[0].valor - valor : saldoAtualQuery.rows[0].valor + valor;

    if (tipo === 'd' && novoSaldo < -clienteQuery.rows[0].limite) {
      return res.status(422).json("422 limite");
    }

    await client.query('INSERT INTO transacoes (cliente_id, valor, tipo, descricao) VALUES ($1, $2, $3, $4)', [id, valor, tipo, descricao]);
    await client.query('UPDATE saldos SET valor = $1 WHERE cliente_id = $2', [novoSaldo, id]);

    return res.status(200).json({ limite: clienteQuery.rows[0].limite, saldo: novoSaldo });
  } catch (error) {
    console.error('Erro ao processar transação:', error);
    return res.status(500).json('500');
  }
})

app.delete('/clientes/:id/extrato', async (req, res) => {
  await client.query('DELETE FROM transacoes;UPDATE saldos SET valor = 0;')
  return res.status(200).json('200')
})
/* */
app.listen(port, () => {})