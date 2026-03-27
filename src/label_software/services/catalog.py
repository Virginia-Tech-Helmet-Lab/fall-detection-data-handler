"""Read-only access to the Data-Catalog database."""

import os
import sqlite3
from ..config import settings

VIDEO_EXTENSIONS = {'.mp4', '.avi', '.mov', '.mkv', '.wmv'}
NON_ANNOTATABLE_FORMATS = {'zip', 'csv', 'dcm', 'npy', 'fls', 'fpc', 'fls/fpc'}


def _get_catalog_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.catalog_db_path)
    conn.row_factory = sqlite3.Row
    return conn


def list_datasets(modality: str | None = None, domain: str | None = None) -> list[dict]:
    conn = _get_catalog_conn()
    query = """
        SELECT d.id, d.name, d.description, d.modality, d.domain,
               ds.num_samples, ds.total_size_bytes, ds.format, ds.resolution, ds.fps,
               sl.path as primary_path
        FROM datasets d
        LEFT JOIN dataset_stats ds ON ds.dataset_id = d.id
        LEFT JOIN storage_locations sl ON sl.dataset_id = d.id AND sl.is_primary = 1
    """
    conditions, params = [], []
    if modality:
        conditions.append("d.modality = ?")
        params.append(modality)
    if domain:
        conditions.append("d.domain = ?")
        params.append(domain)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY d.name"

    rows = conn.execute(query, params).fetchall()
    conn.close()

    results = []
    for r in rows:
        fmt = (r["format"] or "").lower()
        is_annotatable = r["modality"] == "video" and fmt not in NON_ANNOTATABLE_FORMATS
        results.append({
            "id": r["id"],
            "name": r["name"],
            "description": r["description"],
            "modality": r["modality"],
            "domain": r["domain"],
            "num_samples": r["num_samples"],
            "total_size_gb": round(r["total_size_bytes"] / (1024**3), 1) if r["total_size_bytes"] else None,
            "format": r["format"],
            "resolution": r["resolution"],
            "fps": r["fps"],
            "primary_path": r["primary_path"],
            "is_annotatable": is_annotatable,
        })
    return results


def get_dataset(dataset_id: int) -> dict | None:
    conn = _get_catalog_conn()
    row = conn.execute(
        "SELECT id, name, description, modality, domain FROM datasets WHERE id = ?",
        (dataset_id,),
    ).fetchone()
    if not row:
        conn.close()
        return None

    stats = conn.execute(
        "SELECT * FROM dataset_stats WHERE dataset_id = ?", (dataset_id,)
    ).fetchone()
    locations = conn.execute(
        "SELECT * FROM storage_locations WHERE dataset_id = ? ORDER BY is_primary DESC",
        (dataset_id,),
    ).fetchall()
    annotations = conn.execute(
        "SELECT * FROM annotations WHERE dataset_id = ?", (dataset_id,)
    ).fetchall()
    tags = conn.execute(
        """SELECT t.name FROM tags t
           JOIN dataset_tags dt ON dt.tag_id = t.id
           WHERE dt.dataset_id = ?""",
        (dataset_id,),
    ).fetchall()
    conn.close()

    return {
        "id": row["id"],
        "name": row["name"],
        "description": row["description"],
        "modality": row["modality"],
        "domain": row["domain"],
        "stats": dict(stats) if stats else None,
        "storage_locations": [dict(s) for s in locations],
        "annotations": [dict(a) for a in annotations],
        "tags": [t["name"] for t in tags],
    }


def list_dataset_videos(dataset_id: int, page: int = 1, per_page: int = 50) -> dict:
    """Scan the primary storage path and return paginated video file list."""
    conn = _get_catalog_conn()
    row = conn.execute(
        "SELECT path FROM storage_locations WHERE dataset_id = ? AND is_primary = 1",
        (dataset_id,),
    ).fetchone()
    conn.close()

    if not row or not os.path.isdir(row["path"]):
        return {"videos": [], "total": 0, "page": page, "per_page": per_page}

    base_path = row["path"]
    all_videos = []
    for root, _, files in os.walk(base_path):
        for f in sorted(files):
            if os.path.splitext(f)[1].lower() in VIDEO_EXTENSIONS:
                full_path = os.path.join(root, f)
                all_videos.append({
                    "filename": f,
                    "path": full_path,
                    "relative_path": os.path.relpath(full_path, base_path),
                    "size_bytes": os.path.getsize(full_path),
                })

    total = len(all_videos)
    start = (page - 1) * per_page
    page_videos = all_videos[start:start + per_page]

    return {
        "videos": page_videos,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
    }


def get_primary_path(dataset_id: int) -> str | None:
    conn = _get_catalog_conn()
    row = conn.execute(
        "SELECT path FROM storage_locations WHERE dataset_id = ? AND is_primary = 1",
        (dataset_id,),
    ).fetchone()
    conn.close()
    return row["path"] if row else None
