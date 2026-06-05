import os
import docx

TEMPLATE_PATH = r"c:\Projetos\Cosmo Alma TV\portal-egregora\Contrato\CONTRATO_COSMO_ALMA_TV_V2.docx"
OUTPUT_DIR = r"c:\Projetos\Cosmo Alma TV\portal-egregora\backend\generated_contracts"

def generate_contract_docx(
    nome_completo: str, 
    nome_comercial: str, 
    razao_social: str, 
    cnpj_cpf: str, 
    email: str, 
    chave_pix: str, 
    youtube_id: str,
    genero: str = None,
    estado_civil: str = None,
    cep: str = None,
    endereco: str = None,
    cidade: str = None,
    uf: str = None,
    pais: str = None
) -> str:
    """
    Generates a personalized contract based on the template by replacing the default values.
    Returns the path to the generated contract file.
    """
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    doc = docx.Document(TEMPLATE_PATH)

    # Gender adjustments
    genero_val = (genero or "").upper()
    nacionalidade = "brasileiro(a)"
    if genero_val == "M":
        nacionalidade = "brasileiro"
    elif genero_val == "F":
        nacionalidade = "brasileira"

    # Address block
    address_str = f"{endereco or ''}, {cidade or ''} - {uf or ''}, CEP {cep or ''}, {pais or 'Brasil'}"

    # Replacements dictionary
    replacements = {
        "PARADOXO CASA ATELIÊ": nome_comercial.upper(),
        "49.759.501/0001-45": cnpj_cpf,
        "MANY XAVIER DE BRITO E SOUZA BERNABÊ": nome_completo.upper(),
        "MANY XAVIER DE BRITO E SOUZA BERNABÉ": nome_completo.upper(),
        "Many Xavier de B. e S. Bernabé": nome_completo,
        "789.620.807-53": cnpj_cpf,
        "brasileira": nacionalidade,
        "casada": (estado_civil or "solteiro(a)").lower(),
        "Avenida Edson Passos, nº 87, sobrado, Usina, Rio de Janeiro, RJ": address_str,
    }

    # Helper function to replace text in runs while preserving style
    def replace_text_in_paragraphs(paragraphs):
        for paragraph in paragraphs:
            for key, value in replacements.items():
                if key in paragraph.text:
                    # Replace in the whole paragraph text and reset runs to avoid breaking split text
                    text = paragraph.text.replace(key, value)
                    paragraph.text = text

    # Replace in main body paragraphs
    replace_text_in_paragraphs(doc.paragraphs)

    # Replace in tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                replace_text_in_paragraphs(cell.paragraphs)

    # Save to generated contracts
    clean_cnpj_cpf = cnpj_cpf.replace('/', '').replace('.', '').replace('-', '')
    filename = f"contrato_{nome_comercial.lower().replace(' ', '_')}_{clean_cnpj_cpf}.docx"
    output_path = os.path.join(OUTPUT_DIR, filename)
    doc.save(output_path)
    return output_path
