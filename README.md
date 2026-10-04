# Terjemah Live — Subtitle OBS

Web app statis untuk mengubah suara mikrofon menjadi subtitle terjemahan Indonesia ↔ Inggris. Dibuat untuk Google Chrome desktop dan dapat ditangkap melalui **Window Capture** di OBS.

## Fitur v1.2.0

- Penerjemah adaptif berdasarkan kemampuan perangkat:
  - Chrome Translator bawaan jika tersedia.
  - Model lokal WebGPU untuk perangkat yang memadai.
  - Model lokal CPU/WASM sebagai fallback hemat.
- Mode **Otomatis**, **Hemat perangkat**, dan **Maksimum**.
- Kamus Nama lokal dengan koreksi fonetik dan perlindungan nama selama penerjemahan.
- Kalibrasi pengucapan nama melalui mikrofon; alias salah dengar dipelajari otomatis.
- Impor Kamus Nama dari TXT, CSV, JSON, DOCX, dan PDF berbasis teks.
- Ekspor cadangan Kamus Nama dalam JSON.

- Panel kontrol horizontal di atas pratinjau dan dapat disembunyikan.
- Font Default, Times New Roman, Poppins, dan Arial.
- Subtitle menghilang 2–30 detik setelah tidak ada ucapan baru.
- Batas maksimal 1–4 baris terjemahan.
- Latar OBS hijau, biru, atau hitam murni.
- PWA yang dapat dipasang di desktop maupun mobile.
- Cache antarmuka agar aplikasi tetap dapat dibuka saat offline.

## Yang dibutuhkan

- Google Chrome versi terbaru sangat direkomendasikan.
- Mikrofon yang terhubung ke komputer.
- OBS Studio jika aplikasi dipakai untuk siaran desktop.
- Internet saat penggunaan pertama untuk mengunduh paket penerjemah. Pengenalan suara browser juga dapat memerlukan internet.

Tidak ada API key, akun aplikasi, database, atau biaya per menit.

Tampilan responsif untuk desktop dan mobile. Bila Chrome Translator bawaan tidak tersedia, aplikasi beralih ke model lokal gratis. Kecepatan penerjemahan mobile tetap bergantung pada kemampuan perangkat dan dukungan pengenalan suara browser.

Model lokal diunduh langsung ke browser saat pertama digunakan. Perkiraan ukurannya sekitar 115–210 MB untuk satu arah bahasa, tergantung mode dan perangkat. Mengganti arah bahasa dapat memerlukan unduhan model pasangan bahasa lainnya.

Font Poppins dimuat gratis dari Google Fonts. Jika koneksi font tidak tersedia, aplikasi otomatis memakai Arial sebagai pengganti.

## Memperbarui repository dari v1.1.0

1. Ekstrak ZIP v1.2.0 ke folder sementara.
2. Buka folder repository `terjemah-live-obs` yang sudah terhubung ke GitHub Desktop.
3. Salin seluruh isi hasil ekstrak v1.2.0 ke folder repository tersebut.
4. Pilih **Replace the files in the destination** jika Windows meminta konfirmasi.
5. Jangan menghapus folder `.git` milik repository.
6. Buka GitHub Desktop dan periksa daftar perubahan.
7. Isi ringkasan commit: `Update Terjemah Live v1.2.0`.
8. Klik **Commit to main**, lalu **Push origin**.
9. GitHub Pages akan memperbarui aplikasi secara otomatis.

Jika tampilan lama masih muncul, tutup seluruh jendela aplikasi lalu buka kembali. Service worker v1.2.0 akan mengganti cache antarmuka versi sebelumnya tanpa menghapus Kamus Nama.

## Deploy gratis dengan GitHub Desktop

1. Ekstrak ZIP build ini ke folder tetap, misalnya `Documents/Terjemah-Live`.
2. Buka **GitHub Desktop**.
3. Pilih **File → Add local repository**.
4. Pilih folder hasil ekstrak.
5. Jika muncul keterangan bahwa folder belum menjadi repository, klik **Create a repository**.
6. Pastikan branch bernama `main`.
7. Isi ringkasan commit pertama, misalnya `Build awal Terjemah Live`, lalu klik **Commit to main**.
8. Klik **Publish repository**.
9. Hilangkan centang **Keep this code private**, lalu klik **Publish repository**.
10. Di GitHub.com, buka repository tersebut lalu pilih **Settings → Pages**.
11. Pada **Build and deployment**, pilih **Deploy from a branch**.
12. Pilih branch **main**, folder **/ (root)**, kemudian klik **Save**.

Alamat aplikasi akan berbentuk:

`https://USERNAME.github.io/NAMA-REPOSITORY/`

GitHub dapat memerlukan beberapa menit untuk menerbitkan perubahan pertama.

## Penggunaan pertama

1. Buka alamat GitHub Pages di Chrome desktop.
2. Pilih arah bahasa.
3. Klik **Uji subtitle** untuk memeriksa tampilan.
4. Klik **Mulai mikrofon**.
5. Izinkan mikrofon ketika Chrome meminta izin.
6. Tunggu paket penerjemah selesai diunduh jika ini penggunaan pertama.
7. Mulai berbicara dengan bahasa yang dipilih.

## Mode penerjemah adaptif

- **Otomatis**: memakai Chrome Translator bila tersedia; jika tidak, memilih WebGPU atau CPU/WASM berdasarkan kemampuan perangkat. Model lokal menerjemahkan kalimat final agar tetap ringan.
- **Hemat perangkat**: mengutamakan penggunaan memori rendah dan hanya menerjemahkan kalimat final.
- **Maksimum**: tetap memakai Chrome Translator bila tersedia; pada fallback lokal, mode ini memakai WebGPU dan dapat menerjemahkan teks sementara agar hasil terasa lebih langsung. Mode ini memakai memori dan baterai lebih besar.

Label **Mesin perangkat** menunjukkan mesin yang dipilih. Model lokal berasal dari model terbuka Indonesia ↔ Inggris dan dijalankan langsung di browser melalui Transformers.js. Tidak ada API key atau biaya per karakter.

## Kamus Nama

### Menambahkan nama

1. Buka panel **Kamus Nama**.
2. Masukkan satu nama, tempel banyak nama dengan satu nama per baris, atau impor berkas.
3. Cukup masukkan nama resmi. Alias pengucapan tidak wajib ditulis.

Format teks opsional dengan alias manual:

`Farhan | parahan, far han`

### Kalibrasi melalui mikrofon

1. Hentikan mikrofon subtitle live.
2. Klik **Latih** di samping nama.
3. Sebutkan nama dengan jelas.
4. Aplikasi menyimpan hasil alternatif pengenalan suara sebagai variasi lokal.

Saat live, aplikasi juga menggunakan pencocokan fonetik yang konservatif. Nama dengan kecocokan tinggi diperbaiki dan dikunci sebelum terjemahan, sedangkan nama yang ambigu tidak ditebak sembarangan.

### Impor dan cadangan

- TXT: satu nama per baris.
- CSV: kolom `nama`/`name` dan opsional `alias`.
- JSON: format hasil tombol **Ekspor cadangan**.
- DOCX: setiap paragraf dibaca sebagai satu entri.
- PDF: harus mengandung teks yang dapat diseleksi; PDF hasil scan belum didukung.

Kamus tersimpan di browser perangkat tersebut dan tidak diunggah ke GitHub. Gunakan **Ekspor cadangan** untuk memindahkannya ke perangkat lain. Menghapus data situs/browser dapat menghapus kamus lokal.

Terjemah Live tidak memiliki server atau database sendiri. Namun, layanan pengenalan suara bawaan browser dapat menggunakan layanan daring milik penyedia browser; daftar frasa prioritas dapat ikut diproses oleh mesin pengenalan suara tersebut.

## Pasang sebagai aplikasi PWA

### Chrome desktop

1. Buka alamat GitHub Pages.
2. Klik **Pasang aplikasi** di kanan atas.
3. Klik **Install** pada konfirmasi Chrome.
4. Terjemah Live akan terbuka sebagai aplikasi tersendiri tanpa address bar.

### Android

1. Perbarui Google Chrome dan Google Play Services.
2. Buka alamat GitHub Pages melalui Chrome.
3. Tekan **Pasang aplikasi**, atau gunakan menu Chrome → **Tambahkan ke layar utama**.
4. Ikuti konfirmasi pemasangan.

### iPhone atau iPad

1. Buka alamat aplikasi melalui Safari.
2. Tekan **Bagikan**.
3. Pilih **Tambahkan ke Layar Utama**.

Antarmuka dapat terbuka dari cache. Model lokal yang telah selesai diunduh juga disimpan oleh browser, tetapi pengenalan suara dapat tetap memerlukan internet tergantung perangkat.

## Pasang di OBS

1. Biarkan aplikasi terbuka di Chrome dan jangan minimalkan jendelanya.
2. Klik **Buka Mode OBS** pada aplikasi.
3. Di OBS, klik tombol **+** pada panel Sources.
4. Pilih **Window Capture**.
5. Pilih jendela Chrome berjudul **Terjemah Live — Subtitle OBS**.
6. Klik kanan source tersebut, pilih **Filters**.
7. Di bagian Effect Filters, pilih filter sesuai latar: **Chroma Key** untuk hijau/biru, atau **Luma Key** untuk hitam murni.
8. Untuk hijau/biru, pilih **Key Color Type** yang sesuai. Untuk hitam, naikkan **Luma Min** perlahan sampai latar hilang; **Color Key** dengan warna kustom `#000000` juga dapat digunakan.
9. Sesuaikan Similarity/Smoothness atau nilai Luma secukupnya agar teks tetap bersih.
10. Atur ukuran dan posisi source, kemudian kunci source di OBS.

Tekan `Esc` untuk keluar dari Mode OBS.

## Tombol cepat

- `Spasi`: balik arah Indonesia ↔ Inggris.
- `S`: mulai atau hentikan mikrofon.
- `O`: buka atau tutup Mode OBS.
- `Esc`: keluar dari Mode OBS.

## Catatan penting

- Arah bahasa dipilih manual karena pengenalan suara perlu mengetahui bahasa yang sedang didengar.
- Gunakan **Window Capture**, bukan Browser Source OBS, agar izin mikrofon dan mesin penerjemah browser tersedia dengan benar.
- Jangan minimalkan Chrome selama siaran. Letakkan jendelanya di monitor lain atau di belakang OBS jika perlu.
- Bila mikrofon ditolak, klik ikon pengaturan situs di address bar Chrome, izinkan mikrofon, lalu muat ulang.
- Semua preferensi tampilan hanya disimpan di browser perangkat tersebut.
- JSZip dan PDF.js disertakan secara lokal untuk membaca DOCX/PDF; lisensinya tersedia di folder `vendor`.
