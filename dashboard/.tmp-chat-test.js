const Database = require('better-sqlite3');
const db = new Database('data/tasks.db', { readonly: true });
console.log('before');
const rows = db.prepare('SELECT * FROM chat_threads WHERE agent = ?').all('thor');
console.log(JSON.stringify(rows, null, 2));
db.close();
console.log('after');
