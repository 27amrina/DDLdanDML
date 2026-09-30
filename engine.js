class MiniSqlEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.databases = {};
    this.activeDatabase = null;
    this.ensureDatabase('__session__');
    this.activeDatabase = '__session__';
  }

  ensureDatabase(name) {
    if (!this.databases[name]) {
      this.databases[name] = { tables: {} };
    }
    return this.databases[name];
  }

  serialize() {
    return JSON.stringify({
      databases: this.databases,
      activeDatabase: this.activeDatabase
    });
  }

  load(serialized) {
    const obj = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
    if (!obj || typeof obj !== 'object') throw new Error('Data database tidak valid.');
    this.databases = obj.databases || {};
    this.activeDatabase = obj.activeDatabase || '__session__';
    this.ensureDatabase(this.activeDatabase);
  }

  get db() {
    return this.ensureDatabase(this.activeDatabase || '__session__');
  }

  splitStatements(sql) {
    const out = [];
    let current = '';
    let quote = null;
    let depth = 0;
    for (let i = 0; i < sql.length; i++) {
      const ch = sql[i];
      const next = sql[i + 1];
      if (quote) {
        current += ch;
        if (ch === quote) {
          if (next === quote) {
            current += next;
            i++;
          } else if (sql[i - 1] !== '\\') {
            quote = null;
          }
        }
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        quote = ch;
        current += ch;
      } else if (ch === '(') {
        depth++;
        current += ch;
      } else if (ch === ')') {
        depth = Math.max(0, depth - 1);
        current += ch;
      } else if (ch === ';' && depth === 0) {
        if (current.trim()) out.push(current.trim());
        current = '';
      } else if (ch === '-' && next === '-' && depth === 0) {
        while (i < sql.length && sql[i] !== '\n') i++;
        current += '\n';
      } else if (ch === '/' && next === '*' && depth === 0) {
        i += 2;
        while (i < sql.length - 1 && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
        i++;
      } else {
        current += ch;
      }
    }
    if (current.trim()) out.push(current.trim());
    return out;
  }

  splitTopLevel(text, delimiter = ',') {
    const out = [];
    let current = '';
    let quote = null;
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];
      if (quote) {
        current += ch;
        if (ch === quote) {
          if (next === quote) {
            current += next;
            i++;
          } else if (text[i - 1] !== '\\') {
            quote = null;
          }
        }
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        quote = ch;
        current += ch;
      } else if (ch === '(') {
        depth++;
        current += ch;
      } else if (ch === ')') {
        depth = Math.max(0, depth - 1);
        current += ch;
      } else if (ch === delimiter && depth === 0) {
        out.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) out.push(current.trim());
    return out;
  }

  normalizeName(name) {
    return String(name || '').trim().replace(/^`|`$/g, '').replace(/^"|"$/g, '');
  }

  parseValue(token) {
    const s = String(token).trim();
    if (/^NULL$/i.test(s)) return null;
    if (/^DEFAULT$/i.test(s)) return { __default: true };
    if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
      const q = s[0];
      let v = s.slice(1, -1);
      const re = new RegExp(q + q, 'g');
      v = v.replace(re, q).replace(/\\n/g, '\n').replace(/\\t/g, '\t');
      return v;
    }
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    return s;
  }

  formatValue(v) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return String(v);
    return String(v);
  }

  normalizeType(type) {
    return String(type || '').trim().replace(/\s+/g, '').toUpperCase();
  }

  validateDataType(type, columnName = '') {
    const t = this.normalizeType(type);
    const simple = /^(?:INT|INTEGER|BIGINT|SMALLINT|TINYINT|YEAR|DATE|DATETIME|TIMESTAMP|TEXT|MEDIUMTEXT|LONGTEXT|BOOLEAN|BOOL|FLOAT|DOUBLE|REAL)$/;
    const sized = /^(?:VARCHAR|CHAR)\(\d+\)$/;
    const numeric = /^(?:DECIMAL|NUMERIC)\(\d+(?:,\d+)?\)$/;
    if (simple.test(t) || sized.test(t) || numeric.test(t)) return t;
    const label = columnName ? ` pada kolom '${columnName}'` : '';
    if (/^[A-Z]+\([^0-9]/.test(t) || /PRIMARY|AUTO|NOTNULL|UNIQUE/.test(t)) {
      throw new Error(`Tipe data '${type}'${label} tidak valid. Atribut seperti PRIMARY KEY, AUTO_INCREMENT, NOT NULL, dan UNIQUE ditulis setelah tipe data tanpa tanda kurung. Contoh: id_kategori INT AUTO_INCREMENT PRIMARY KEY.`);
    }
    throw new Error(`Tipe data '${type}'${label} belum didukung/tidak valid. Gunakan tipe SQL seperti INT, VARCHAR(50), DECIMAL(12,2), YEAR, DATE, atau TEXT.`);
  }

  parseColumnOptions(opts, columnName) {
    const original = String(opts || '').trim();
    if (/\bAUTO\s+INCREMENT\b/i.test(original) && !/\bAUTO_INCREMENT\b/i.test(original)) {
      throw new Error(`Gunakan AUTO_INCREMENT (dengan garis bawah), bukan AUTO INCREMENT, pada kolom '${columnName}'.`);
    }
    if (/\(\s*(?:PRIMARY|AUTO|NOT|UNIQUE)/i.test(original)) {
      throw new Error(`Atribut kolom '${columnName}' tidak boleh dibungkus tanda kurung. Contoh yang benar: ${columnName} INT AUTO_INCREMENT PRIMARY KEY.`);
    }
    let defaultValue;
    const dm = original.match(/\bDEFAULT\s+((?:'[^']*(?:''[^']*)*')|(?:"[^"]*")|[^\s,]+)/i);
    if (dm) defaultValue = this.parseValue(dm[1]);

    let rest = original;
    if (dm) rest = rest.replace(dm[0], ' ');
    rest = rest
      .replace(/\bPRIMARY\s+KEY\b/ig, ' ')
      .replace(/\bAUTO_INCREMENT\b/ig, ' ')
      .replace(/\bAUTOINCREMENT\b/ig, ' ')
      .replace(/\bNOT\s+NULL\b/ig, ' ')
      .replace(/\bNULL\b/ig, ' ')
      .replace(/\bUNIQUE\b/ig, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (rest) {
      throw new Error(`Atribut kolom '${columnName}' tidak dikenali: ${rest}. Gunakan PRIMARY KEY, AUTO_INCREMENT, NOT NULL, UNIQUE, atau DEFAULT.`);
    }
    return {
      primaryKey: /\bPRIMARY\s+KEY\b/i.test(original),
      autoIncrement: /\bAUTO_INCREMENT\b|\bAUTOINCREMENT\b/i.test(original),
      notNull: /\bNOT\s+NULL\b/i.test(original),
      unique: /\bUNIQUE\b/i.test(original),
      defaultValue
    };
  }

  evalAssignmentExpression(expr, ctx) {
    const s = String(expr || '').trim();
    if (!s) throw new Error('Nilai pada SET tidak boleh kosong.');

    // Literal umum: angka, string, NULL, atau DEFAULT.
    if (/^NULL$/i.test(s) || /^DEFAULT$/i.test(s) || /^-?\d+(?:\.\d+)?$/.test(s) ||
        ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"')))) {
      return this.parseValue(s);
    }

    // Referensi kolom langsung, misalnya SET jumlah = jumlah.
    const direct = this.resolveOperand(s, ctx);
    if (direct !== s || Object.keys(ctx).some(k => k.toLowerCase() === s.replace(/`/g,'').toLowerCase())) {
      return direct;
    }

    // Aritmetika sederhana yang aman untuk latihan DML, misalnya:
    // SET jumlah = jumlah - 3 atau SET jumlah = 20 - 3.
    const am = s.match(/^(.+?)\s*([+\-*/])\s*(.+)$/);
    if (am) {
      const left = this.resolveOperand(am[1], ctx);
      const right = this.resolveOperand(am[3], ctx);
      const a = Number(left), b = Number(right);
      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        throw new Error(`Ekspresi SET '${s}' harus menggunakan nilai/kolom numerik untuk operasi ${am[2]}.`);
      }
      switch (am[2]) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/':
          if (b === 0) throw new Error('Pembagian dengan nol tidak diperbolehkan.');
          return a / b;
      }
    }

    // Jika bukan ekspresi, pertahankan perilaku literal teks lama agar simulator tetap sederhana.
    return this.parseValue(s);
  }

  execute(sql) {
    const statements = this.splitStatements(sql);
    if (!statements.length) throw new Error('Query masih kosong.');
    const results = [];
    for (const statement of statements) {
      results.push(this.executeStatement(statement));
    }
    return results;
  }

  executeStatement(statement) {
    const s = statement.trim();
    let m;

    if ((m = s.match(/^CREATE\s+DATABASE(?:\s+IF\s+NOT\s+EXISTS)?\s+([\w`-]+)$/i))) {
      const name = this.normalizeName(m[1]);
      if (this.databases[name]) {
        return { type: 'message', message: `Database ${name} sudah ada.` };
      }
      this.ensureDatabase(name);
      return { type: 'message', message: `Database ${name} berhasil dibuat.` };
    }

    if ((m = s.match(/^USE\s+([\w`-]+)$/i))) {
      const name = this.normalizeName(m[1]);
      if (!this.databases[name]) throw new Error(`Database '${name}' belum dibuat.`);
      this.activeDatabase = name;
      return { type: 'message', message: `Database aktif: ${name}` };
    }

    if ((m = s.match(/^DROP\s+DATABASE(?:\s+IF\s+EXISTS)?\s+([\w`-]+)$/i))) {
      const name = this.normalizeName(m[1]);
      if (!this.databases[name]) return { type: 'message', message: `Database ${name} tidak ditemukan.` };
      delete this.databases[name];
      if (this.activeDatabase === name) {
        this.activeDatabase = '__session__';
        this.ensureDatabase('__session__');
      }
      return { type: 'message', message: `Database ${name} dihapus.` };
    }

    if (/^SHOW\s+DATABASES$/i.test(s)) {
      const rows = Object.keys(this.databases).filter(x => x !== '__session__').map(Database => ({ Database }));
      return { type: 'select', columns: ['Database'], rows };
    }

    if (/^SHOW\s+TABLES$/i.test(s)) {
      const col = `Tables_in_${this.activeDatabase}`;
      const rows = Object.keys(this.db.tables).map(t => ({ [col]: t }));
      return { type: 'select', columns: [col], rows };
    }

    if ((m = s.match(/^(?:DESCRIBE|DESC)\s+([\w`-]+)$/i))) {
      const name = this.normalizeName(m[1]);
      const table = this.requireTable(name);
      const rows = table.columns.map(c => ({
        Field: c.name,
        Type: c.type,
        Null: c.notNull ? 'NO' : 'YES',
        Key: c.primaryKey ? 'PRI' : (c.unique ? 'UNI' : ''),
        Default: c.defaultValue === undefined ? null : c.defaultValue,
        Extra: c.autoIncrement ? 'auto_increment' : ''
      }));
      return { type: 'select', columns: ['Field','Type','Null','Key','Default','Extra'], rows };
    }

    if ((m = s.match(/^CREATE\s+TABLE(\s+IF\s+NOT\s+EXISTS)?\s+([\w`-]+)\s*\(([\s\S]*)\)$/i))) {
      const ifNotExists = !!m[1];
      const name = this.normalizeName(m[2]);
      if (this.db.tables[name]) {
        if (ifNotExists) return { type: 'message', message: `Tabel ${name} sudah ada; CREATE TABLE IF NOT EXISTS dilewati.` };
        throw new Error(`Tabel '${name}' sudah ada.`);
      }
      const defs = this.splitTopLevel(m[3]);
      const columns = [];
      const foreignKeys = [];
      const tableConstraints = [];
      for (let def of defs) {
        def = def.trim();
        if (!def) continue;
        let fm;
        if ((fm = def.match(/^FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([\w`-]+)\s*\(([^)]+)\)\s*$/i))) {
          foreignKeys.push({
            column: this.normalizeName(fm[1]),
            refTable: this.normalizeName(fm[2]),
            refColumn: this.normalizeName(fm[3])
          });
          continue;
        }
        if ((fm = def.match(/^PRIMARY\s+KEY\s*\(([^)]+)\)\s*$/i))) {
          tableConstraints.push({ type: 'primaryKey', columns: this.splitTopLevel(fm[1]).map(x => this.normalizeName(x)) });
          continue;
        }
        if ((fm = def.match(/^UNIQUE\s*\(([^)]+)\)\s*$/i))) {
          tableConstraints.push({ type: 'unique', columns: this.splitTopLevel(fm[1]).map(x => this.normalizeName(x)) });
          continue;
        }

        const cm = def.match(/^([\w`-]+)\s+([A-Za-z]+(?:\s*\([^)]*\))?)([\s\S]*)$/i);
        if (!cm) throw new Error(`Definisi kolom tidak dikenali: ${def}`);
        const colName = this.normalizeName(cm[1]);
        if (columns.some(c => c.name.toLowerCase() === colName.toLowerCase())) throw new Error(`Kolom '${colName}' ditulis lebih dari satu kali.`);
        const type = this.validateDataType(cm[2], colName);
        const opts = this.parseColumnOptions(cm[3] || '', colName);
        if (opts.autoIncrement && !/^(?:INT|INTEGER|BIGINT|SMALLINT|TINYINT)$/.test(type)) {
          throw new Error(`AUTO_INCREMENT pada kolom '${colName}' harus menggunakan tipe bilangan bulat seperti INT.`);
        }
        columns.push({ name: colName, type, ...opts });
      }
      if (!columns.length) throw new Error(`Tabel '${name}' harus memiliki minimal satu kolom.`);
      for (const tc of tableConstraints) {
        for (const cn of tc.columns) {
          const c = columns.find(x => x.name.toLowerCase() === cn.toLowerCase());
          if (!c) throw new Error(`Constraint ${tc.type === 'primaryKey' ? 'PRIMARY KEY' : 'UNIQUE'} mengacu ke kolom '${cn}' yang tidak ditemukan.`);
          if (tc.type === 'primaryKey') c.primaryKey = true;
          if (tc.type === 'unique') c.unique = true;
        }
      }
      for (const fk of foreignKeys) {
        const local = columns.find(c => c.name.toLowerCase() === fk.column.toLowerCase());
        if (!local) throw new Error(`FOREIGN KEY mengacu ke kolom lokal '${fk.column}' yang tidak ditemukan.`);
        const refTable = this.db.tables[fk.refTable];
        if (!refTable) throw new Error(`FOREIGN KEY mengacu ke tabel '${fk.refTable}' yang belum dibuat.`);
        if (!refTable.columns.some(c => c.name.toLowerCase() === fk.refColumn.toLowerCase())) throw new Error(`FOREIGN KEY mengacu ke kolom '${fk.refTable}.${fk.refColumn}' yang tidak ditemukan.`);
      }
      this.db.tables[name] = { name, columns, foreignKeys, rows: [], autoCounters: {} };
      return { type: 'message', message: `Tabel ${name} berhasil dibuat.` };
    }

    // ALTER TABLE mendukung satu atau beberapa ADD COLUMN dalam satu statement.
    // Contoh yang didukung:
    // ALTER TABLE barang ADD harga DECIMAL(12,2);
    // ALTER TABLE barang ADD COLUMN harga DECIMAL(12,2), ADD COLUMN merek VARCHAR(50);
    if ((m = s.match(/^ALTER\s+TABLE\s+([\w`-]+)\s+([\s\S]+)$/i))) {
      const table = this.requireTable(this.normalizeName(m[1]));
      const actions = this.splitTopLevel(m[2]);
      if (!actions.length) throw new Error('ALTER TABLE belum memiliki aksi. Gunakan ADD COLUMN untuk menambahkan field.');

      let added = 0;
      const addedNames = [];
      for (const rawAction of actions) {
        const action = rawAction.trim();
        const am = action.match(/^ADD(?:\s+COLUMN)?(?:\s+IF\s+NOT\s+EXISTS)?\s+([\w`-]+)\s+([A-Za-z]+(?:\s*\([^)]*\))?)([\s\S]*)$/i);
        if (!am) {
          throw new Error(`Aksi ALTER TABLE belum didukung/tidak valid: ${action}. Contoh: ALTER TABLE barang ADD COLUMN harga DECIMAL(12,2);`);
        }
        const ifNotExists = /^ADD(?:\s+COLUMN)?\s+IF\s+NOT\s+EXISTS\b/i.test(action);
        const colName = this.normalizeName(am[1]);
        const duplicate = table.columns.some(c => c.name.toLowerCase() === colName.toLowerCase());
        if (duplicate) {
          if (ifNotExists) continue;
          throw new Error(`Kolom '${colName}' sudah ada pada tabel '${table.name}'.`);
        }

        const type = this.validateDataType(am[2], colName);
        let optionText = String(am[3] || '').trim();
        let position = null;
        let pm;
        if ((pm = optionText.match(/(?:^|\s)AFTER\s+([\w`-]+)\s*$/i))) {
          position = { type: 'after', column: this.normalizeName(pm[1]) };
          optionText = optionText.slice(0, pm.index).trim();
        } else if (/(?:^|\s)FIRST\s*$/i.test(optionText)) {
          position = { type: 'first' };
          optionText = optionText.replace(/(?:^|\s)FIRST\s*$/i, '').trim();
        }

        const opts = this.parseColumnOptions(optionText, colName);
        if (opts.autoIncrement && !/^(?:INT|INTEGER|BIGINT|SMALLINT|TINYINT)$/.test(type)) {
          throw new Error(`AUTO_INCREMENT pada kolom '${colName}' harus menggunakan tipe bilangan bulat seperti INT.`);
        }
        const col = { name: colName, type, ...opts };

        if (position?.type === 'first') {
          table.columns.unshift(col);
        } else if (position?.type === 'after') {
          const pos = table.columns.findIndex(c => c.name.toLowerCase() === position.column.toLowerCase());
          if (pos < 0) throw new Error(`Kolom acuan AFTER '${position.column}' tidak ditemukan pada tabel '${table.name}'.`);
          table.columns.splice(pos + 1, 0, col);
        } else {
          table.columns.push(col);
        }
        for (const row of table.rows) row[colName] = opts.defaultValue === undefined ? null : opts.defaultValue;
        added++;
        addedNames.push(colName);
      }
      const label = addedNames.length ? addedNames.join(', ') : 'tidak ada kolom baru';
      return { type: 'message', message: `${added} kolom ditambahkan ke tabel ${table.name}: ${label}.`, affectedRows: added };
    }

    if ((m = s.match(/^DROP\s+TABLE(?:\s+IF\s+EXISTS)?\s+([\w`-]+)$/i))) {
      const name = this.normalizeName(m[1]);
      if (!this.db.tables[name]) return { type: 'message', message: `Tabel ${name} tidak ditemukan.` };
      delete this.db.tables[name];
      return { type: 'message', message: `Tabel ${name} dihapus.` };
    }

    if ((m = s.match(/^TRUNCATE\s+TABLE\s+([\w`-]+)$/i))) {
      const table = this.requireTable(this.normalizeName(m[1]));
      const count = table.rows.length;
      table.rows = [];
      table.autoCounters = {};
      return { type: 'message', message: `${count} record dihapus dari ${table.name}.` };
    }

    if ((m = s.match(/^INSERT\s+INTO\s+([\w`-]+)\s*(?:\(([^)]*)\))?\s+VALUES\s+([\s\S]+)$/i))) {
      const table = this.requireTable(this.normalizeName(m[1]));
      const columns = m[2] ? this.splitTopLevel(m[2]).map(x => this.normalizeName(x)) : table.columns.map(c => c.name);
      const groups = this.parseValueGroups(m[3]);
      let inserted = 0;
      for (const group of groups) {
        const values = this.splitTopLevel(group).map(v => this.parseValue(v));
        if (values.length !== columns.length) {
          throw new Error(`Jumlah nilai (${values.length}) tidak sama dengan jumlah kolom (${columns.length}).`);
        }
        const row = {};
        for (const col of table.columns) {
          if (col.autoIncrement) {
            const next = (table.autoCounters[col.name] || 0) + 1;
            table.autoCounters[col.name] = next;
            row[col.name] = next;
          } else if (col.defaultValue !== undefined) {
            row[col.name] = col.defaultValue;
          } else {
            row[col.name] = null;
          }
        }
        columns.forEach((cn, idx) => {
          const col = table.columns.find(c => c.name.toLowerCase() === cn.toLowerCase());
          if (!col) throw new Error(`Kolom '${cn}' tidak ditemukan pada tabel '${table.name}'.`);
          const val = values[idx] && values[idx].__default ? (col.defaultValue === undefined ? null : col.defaultValue) : values[idx];
          row[col.name] = val;
          if (col.autoIncrement && typeof val === 'number') {
            table.autoCounters[col.name] = Math.max(table.autoCounters[col.name] || 0, val);
          }
        });
        this.validateRow(table, row, null);
        table.rows.push(row);
        inserted++;
      }
      return { type: 'message', message: `${inserted} record berhasil ditambahkan ke ${table.name}.`, affectedRows: inserted };
    }

    if ((m = s.match(/^UPDATE\s+([\w`-]+)\s+SET\s+([\s\S]+?)(?:\s+WHERE\s+([\s\S]+))?$/i))) {
      const table = this.requireTable(this.normalizeName(m[1]));
      const assignments = this.splitTopLevel(m[2]).map(part => {
        const am = part.match(/^([\w`.-]+)\s*=\s*([\s\S]+)$/);
        if (!am) throw new Error(`SET tidak dikenali: ${part}`);
        return { column: this.normalizeName(am[1].split('.').pop()), expression: am[2].trim() };
      });
      const where = m[3] ? m[3].trim() : null;
      let affected = 0;
      for (const row of table.rows) {
        const ctx = this.rowContext(table.name, row);
        if (!where || this.evalCondition(where, ctx)) {
          const candidate = { ...row };
          for (const a of assignments) {
            if (!table.columns.some(c => c.name.toLowerCase() === a.column.toLowerCase())) throw new Error(`Kolom '${a.column}' tidak ditemukan.`);
            const actual = table.columns.find(c => c.name.toLowerCase() === a.column.toLowerCase()).name;
            candidate[actual] = this.evalAssignmentExpression(a.expression, ctx);
          }
          this.validateRow(table, candidate, row);
          Object.assign(row, candidate);
          affected++;
        }
      }
      return { type: 'message', message: `${affected} record diperbarui pada ${table.name}.`, affectedRows: affected };
    }

    if ((m = s.match(/^DELETE\s+FROM\s+([\w`-]+)(?:\s+WHERE\s+([\s\S]+))?$/i))) {
      const table = this.requireTable(this.normalizeName(m[1]));
      const where = m[2] ? m[2].trim() : null;
      const before = table.rows.length;
      table.rows = table.rows.filter(row => {
        const match = !where || this.evalCondition(where, this.rowContext(table.name, row));
        return !match;
      });
      const affected = before - table.rows.length;
      return { type: 'message', message: `${affected} record dihapus dari ${table.name}.`, affectedRows: affected };
    }

    if (/^SELECT\s+/i.test(s)) {
      return this.executeSelect(s);
    }

    throw new Error('Perintah SQL belum didukung oleh simulator ini. Gunakan CREATE, ALTER, INSERT, UPDATE, DELETE, SELECT, JOIN, ORDER BY, DROP, atau TRUNCATE.');
  }

  parseValueGroups(text) {
    const out = [];
    let depth = 0;
    let quote = null;
    let start = -1;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];
      if (quote) {
        if (ch === quote) {
          if (next === quote) i++;
          else if (text[i - 1] !== '\\') quote = null;
        }
        continue;
      }
      if (ch === "'" || ch === '"') quote = ch;
      else if (ch === '(') {
        if (depth === 0) start = i + 1;
        depth++;
      } else if (ch === ')') {
        depth--;
        if (depth === 0 && start >= 0) {
          out.push(text.slice(start, i));
          start = -1;
        }
      }
    }
    if (!out.length) throw new Error('VALUES harus berisi pasangan tanda kurung, contoh: VALUES (1, \'A\').');
    return out;
  }

  requireTable(name) {
    const table = this.db.tables[name];
    if (!table) throw new Error(`Tabel '${name}' belum dibuat pada database '${this.activeDatabase}'.`);
    return table;
  }

  validateRow(table, row, oldRow) {
    for (const col of table.columns) {
      const v = row[col.name];
      if (col.notNull && (v === null || v === undefined || v === '')) throw new Error(`Kolom '${col.name}' tidak boleh NULL/kosong.`);
      if ((col.primaryKey || col.unique) && v !== null && v !== undefined) {
        const duplicate = table.rows.some(r => r !== oldRow && String(r[col.name]) === String(v));
        if (duplicate) throw new Error(`Nilai '${v}' pada kolom '${col.name}' harus unik.`);
      }
    }
    for (const fk of table.foreignKeys || []) {
      const v = row[fk.column];
      if (v === null || v === undefined) continue;
      const rt = this.db.tables[fk.refTable];
      if (!rt) throw new Error(`Foreign key mengacu ke tabel '${fk.refTable}' yang belum ada.`);
      const exists = rt.rows.some(r => String(r[fk.refColumn]) === String(v));
      if (!exists) throw new Error(`Foreign key gagal: nilai ${fk.column}=${v} tidak ditemukan di ${fk.refTable}.${fk.refColumn}.`);
    }
  }

  rowContext(tableName, row, alias = null) {
    const ctx = {};
    for (const [k, v] of Object.entries(row)) {
      ctx[k] = v;
      ctx[`${tableName}.${k}`] = v;
      if (alias && String(alias).toLowerCase() !== String(tableName).toLowerCase()) {
        ctx[`${alias}.${k}`] = v;
      }
    }
    return ctx;
  }

  resolveOperand(token, ctx) {
    const t = token.trim().replace(/`/g, '');
    if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"')) || /^-?\d+(\.\d+)?$/.test(t) || /^NULL$/i.test(t)) {
      return this.parseValue(t);
    }
    if (Object.prototype.hasOwnProperty.call(ctx, t)) return ctx[t];
    const lower = t.toLowerCase();
    const key = Object.keys(ctx).find(k => k.toLowerCase() === lower);
    if (key) return ctx[key];
    return t;
  }

  evalCondition(expr, ctx) {
    const parts = this.splitLogical(expr, 'AND');
    return parts.every(part => {
      const orParts = this.splitLogical(part, 'OR');
      return orParts.some(p => this.evalSimpleCondition(p, ctx));
    });
  }

  splitLogical(expr, op) {
    const out = [];
    let current = '';
    let quote = null;
    let depth = 0;
    const upper = expr.toUpperCase();
    for (let i = 0; i < expr.length; i++) {
      const ch = expr[i];
      if (quote) {
        current += ch;
        if (ch === quote && expr[i - 1] !== '\\') quote = null;
        continue;
      }
      if (ch === "'" || ch === '"') { quote = ch; current += ch; continue; }
      if (ch === '(') { depth++; current += ch; continue; }
      if (ch === ')') { depth--; current += ch; continue; }
      if (depth === 0 && upper.slice(i).match(new RegExp(`^\\s+${op}\\s+`))) {
        const mm = upper.slice(i).match(new RegExp(`^\\s+${op}\\s+`));
        out.push(current.trim()); current = ''; i += mm[0].length - 1; continue;
      }
      current += ch;
    }
    if (current.trim()) out.push(current.trim());
    return out.length ? out : [expr.trim()];
  }

  evalSimpleCondition(expr, ctx) {
    let s = expr.trim();
    while (s.startsWith('(') && s.endsWith(')')) s = s.slice(1, -1).trim();
    let m;
    if ((m = s.match(/^(.+?)\s+IS\s+(NOT\s+)?NULL$/i))) {
      const v = this.resolveOperand(m[1], ctx);
      return m[2] ? v !== null && v !== undefined : v === null || v === undefined;
    }
    if ((m = s.match(/^(.+?)\s*(=|<>|!=|>=|<=|>|<)\s*(.+)$/))) {
      const left = this.resolveOperand(m[1], ctx);
      const right = this.resolveOperand(m[3], ctx);
      switch (m[2]) {
        case '=': return String(left) === String(right);
        case '!=':
        case '<>': return String(left) !== String(right);
        case '>': return Number(left) > Number(right);
        case '<': return Number(left) < Number(right);
        case '>=': return Number(left) >= Number(right);
        case '<=': return Number(left) <= Number(right);
      }
    }
    throw new Error(`Kondisi WHERE belum didukung: ${expr}`);
  }

  executeSelect(s) {
    // Mendukung nama tabel langsung maupun alias, misalnya:
    // FROM barang b JOIN kategori k ON b.id_kategori = k.id_kategori
    const m = s.match(/^SELECT\s+([\s\S]+?)\s+FROM\s+([\w`-]+)(?:\s+(?:AS\s+)?((?!INNER\b|JOIN\b|WHERE\b|ORDER\b)[\w`-]+))?([\s\S]*)$/i);
    if (!m) throw new Error('Format SELECT tidak dikenali.');
    const selectPart = m[1].trim();
    const baseName = this.normalizeName(m[2]);
    const baseAlias = m[3] ? this.normalizeName(m[3]) : null;
    let tail = m[4] || '';
    const base = this.requireTable(baseName);
    const aliasMap = { [baseName.toLowerCase()]: baseName };
    if (baseAlias) aliasMap[baseAlias.toLowerCase()] = baseName;
    let contexts = base.rows.map(r => this.rowContext(baseName, r, baseAlias));

    const joins = [];
    while (true) {
      const jm = tail.match(/^\s*(?:INNER\s+)?JOIN\s+([\w`-]+)(?:\s+(?:AS\s+)?((?!ON\b)[\w`-]+))?\s+ON\s+([\s\S]+?)(?=\s+(?:INNER\s+)?JOIN\s+|\s+WHERE\s+|\s+ORDER\s+BY\s+|$)/i);
      if (!jm) break;
      const tableName = this.normalizeName(jm[1]);
      const alias = jm[2] ? this.normalizeName(jm[2]) : null;
      joins.push({ table: tableName, alias, on: jm[3].trim() });
      aliasMap[tableName.toLowerCase()] = tableName;
      if (alias) aliasMap[alias.toLowerCase()] = tableName;
      tail = tail.slice(jm[0].length);
    }

    for (const join of joins) {
      const jt = this.requireTable(join.table);
      const nextContexts = [];
      for (const ctx of contexts) {
        for (const row of jt.rows) {
          const merged = { ...ctx, ...this.rowContext(join.table, row, join.alias) };
          if (this.evalCondition(join.on, merged)) nextContexts.push(merged);
        }
      }
      contexts = nextContexts;
    }

    let where = null;
    let orderBy = null;
    let wm = tail.match(/^\s*WHERE\s+([\s\S]+?)(?=\s+ORDER\s+BY\s+|$)/i);
    if (wm) {
      where = wm[1].trim();
      tail = tail.slice(wm[0].length);
    }
    let om = tail.match(/^\s*ORDER\s+BY\s+([\w`.-]+)(?:\s+(ASC|DESC))?\s*$/i);
    if (om) {
      orderBy = { key: this.normalizeName(om[1]).replace(/`/g,''), dir: (om[2] || 'ASC').toUpperCase() };
      tail = '';
    }
    if (tail.trim()) throw new Error(`Bagian SELECT belum didukung: ${tail.trim()}`);

    if (where) contexts = contexts.filter(ctx => this.evalCondition(where, ctx));

    if (orderBy) {
      contexts.sort((a, b) => {
        const av = this.resolveOperand(orderBy.key, a);
        const bv = this.resolveOperand(orderBy.key, b);
        let cmp;
        if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
        else cmp = String(av ?? '').localeCompare(String(bv ?? ''), 'id');
        return orderBy.dir === 'DESC' ? -cmp : cmp;
      });
    }

    const specs = this.splitTopLevel(selectPart);
    const columns = [];
    const rows = [];

    if (specs.length === 1 && specs[0] === '*') {
      const plainCols = base.columns.map(c => c.name);
      columns.push(...plainCols);
      for (const ctx of contexts) {
        const row = {};
        const qualifier = baseAlias || baseName;
        for (const c of plainCols) row[c] = this.resolveOperand(`${qualifier}.${c}`, ctx);
        rows.push(row);
      }
    } else {
      const parsedSpecs = specs.map(spec => {
        const am = spec.match(/^([\w`.*-]+)(?:\s+(?:AS\s+)?([\w`-]+))?$/i);
        if (!am) throw new Error(`Kolom SELECT belum didukung: ${spec}`);
        const expr = am[1].replace(/`/g,'');
        const alias = am[2] ? this.normalizeName(am[2]) : expr.split('.').pop();
        return { expr, alias };
      });
      columns.push(...parsedSpecs.map(x => x.alias));
      for (const ctx of contexts) {
        const row = {};
        for (const p of parsedSpecs) {
          if (p.expr.endsWith('.*')) {
            const qualifier = p.expr.slice(0, -2);
            const actualName = aliasMap[qualifier.toLowerCase()] || qualifier;
            const t = this.requireTable(actualName);
            for (const c of t.columns) row[c.name] = this.resolveOperand(`${qualifier}.${c.name}`, ctx);
          } else {
            row[p.alias] = this.resolveOperand(p.expr, ctx);
          }
        }
        rows.push(row);
      }
    }

    const finalColumns = rows.length ? Object.keys(rows[0]) : columns;
    return { type: 'select', columns: finalColumns, rows };
  }

  getTable(name) {
    return this.db.tables[name] || null;
  }

  tableInfo() {
    return Object.values(this.db.tables).map(t => ({ name: t.name, rows: t.rows.length, columns: t.columns.length }));
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = MiniSqlEngine;
