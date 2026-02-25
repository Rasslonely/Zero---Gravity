# 🚀 DEPLOYMENT GUIDE (BCH-1 Hackcelerator)

Zero-Gravity (0G) consists of two main components that need to run continuously for the protocol to work end-to-end:

1.  **The Frontend (Next.js):** Runs in the browser, takes user input, parses it with Gemini, sends TX to Starknet, and pushes the intent to Supabase.
2.  **The Oracle Daemon (Node.js):** Runs continually in the background, listening to Supabase for new intents, attesting them, and broadcasting them to Bitcoin Cash.

---

## 🏗️ 1. Deploying the Frontend (Web App)
The best place to deploy `apps/web` is **Vercel**. 

1. Push your code to GitHub.
2. Go to [Vercel](https://vercel.com/) -> Import Project.
3. **Framework Preset:** Next.js
4. **Root Directory:** `apps/web`
5. **Environment Variables:** Copy everything from your `.env` file into the Vercel Envs settings:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `GOOGLE_GEMINI_API_KEY`
    - *etc...*
6. Click **Deploy**.

---

## 🔮 2. Deploying the Shadow Oracle Daemon
Karena Oracle adalah sebuah "Daemon" (Service yang berjalan 24/7 di background tanpa UI), kamu tidak bisa men-deploynya ke Vercel (karena Vercel itu serverless functions yang mati setelah 10 detik).

Kamu butuh server aso / VPS yang menyala 24/7. **Platform Terbaik dan Termudah: Render.com atau Railway.app**.

### Opsi A: Menggunakan Render.com (Gratis/Mudah)
1. Buat akun di [Render](https://render.com/).
2. Klik **New +** -> **Background Worker**.
3. Hubungkan ke repository GitHub Zero-Gravity.
4. **Settings:**
    - Root Directory: `.` (Biarkan kosong / root monorepo).
    - Environment: `Node`
    - Build Command: `npm install && cd apps/oracle && npm run build`
    - Start Command: `cd apps/oracle && npm run start`
5. **Environment Variables:** Masukkan semua `.env` rahasia:
    - `SUPABASE_URL`
    - `SUPABASE_SERVICE_ROLE_KEY` (Penting! Harus Service Role, jangan Anon Key)
    - `ORACLE_PRIVATE_KEY`
    - `BCH_OWNER_PRIVATE_KEY`
6. Klik **Create Worker**. Render akan menjalankan script ini 24/7.

### Opsi C: Menggunakan Dewacloud (Sangat Direkomendasikan utk Indonesia)
Jika kamu mencari opsi yang sangat stabil dan sering dipakai developer Indonesia, **Dewacloud** adalah pilihan tepat (mereka mengklaim punya free/trial tier yang bagus).

1. Login ke Dashboard Dewacloud.
2. Klik **New Environment** -> Pilih **Node.js** container.
3. Setelah environment jadi, kamu bisa *deploy via Git* atau *SSH*.
4. **Deploy via Git:**
    - Masukkan URL repo GitHub Zero-Gravity.
    - Set folder path ke `apps/oracle`.
5. **Set Environment Variables:**
    - Di menu *Variables* container, masukkan semua isi `.env` rahasia kamu.
6. **Mulai Daemon:**
    - Dewacloud biasanya akan otomatis menjalankan `npm start`. Pastikan `package.json` di dalam `apps/oracle` sudah diset `start` script-nya ke `node dist/index.js` (Kamu harus jalankan build process dulu sebelum start).

---

## 🧪 3. Cara Curang (Hackathon Cheat Code) - Local Oracle
Jika kamu baru mau presentasi *Live* (Zoom/Stage), ada opsi kedua yang sangat **dianjurkan** oleh juri teknis karena menunjukkan kamu benar-benar me-run node-nya:

1. Deploy Web ke Vercel atau localhost (Bebas).
2. Di laptop presentasi kamu, buka Terminal (VSCode).
3. Jalankan Oracle secara lokal:
   ```bash
   cd apps/oracle
   npm run dev
   ```
4. Biarkan terminal menyala di background.
5. Lakukan Swipe dari Vercel/Web.
6. Supabase di cloud akan menerima intent dari Vercel, lalu **melemparnya kembali ke laptop kamu** (karena Oracle nyala di laptop).
7. Laptop kamu menandatangani dan membroadcastnya langsung ke BCH Chipnet!

*Juri sangat suka melihat layar Terminal SSH/Log yang bergerak otomatis saat transaksi web berhasil!*
