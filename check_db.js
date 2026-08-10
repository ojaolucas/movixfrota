const db = require('./db');

async function main() {
    try {
        const res = await db.query("SELECT id, \"dataSaida\", \"horaSaida\", status FROM viagens ORDER BY \"dataSaida\" DESC, \"horaSaida\" DESC LIMIT 10");
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

main();
