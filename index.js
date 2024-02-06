const express = require('express')
const app = express()
const port = 9999

app.get('/', (req, res) => {res.status(200).json('Hello World!')})
/* */
app.get('/clientes/:id/extrato', (req, res) => {
  var id = req.params.id
  // verificar se o usuario existe e retornar o extrato
  res.status(200).json(id)
})
app.post('/clientes/:id/transacoes', (req, res) => {
  // verificar se o saldo é menor que o limite
})
/* */
app.listen(port, () => {console.log(`on port ${port}`)})