import fs from "fs";
import path from "path";
import PizZip from "pizzip";

// We will look for the template in the root of the project
const TEMPLATE_RELATIVE_PATH = "Contrato/CONTRATO_COSMO_ALMA_TV_V2.docx";

interface ContractData {
  nomeCompleto: string;
  nomeComercial: string;
  razaoSocial?: string;
  cnpjCpf: string;
  email: string;
  chavePix?: string;
  youtubeId?: string;
  genero?: string;
  estadoCivil?: string;
  cep?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  pais?: string;
}

export function generateContractDocxBuffer(data: ContractData): Buffer {
  const templatePath = path.join(process.cwd(), TEMPLATE_RELATIVE_PATH);
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template contract not found at ${templatePath}`);
  }

  const content = fs.readFileSync(templatePath);
  const zip = new PizZip(content);

  // Determine gender/nationality details
  const generoVal = (data.genero || "").toUpperCase();
  let nacionalidade = "brasileiro(a)";
  if (generoVal === "M") {
    nacionalidade = "brasileiro";
  } else if (generoVal === "F") {
    nacionalidade = "brasileira";
  }

  const addressStr = `${data.endereco || ""}, ${data.cidade || ""} - ${data.uf || ""}, CEP ${data.cep || ""}, ${data.pais || "Brasil"}`;

  const replacements: Record<string, string> = {
    "PARADOXO CASA ATELIÊ": data.nomeComercial.toUpperCase(),
    "49.759.501/0001-45": data.cnpjCpf,
    "MANY XAVIER DE BRITO E SOUZA BERNABÊ": data.nomeCompleto.toUpperCase(),
    "MANY XAVIER DE BRITO E SOUZA BERNABÉ": data.nomeCompleto.toUpperCase(),
    "Many Xavier de B. e S. Bernabé": data.nomeCompleto,
    "789.620.807-53": data.cnpjCpf,
    "brasileira": nacionalidade,
    "casada": (data.estadoCivil || "solteiro(a)").toLowerCase(),
    "Avenida Edson Passos, nº 87, sobrado, Usina, Rio de Janeiro, RJ": addressStr,
  };

  // Files in DOCX zip where text can reside
  const filesToProcess = [
    "word/document.xml",
    "word/header1.xml",
    "word/footer1.xml",
    "word/header2.xml",
    "word/footer2.xml"
  ];

  for (const filename of filesToProcess) {
    const file = zip.file(filename);
    if (file) {
      let text = file.asText();
      
      // Perform replacements
      for (const [key, value] of Object.entries(replacements)) {
        // Try to replace exact match
        text = text.replaceAll(key, value);
      }
      
      zip.file(filename, text);
    }
  }

  return zip.generate({ type: "nodebuffer" });
}
