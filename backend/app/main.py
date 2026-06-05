import os
from fastapi import FastAPI, Depends, HTTPException, status, Body
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any
from .database import engine, Base, get_db
from . import models, schemas
from .services.contract import generate_contract_docx
from .services.asaas import create_customer, create_subscription
from .services.cron import run_weekly_youtube_audit
from .services.split import run_monthly_financial_split
from .services.zapsign import create_zapsign_document

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Portal Egrégora API",
    description="CMS para Gestão do Condomínio Audiovisual Místico Cosmo Alma TV",
    version="1.0.0"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_status = "error"
    try:
        # Simple query to check DB availability
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"disconnected: {str(e)}"

    return {
        "status": "healthy",
        "service": "Portal Egrégora API",
        "db_connection": db_status
    }

@app.post("/api/condominos", response_model=schemas.CondominoResponse, status_code=status.HTTP_201_CREATED)
def create_condomino(condomino: schemas.CondominoCreate, db: Session = Depends(get_db)):
    # Check if CNPJ/CPF already exists
    existing = db.query(models.Condomino).filter(models.Condomino.cnpj_cpf == condomino.cnpj_cpf).first()
    if existing:
        raise HTTPException(status_code=400, detail="CNPJ/CPF já cadastrado.")
    
    # Check if Email already exists
    existing_email = db.query(models.Condomino).filter(models.Condomino.email == condomino.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado.")

    # Generate contract DOCX
    contrato_path = None
    try:
        contrato_path = generate_contract_docx(
            nome_completo=condomino.nome_completo,
            nome_comercial=condomino.nome_comercial,
            razao_social=condomino.razao_social or condomino.nome_completo,
            cnpj_cpf=condomino.cnpj_cpf,
            email=condomino.email,
            chave_pix=condomino.chave_pix or "",
            youtube_id=condomino.youtube_id or "",
            genero=condomino.genero,
            estado_civil=condomino.estado_civil,
            cep=condomino.cep,
            endereco=condomino.endereco,
            cidade=condomino.cidade,
            uf=condomino.uf,
            pais=condomino.pais
        )
    except Exception as e:
        import logging
        logging.getLogger("uvicorn").error(f"Error generating contract DOCX: {str(e)}")

    # Send to ZapSign
    zapsign_doc_id = None
    zapsign_sign_url = None
    if contrato_path:
        try:
            zap_res = create_zapsign_document(
                nome_completo=condomino.nome_completo,
                email=condomino.email,
                nome_comercial=condomino.nome_comercial,
                contrato_path=contrato_path
            )
            zapsign_doc_id = zap_res.get("doc_id")
            zapsign_sign_url = zap_res.get("sign_url")
        except Exception as e:
            import logging
            logging.getLogger("uvicorn").error(f"Error creating ZapSign document: {str(e)}")

    db_condomino = models.Condomino(
        nome_completo=condomino.nome_completo,
        nome_comercial=condomino.nome_comercial,
        razao_social=condomino.razao_social,
        cnpj_cpf=condomino.cnpj_cpf,
        email=condomino.email,
        youtube_id=condomino.youtube_id,
        chave_pix=condomino.chave_pix,
        status=models.OperacionalStatus.AGUARDANDO_ASSINATURA,
        contrato_path=contrato_path,
        zapsign_doc_id=zapsign_doc_id,
        zapsign_sign_url=zapsign_sign_url,
        genero=condomino.genero,
        estado_civil=condomino.estado_civil,
        cep=condomino.cep,
        endereco=condomino.endereco,
        cidade=condomino.cidade,
        uf=condomino.uf,
        pais=condomino.pais
    )
    db.add(db_condomino)
    db.commit()
    db.refresh(db_condomino)
    return db_condomino

@app.get("/api/condominos", response_model=List[schemas.CondominoResponse])
def list_condominos(db: Session = Depends(get_db)):
    return db.query(models.Condomino).all()

@app.get("/api/condominos/{condomino_id}", response_model=schemas.CondominoResponse)
def get_condomino(condomino_id: str, db: Session = Depends(get_db)):
    db_condomino = db.query(models.Condomino).filter(models.Condomino.id == condomino_id).first()
    if not db_condomino:
        raise HTTPException(status_code=404, detail="Condômino não encontrado.")
    return db_condomino

@app.post("/api/condominos/{condomino_id}/assinar", response_model=schemas.CondominoResponse)
def sign_contract(condomino_id: str, db: Session = Depends(get_db)):
    db_condomino = db.query(models.Condomino).filter(models.Condomino.id == condomino_id).first()
    if not db_condomino:
        raise HTTPException(status_code=404, detail="Condômino não encontrado.")
    
    if db_condomino.status != models.OperacionalStatus.AGUARDANDO_ASSINATURA:
        raise HTTPException(status_code=400, detail=f"Contrato não pode ser assinado no status atual: {db_condomino.status}")
    
    try:
        # Create customer in Asaas
        customer_id = create_customer(
            nome=db_condomino.nome_completo,
            email=db_condomino.email,
            cnpj_cpf=db_condomino.cnpj_cpf
        )
        # Create subscription of R$ 100.00
        create_subscription(customer_id=customer_id, value=100.0)
        
        db_condomino.asaas_id = customer_id
        db_condomino.status = models.OperacionalStatus.ATIVO_PENDENTE_PAGAMENTO
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na integração com o Asaas: {str(e)}")
    
    db.commit()
    db.refresh(db_condomino)
    return db_condomino

@app.post("/api/webhooks/asaas")
def asaas_webhook(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    event = payload.get("event")
    payment = payload.get("payment", {})
    customer_id = payment.get("customer")
    
    if not customer_id:
        raise HTTPException(status_code=400, detail="Identificador do cliente não encontrado no pagamento.")
        
    condomino = db.query(models.Condomino).filter(models.Condomino.asaas_id == customer_id).first()
    if not condomino:
        raise HTTPException(status_code=404, detail="Condômino não encontrado para o cliente Asaas especificado.")

    if event == "PAYMENT_RECEIVED":
        condomino.status = models.OperacionalStatus.ATIVO_ADIMPLENTE
        db.commit()
        return {"status": "success", "message": f"Condômino {condomino.nome_comercial} ativado como adimplente."}
        
    elif event == "PAYMENT_OVERDUE":
        # Cláusula 11ª: Suspensão automática por inadimplência
        condomino.status = models.OperacionalStatus.SUSPENSO_INADIMPLENCIA
        db.commit()
        return {"status": "success", "message": f"Condômino {condomino.nome_comercial} suspenso por inadimplência."}
        
    return {"status": "ignored", "message": f"Evento {event} não requer ação."}


@app.get("/api/condominos/{condomino_id}/contrato")
def download_contract(condomino_id: str, db: Session = Depends(get_db)):
    db_condomino = db.query(models.Condomino).filter(models.Condomino.id == condomino_id).first()
    if not db_condomino or not db_condomino.contrato_path:
        raise HTTPException(status_code=404, detail="Contrato não encontrado ou não gerado.")
    
    if not os.path.exists(db_condomino.contrato_path):
        raise HTTPException(status_code=404, detail="Arquivo do contrato físico não encontrado no servidor.")
        
    return FileResponse(
        path=db_condomino.contrato_path,
        filename=os.path.basename(db_condomino.contrato_path),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )


@app.post("/api/admin/cron/youtube")
def trigger_youtube_audit(payload: Dict[str, Any] = Body(default={}), db: Session = Depends(get_db)):
    overrides = payload.get("overrides")
    result = run_weekly_youtube_audit(db, mock_override_uploads=overrides)
    return result


@app.post("/api/admin/fechamento")
def post_fechamento_mensal(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    mes_referencia = payload.get("mes_referencia")
    receita_bruta = payload.get("receita_bruta_adsense")
    if not mes_referencia or receita_bruta is None:
        raise HTTPException(status_code=400, detail="Mês de referência e receita bruta do AdSense são requeridos.")
    
    result = run_monthly_financial_split(db, mes_referencia=mes_referencia, receita_bruta_adsense=float(receita_bruta))
    return result


@app.get("/api/admin/fechamentos", response_model=List[schemas.FechamentoFinanceiroResponse])
def list_fechamentos(db: Session = Depends(get_db)):
    return db.query(models.FechamentoFinanceiro).order_by(models.FechamentoFinanceiro.data_fechamento.desc()).all()


