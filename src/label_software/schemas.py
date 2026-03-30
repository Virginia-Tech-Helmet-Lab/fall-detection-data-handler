from pydantic import BaseModel


class AnnotationCreate(BaseModel):
    video_id: int
    label: str
    frame_index: int | None = None
    start_time: float | None = None
    end_time: float | None = None
    start_frame: int | None = None
    end_frame: int | None = None
    annotator_name: str | None = None


class BboxAnnotationCreate(BaseModel):
    video_id: int
    frame_index: int
    x: float
    y: float
    width: float
    height: float
    part_label: str
    annotator_name: str | None = None


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    deadline: str | None = None
    annotation_schema: dict | None = None
    normalization_settings: dict | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    deadline: str | None = None
    annotation_schema: dict | None = None
    normalization_settings: dict | None = None
    quality_threshold: float | None = None
    status: str | None = None


class AssignVideosRequest(BaseModel):
    video_ids: list[int]


class StatusUpdateRequest(BaseModel):
    status: str


class ExportRequest(BaseModel):
    format: str = "json"
    options: dict = {}


class MLDatasetRequest(BaseModel):
    mlOptions: dict = {}


class CatalogImportRequest(BaseModel):
    dataset_id: int
    project_id: int
    video_paths: list[str] = []
    import_all: bool = False
    extract_metadata: bool = False


class CatalogPublishRequest(BaseModel):
    version: str | None = None
