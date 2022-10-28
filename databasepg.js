const {Client} = require('pg')

export const client = new Client({
  host: "localhost",
  user: "postgres",
  port: 5432,
  password: "Hartley123",
  database: "postgres"
})

module.exports = {
  client
}