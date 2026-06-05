import os
import base64
import requests
import logging

ZAPSIGN_API_KEY = os.getenv("ZAPSIGN_API_KEY", "")
ZAPSIGN_API_URL = "https://api.zapsign.com.br/api/v1/docs"

logger = logging.getLogger("uvicorn")

def create_zapsign_document(
    nome_completo: str,
    email: str,
    nome_comercial: str,
    contrato_path: str
) -> dict:
    """
    Uploads the compiled contract to ZapSign and creates a document for signing.
    If ZAPSIGN_API_KEY is empty, it returns simulated sandbox URLs.
    """
    if not ZAPSIGN_API_KEY:
        logger.info("[ZapSign Integration] Running in Simulation Mode (No API key provided).")
        simulated_doc_id = "zap-sim-doc-123456789"
        simulated_sign_url = f"https://sandbox.zapsign.com.br/sign/{simulated_doc_id}"
        return {
            "status": "simulated",
            "doc_id": simulated_doc_id,
            "sign_url": simulated_sign_url
        }

    if not contrato_path or not os.path.exists(contrato_path):
        raise FileNotFoundError(f"Arquivo de contrato não encontrado para envio: {contrato_path}")

    # Read DOCX file and convert to Base64
    with open(contrato_path, "rb") as file:
        encoded_string = base64.b64encode(file.read()).decode("utf-8")

    filename = os.path.basename(contrato_path)

    # Prepare ZapSign Payload
    # API Docs: https://docs.zapsign.com.br/
    payload = {
        "name": f"Contrato Cosmo Alma TV - {nome_comercial}",
        "base64_pdf": f"data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,{encoded_string}",
        "signers": [
            {
                "name": nome_completo,
                "email": email,
                "send_email": True,
                "auth_mode": "signature"
            }
        ]
    }

    headers = {
        "Authorization": f"Bearer {ZAPSIGN_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(ZAPSIGN_API_URL, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()

        # Extract document and signer details
        doc_id = data.get("token")
        signers = data.get("signers", [])
        sign_url = signers[0].get("sign_url") if signers else ""

        logger.info(f"[ZapSign Integration] Document created successfully. ID: {doc_id}")
        return {
            "status": "success",
            "doc_id": doc_id,
            "sign_url": sign_url
        }
    except Exception as e:
        logger.error(f"[ZapSign Integration] Error creating document on ZapSign: {str(e)}")
        raise e
