const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = 'f:\\ngoding\\semua313\\novelora-testing';
const tempRepoDir = path.join(rootDir, 'temp-github-repo');
const repoUrl = 'https://github.com/nopalpage/novelora.git';

console.log('Memulai proses pembuatan struktur GitHub dan Push...');

try {
  // 1. Buat folder temp
  if (fs.existsSync(tempRepoDir)) {
    fs.rmSync(tempRepoDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempRepoDir);

  // Fungsi untuk copy folder dengan mengabaikan node_modules, .git, dan build artifacts
  function copyFolderSync(from, to) {
    fs.mkdirSync(to, { recursive: true });
    fs.readdirSync(from).forEach(element => {
      if (['node_modules', '.git', 'dist', '.wrangler'].includes(element)) return;
      
      const stat = fs.lstatSync(path.join(from, element));
      if (stat.isFile()) {
        fs.copyFileSync(path.join(from, element), path.join(to, element));
      } else if (stat.isDirectory()) {
        copyFolderSync(path.join(from, element), path.join(to, element));
      }
    });
  }

  // 2. Copy frontend dan backend ke folder baru
  console.log('Menyalin Frontend...');
  copyFolderSync(path.join(rootDir, 'novelora-frontend'), path.join(tempRepoDir, 'frontend'));
  
  console.log('Menyalin Backend...');
  copyFolderSync(path.join(rootDir, 'novelora-backend'), path.join(tempRepoDir, 'backend'));

  // 3. Jalankan Git Commands
  console.log('Menjalankan Git init, commit, dan push...');
  
  const execOptions = { cwd: tempRepoDir, stdio: 'inherit' };
  
  execSync('git init', execOptions);
  execSync('git add .', execOptions);
  execSync('git commit -m "Deploy: Restructure repository to frontend and backend folders"', execOptions);
  execSync('git branch -M main', execOptions);
  execSync(`git remote add origin ${repoUrl}`, execOptions);
  
  console.log('\\nSedang melakukan Push ke GitHub...');
  execSync('git push -u origin main -f', execOptions);

  console.log('\\n✅ Berhasil push ke GitHub repository: nopalpage/novelora dengan struktur folder frontend/ dan backend/ !');
  console.log('Sekarang Anda bisa mengatur Cloudflare Pages ke path /frontend dan Cloudflare Workers ke path /backend.');

  // Bersihkan folder temp
  fs.rmSync(tempRepoDir, { recursive: true, force: true });

} catch (error) {
  console.error('\\n❌ Terjadi kesalahan:', error.message);
}
