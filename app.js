/* Website Praktik Basis Data - PPLG */
const engine = new MiniSqlEngine();
const STORAGE_KEY = 'pplg_basisdata_praktik_v1';
const STORAGE_VERSION = 4;
let storageEnabled = true;

const tasks = [
  {
    id: 1, section: 'A', title: 'Membuat Database', points: 5,
    prompt: `Buat database bernama <code>inventaris_lab</code>, kemudian aktifkan database tersebut agar dapat digunakan.`,
    checklist: ['Gunakan CREATE DATABASE', 'Aktifkan dengan USE inventaris_lab'],
    placeholder: `-- Tulis query Soal 1 di sini\nCREATE DATABASE ...;\nUSE ...;`,
    validate: ({sql}) => {
      const exists = !!engine.databases['inventaris_lab'];
      const active = engine.activeDatabase === 'inventaris_lab';
      return verdict(exists && active, exists && active ? 'Database inventaris_lab sudah dibuat dan aktif.' : 'Database inventaris_lab harus dibuat dan diaktifkan dengan USE.');
    }
  },
  {
    id: 2, section: 'A', title: 'Membuat Tabel Kategori', points: 5,
    prompt: `Buat tabel <code>kategori</code> dengan field: <b>id_kategori INT</b> (Primary Key, Auto Increment), <b>nama_kategori VARCHAR(50)</b> (NOT NULL), dan <b>keterangan VARCHAR(100)</b>.`,
    checklist: ['id_kategori = Primary Key + Auto Increment', 'nama_kategori = NOT NULL', 'keterangan = VARCHAR(100)'],
    placeholder: `CREATE TABLE kategori (\n    ...\n);`,
    validate: () => {
      const t = table('kategori');
      if (!t) {
        const typo=engine.tableInfo().find(x=>['katagori','category','kategori_barang'].includes(norm(x.name)));
        return verdict(false, typo ? `Nama tabel harus kategori, bukan '${typo.name}'. Perbaiki nama tabel lalu jalankan kembali.` : 'Tabel kategori belum ditemukan. Pastikan nama tabel ditulis tepat: kategori.');
      }
      const id = col(t,'id_kategori'), nama=col(t,'nama_kategori'), ket=col(t,'keterangan');
      const ok=id && typeEq(id,'INT') && id.primaryKey && id.autoIncrement && nama && typeEq(nama,'VARCHAR(50)') && nama.notNull && ket && typeEq(ket,'VARCHAR(100)');
      return verdict(!!ok, 'Struktur yang benar: id_kategori INT AUTO_INCREMENT PRIMARY KEY, nama_kategori VARCHAR(50) NOT NULL, keterangan VARCHAR(100). Jangan memakai tanda kurung untuk PRIMARY KEY/AUTO_INCREMENT/NOT NULL.');
    }
  },
  {
    id: 3, section: 'A', title: 'Membuat Tabel Lokasi', points: 5,
    prompt: `Buat tabel <code>lokasi</code> dengan field: <b>id_lokasi INT</b> (Primary Key, Auto Increment), <b>nama_lokasi VARCHAR(50)</b> (NOT NULL), dan <b>penanggung_jawab VARCHAR(100)</b>.`,
    checklist: ['id_lokasi = Primary Key + Auto Increment', 'nama_lokasi = NOT NULL', 'penanggung_jawab = VARCHAR(100)'],
    placeholder: `CREATE TABLE lokasi (\n    ...\n);`,
    validate: () => {
      const t = table('lokasi');
      if (!t) return verdict(false, 'Tabel lokasi belum ditemukan.');
      const id = col(t,'id_lokasi'), nama=col(t,'nama_lokasi'), pj=col(t,'penanggung_jawab');
      const ok=id && typeEq(id,'INT') && id.primaryKey && id.autoIncrement && nama && typeEq(nama,'VARCHAR(50)') && nama.notNull && pj && typeEq(pj,'VARCHAR(100)');
      return verdict(!!ok, 'Struktur tabel lokasi belum sesuai. Gunakan id_lokasi INT AUTO_INCREMENT PRIMARY KEY, nama_lokasi VARCHAR(50) NOT NULL, dan penanggung_jawab VARCHAR(100).');
    }
  },
  {
    id: 4, section: 'A', title: 'Membuat Tabel Barang & Relasi', points: 10,
    prompt: `Buat tabel <code>barang</code> dengan field <code>id_barang</code>, <code>kode_barang</code>, <code>nama_barang</code>, <code>id_kategori</code>, <code>id_lokasi</code>, <code>jumlah</code>, <code>kondisi</code>, dan <code>tahun_pengadaan</code>. Tentukan Primary Key, UNIQUE, NOT NULL, DEFAULT, serta Foreign Key ke tabel kategori dan lokasi.`,
    checklist: ['id_barang = Primary Key + Auto Increment', 'kode_barang = UNIQUE + NOT NULL', 'jumlah DEFAULT 0', 'Foreign Key id_kategori dan id_lokasi'],
    placeholder: `CREATE TABLE barang (\n    ...\n    FOREIGN KEY (...) REFERENCES ...(...),\n    FOREIGN KEY (...) REFERENCES ...(...)\n);`,
    validate: () => {
      const t = table('barang');
      if (!t) return verdict(false, 'Tabel barang belum ditemukan.');
      const id=col(t,'id_barang'), kode=col(t,'kode_barang'), nama=col(t,'nama_barang'), jumlah=col(t,'jumlah');
      const fkK=(t.foreignKeys||[]).some(f=>eq(f.column,'id_kategori')&&eq(f.refTable,'kategori')&&eq(f.refColumn,'id_kategori'));
      const fkL=(t.foreignKeys||[]).some(f=>eq(f.column,'id_lokasi')&&eq(f.refTable,'lokasi')&&eq(f.refColumn,'id_lokasi'));
      const fields=['id_barang','kode_barang','nama_barang','id_kategori','id_lokasi','jumlah','kondisi','tahun_pengadaan'].every(n=>col(t,n));
      const types=typeEq(id,'INT') && typeEq(kode,'VARCHAR(20)') && typeEq(nama,'VARCHAR(100)') && typeEq(col(t,'id_kategori'),'INT') && typeEq(col(t,'id_lokasi'),'INT') && typeEq(jumlah,'INT') && typeEq(col(t,'kondisi'),'VARCHAR(20)') && typeEq(col(t,'tahun_pengadaan'),'YEAR');
      return verdict(!!(fields && types && id?.primaryKey && id?.autoIncrement && kode?.unique && kode?.notNull && nama?.notNull && jumlah && Number(jumlah.defaultValue)===0 && fkK && fkL), 'Struktur tabel barang atau relasinya belum sesuai ketentuan. Periksa tipe data, PRIMARY KEY, AUTO_INCREMENT, UNIQUE, NOT NULL, DEFAULT 0, dan kedua FOREIGN KEY.');
    }
  },
  {
    id: 5, section: 'A', title: 'ALTER TABLE', points: 5,
    prompt: `Tambahkan dua field baru pada tabel <code>barang</code>: <code>harga DECIMAL(12,2)</code> dan <code>merek VARCHAR(50)</code> menggunakan <code>ALTER TABLE</code>.`,
    checklist: ['Tambah kolom harga', 'Tambah kolom merek', 'Gunakan ALTER TABLE'],
    placeholder: `-- Boleh satu ALTER dengan dua ADD, atau dua ALTER terpisah\nALTER TABLE barang\nADD COLUMN harga DECIMAL(12,2),\nADD COLUMN merek VARCHAR(50);`,
    validate: ({sql}) => {
      const t=table('barang');
      const harga=t&&col(t,'harga'), merek=t&&col(t,'merek');
      const used=(sql.match(/ALTER\s+TABLE/gi)||[]).length>=1;
      return verdict(!!(harga && typeEq(harga,'DECIMAL(12,2)') && merek && typeEq(merek,'VARCHAR(50)') && used), 'Tambahkan harga DECIMAL(12,2) dan merek VARCHAR(50) menggunakan ALTER TABLE. Boleh satu ALTER dengan dua ADD COLUMN atau dua ALTER terpisah.');
    }
  },
  {
    id: 6, section: 'B', title: 'INSERT Data Kategori', points: 5,
    prompt: `Masukkan minimal 5 kategori: <b>Komputer</b>, <b>Perangkat Input</b>, <b>Perangkat Output</b>, <b>Jaringan</b>, dan <b>Pendukung</b>.`,
    checklist: ['Minimal 5 data', 'Semua nama kategori wajib tersedia', 'Gunakan INSERT INTO'],
    placeholder: `INSERT INTO kategori (...) VALUES\n(...),\n(...);`,
    validate: () => {
      const t=table('kategori'); if(!t) return verdict(false,'Tabel kategori belum tersedia.');
      const req=['Komputer','Perangkat Input','Perangkat Output','Jaringan','Pendukung'];
      const ok=req.every(v=>t.rows.some(r=>norm(r.nama_kategori)===norm(v)));
      return verdict(ok, 'Pastikan kelima kategori wajib sudah dimasukkan.');
    }
  },
  {
    id: 7, section: 'B', title: 'INSERT Data Lokasi', points: 5,
    prompt: `Masukkan minimal 4 lokasi: <b>Lab Komputer 1</b>, <b>Lab Komputer 2</b>, <b>Ruang Server</b>, dan <b>Gudang IT</b>. Lengkapi penanggung jawab masing-masing lokasi.`,
    checklist: ['4 lokasi wajib tersedia', 'Isi penanggung_jawab', 'Gunakan INSERT INTO'],
    placeholder: `INSERT INTO lokasi (...) VALUES\n(...),\n(...);`,
    validate: () => {
      const t=table('lokasi'); if(!t) return verdict(false,'Tabel lokasi belum tersedia.');
      const req=['Lab Komputer 1','Lab Komputer 2','Ruang Server','Gudang IT'];
      const ok=req.every(v=>t.rows.some(r=>norm(r.nama_lokasi)===norm(v))) && t.rows.filter(r=>req.some(v=>norm(v)===norm(r.nama_lokasi))).every(r=>String(r.penanggung_jawab||'').trim());
      return verdict(ok, 'Pastikan empat lokasi dan penanggung jawabnya sudah dimasukkan.');
    }
  },
  {
    id: 8, section: 'B', title: 'INSERT Data Barang', points: 10,
    prompt: `Masukkan 6 data barang wajib berikut: BRG001 PC Desktop, BRG002 Keyboard USB, BRG003 Mouse USB, BRG004 Monitor LED 24 Inch, BRG005 Switch 24 Port, dan BRG006 Proyektor. Gunakan data kategori, lokasi, jumlah, kondisi, tahun, harga, dan merek sesuai soal praktik.`,
    checklist: ['BRG001 sampai BRG006 tersedia', 'Relasi kategori/lokasi valid', 'Harga dan merek terisi'],
    placeholder: `INSERT INTO barang\n(kode_barang, nama_barang, id_kategori, id_lokasi, jumlah, kondisi, tahun_pengadaan, harga, merek)\nVALUES\n(...);`,
    validate: () => {
      const b=table('barang'), k=table('kategori'), l=table('lokasi');
      if(!b||!k||!l) return verdict(false,'Tabel barang/kategori/lokasi belum tersedia.');
      const kid=(name)=>k.rows.find(r=>norm(r.nama_kategori)===norm(name))?.id_kategori;
      const lid=(name)=>l.rows.find(r=>norm(r.nama_lokasi)===norm(name))?.id_lokasi;
      const expected=[
        ['BRG001','PC Desktop','Komputer','Lab Komputer 1',20,'Baik',2025,7500000,'Lenovo'],
        ['BRG002','Keyboard USB','Perangkat Input','Lab Komputer 1',20,'Baik',2025,150000,'Logitech'],
        ['BRG003','Mouse USB','Perangkat Input','Lab Komputer 1',20,'Baik',2025,100000,'Logitech'],
        ['BRG004','Monitor LED 24 Inch','Perangkat Output','Lab Komputer 1',20,'Baik',2025,1800000,'Samsung'],
        ['BRG005','Switch 24 Port','Jaringan','Ruang Server',2,'Baik',2024,2500000,'TP-Link'],
        ['BRG006','Proyektor','Perangkat Output','Lab Komputer 2',1,'Baik',2023,8000000,'Epson']
      ];
      const ok=expected.every(([kode,nama,kat,lok,jumlah,kondisi,tahun,harga,merek])=>{
        const r=b.rows.find(x=>norm(x.kode_barang)===norm(kode));
        return r && norm(r.nama_barang)===norm(nama) && String(r.id_kategori)===String(kid(kat)) && String(r.id_lokasi)===String(lid(lok)) && Number(r.jumlah)===jumlah && norm(r.kondisi)===norm(kondisi) && Number(r.tahun_pengadaan)===tahun && Number(r.harga)===harga && norm(r.merek)===norm(merek);
      });
      return verdict(!!ok, 'Periksa kembali BRG001-BRG006: nama, kategori, lokasi, jumlah, kondisi, tahun, harga, dan merek harus sesuai data soal.');
    }
  },
  {
    id: 9, section: 'B', title: 'Tambah SSD 1 TB', points: 5,
    prompt: `Tambahkan kategori <b>Penyimpanan</b> bila belum ada, lalu masukkan: BRG007 - SSD 1 TB, lokasi Gudang IT, jumlah 5, kondisi Baik, tahun 2026, harga 1.200.000, merek Kingston.`,
    checklist: ['Kategori Penyimpanan tersedia', 'BRG007 tersedia', 'Jumlah 5, tahun 2026, harga 1200000, merek Kingston'],
    placeholder: `-- Tambahkan kategori jika perlu\nINSERT INTO ...;\n-- Tambahkan BRG007\nINSERT INTO ...;`,
    validate: () => {
      const k=table('kategori'), b=table('barang');
      if(!k||!b) return verdict(false,'Tabel kategori/barang belum tersedia.');
      const kat=k.rows.find(r=>norm(r.nama_kategori)==='penyimpanan');
      const gudang=table('lokasi')?.rows?.find(r=>norm(r.nama_lokasi)==='gudang it');
      const row=b.rows.find(r=>norm(r.kode_barang)==='brg007');
      const ok=kat && gudang && row && String(row.id_kategori)===String(kat.id_kategori) && String(row.id_lokasi)===String(gudang.id_lokasi) && Number(row.jumlah)===5 && norm(row.kondisi)==='baik' && Number(row.tahun_pengadaan)===2026 && Number(row.harga)===1200000 && norm(row.merek)==='kingston';
      return verdict(!!ok, 'Pastikan BRG007 terhubung ke kategori Penyimpanan dan Gudang IT, jumlah 5, kondisi Baik, tahun 2026, harga 1200000, dan merek Kingston.');
    }
  },
  {
    id: 10, section: 'C', title: 'UPDATE Jumlah Keyboard', points: 5,
    prompt: `Dua keyboard rusak. Ubah jumlah <b>BRG002 Keyboard USB</b> dari 20 menjadi <b>18</b> menggunakan <code>UPDATE</code> dan <code>WHERE</code>.`,
    checklist: ['Gunakan UPDATE', 'Gunakan WHERE', 'BRG002 jumlah = 18'],
    placeholder: `UPDATE barang\nSET ...\nWHERE ...;`,
    validate: ({sql}) => {
      const row=findBarang('BRG002');
      const ok=row && Number(row.jumlah)===18 && /UPDATE/i.test(sql) && /WHERE/i.test(sql);
      return verdict(!!ok, 'Jumlah BRG002 harus 18 dan query wajib menggunakan WHERE.');
    }
  },
  {
    id: 11, section: 'C', title: 'UPDATE Kondisi Proyektor', points: 5,
    prompt: `Proyektor BRG006 mengalami kerusakan. Ubah kondisi dari <b>Baik</b> menjadi <b>Rusak</b>.`,
    checklist: ['BRG006 kondisi = Rusak', 'Gunakan WHERE agar hanya proyektor berubah'],
    placeholder: `UPDATE barang\nSET kondisi = ...\nWHERE ...;`,
    validate: ({sql}) => {
      const row=findBarang('BRG006');
      return verdict(!!(row && norm(row.kondisi)==='rusak' && /WHERE/i.test(sql)), 'Kondisi BRG006 harus Rusak dan query harus menggunakan WHERE.');
    }
  },
  {
    id: 12, section: 'C', title: 'UPDATE Dua Kolom Sekaligus', points: 5,
    prompt: `Setelah diperbaiki, ubah kondisi BRG006 kembali menjadi <b>Baik</b> sekaligus pindahkan ke <b>Lab Komputer 1</b> menggunakan satu perintah UPDATE.`,
    checklist: ['Satu UPDATE', 'kondisi = Baik', 'id_lokasi mengarah ke Lab Komputer 1'],
    placeholder: `UPDATE barang\nSET kondisi = ...,\n    id_lokasi = ...\nWHERE ...;`,
    validate: ({sql}) => {
      const row=findBarang('BRG006'), loc=idLokasiByName('Lab Komputer 1');
      const updateCount=(sql.match(/\bUPDATE\b/gi)||[]).length;
      return verdict(!!(row && norm(row.kondisi)==='baik' && String(row.id_lokasi)===String(loc) && updateCount===1 && /\bWHERE\b/i.test(sql)), 'Gunakan satu UPDATE dengan WHERE untuk mengubah kondisi BRG006 menjadi Baik dan lokasi ke Lab Komputer 1.');
    }
  },
  {
    id: 13, section: 'C', title: 'DELETE Data Percobaan', points: 5,
    prompt: `Tambahkan terlebih dahulu data percobaan dengan kode <b>BRG999</b>, kemudian hapus data tersebut menggunakan <code>DELETE</code> dan <code>WHERE</code>.`,
    checklist: ['Query memuat INSERT BRG999', 'Query memuat DELETE BRG999', 'BRG999 tidak ada setelah query selesai'],
    placeholder: `INSERT INTO barang (...) VALUES (... 'BRG999' ...);\nDELETE FROM barang WHERE ...;`,
    validate: ({sql}) => {
      const hasInsert=/INSERT[\s\S]*BRG999/i.test(sql), hasDelete=/DELETE[\s\S]*BRG999/i.test(sql), hasWhere=/DELETE[\s\S]*WHERE/i.test(sql);
      const absent=!findBarang('BRG999');
      return verdict(hasInsert && hasDelete && hasWhere && absent, 'Tulis INSERT BRG999 kemudian DELETE ... WHERE ... hingga BRG999 benar-benar terhapus.');
    }
  },
  {
    id: 14, section: 'D', title: 'SELECT Seluruh Barang', points: 2,
    prompt: `Tampilkan seluruh data yang terdapat pada tabel <code>barang</code>.`,
    checklist: ['Gunakan SELECT', 'Tampilkan seluruh kolom', 'Sumber data tabel barang'],
    placeholder: `SELECT ... FROM barang;`,
    validate: ({sql, results}) => {
      const r=lastSelect(results); const t=table('barang');
      if(!r||!t) return verdict(false,'Belum ada hasil SELECT dari tabel barang.');
      const expectedCols=t.columns.map(c=>norm(c.name));
      const resultCols=(r.columns||[]).map(norm);
      const allColumns=expectedCols.every(c=>resultCols.includes(c));
      const ok=/\bSELECT\b/i.test(sql) && /\bFROM\s+barang\b/i.test(sql) && r.rows.length===t.rows.length && allColumns;
      return verdict(!!ok, 'Tampilkan seluruh record dan seluruh kolom tabel barang. SELECT * atau daftar semua kolom sama-sama diterima.');
    }
  },
  {
    id: 15, section: 'D', title: 'SELECT Kondisi Baik', points: 2,
    prompt: `Tampilkan hanya barang yang memiliki kondisi <b>Baik</b>.`,
    checklist: ['Gunakan WHERE', "kondisi = 'Baik'", 'Hasil tidak memuat kondisi selain Baik'],
    placeholder: `SELECT ...\nFROM barang\nWHERE ...;`,
    validate: ({sql, results}) => {
      const r=lastSelect(results), b=table('barang');
      if(!r||!b) return verdict(false,'Belum ada hasil SELECT dari tabel barang.');
      const expected=b.rows.filter(x=>norm(x.kondisi)==='baik');
      const resultConditions=r.rows.map(x=>x.kondisi).filter(v=>v!==undefined);
      const conditionsOk=!resultConditions.length || resultConditions.every(v=>norm(v)==='baik');
      const ok=/\bWHERE\b/i.test(sql) && r.rows.length===expected.length && r.rows.length>0 && conditionsOk;
      return verdict(!!ok, "Gunakan WHERE kondisi = 'Baik' dan pastikan hasil hanya memuat seluruh barang yang kondisinya Baik.");
    }
  },
  {
    id: 16, section: 'D', title: 'SELECT Perangkat Input', points: 2,
    prompt: `Tampilkan hanya barang dari kategori <b>Perangkat Input</b>. Anda boleh menggunakan id_kategori atau JOIN ke tabel kategori.`,
    checklist: ['Gunakan WHERE', 'Hasil memuat Keyboard USB dan Mouse USB', 'Tidak memuat kategori lain'],
    placeholder: `SELECT ...\nFROM barang\n...\nWHERE ...;`,
    validate: ({sql,results}) => {
      const r=lastSelect(results), b=table('barang'), k=table('kategori');
      if(!r||!b||!k) return verdict(false,'Belum ada hasil SELECT atau tabel pendukung belum tersedia.');
      const kat=k.rows.find(x=>norm(x.nama_kategori)==='perangkat input');
      if(!kat) return verdict(false,'Kategori Perangkat Input belum ditemukan.');
      const expected=b.rows.filter(x=>String(x.id_kategori)===String(kat.id_kategori));
      const expectedNames=expected.map(x=>norm(x.nama_barang)).sort();
      const resultNames=r.rows.map(x=>norm(x.nama_barang || x.Barang || x.barang)).filter(Boolean).sort();
      const sameNames=resultNames.length===expectedNames.length && expectedNames.every((v,i)=>resultNames[i]===v);
      const ok=/\bWHERE\b/i.test(sql) && sameNames;
      return verdict(ok, 'Hasil harus hanya memuat semua barang kategori Perangkat Input (Keyboard USB dan Mouse USB), tanpa kategori lain.');
    }
  },
  {
    id: 17, section: 'D', title: 'ORDER BY A-Z dan Z-A', points: 2,
    prompt: `Tampilkan seluruh barang dan urutkan berdasarkan <code>nama_barang</code> dari A-Z. Kemudian buat query kedua untuk urutan Z-A.`,
    checklist: ['Query pertama ORDER BY nama_barang ASC', 'Query kedua ORDER BY nama_barang DESC'],
    placeholder: `SELECT ... FROM barang ORDER BY nama_barang ASC;\n\nSELECT ... FROM barang ORDER BY nama_barang DESC;`,
    validate: ({sql, results}) => {
      const selects=(results||[]).filter(r=>r.type==='select');
      if(selects.length<2) return verdict(false,'Harus ada dua SELECT: A-Z dan Z-A.');
      const names=(r)=>r.rows.map(x=>String(x.nama_barang??x.Nama??x.nama??''));
      const ascNames=names(selects[0]), descNames=names(selects[1]);
      const ascSorted=[...ascNames].sort((a,b)=>a.localeCompare(b,'id'));
      const descSorted=[...ascSorted].reverse();
      const same=(a,b)=>a.length===b.length && a.every((v,i)=>v===b[i]);
      const hasTwoOrder=(sql.match(/\bORDER\s+BY\b/gi)||[]).length>=2;
      const ok=hasTwoOrder && same(ascNames,ascSorted) && same(descNames,descSorted);
      return verdict(ok, 'Buat dua SELECT dengan ORDER BY nama_barang: query pertama A-Z (ASC boleh ditulis atau dibiarkan default), query kedua DESC.');
    }
  },
  {
    id: 18, section: 'D', title: 'JOIN Tiga Tabel', points: 7,
    prompt: `Gunakan JOIN untuk menampilkan <code>kode_barang</code>, <code>nama_barang</code>, <code>nama_kategori</code>, <code>nama_lokasi</code>, <code>jumlah</code>, dan <code>kondisi</code> dari tabel barang, kategori, dan lokasi.`,
    checklist: ['JOIN kategori', 'JOIN lokasi', '6 kolom informasi tampil'],
    placeholder: `SELECT\n    ...\nFROM barang\nJOIN kategori ON ...\nJOIN lokasi ON ...;`,
    validate: ({sql, results}) => {
      const r=lastSelect(results); if(!r) return verdict(false,'Belum ada hasil SELECT JOIN.');
      const cols=(r.columns||[]).map(norm);
      const req=['kode_barang','nama_barang','nama_kategori','nama_lokasi','jumlah','kondisi'];
      const ok=(sql.match(/\bJOIN\b/gi)||[]).length>=2 && req.every(c=>cols.includes(norm(c))) && r.rows.length>0;
      return verdict(ok, 'JOIN harus menghubungkan barang-kategori-lokasi dan menampilkan enam kolom yang diminta.');
    }
  },
  {
    id: 19, section: 'E', title: 'Problem Solving: Laptop Asus', points: 3,
    prompt: `Laboratorium membeli <b>10 Laptop Asus</b> seharga <b>Rp8.500.000/unit</b> pada tahun <b>2026</b>. Tentukan kategori dan lokasi yang sesuai, masukkan ke database, lalu tampilkan kembali data tersebut dengan SELECT.`,
    checklist: ['INSERT Laptop Asus', 'jumlah = 10', 'harga = 8500000', 'tahun = 2026', 'SELECT menampilkan Laptop Asus'],
    placeholder: `-- INSERT data Laptop Asus\nINSERT INTO barang (...) VALUES (...);\n\n-- Tampilkan kembali\nSELECT ... FROM barang WHERE ...;`,
    validate: ({sql, results}) => {
      const b=table('barang');
      const row=b&&b.rows.find(r=>norm(r.nama_barang).includes('laptop') && norm(r.merek)==='asus');
      const r=lastSelect(results);
      const resultHas=r&&r.rows.some(x=>norm(x.nama_barang||'').includes('laptop'));
      const ok=row && Number(row.jumlah)===10 && Number(row.harga)===8500000 && Number(row.tahun_pengadaan)===2026 && /INSERT/i.test(sql) && /SELECT/i.test(sql) && resultHas;
      return verdict(!!ok, 'Data Laptop Asus harus berjumlah 10, harga 8500000, tahun 2026, lalu ditampilkan dengan SELECT.');
    }
  },
  {
    id: 20, section: 'E', title: 'Problem Solving: Koreksi Switch', points: 2,
    prompt: `BRG005 Switch 24 Port tercatat 2 unit, padahal jumlah sebenarnya <b>4 unit</b>. Buat query untuk memperbaiki data.`,
    checklist: ['Gunakan UPDATE', 'Gunakan WHERE', 'BRG005 jumlah = 4'],
    placeholder: `UPDATE barang\nSET ...\nWHERE ...;`,
    validate: ({sql}) => {
      const r=findBarang('BRG005'); return verdict(!!(r&&Number(r.jumlah)===4&&/UPDATE/i.test(sql)&&/WHERE/i.test(sql)), 'Jumlah BRG005 harus diperbaiki menjadi 4.');
    }
  },
  {
    id: 21, section: 'E', title: 'Problem Solving: Mouse Rusak', points: 2,
    prompt: `Jumlah awal Mouse USB 20 unit. Ditemukan 3 mouse rusak. Perbarui jumlah mouse yang masih dapat digunakan menjadi nilai yang benar.`,
    checklist: ['Hitung 20 - 3', 'Gunakan UPDATE', 'BRG003 jumlah = 17'],
    placeholder: `UPDATE barang\nSET ...\nWHERE ...;`,
    validate: ({sql}) => {
      const r=findBarang('BRG003'); return verdict(!!(r&&Number(r.jumlah)===17&&/UPDATE/i.test(sql)&&/WHERE/i.test(sql)), 'Jumlah BRG003 yang masih dapat digunakan harus 17.');
    }
  },
  {
    id: 22, section: 'E', title: 'Problem Solving: Pindah Lokasi Keyboard', points: 3,
    prompt: `Keyboard USB dipindahkan dari <b>Lab Komputer 1</b> ke <b>Lab Komputer 2</b>. Perbarui lokasi BRG002 dengan query SQL yang sesuai.`,
    checklist: ['Gunakan UPDATE', 'Gunakan WHERE', 'BRG002 mengarah ke Lab Komputer 2'],
    placeholder: `UPDATE barang\nSET id_lokasi = ...\nWHERE ...;`,
    validate: ({sql}) => {
      const r=findBarang('BRG002'), loc=idLokasiByName('Lab Komputer 2');
      return verdict(!!(r&&String(r.id_lokasi)===String(loc)&&/UPDATE/i.test(sql)&&/WHERE/i.test(sql)), 'BRG002 harus dipindahkan ke Lab Komputer 2.');
    }
  }
];

const sectionMeta = {
  A: {name:'Praktik DDL', max:30},
  B: {name:'Praktik DML - INSERT', max:25},
  C: {name:'UPDATE & DELETE', max:20},
  D: {name:'DQL / SELECT', max:15},
  E: {name:'Problem Solving', max:10}
};

let state = {
  student: {name:'', className:'', nis:''},
  answers: {},
  completed: {},
  feedback: {},
  currentTask: 1,
  startedAt: null,
  lastSaved: null
};
let currentResults = [];

function norm(v){ return String(v ?? '').trim().toLowerCase(); }
function eq(a,b){ return norm(a)===norm(b); }
function verdict(ok,message){ return {ok:!!ok, message}; }
function table(name){ return engine.getTable(name); }
function col(t,name){ return t?.columns?.find(c=>eq(c.name,name)); }
function typeEq(c, expected){ return !!c && String(c.type||'').replace(/\s+/g,'').toUpperCase()===String(expected||'').replace(/\s+/g,'').toUpperCase(); }
function findBarang(code){ return table('barang')?.rows?.find(r=>eq(r.kode_barang,code)); }
function idLokasiByName(name){ return table('lokasi')?.rows?.find(r=>eq(r.nama_lokasi,name))?.id_lokasi; }
function lastSelect(results){ return [...(results||[])].reverse().find(r=>r.type==='select') || null; }

function invalidateFromTask(taskId){
  tasks.filter(t=>t.id>=Number(taskId)).forEach(t=>{
    delete state.completed[t.id];
    if(t.id!==Number(taskId)) delete state.feedback[t.id];
  });
}

function rebuildEngineThrough(taskId, currentSqlOverride=null){
  engine.reset();
  let targetResults=[];
  for(const task of tasks){
    if(task.id>Number(taskId)) break;
    const sql=(task.id===Number(taskId) && currentSqlOverride!==null)
      ? String(currentSqlOverride||'').trim()
      : String(state.answers[task.id]||'').trim();
    if(!sql){
      const err=new Error(task.id===Number(taskId)
        ? 'Editor SQL masih kosong.'
        : `Soal ${task.id} belum memiliki query. Selesaikan soal sebelumnya secara berurutan agar database dapat dibangun dengan benar.`);
      err.taskId=task.id;
      throw err;
    }
    try{
      const results=engine.execute(sql);
      if(task.id===Number(taskId)){
        targetResults=results;
      }else{
        const priorCheck=task.validate({sql,results});
        if(!priorCheck.ok){
          const err=new Error(`Jawaban Soal ${task.id} belum valid: ${priorCheck.message}`);
          err.taskId=task.id;
          throw err;
        }
      }
    }catch(err){
      if(!err.taskId) err.taskId=task.id;
      throw err;
    }
  }
  return targetResults;
}

function rebuildEngineBeforeTask(taskId){
  engine.reset();
  const prev=tasks.filter(t=>t.id<Number(taskId));
  for(const task of prev){
    const sql=String(state.answers[task.id]||'').trim();
    if(!sql) break;
    try{
      const results=engine.execute(sql);
      const check=task.validate({sql,results});
      if(!check.ok) break;
    }catch(_){ break; }
  }
}

function revalidateSavedProgress(){
  engine.reset();
  const oldCompleted={...(state.completed||{})};
  state.completed={};
  let stopped=false;
  for(const task of tasks){
    if(stopped) break;
    const sql=String(state.answers[task.id]||'').trim();
    if(!sql) break;
    try{
      const results=engine.execute(sql);
      const result=task.validate({sql,results});
      state.feedback[task.id]=result;
      if(result.ok) state.completed[task.id]=true;
      else { stopped=true; rebuildEngineBeforeTask(task.id); }
    }catch(err){
      state.feedback[task.id]={ok:false,message:`${err.message||String(err)}`};
      stopped=true;
      rebuildEngineBeforeTask(task.id);
    }
  }
  // Bila progres lama berubah setelah pemeriksaan ulang, langsung simpan versi yang konsisten.
  const changed=tasks.some(t=>!!oldCompleted[t.id]!==!!state.completed[t.id]);
  if(changed) saveState();
}

function loadState(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw) return false;
    const saved=JSON.parse(raw);
    state={...state,...saved, student:{...state.student,...(saved.student||{})}};
    // Engine tidak dimuat mentah dari versi lama. Database dibangun ulang dari jawaban
    // agar tidak membawa tabel duplikat / struktur salah dari eksekusi sebelumnya.
    engine.reset();
    storageEnabled=true;
    return true;
  }catch(err){
    storageEnabled=false;
    console.warn('Gagal memuat data tersimpan',err);
    return false;
  }
}

function saveState(){
  if(!storageEnabled) { updateSavedLabel(true); return false; }
  try{
    state.lastSaved=new Date().toISOString();
    const payload={version:STORAGE_VERSION,...state,engine:JSON.parse(engine.serialize())};
    localStorage.setItem(STORAGE_KEY,JSON.stringify(payload));
    updateSavedLabel();
    return true;
  }catch(err){
    storageEnabled=false;
    console.warn('Gagal menyimpan Local Storage',err);
    updateSavedLabel(true);
    return false;
  }
}

function updateSavedLabel(error=false){
  const el=document.getElementById('savedLabel');
  if(!el) return;
  el.classList.toggle('saved-ok',!error && !!state.lastSaved);
  el.classList.toggle('saved-error',!!error);
  if(error){ el.textContent='Gagal menyimpan'; return; }
  if(!state.lastSaved){ el.textContent='Belum tersimpan'; return; }
  const d=new Date(state.lastSaved);
  const time=Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  el.textContent=`Tersimpan lokal${time?' • '+time:''}`;
}

function hasSavedProgress(){
  const hasAnswers=Object.values(state.answers||{}).some(v=>String(v||'').trim());
  const hasCompleted=Object.values(state.completed||{}).some(Boolean);
  const hasDb=!!(engine.activeDatabase && engine.activeDatabase!=='__session__') || (engine.tableInfo?.().length>0);
  return !!(state.startedAt || hasAnswers || hasCompleted || hasDb);
}

function hydrateIdentityInputs(){
  const n=document.getElementById('studentName'), c=document.getElementById('studentClass'), i=document.getElementById('studentNis');
  if(n) n.value=state.student.name||'';
  if(c) c.value=state.student.className||'';
  if(i) i.value=state.student.nis||'';
}

function updateResumeNotice(){
  const box=document.getElementById('resumeNotice');
  if(!box) return;
  const canResume=!!state.student.name && hasSavedProgress();
  box.classList.toggle('hidden',!canResume);
  if(canResume){
    const d=state.lastSaved?new Date(state.lastSaved):null;
    const stamp=d && !Number.isNaN(d.getTime()) ? d.toLocaleString('id-ID') : 'waktu sebelumnya';
    const info=document.getElementById('resumeInfo');
    if(info) info.textContent=`${state.student.name} • Soal ${state.currentTask||1} • ${completedCount()}/${tasks.length} selesai • terakhir disimpan ${stamp}.`;
  }
}

function clearStoredSession(keepIdentity=true){
  const student=keepIdentity?{...state.student}:{name:'',className:'',nis:''};
  try{ localStorage.removeItem(STORAGE_KEY); }catch(_){}
  engine.reset();
  state={student,answers:{},completed:{},feedback:{},currentTask:1,startedAt:null,lastSaved:null};
  currentResults=[];
  storageEnabled=true;
}

function totalScore(){
  return tasks.reduce((sum,t)=>sum+(state.completed[t.id]?t.points:0),0);
}
function completedCount(){ return tasks.filter(t=>state.completed[t.id]).length; }

function init(){
  const restored=loadState();
  if(restored) revalidateSavedProgress();
  bindGlobalEvents();
  hydrateIdentityInputs();
  // Tampilkan halaman awal agar pengguna dapat memilih melanjutkan progres tersimpan.
  showLanding(true);
  updateResumeNotice();
  if(restored && state.student.name && hasSavedProgress()){
    setTimeout(()=>toast('Progres sebelumnya ditemukan dan database simulator sudah dibangun ulang dari jawaban tersimpan. Klik “Lanjutkan Progres” untuk meneruskan.','success'),250);
  }
}

function bindGlobalEvents(){
  const identityIds=['studentName','studentClass','studentNis'];
  identityIds.forEach(id=>document.getElementById(id)?.addEventListener('input',()=>{
    state.student={
      name:document.getElementById('studentName').value.trim(),
      className:document.getElementById('studentClass').value.trim(),
      nis:document.getElementById('studentNis').value.trim()
    };
    window.clearTimeout(window.__identitySaveTimer);
    window.__identitySaveTimer=setTimeout(()=>{ saveState(); updateResumeNotice(); },350);
  }));

  document.getElementById('resumeBtn')?.addEventListener('click',()=>{
    if(!state.student.name){ return; }
    showWorkspace();
    updateSavedLabel();
    toast('Progres berhasil dimuat kembali dari Local Storage.','success');
  });
  document.getElementById('newSessionBtn')?.addEventListener('click',()=>{
    if(!confirm('Mulai sesi baru? Seluruh jawaban, skor, dan database simulator yang tersimpan akan dihapus.')) return;
    clearStoredSession(true);
    hydrateIdentityInputs();
    updateResumeNotice();
    updateSavedLabel();
    toast('Sesi baru siap. Identitas tetap dipertahankan.','success');
  });

  document.getElementById('startForm').addEventListener('submit', e=>{
    e.preventDefault();
    const name=document.getElementById('studentName').value.trim();
    const className=document.getElementById('studentClass').value.trim();
    const nis=document.getElementById('studentNis').value.trim();
    if(!name||!className){ alert('Nama dan kelas wajib diisi.'); return; }
    state.student={name,className,nis};
    state.startedAt=state.startedAt||new Date().toISOString();
    saveState(); showWorkspace();
  });

  document.getElementById('runBtn').addEventListener('click',()=>runCurrent(false));
  document.getElementById('checkBtn').addEventListener('click',()=>runCurrent(true));
  document.getElementById('saveBtn').addEventListener('click',()=>{
    captureAnswer(); saveState(); toast('Jawaban disimpan.','success');
  });
  document.getElementById('resetEditorBtn').addEventListener('click',()=>{
    const t=getCurrentTask();
    if(confirm('Kosongkan editor untuk soal ini?')){
      state.answers[t.id]='';
      invalidateFromTask(t.id);
      state.feedback[t.id]=null;
      document.getElementById('sqlEditor').value='';
      renderFeedback(null); updateDashboard(); renderTaskNav(); saveState();
    }
  });
  document.getElementById('resetAllBtn').addEventListener('click',resetAll);
  document.getElementById('exportSqlBtn').addEventListener('click',exportSql);
  document.getElementById('exportReportBtn').addEventListener('click',exportReport);
  document.getElementById('changeStudentBtn').addEventListener('click',()=>{
    if(confirm('Kembali ke halaman identitas? Jawaban dan progres tetap tersimpan.')) showLanding(true);
  });
  document.getElementById('referenceBtn').addEventListener('click',()=>openModal('referenceModal'));
  document.getElementById('schemaBtn').addEventListener('click',()=>openModal('schemaModal'));
  document.getElementById('helpBtn').addEventListener('click',()=>openModal('helpModal'));
  document.querySelectorAll('[data-close-modal]').forEach(btn=>btn.addEventListener('click',()=>closeModal(btn.closest('.modal'))));
  document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m) closeModal(m)}));

  document.getElementById('sqlEditor').addEventListener('input',()=>{
    const t=getCurrentTask();
    state.answers[t.id]=document.getElementById('sqlEditor').value;
    invalidateFromTask(t.id);
    state.feedback[t.id]=null;
    renderFeedback(null);
    updateDashboard();
    renderTaskNav();
    window.clearTimeout(window.__saveTimer);
    window.__saveTimer=setTimeout(saveState,350);
  });
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){ e.preventDefault(); runCurrent(true); }
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){ e.preventDefault(); captureAnswer(); saveState(); toast('Jawaban disimpan.','success'); }
  });

  // Simpan juga ketika tab ditutup, direfresh, dipindah ke background, atau halaman ditinggalkan.
  const flushSave=()=>{
    try{ captureAnswer(); }catch(_){}
    saveState();
  };
  window.addEventListener('pagehide',flushSave);
  window.addEventListener('beforeunload',flushSave);
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') flushSave(); });
}

function showLanding(keepValues=false){
  document.getElementById('landing').classList.remove('hidden');
  document.getElementById('workspace').classList.add('hidden');
  if(keepValues||state.student.name) hydrateIdentityInputs();
  updateResumeNotice();
}

function showWorkspace(){
  document.getElementById('landing').classList.add('hidden');
  document.getElementById('workspace').classList.remove('hidden');
  renderStudent(); renderTaskNav(); renderTask(state.currentTask||1); updateDashboard(); renderDbExplorer(); updateSavedLabel();
}

function renderStudent(){
  document.getElementById('studentDisplay').textContent=state.student.name;
  document.getElementById('classDisplay').textContent=state.student.className + (state.student.nis?` • NIS ${state.student.nis}`:'');
}

function renderTaskNav(){
  const root=document.getElementById('taskNav'); root.innerHTML='';
  Object.entries(sectionMeta).forEach(([key,meta])=>{
    const sec=document.createElement('div'); sec.className='nav-section';
    const done=tasks.filter(t=>t.section===key&&state.completed[t.id]).reduce((s,t)=>s+t.points,0);
    sec.innerHTML=`<div class="nav-section-title"><span>${key}. ${meta.name}</span><small>${done}/${meta.max}</small></div>`;
    tasks.filter(t=>t.section===key).forEach(t=>{
      const btn=document.createElement('button');
      btn.className=`task-nav-btn ${Number(state.currentTask)===t.id?'active':''} ${state.completed[t.id]?'done':''}`;
      btn.innerHTML=`<span class="task-number">${state.completed[t.id]?'✓':t.id}</span><span class="task-nav-text"><b>Soal ${t.id}</b><small>${t.points} poin</small></span>`;
      btn.addEventListener('click',()=>{captureAnswer(); state.currentTask=t.id; saveState(); renderTaskNav(); renderTask(t.id);});
      sec.appendChild(btn);
    });
    root.appendChild(sec);
  });
}

function getCurrentTask(){ return tasks.find(t=>t.id===Number(state.currentTask))||tasks[0]; }

function renderTask(id){
  state.currentTask=id;
  const t=getCurrentTask();
  document.getElementById('taskSectionBadge').textContent=`Bagian ${t.section} • ${sectionMeta[t.section].name}`;
  document.getElementById('taskTitle').textContent=`Soal ${t.id} — ${t.title}`;
  document.getElementById('taskPoints').textContent=`${t.points} poin`;
  document.getElementById('taskPrompt').innerHTML=t.prompt;
  document.getElementById('taskChecklist').innerHTML=t.checklist.map(x=>`<li>${escapeHtml(x)}</li>`).join('');
  const editor=document.getElementById('sqlEditor'); editor.value=state.answers[t.id]||''; editor.placeholder=t.placeholder;
  const fb=state.feedback[t.id]; renderFeedback(fb);
  currentResults=[]; renderResults([]);
  updatePager(); renderDbExplorer();
  document.getElementById('sqlEditor').focus({preventScroll:true});
}

function captureAnswer(){
  const t=getCurrentTask();
  const editor=document.getElementById('sqlEditor');
  if(editor) state.answers[t.id]=editor.value;
}

function updatePager(){
  const idx=tasks.findIndex(t=>t.id===getCurrentTask().id);
  const prev=document.getElementById('prevBtn'), next=document.getElementById('nextBtn');
  prev.disabled=idx===0; next.disabled=idx===tasks.length-1;
  prev.onclick=()=>{if(idx>0){captureAnswer();state.currentTask=tasks[idx-1].id;saveState();renderTaskNav();renderTask(state.currentTask);}};
  next.onclick=()=>{if(idx<tasks.length-1){captureAnswer();state.currentTask=tasks[idx+1].id;saveState();renderTaskNav();renderTask(state.currentTask);}};
}

function runCurrent(withCheck){
  const t=getCurrentTask();
  const sql=document.getElementById('sqlEditor').value.trim();
  state.answers[t.id]=sql;
  if(!sql){ renderFeedback({ok:false,message:'Editor SQL masih kosong.'}); return; }
  setBusy(true);
  try{
    // Selalu bangun ulang database dari Soal 1 sampai soal aktif.
    // Dengan cara ini tombol Jalankan dapat ditekan berkali-kali tanpa membuat tabel/data ganda.
    currentResults=rebuildEngineThrough(t.id,sql);
    renderResults(currentResults);
    if(withCheck){
      const result=t.validate({sql,results:currentResults});
      state.feedback[t.id]=result;
      if(result.ok){
        state.completed[t.id]=true;
        renderFeedback(result);
        toast(`Soal ${t.id} benar! +${t.points} poin`,'success');
      }else{
        delete state.completed[t.id];
        renderFeedback(result);
      }
    }else{
      renderFeedback({ok:true,message:'Query berhasil dijalankan pada database yang dibangun ulang dari jawaban Soal 1 sampai soal ini. Aman menjalankan query yang sama berulang kali.'},true);
    }
    saveState(); updateDashboard(); renderTaskNav(); renderDbExplorer();
  }catch(err){
    currentResults=[]; renderResults([]);
    const prefix=err.taskId && Number(err.taskId)!==Number(t.id) ? `Masalah pada Soal ${err.taskId}: ` : '';
    const result={ok:false,message:prefix+(err.message||String(err))};
    if(withCheck){ state.feedback[t.id]=result; delete state.completed[t.id]; }
    renderFeedback(result);
    // Hindari state setengah jadi jika query gagal di tengah eksekusi.
    rebuildEngineBeforeTask(t.id);
    renderDbExplorer(); updateDashboard(); renderTaskNav(); saveState();
  }finally{ setBusy(false); }
}

function renderFeedback(fb,neutral=false){
  const box=document.getElementById('feedbackBox');
  if(!fb){ box.className='feedback hidden'; box.innerHTML=''; return; }
  box.className=`feedback ${neutral?'neutral':(fb.ok?'success':'error')}`;
  box.innerHTML=`<div class="feedback-icon">${neutral?'i':(fb.ok?'✓':'!')}</div><div><b>${neutral?'Status Query':(fb.ok?'Jawaban terverifikasi':'Perlu diperbaiki')}</b><p>${escapeHtml(fb.message||'')}</p></div>`;
}

function renderResults(results){
  const root=document.getElementById('resultArea');
  if(!results||!results.length){
    root.innerHTML='<div class="empty-result">Hasil query akan tampil di sini.</div>'; return;
  }
  root.innerHTML='';
  results.forEach((r,idx)=>{
    const block=document.createElement('div'); block.className='result-block';
    if(r.type==='select'){
      const tableHtml=`<div class="result-caption">Hasil ${idx+1} • ${r.rows.length} baris</div><div class="table-scroll"><table class="data-table"><thead><tr>${r.columns.map(c=>`<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${r.rows.map(row=>`<tr>${r.columns.map(c=>`<td>${escapeHtml(formatCell(row[c]))}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${r.columns.length}">0 baris</td></tr>`}</tbody></table></div>`;
      block.innerHTML=tableHtml;
    }else{
      block.innerHTML=`<div class="query-message"><span>✓</span>${escapeHtml(r.message||'Query berhasil.')}</div>`;
    }
    root.appendChild(block);
  });
}

function renderDbExplorer(){
  const root=document.getElementById('dbExplorer');
  const active=engine.activeDatabase||'-';
  const infos=engine.tableInfo();
  root.innerHTML=`<div class="db-active"><span class="db-dot"></span><div><small>Database aktif</small><b>${escapeHtml(active==='__session__'?'Belum memilih database':active)}</b></div></div>${infos.length?`<div class="db-tables">${infos.map(t=>`<button class="db-table" data-table="${escapeHtml(t.name)}"><span>▦</span><div><b>${escapeHtml(t.name)}</b><small>${t.rows} baris • ${t.columns} kolom</small></div></button>`).join('')}</div>`:'<p class="db-empty">Belum ada tabel.</p>'}`;
  root.querySelectorAll('[data-table]').forEach(btn=>btn.addEventListener('click',()=>showTablePreview(btn.dataset.table)));
}

function showTablePreview(name){
  const t=table(name); if(!t) return;
  document.getElementById('schemaTitle').textContent=`Struktur & Data: ${name}`;
  const schemaRows=t.columns.map(c=>`<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.type)}</td><td>${c.primaryKey?'PK ':''}${c.autoIncrement?'AI ':''}${c.notNull?'NOT NULL ':''}${c.unique?'UNIQUE ':''}${c.defaultValue!==undefined?`DEFAULT ${escapeHtml(c.defaultValue)}`:''}</td></tr>`).join('');
  let html=`<h4>Struktur Tabel</h4><div class="table-scroll"><table class="data-table"><thead><tr><th>Field</th><th>Tipe</th><th>Atribut</th></tr></thead><tbody>${schemaRows}</tbody></table></div>`;
  if(t.foreignKeys?.length){ html+=`<h4>Foreign Key</h4><ul class="simple-list">${t.foreignKeys.map(f=>`<li><code>${escapeHtml(f.column)}</code> → <code>${escapeHtml(f.refTable)}.${escapeHtml(f.refColumn)}</code></li>`).join('')}</ul>`; }
  html+=`<h4>Data (${t.rows.length} baris)</h4>`;
  if(t.rows.length){
    const cols=t.columns.map(c=>c.name);
    html+=`<div class="table-scroll"><table class="data-table"><thead><tr>${cols.map(c=>`<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${t.rows.map(r=>`<tr>${cols.map(c=>`<td>${escapeHtml(formatCell(r[c]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }else html+='<p class="muted">Belum ada data.</p>';
  document.getElementById('schemaContent').innerHTML=html;
  openModal('schemaModal');
}

function updateDashboard(){
  const score=totalScore(), count=completedCount();
  document.getElementById('scoreValue').textContent=score;
  document.getElementById('progressText').textContent=`${count}/${tasks.length} soal selesai`;
  document.getElementById('progressBar').style.width=`${Math.round(count/tasks.length*100)}%`;
  document.getElementById('scoreRing').style.setProperty('--score',score);
  updateSavedLabel();
}

function setBusy(on){
  ['runBtn','checkBtn'].forEach(id=>{const b=document.getElementById(id);b.disabled=on;});
  document.getElementById('checkBtn').textContent=on?'Memproses...':'Jalankan & Periksa';
}

function resetAll(){
  if(!confirm('Reset seluruh database, jawaban, progres, dan skor? Tindakan ini tidak dapat dibatalkan.')) return;
  const student={...state.student};
  engine.reset();
  state={student,answers:{},completed:{},feedback:{},currentTask:1,startedAt:new Date().toISOString(),lastSaved:null};
  saveState(); currentResults=[]; renderTaskNav(); renderTask(1); updateDashboard(); renderDbExplorer(); toast('Seluruh progres berhasil direset.','success');
}

function exportSql(){
  captureAnswer();
  const lines=[];
  lines.push(`-- PROYEK BASIS DATA DDL & DML`);
  lines.push(`-- Nama : ${state.student.name}`);
  lines.push(`-- Kelas: ${state.student.className}`);
  if(state.student.nis) lines.push(`-- NIS  : ${state.student.nis}`);
  lines.push(`-- Skor latihan otomatis: ${totalScore()}/100`);
  lines.push('');
  tasks.forEach(t=>{
    lines.push(`-- ==================================================`);
    lines.push(`-- SOAL ${t.id}: ${t.title} (${t.points} poin)`);
    lines.push(`-- Status: ${state.completed[t.id]?'TERVERIFIKASI':'BELUM TERVERIFIKASI'}`);
    lines.push(state.answers[t.id]||'-- Belum dijawab');
    lines.push('');
  });
  downloadText(`inventaris_${safeFileName(state.student.name)}.sql`,lines.join('\n'),'text/sql');
}

function exportReport(){
  captureAnswer();
  const now=new Date();
  let html=`<!doctype html><html><head><meta charset="utf-8"><title>Laporan Praktik Basis Data</title><style>body{font-family:Arial,sans-serif;color:#172033;max-width:900px;margin:30px auto;padding:20px}h1{color:#123b70}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #bbb;padding:8px;text-align:left}th{background:#eef4fb}.ok{color:#087a4b;font-weight:bold}.no{color:#b04435;font-weight:bold}pre{background:#f4f6f8;padding:12px;white-space:pre-wrap;border-left:4px solid #2e65a4}.summary{padding:14px;background:#eef6ff;border-radius:8px}</style></head><body>`;
  html+=`<h1>Laporan Praktik Basis Data</h1><p><b>Sistem Inventaris Laboratorium Komputer</b></p><div class="summary"><b>Nama:</b> ${escapeHtml(state.student.name)}<br><b>Kelas:</b> ${escapeHtml(state.student.className)}<br>${state.student.nis?`<b>NIS:</b> ${escapeHtml(state.student.nis)}<br>`:''}<b>Skor latihan otomatis:</b> ${totalScore()}/100<br><b>Soal terverifikasi:</b> ${completedCount()}/${tasks.length}<br><b>Dicetak:</b> ${now.toLocaleString('id-ID')}</div>`;
  html+=`<table><thead><tr><th>No</th><th>Soal</th><th>Poin</th><th>Status</th></tr></thead><tbody>${tasks.map(t=>`<tr><td>${t.id}</td><td>${escapeHtml(t.title)}</td><td>${t.points}</td><td class="${state.completed[t.id]?'ok':'no'}">${state.completed[t.id]?'Terverifikasi':'Belum'}</td></tr>`).join('')}</tbody></table>`;
  html+='<h2>Jawaban SQL</h2>';
  tasks.forEach(t=>{html+=`<h3>Soal ${t.id} — ${escapeHtml(t.title)}</h3><pre>${escapeHtml(state.answers[t.id]||'Belum dijawab')}</pre>`;});
  html+='</body></html>';
  const blob=new Blob([html],{type:'text/html;charset=utf-8'}); const url=URL.createObjectURL(blob); const w=window.open(url,'_blank'); if(w){w.addEventListener('load',()=>setTimeout(()=>w.print(),300));} else downloadBlob(`laporan_${safeFileName(state.student.name)}.html`,blob); setTimeout(()=>URL.revokeObjectURL(url),5000);
}

function downloadText(name,text,type='text/plain'){ downloadBlob(name,new Blob([text],{type:`${type};charset=utf-8`})); }
function downloadBlob(name,blob){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
function safeFileName(s){ return String(s||'siswa').trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')||'siswa'; }
function formatCell(v){ return v===null||v===undefined?'NULL':String(v); }
function escapeHtml(s){ return String(s??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }

function openModal(id){ document.getElementById(id).classList.add('show'); document.body.classList.add('modal-open'); }
function closeModal(el){ if(typeof el==='string') el=document.getElementById(el); el?.classList.remove('show'); document.body.classList.remove('modal-open'); }
function toast(message,type=''){ const t=document.getElementById('toast');t.textContent=message;t.className=`toast show ${type}`;clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>t.className='toast',2500); }

window.addEventListener('DOMContentLoaded',init);
