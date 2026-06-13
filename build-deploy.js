const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT_DIR = __dirname;
const DEPLOY_DIR = path.join(ROOT_DIR, "deploy");
const ZIP_FILE = path.join(ROOT_DIR, "egregora-deploy.zip");

function log(msg) {
  console.log(`[Deploy Script] ${msg}`);
}

function deleteFolderRecursive(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((file) => {
      const curPath = path.join(directoryPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(directoryPath);
  }
}

function copyFolderSync(from, to, exclude = []) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach((element) => {
    if (exclude.includes(element)) return;
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath, exclude);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}

try {
  log("Iniciando processo de build customizado para o Hostinger (Custom Server)...");

  // 1. Limpar pastas de deploys anteriores
  if (fs.existsSync(DEPLOY_DIR)) {
    log("Limpando pasta 'deploy' antiga...");
    deleteFolderRecursive(DEPLOY_DIR);
  }
  if (fs.existsSync(ZIP_FILE)) {
    log("Removendo 'egregora-deploy.zip' antigo...");
    fs.unlinkSync(ZIP_FILE);
  }

  // Limpar a pasta .next antes de rodar o build para evitar problemas de cache/permissão
  const nextDirRoot = path.join(ROOT_DIR, ".next");
  if (fs.existsSync(nextDirRoot)) {
    try {
      log("Limpando pasta '.next' de compilações anteriores para evitar erros de cache/EACCES...");
      deleteFolderRecursive(nextDirRoot);
    } catch (e) {
      log("Atenção: Não foi possível remover completamente a pasta '.next' antiga.");
      log("Isso geralmente acontece quando o servidor de desenvolvimento (npm run dev) está ativo.");
      log("Se a compilação a seguir falhar, por favor, desligue o servidor dev temporariamente.");
    }
  }

  // 2. Rodar build do Next.js
  log("Executando 'npm run build'...");
  execSync("npm run build", { stdio: "inherit", cwd: ROOT_DIR });

  // 3. Criar a nova estrutura de deploy
  log("Criando a estrutura da pasta 'deploy'...");
  fs.mkdirSync(DEPLOY_DIR, { recursive: true });

  // Copiar pasta .next (excluindo cache para diminuir o tamanho do ZIP)
  log("Copiando pasta '.next' (excluindo cache)...");
  const nextDir = path.join(ROOT_DIR, ".next");
  const destNextDir = path.join(DEPLOY_DIR, ".next");
  copyFolderSync(nextDir, destNextDir, ["cache"]);

  // Copiar public
  log("Copiando arquivos públicos (public)...");
  const publicDir = path.join(ROOT_DIR, "public");
  const destPublicDir = path.join(DEPLOY_DIR, "public");
  copyFolderSync(publicDir, destPublicDir);

  // Copiar Contrato
  log("Copiando pasta Contrato...");
  const contratoDir = path.join(ROOT_DIR, "Contrato");
  const destContratoDir = path.join(DEPLOY_DIR, "Contrato");
  copyFolderSync(contratoDir, destContratoDir);

  // Copiar package.json e package-lock.json, modificando o script de build para evitar execução no Hostinger
  log("Copiando e otimizando package.json para o deploy no Hostinger...");
  const pkgPath = path.join(ROOT_DIR, "package.json");
  const pkgContent = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  if (pkgContent.scripts) {
    pkgContent.scripts.build = "echo 'Build already completed locally. Skipping.'";
    pkgContent.scripts["build:deploy"] = "echo 'Not applicable on server'";
    pkgContent.scripts.start = "node server.js";
  }
  fs.writeFileSync(
    path.join(DEPLOY_DIR, "package.json"),
    JSON.stringify(pkgContent, null, 2),
    "utf8"
  );
  if (fs.existsSync(path.join(ROOT_DIR, "package-lock.json"))) {
    fs.copyFileSync(path.join(ROOT_DIR, "package-lock.json"), path.join(DEPLOY_DIR, "package-lock.json"));
  }

  // Copiar .env.production para deploy/.env se existir
  const envProductionPath = path.join(ROOT_DIR, ".env.production");
  if (fs.existsSync(envProductionPath)) {
    log("Copiando .env.production para deploy/.env...");
    fs.copyFileSync(envProductionPath, path.join(DEPLOY_DIR, ".env"));
  }

  // 4. Criar o arquivo server.js personalizado na raiz do deploy
  log("Criando server.js personalizado para o Phusion Passenger da Hostinger com suporte a logs...");
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
  fs.writeFileSync(path.join(DEPLOY_DIR, "server.js"), serverJsContent, "utf8");

  // Criar app.js e index.js como fallbacks para compatibilidade com o Hostinger
  log("Criando arquivos de inicialização alternativos (app.js e index.js)...");
  const fallbackJsContent = `// Arquivo de inicializacao alternativo para garantir compatibilidade com o Hostinger Passenger
require('./server.js');
`;
  fs.writeFileSync(path.join(DEPLOY_DIR, "app.js"), fallbackJsContent, "utf8");
  fs.writeFileSync(path.join(DEPLOY_DIR, "index.js"), fallbackJsContent, "utf8");

  // Criar gatilho de reinício tmp/restart.txt para o Passenger do Hostinger
  log("Criando gatilho de reinício tmp/restart.txt...");
  const tmpDir = path.join(DEPLOY_DIR, "tmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(path.join(tmpDir, "restart.txt"), Date.now().toString(), "utf8");

  // 5. Zipar a pasta de deploy
  log("Compactando pasta 'deploy' em 'egregora-deploy.zip'...");
  const psCommand = `powershell -Command "Compress-Archive -Path '${DEPLOY_DIR}\\*' -DestinationPath '${ZIP_FILE}' -Force"`;
  execSync(psCommand, { stdio: "inherit" });

  // 6. Limpar pasta temporária deploy
  log("Limpando pasta temporária 'deploy'...");
  deleteFolderRecursive(DEPLOY_DIR);

  log("Sucesso! O arquivo 'egregora-deploy.zip' foi gerado e está pronto para upload no Hostinger Web App Node.js.");
} catch (error) {
  console.error("\n[Erro no Deploy Script]:", error.message);
  process.exit(1);
}
