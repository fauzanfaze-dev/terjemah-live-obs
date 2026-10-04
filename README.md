# Terjemah Live — Subtitle OBS

Web app statis untuk mengubah suara mikrofon menjadi subtitle terjemahan Indonesia ↔ Inggris. Dibuat untuk Google Chrome desktop dan dapat ditangkap melalui **Window Capture** di OBS.

## Yang dibutuhkan

- Google Chrome desktop versi terbaru.
- Mikrofon yang terhubung ke komputer.
- OBS Studio.
- Internet saat penggunaan pertama untuk mengunduh paket penerjemahan Chrome. Pengenalan suara standar juga dapat memerlukan internet.

Tidak ada API key, akun aplikasi, database, atau biaya per menit.

Tampilan sudah responsif untuk ponsel. Pengaturan dan **Uji Subtitle** dapat digunakan dari mobile, tetapi penerjemahan suara langsung tetap memerlukan Chrome desktop karena Translator bawaan Chrome belum tersedia di perangkat mobile.

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

## Pasang di OBS

1. Biarkan aplikasi terbuka di Chrome dan jangan minimalkan jendelanya.
2. Klik **Buka Mode OBS** pada aplikasi.
3. Di OBS, klik tombol **+** pada panel Sources.
4. Pilih **Window Capture**.
5. Pilih jendela Chrome berjudul **Terjemah Live — Subtitle OBS**.
6. Klik kanan source tersebut, pilih **Filters**.
7. Di bagian Effect Filters, klik **+ → Chroma Key**.
8. Pilih **Key Color Type: Green** jika aplikasi memakai latar hijau chroma.
9. Sesuaikan Similarity dan Smoothness hingga latar hilang bersih.
10. Atur ukuran dan posisi source, kemudian kunci source di OBS.

Tekan `Esc` untuk keluar dari Mode OBS.

## Tombol cepat

- `Spasi`: balik arah Indonesia ↔ Inggris.
- `S`: mulai atau hentikan mikrofon.
- `O`: buka atau tutup Mode OBS.
- `Esc`: keluar dari Mode OBS.

## Catatan penting

- Arah bahasa dipilih manual karena pengenalan suara perlu mengetahui bahasa yang sedang didengar.
- Gunakan **Window Capture**, bukan Browser Source OBS, agar fitur mikrofon dan Translator bawaan Chrome tersedia.
- Jangan minimalkan Chrome selama siaran. Letakkan jendelanya di monitor lain atau di belakang OBS jika perlu.
- Bila mikrofon ditolak, klik ikon pengaturan situs di address bar Chrome, izinkan mikrofon, lalu muat ulang.
- Semua preferensi tampilan hanya disimpan di browser perangkat tersebut.
