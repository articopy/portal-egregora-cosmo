import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from .database import Base

class OperacionalStatus(str, enum.Enum):
    AGUARDANDO_ASSINATURA = "AGUARDANDO_ASSINATURA"
    ATIVO_PENDENTE_PAGAMENTO = "ATIVO_PENDENTE_PAGAMENTO"
    ATIVO_ADIMPLENTE = "ATIVO_ADIMPLENTE"
    SUSPENSO_INADIMPLENCIA = "SUSPENSO_INADIMPLENCIA"
    BLOQUEADO_ASSIDUIDADE = "BLOQUEADO_ASSIDUIDADE"

class Condomino(Base):
    __tablename__ = "condominos"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nome_completo = Column(String(255), nullable=False)
    nome_comercial = Column(String(255), nullable=False)
    razao_social = Column(String(255), nullable=True)
    cnpj_cpf = Column(String(20), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    telefone = Column(String(50), nullable=True)
    status = Column(Enum(OperacionalStatus), default=OperacionalStatus.AGUARDANDO_ASSINATURA, nullable=False)
    asaas_id = Column(String(255), nullable=True)
    zapsign_doc_id = Column(String(255), nullable=True)
    zapsign_sign_url = Column(String(512), nullable=True)
    youtube_id = Column(String(255), nullable=True)
    chave_pix = Column(String(255), nullable=True)
    contrato_path = Column(String(512), nullable=True)
    genero = Column(String(50), nullable=True)
    estado_civil = Column(String(50), nullable=True)
    cep = Column(String(20), nullable=True)
    endereco = Column(String(255), nullable=True)
    cidade = Column(String(100), nullable=True)
    uf = Column(String(10), nullable=True)
    pais = Column(String(100), nullable=True)
    data_onboarding = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationship to video deliveries
    entregas = relationship("EntregaVideo", back_populates="condomino", cascade="all, delete-orphan")

class EntregaVideo(Base):
    __tablename__ = "entregas_video"

    id = Column(Integer, primary_key=True, autoincrement=True)
    condomino_id = Column(String(36), ForeignKey("condominos.id", ondelete="CASCADE"), nullable=False)
    semana_codigo = Column(String(20), nullable=False)  # e.g., "2026-W23"
    qtd_entregue = Column(Integer, default=0, nullable=False)
    status_valido = Column(Boolean, default=True, nullable=False)

    # Relationship back to Condomino
    condomino = relationship("Condomino", back_populates="entregas")

class FechamentoFinanceiro(Base):
    __tablename__ = "fechamentos_financeiros"

    id = Column(Integer, primary_key=True, autoincrement=True)
    mes_referencia = Column(String(7), nullable=False)  # e.g., "2026-06"
    receita_bruta_adsense = Column(Float, nullable=False)
    retencao_adm_30 = Column(Float, nullable=False)
    fundo_partilha_70 = Column(Float, nullable=False)
    valor_por_condomino = Column(Float, nullable=False)
    qtd_condominos_ativos = Column(Integer, nullable=False)
    data_fechamento = Column(DateTime, default=datetime.utcnow, nullable=False)
