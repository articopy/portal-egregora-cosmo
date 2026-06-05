from sqlalchemy.orm import Session
from .. import models

def run_monthly_financial_split(db: Session, mes_referencia: str, receita_bruta_adsense: float) -> dict:
    """
    Computes the monthly revenue distribution (Regra 70/30).
    Saves a record to FechamentoFinanceiro and returns the breakdown.
    """
    # 30% retention for management
    retencao_adm_30 = receita_bruta_adsense * 0.30
    # 70% share for eligible creators
    fundo_partilha_70 = receita_bruta_adsense * 0.70

    # Get active adimplente condôminos who are eligible (status must be ATIVO_ADIMPLENTE)
    eligible_condominos = db.query(models.Condomino).filter(
        models.Condomino.status == models.OperacionalStatus.ATIVO_ADIMPLENTE
    ).all()

    count_eligible = len(eligible_condominos)
    valor_por_condomino = fundo_partilha_70 / count_eligible if count_eligible > 0 else 0.0

    # Save closing to DB
    fechamento = models.FechamentoFinanceiro(
        mes_referencia=mes_referencia,
        receita_bruta_adsense=receita_bruta_adsense,
        retencao_adm_30=retencao_adm_30,
        fundo_partilha_70=fundo_partilha_70,
        valor_por_condomino=valor_por_condomino,
        qtd_condominos_ativos=count_eligible
    )
    db.add(fechamento)
    db.commit()
    db.refresh(fechamento)

    return {
        "id": fechamento.id,
        "mes_referencia": fechamento.mes_referencia,
        "receita_bruta_adsense": fechamento.receita_bruta_adsense,
        "retencao_adm_30": fechamento.retencao_adm_30,
        "fundo_partilha_70": fechamento.fundo_partilha_70,
        "valor_por_condomino": fechamento.valor_por_condomino,
        "qtd_condominos_ativos": fechamento.qtd_condominos_ativos,
        "data_fechamento": fechamento.data_fechamento.isoformat(),
        "eligible_list": [c.nome_comercial for c in eligible_condominos]
    }
