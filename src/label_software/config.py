import os
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = f"sqlite:///{Path('instance/fall_detection.db').resolve()}"
    upload_folder: str = os.path.join(os.getcwd(), "uploads")
    frontend_dist: str = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
    max_upload_size: int = 10 * 1024 * 1024 * 1024  # 10GB

    model_config = {"env_prefix": "LABEL_"}

    @property
    def thumbnail_cache(self) -> str:
        return os.path.join(self.upload_folder, "thumbnails")

    @property
    def preview_dir(self) -> str:
        return os.path.join(self.upload_folder, "preview")


settings = Settings()
