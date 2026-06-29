import os
import random
import string
import logging

logger = logging.getLogger("asaas_service")

ASAAS_API_KEY = os.getenv("ASAAS_API_KEY", "")
ASAAS_API_URL = os.getenv("ASAAS_API_URL", "https://sandbox.asaas.com/v3") # default to sandbox

def generate_mock_id(prefix: str) -> str:
    random_str = "".join(random.choices(string.ascii_lowercase + string.digits, k=10))
    return f"{prefix}_{random_str}"

def create_customer(nome: str, email: str, cnpj_cpf: str, phone: str = None) -> str:
    """
    Creates a customer in Asaas.
    Returns the customer ID.
    """
    if not ASAAS_API_KEY:
        mock_id = generate_mock_id("cus")
        logger.warning(f"[Asaas Mock] Creating customer {nome}. ID: {mock_id}")
        return mock_id

    # Real implementation using requests
    import requests
    headers = {
        "access_token": ASAAS_API_KEY,
        "Content-Type": "application/json"
    }
    clean_phone = "".join(filter(str.isdigit, phone)) if phone else None
    payload = {
        "name": nome,
        "email": email,
        "cpfCnpj": cnpj_cpf.replace(".", "").replace("/", "").replace("-", ""),
        "phone": clean_phone,
        "mobilePhone": clean_phone
    }
    try:
        response = requests.post(f"{ASAAS_API_URL}/customers", json=payload, headers=headers)
        if response.status_code == 200:
            data = response.json()
            return data.get("id")
        else:
            logger.error(f"Error creating customer: {response.text}")
            raise Exception(f"Asaas Error: {response.text}")
    except Exception as e:
        logger.error(f"Exception creating customer: {str(e)}")
        raise e

def create_subscription(customer_id: str, value: float = 100.0) -> str:
    """
    Creates a subscription for the customer.
    Returns the subscription ID.
    """
    if not ASAAS_API_KEY:
        mock_id = generate_mock_id("sub")
        logger.warning(f"[Asaas Mock] Creating subscription of R$ {value} for {customer_id}. ID: {mock_id}")
        return mock_id

    import requests
    headers = {
        "access_token": ASAAS_API_KEY,
        "Content-Type": "application/json"
    }
    # Vencimento todo dia 10
    from datetime import datetime, timedelta
    today = datetime.now()
    if today.day > 10:
        # Next month day 10
        if today.month == 12:
            next_due = datetime(today.year + 1, 1, 10)
        else:
            next_due = datetime(today.year, today.month + 1, 10)
    else:
        next_due = datetime(today.year, today.month, 10)

    payload = {
        "customer": customer_id,
        "billingType": "UNDEFINED", # Boleto + Pix
        "value": value,
        "nextDueDate": next_due.strftime("%Y-%m-%d"),
        "cycle": "MONTHLY"
    }
    try:
        response = requests.post(f"{ASAAS_API_URL}/subscriptions", json=payload, headers=headers)
        if response.status_code == 200:
            data = response.json()
            return data.get("id")
        else:
            logger.error(f"Error creating subscription: {response.text}")
            raise Exception(f"Asaas Error: {response.text}")
    except Exception as e:
        logger.error(f"Exception creating subscription: {str(e)}")
        raise e
