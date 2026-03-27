"""Import routes: Google Drive, URL, Dropbox."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..schemas import ImportUrlsRequest, ImportDropboxRequest, ImportGoogleDriveRequest

router = APIRouter()


@router.post("/import/google-drive")
def import_from_google_drive_endpoint(body: ImportGoogleDriveRequest, db: Session = Depends(get_db)):
    if not body.fileIds:
        raise HTTPException(400, detail="No file IDs provided")
    return {'status': 'redirect', 'message': 'Please authorize with Google Drive in the browser'}


@router.post("/import/url")
def import_from_url(body: ImportUrlsRequest, db: Session = Depends(get_db)):
    if not body.urls:
        raise HTTPException(400, detail="No URLs provided")
    try:
        from ..services.import_sources.url_import import import_from_urls
        results = import_from_urls(db, body.urls, settings.upload_folder)
        db.commit()
        return {'imported': results}
    except Exception as e:
        db.rollback()
        raise HTTPException(500, detail=str(e))


@router.post("/import/dropbox")
def import_from_dropbox_endpoint(body: ImportDropboxRequest, db: Session = Depends(get_db)):
    if not body.files:
        raise HTTPException(400, detail="No files provided")
    try:
        from ..services.import_sources.dropbox import import_from_dropbox
        results = import_from_dropbox(db, body.files, settings.upload_folder)
        db.commit()
        return {'imported': results}
    except Exception as e:
        db.rollback()
        raise HTTPException(500, detail=str(e))
