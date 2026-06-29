from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from .models import OperacionalStatus

class CondominoBase(BaseModel):
    nome_completo: str
    nome_comercial: str
    razao_social: Optional[str] = None
    cnpj_cpf: str
    email: EmailStr
    telefone: Optional[str] = None
    youtube_id: Optional[str] = None
    chave_pix: Optional[str] = None
    genero: Optional[str] = None
    estado_civil: Optional[str] = None
    cep: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    pais: Optional[str] = None

class CondominoCreate(CondominoBase):
    pass

class CondominoResponse(CondominoBase):
    id: str
    status: OperacionalStatus
    asaas_id: Optional[str] = None
    zapsign_doc_id: Optional[str] = None
    zapsign_sign_url: Optional[str] = None
    contrato_path: Optional[str] = None
    data_onboarding: datetime

    class Config:
        from_attributes = True

class EntregaVideoBase(BaseModel):
    condomino_id: str
    semana_codigo: str
    qtd_entregue: int
    status_valido: bool = True

class EntregaVideoResponse(EntregaVideoBase):
    id: int

    class Config:
        from_attributes = True

class FechamentoFinanceiroResponse(BaseModel):
    id: int
    mes_referencia: str
    receita_bruta_adsense: float
    retencao_adm_30: float
    fundo_partilha_70: float
    valor_por_condomino: float
    qtd_condominos_ativos: int
    data_fechamento: datetime

    class Config:
        from_attributes = True
