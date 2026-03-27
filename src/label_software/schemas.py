from pydantic import BaseModel


class NormalizeRequest(BaseModel):
    video_id: int
    settings: dict


class NormalizeAllRequest(BaseModel):
    settings: dict


class AnnotationCreate(BaseModel):
    video_id: int
    start_time: float
    end_time: float
    start_frame: int
    end_frame: int
    label: str
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


class ImportUrlsRequest(BaseModel):
    urls: list[str]


class ImportDropboxRequest(BaseModel):
    files: list[dict]


class ImportGoogleDriveRequest(BaseModel):
    fileIds: list[str]
