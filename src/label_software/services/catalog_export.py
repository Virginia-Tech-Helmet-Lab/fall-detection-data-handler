"""Publish Label-Software annotations back to the Data-Catalog."""

import json
import os
import sqlite3
from datetime import datetime

from sqlalchemy.orm import Session

from ..config import settings
from ..models import Project, Video, TemporalAnnotation, BoundingBoxAnnotation


def publish_to_catalog(db: Session, project_id: int, version: str | None = None) -> dict:
    project = db.query(Project).get(project_id)
    if not project:
        raise ValueError("Project not found")
    if not project.catalog_dataset_id:
        raise ValueError("Project is not linked to a catalog dataset")

    # Resolve dataset info from catalog
    catalog_conn = sqlite3.connect(settings.catalog_db_path)
    catalog_conn.row_factory = sqlite3.Row
    dataset = catalog_conn.execute(
        "SELECT name FROM datasets WHERE id = ?", (project.catalog_dataset_id,)
    ).fetchone()
    if not dataset:
        catalog_conn.close()
        raise ValueError(f"Catalog dataset {project.catalog_dataset_id} not found")

    dataset_name = dataset["name"]
    storage_row = catalog_conn.execute(
        "SELECT path FROM storage_locations WHERE dataset_id = ? AND is_primary = 1",
        (project.catalog_dataset_id,),
    ).fetchone()
    dataset_path = storage_row["path"] if storage_row else os.path.join(settings.catalog_data_root, dataset_name)

    # Auto-version
    annotations_dir = os.path.join(dataset_path, "annotations")
    os.makedirs(annotations_dir, exist_ok=True)

    if version is None:
        v = 1
        safe_name = project.name.replace(" ", "_")
        while os.path.exists(os.path.join(annotations_dir, f"{safe_name}_v{v}.json")):
            v += 1
        version = f"v{v}"

    safe_name = project.name.replace(" ", "_")
    output_filename = f"{safe_name}_{version}.json"
    output_path = os.path.join(annotations_dir, output_filename)

    # Build annotation export
    videos = db.query(Video).filter_by(project_id=project_id).all()
    annotator_names = set()
    export_data = []

    for video in videos:
        temporals = db.query(TemporalAnnotation).filter_by(video_id=video.video_id).all()
        bboxes = db.query(BoundingBoxAnnotation).filter_by(video_id=video.video_id).all()

        for a in temporals:
            if a.annotator_name:
                annotator_names.add(a.annotator_name)
        for b in bboxes:
            if b.annotator_name:
                annotator_names.add(b.annotator_name)

        export_data.append({
            "video_id": video.video_id,
            "filename": os.path.basename(video.catalog_path or video.filename),
            "catalog_path": video.catalog_path,
            "resolution": video.resolution,
            "framerate": video.framerate,
            "duration": video.duration,
            "temporal_annotations": [{
                "label": a.label,
                "start_time": a.start_time,
                "end_time": a.end_time,
                "start_frame": a.start_frame,
                "end_frame": a.end_frame,
                "annotator_name": a.annotator_name,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            } for a in temporals],
            "bounding_box_annotations": [{
                "frame_index": b.frame_index,
                "x": b.x, "y": b.y,
                "width": b.width, "height": b.height,
                "part_label": b.part_label,
                "annotator_name": b.annotator_name,
                "created_at": b.created_at.isoformat() if b.created_at else None,
            } for b in bboxes],
        })

    total_temporal = sum(len(v["temporal_annotations"]) for v in export_data)
    total_bbox = sum(len(v["bounding_box_annotations"]) for v in export_data)

    # Write JSON file
    output = {
        "metadata": {
            "dataset": dataset_name,
            "project": project.name,
            "version": version,
            "exported_at": datetime.utcnow().isoformat(),
            "annotators": sorted(annotator_names),
            "video_count": len(export_data),
            "temporal_annotation_count": total_temporal,
            "bbox_annotation_count": total_bbox,
        },
        "videos": export_data,
    }
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    # Register in catalog.db
    annotation_name = f"{safe_name}_{version}"
    ann_types = []
    if total_temporal > 0:
        ann_types.append("temporal")
    if total_bbox > 0:
        ann_types.append("bbox")

    catalog_conn.execute(
        """INSERT OR REPLACE INTO annotations
           (dataset_id, name, annotation_type, format, path, num_annotations, created_by, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            project.catalog_dataset_id,
            annotation_name,
            "+".join(ann_types) or "temporal",
            "json",
            output_path,
            total_temporal + total_bbox,
            "Label-Software",
            f"Created from project '{project.name}'. Annotators: {', '.join(sorted(annotator_names)) or 'unknown'}",
        ),
    )
    catalog_conn.commit()
    catalog_conn.close()

    return {
        "success": True,
        "path": output_path,
        "version": version,
        "annotation_count": total_temporal + total_bbox,
        "temporal_count": total_temporal,
        "bbox_count": total_bbox,
        "video_count": len(export_data),
    }
