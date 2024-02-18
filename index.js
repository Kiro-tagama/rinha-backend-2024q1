const app = require('fastify')()
const {Pool} = require('pg')

const client = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'rinha',
  password: '123',
  port: 5432,
  max: 60,
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 10000,
})
client.connect().then(res=>console.log("conectou")).catch(err=>console.log("n conectou"))

app.get('/', (req,res) => res.status(200).send("server on"))
/* */
app.get('/clientes/:id/extrato', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(422).send();

    const clienteQuery = await client.query('SELECT id, limite FROM clientes WHERE id = $1', [id]);
    if (clienteQuery.rows.length === 0) return res.status(404).send();
    
    const saldoQuery = await client.query('SELECT valor FROM saldos WHERE cliente_id = $1', [id]);
    const transacoesQuery = await client.query('SELECT * FROM transacoes WHERE cliente_id = $1', [id]);

    return res.status(200).send({
      saldo: {
        total: saldoQuery.rows[0].valor,
        data_extrato: new Date().toISOString(),
        limite: clienteQuery.rows[0].limite,
      },
      ultimas_transacoes: transacoesQuery.rows,
    });

  } catch (error) {
    console.error('Erro ao buscar extrato:', error);
    return res.status(500).send();
  }
})

app.post('/clientes/:id/transacoes', async (req, res) => {
  try {
    const id = req.params.id;
    const { valor, tipo, descricao } = req.body;
    
    if (
      isNaN(id) || 
      !req.body || !valor || !tipo || !descricao || 
      !['c', 'd'].includes(tipo) || 
      !Number.isInteger(Number(valor)) || 
      descricao.length < 1 || descricao.length > 10
    ) {
      return res.status(422).send();
    }

    const clienteQuery = await client.query('SELECT * FROM clientes WHERE id = $1', [id]);
    if (clienteQuery.rows.length === 0) return res.status(404).send();

    const saldoAtualQuery = await client.query('SELECT * FROM saldos WHERE cliente_id = $1', [id]);
    const novoSaldo = tipo === 'd' ? saldoAtualQuery.rows[0].valor - valor : saldoAtualQuery.rows[0].valor + valor;

    if (tipo === 'd' && novoSaldo < -clienteQuery.rows[0].limite) {
      return res.status(422).send();
    }

    await client.query('BEGIN');
    await client.query('INSERT INTO transacoes (cliente_id, valor, tipo, descricao) VALUES ($1, $2, $3, $4)', [id, valor, tipo, descricao]);
    await client.query('UPDATE saldos SET valor = $1 WHERE cliente_id = $2', [novoSaldo, id]);
    await client.query('COMMIT');

    return res.status(200).send({ limite: clienteQuery.rows[0].limite, saldo: novoSaldo });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).send();
  } finally{
    client.release();
  }
});


app.delete('/clientes/:id/extrato', async (req, res) => {
  await client.query('DELETE FROM transacoes;UPDATE saldos SET valor = 0;')
  return res.status(200).send();
})
/* */
app.listen({ port: process.env.HTTP_PORT, host:"0.0.0.0"});