import pkg from "pg";

const { Pool } = pkg;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "daftaraset2",
  password: "magenta2025",
  port: 5432,
});

export default pool;
