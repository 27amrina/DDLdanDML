WEBSITE PRAKTIK BASIS DATA DDL, DML & DQL
Sistem Inventaris Laboratorium Komputer

CARA MENJALANKAN
1. Ekstrak seluruh isi ZIP ke satu folder.
2. Buka file index.html menggunakan Google Chrome, Microsoft Edge, atau Firefox.
3. Tidak memerlukan XAMPP/MySQL untuk latihan karena website menggunakan simulator SQL di browser.

LOCAL STORAGE / AUTOSAVE
- Identitas siswa, jawaban setiap soal, progres, skor, soal terakhir, dan kondisi database simulator disimpan otomatis ke Local Storage browser.
- Query disimpan otomatis saat siswa mengetik.
- Data juga dipaksa tersimpan saat halaman direfresh, ditutup, atau tab dipindahkan ke background.
- Saat website dibuka kembali pada browser dan perangkat yang sama, akan muncul tombol "Lanjutkan Progres".
- Gunakan browser dan file/folder yang sama untuk hasil paling konsisten.
- Jangan menggunakan mode Incognito/Private jika ingin progres tetap tersedia.
- Tombol "Mulai Baru" akan menghapus progres, jawaban, dan database simulator yang tersimpan, tetapi mempertahankan identitas yang sedang terisi.

FITUR
- 22 soal praktik, total 100 poin.
- SQL Editor interaktif.
- CREATE DATABASE, CREATE TABLE, ALTER TABLE.
- INSERT, UPDATE, DELETE.
- SELECT, WHERE, ORDER BY, JOIN.
- DROP, TRUNCATE, SHOW TABLES, DESCRIBE.
- Pemeriksaan jawaban dan skor otomatis.
- Database Explorer.
- Materi visual DDL/DML/relasi database.
- Unduh jawaban sebagai file .sql.
- Cetak laporan hasil praktik.
- Autosave Local Storage dan pemulihan progres.

CATATAN
Local Storage berada pada browser/perangkat pengguna. Menghapus data situs/browser atau membuka dari konteks browser yang berbeda dapat menghilangkan akses ke progres lama. Untuk pengumpulan resmi, siswa tetap disarankan mengunduh file .SQL setelah selesai.

PERBAIKAN VERSI 4
- Database simulator dibangun ulang dari jawaban Soal 1 sampai soal aktif setiap kali tombol Jalankan/Jalankan & Periksa ditekan.
- Query CREATE TABLE atau INSERT yang sama dapat diperiksa ulang tanpa menimbulkan error palsu karena state eksekusi sebelumnya.
- Progres Local Storage tetap tersimpan, tetapi engine lama tidak dimuat mentah; struktur dibangun ulang dan diperiksa kembali dari jawaban siswa.
- Parser CREATE TABLE diperketat agar sintaks yang bukan SQL MySQL tidak diterima diam-diam.
- Contoh atribut kolom yang benar: id_kategori INT AUTO_INCREMENT PRIMARY KEY.
- Jangan menulis: id_kategori INT (Primary Key, Auto Increment).
- NOT NULL juga ditulis tanpa tanda kurung: nama_kategori VARCHAR(50) NOT NULL.
- Nama tabel wajib tepat, misalnya kategori (bukan katagori).
- Tampilan toolbar editor diperbaiki untuk layar HP agar tombol tidak keluar dari layar.


TAMBAHAN PERBAIKAN VERSI 4
- Parser ALTER TABLE diperbaiki dan diuji ulang.
- Mendukung dua ALTER terpisah maupun satu ALTER dengan beberapa ADD COLUMN.
  Contoh: ALTER TABLE barang ADD COLUMN harga DECIMAL(12,2), ADD COLUMN merek VARCHAR(50);
- Mendukung opsi posisi kolom FIRST dan AFTER untuk ADD COLUMN.
- Validator Soal 5 tidak lagi mewajibkan tepat dua perintah ALTER; satu ALTER dengan dua ADD juga sah.
- UPDATE sekarang mendukung aritmetika sederhana seperti SET jumlah = jumlah - 3 dan jumlah = jumlah + 2.
- SELECT/JOIN mendukung alias tabel seperti FROM barang b JOIN kategori k ...
- Pemeriksaan SELECT dan ORDER BY dibuat lebih fleksibel terhadap SQL yang valid, tetapi tetap memeriksa hasilnya.
- Pemeriksaan Soal 8 dan 9 diperketat agar data, relasi, lokasi, kategori, harga, merek, dan jumlah benar-benar sesuai.
- Soal 12 kini wajib menggunakan WHERE agar tidak mengubah seluruh record.
- Duplikasi shortcut Ctrl+S pada JavaScript dihapus.
- Seluruh 22 soal diuji dengan jawaban standar dan variasi sintaks SQL valid.
