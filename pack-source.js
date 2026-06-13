const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT_DIR = __dirname;
const TEMP_DIR = path.join(ROOT_DIR, "source-deploy-temp");
const ZIP_FILE = path.join(ROOT_DIR, "egregora-deploy.zip");

function log(msg) {
  console.log(`[Pack Source] ${msg}`);
}

try {
  log("Iniciando preparação do ZIP de código-fonte para o Hostinger Node.js Web App...");

  // 1. Limpar deploys anteriores usando métodos nativos robustos do Node.js
  if (fs.existsSync(TEMP_DIR)) {
    log("Limpando pasta temporária antiga...");
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
  if (fs.existsSync(ZIP_FILE)) {
    log("Removendo zip antigo...");
    fs.unlinkSync(ZIP_FILE);
  }

  // 2. Criar a nova estrutura
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  // Copiar pastas fundamentais usando fs.cpSync (nativo e robusto)
  log("Copiando pasta 'src'...");
  fs.cpSync(path.join(ROOT_DIR, "src"), path.join(TEMP_DIR, "src"), { recursive: true });

  log("Copiando pasta 'public'...");
  fs.cpSync(path.join(ROOT_DIR, "public"), path.join(TEMP_DIR, "public"), { recursive: true });

  log("Copiando pasta 'Contrato'...");
  fs.cpSync(path.join(ROOT_DIR, "Contrato"), path.join(TEMP_DIR, "Contrato"), { recursive: true });

  // Copiar arquivos de configuração
  const filesToCopy = [
    "package.json",
    "package-lock.json",
    "next.config.mjs",
    "tsconfig.json",
    "postcss.config.mjs",
    "eslint.config.mjs",
    "next-env.d.ts"
  ];

  filesToCopy.forEach(file => {
    const srcPath = path.join(ROOT_DIR, file);
    if (fs.existsSync(srcPath)) {
      log(`Copiando ${file}...`);
      fs.copyFileSync(srcPath, path.join(TEMP_DIR, file));
    }
  });

  // Copiar .env.production como .env (configuração de produção)
  const envProductionPath = path.join(ROOT_DIR, ".env.production");
  if (fs.existsSync(envProductionPath)) {
    log("Copiando .env.production como .env...");
    fs.copyFileSync(envProductionPath, path.join(TEMP_DIR, ".env"));
  }

  // 3. Criar os arquivos de inicialização do Passenger (server.js, app.js, index.js)
  log("Criando server.js para gerenciamento do Next.js via Phusion Passenger (Hostinger)...");
  const serverJsContent = `// Otimizacoes para evitar o limite de processos (nproc) no Hostinger / cPanel
process.env.UV_THREADPOOL_SIZE = '1';

const fs = require('fs');
const path = require('path');

// Configura redirecionamento de logs para o arquivo passenger.log na raiz do app
const logFilePath = path.join(__dirname, 'passenger.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

function writeToLogFile(prefix, data) {
  const time = new Date().toISOString();
  let logData = data.toString();
  if (!logData.endsWith('\\n')) {
    logData += '\\n';
  }
  logStream.write(\`[\${time}] [\${prefix}] \${logData}\`);
}

// Redireciona standard output e standard error
const originalWriteOut = process.stdout.write;
const originalWriteErr = process.stderr.write;

process.stdout.write = function(chunk, encoding, callback) {
  writeToLogFile('STDOUT', chunk);
  return originalWriteOut.apply(process.stdout, arguments);
};

process.stderr.write = function(chunk, encoding, callback) {
  writeToLogFile('STDERR', chunk);
  return originalWriteErr.apply(process.stderr, arguments);
};

// Captura erros não tratados
process.on('uncaughtException', (err) => {
  writeToLogFile('CRITICAL', \`Uncaught Exception: \${err.stack || err}\\n\`);
  logStream.end(() => {
    process.exit(1);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  writeToLogFile('CRITICAL', \`Unhandled Rejection at: \${promise}, reason: \${reason}\\n\`);
});

console.log('=== INICIANDO SERVIDOR EM PRODUCAO ===');
console.log('Node Version:', process.version);
console.log('Platform:', process.platform);
console.log('Working Directory:', __dirname);
console.log('PORT env:', process.env.PORT);
console.log('UV_THREADPOOL_SIZE:', process.env.UV_THREADPOOL_SIZE);
console.log('NODE_OPTIONS:', process.env.NODE_OPTIONS);

// Agora importamos os outros pacotes que podem falhar dependendo da versão do Node ou dependências ausentes
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false;
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;
const host = '0.0.0.0';

const isNumeric = !isNaN(port) && !isNaN(parseFloat(port));

app.prepare().then(() => {
  console.log('Next.js app preparado com sucesso.');
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  if (isNumeric) {
    server.listen(Number(port), host, (err) => {
      if (err) throw err;
      console.log(\`> Ready on port \${port} on \${host}\`);
    });
  } else {
    // Se for Unix socket, escuta diretamente no caminho do arquivo
    server.listen(port, (err) => {
      if (err) throw err;
      console.log(\`> Ready on socket \${port}\`);
    });
  }
}).catch((err) => {
  console.error('Erro durante a preparação do app Next.js:', err);
  process.exit(1);
});
`;
  fs.writeFileSync(path.join(TEMP_DIR, "server.js"), serverJsContent, "utf8");

  log("Criando app.js e index.js como fallbacks de inicialização...");
  const fallbackJsContent = `// Arquivo de inicializacao alternativo para garantir compatibilidade com o Hostinger Passenger
require('./server.js');
`;
  fs.writeFileSync(path.join(TEMP_DIR, "app.js"), fallbackJsContent, "utf8");
  fs.writeFileSync(path.join(TEMP_DIR, "index.js"), fallbackJsContent, "utf8");

  // Criar pasta tmp/ com restart.txt
  log("Criando tmp/restart.txt para controle de reinício...");
  const tmpDir = path.join(TEMP_DIR, "tmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(path.join(tmpDir, "restart.txt"), Date.now().toString(), "utf8");

  // Ajustar o start script no package.json do deploy para "node server.js"
  const destPkgPath = path.join(TEMP_DIR, "package.json");
  if (fs.existsSync(destPkgPath)) {
    const pkgContent = JSON.parse(fs.readFileSync(destPkgPath, "utf8"));
    if (pkgContent.scripts) {
      pkgContent.scripts.start = "node server.js";
    }
    fs.writeFileSync(destPkgPath, JSON.stringify(pkgContent, null, 2), "utf8");
  }

  // 4. Compactar (Usa tar para preservar as permissões Unix ao extrair no Linux da Hostinger)
  // Especificamos os arquivos individualmente para evitar o prefixo "./" nas entradas do ZIP que confunde o parser do Hostinger.
  log("Gerando arquivo ZIP...");
  const filesAndFolders = [
    "src",
    "public",
    "Contrato",
    "package.json",
    "package-lock.json",
    "next.config.mjs",
    "tsconfig.json",
    "postcss.config.mjs",
    "eslint.config.mjs",
    "next-env.d.ts",
    ".env",
    "server.js",
    "app.js",
    "index.js",
    "tmp"
  ].filter(f => fs.existsSync(path.join(TEMP_DIR, f)));

  const tarCommand = `tar -a -c -f "${ZIP_FILE}" -C "${TEMP_DIR}" ${filesAndFolders.join(" ")}`;
  execSync(tarCommand, { stdio: "inherit" });

  // 5. Limpar pasta temporária
  log("Limpando pasta temporária...");
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });

  log(`Sucesso! O arquivo '${path.basename(ZIP_FILE)}' foi criado com o código-fonte pronto para compilação remota no Hostinger.`);
} catch (e) {
  console.error("Erro durante o empacotamento:", e.message);
  process.exit(1);
}
