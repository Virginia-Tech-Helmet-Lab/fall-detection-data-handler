FallDetectionAnnotator/
├── backend/
│   ├── app/
│   │   ├── __init__.py         # Initializes the backend app (Flask/Django)
│   │   ├── models.py           # Data models for video metadata, annotations, etc.
│   │   ├── routes.py           # RESTful API endpoints (/upload, /normalize, /annotations, /review)
│   │   ├── services/           # Business logic and processing modules
│   │   │   ├── normalization.py  # Video normalization routines (e.g., using FFmpeg)
│   │   │   └── annotation.py     # CRUD and processing for temporal and bbox annotations
│   │   └── utils/              # Helper modules (video processing, logging, etc.)
│   │       └── video_processing.py
│   ├── tests/                  # Unit and integration tests for backend components
│   ├── requirements.txt        # Python dependencies
│   └── run.py                  # Application entry point
├── frontend/
│   ├── public/                 # Static assets (index.html, icons, etc.)
│   ├── src/
│   │   ├── components/         # React/Vue components for each UI element
│   │   │   ├── DataImport/     # File upload and metadata extraction component
│   │   │   │   ├── DataImport.js
│   │   │   │   └── DataImport.css
│   │   │   ├── Normalization/  # Panel with normalization sliders/controls and preview
│   │   │   │   ├── NormalizationPanel.js
│   │   │   │   └── NormalizationPanel.css
│   │   │   ├── LabelingInterface/  # Main labeling interface with three panels
│   │   │   │   ├── VideoPlayer.js       # Video playback, scrubbing, frame controls
│   │   │   │   ├── AnnotationPanel.js   # Temporal annotations and save controls
│   │   │   │   ├── BoundingBoxTool.js   # Drawing and adjusting bounding boxes
│   │   │   │   └── LabelingInterface.css
│   │   │   ├── ReviewDashboard/       # Final review interface for labeled videos
│   │   │   │   ├── ReviewDashboard.js
│   │   │   │   └── ReviewDashboard.css
│   │   ├── App.js               # Main application component and router setup
│   │   ├── index.js             # Application entry point for React/Vue
│   │   └── routes.js            # Define client-side routes for each step
│   ├── package.json             # Frontend dependencies and scripts
│   └── package-lock.json        # Locked versions of dependencies
├── docs/
│   ├── Falls_Labeling_Software_Design_Spec.docx  # Detailed technical spec document
│   └── architecture.md        # Additional design docs, API contracts, etc.
├── .gitignore                 # Exclude build artifacts, logs, etc.
└── README.md                  # Project overview, setup instructions, and contribution guidelines
