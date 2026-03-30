export const LABEL_TEMPLATES = [
  {
    id: 'fall_detection',
    name: 'Fall Detection',
    description: 'Standard fall detection with 7 body keypoints',
    schema: {
      event_types: ['Fall'],
      body_parts: ['head', 'shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'],
    },
  },
  {
    id: 'coco_keypoints',
    name: 'COCO Keypoints',
    description: 'COCO supercategories + 17-point human pose skeleton',
    schema: {
      event_types: [
        'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
        'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
        'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
        'left_knee', 'right_knee', 'left_ankle', 'right_ankle',
      ],
      body_parts: [
        'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
        'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
        'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
        'left_knee', 'right_knee', 'left_ankle', 'right_ankle',
      ],
    },
  },
  {
    id: 'activity_recognition',
    name: 'Activity Recognition',
    description: 'Human activity labels with 6 body regions',
    schema: {
      event_types: ['Walking', 'Running', 'Sitting', 'Standing', 'Lying Down', 'Fall', 'Near Fall'],
      body_parts: ['head', 'torso', 'left_arm', 'right_arm', 'left_leg', 'right_leg'],
    },
  },
  {
    id: 'custom',
    name: 'Custom (Blank)',
    description: 'Start with an empty label set and add your own',
    schema: {
      event_types: [],
      body_parts: [],
    },
  },
];
