from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .. import models
from .youtube import fetch_weekly_uploads_count

def run_weekly_youtube_audit(db: Session, mock_override_uploads: dict = None) -> dict:
    """
    Weekly cron job running every Sunday at 23:59 (Cláusula 10ª).
    Audits uploads for all active condôminos.
    Returns audit details.
    """
    # Determine the week code, e.g., "2026-W23"
    today = datetime.utcnow()
    year, week_num, _ = today.isocalendar()
    semana_codigo = f"{year}-W{week_num:02d}"

    # YouTube API uses RFC 3339 datetime format for publishedAfter (e.g., 7 days ago)
    seven_days_ago = today - timedelta(days=7)
    published_after_str = seven_days_ago.isoformat() + "Z"

    # Get all active condôminos
    condominos = db.query(models.Condomino).all()
    results = []

    for c in condominos:
        # We only audit uploads for active adimplente condôminos
        if c.status != models.OperacionalStatus.ATIVO_ADIMPLENTE and c.status != models.OperacionalStatus.BLOQUEADO_ASSIDUIDADE:
            continue

        # Get uploads count
        # Support front-end mock overrides for testing
        if mock_override_uploads and c.id in mock_override_uploads:
            uploads_count = mock_override_uploads[c.id]
        else:
            youtube_id = c.youtube_id or f"mock_chan_{c.nome_comercial.lower()}"
            uploads_count = fetch_weekly_uploads_count(youtube_id, published_after_str)

        # Check validity (minimum 1 video)
        is_valid = uploads_count >= 1

        # Check if already has an entry for this week
        existing_entry = db.query(models.EntregaVideo).filter(
            models.EntregaVideo.condomino_id == c.id,
            models.EntregaVideo.semana_codigo == semana_codigo
        ).first()

        if existing_entry:
            existing_entry.qtd_entregue = uploads_count
            existing_entry.status_valido = is_valid
        else:
            new_entry = models.EntregaVideo(
                condomino_id=c.id,
                semana_codigo=semana_codigo,
                qtd_entregue=uploads_count,
                status_valido=is_valid
            )
            db.add(new_entry)

        # Handle State transitions (Cláusula 10ª / 11ª)
        old_status = c.status
        if not is_valid:
            c.status = models.OperacionalStatus.BLOQUEADO_ASSIDUIDADE
        else:
            # Restore to ATIVO_ADIMPLENTE if they were blocked and now uploaded
            if c.status == models.OperacionalStatus.BLOQUEADO_ASSIDUIDADE:
                c.status = models.OperacionalStatus.ATIVO_ADIMPLENTE

        results.append({
            "condomino": c.nome_comercial,
            "semana": semana_codigo,
            "qtd_entregue": uploads_count,
            "old_status": old_status,
            "new_status": c.status,
            "status_valido": is_valid
        })

    db.commit()
    return {
        "status": "success",
        "semana": semana_codigo,
        "audited_count": len(results),
        "details": results
    }
