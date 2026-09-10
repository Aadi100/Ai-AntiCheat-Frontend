// High-fidelity mock data system for standalone and dev fallback review.

export const mockStats = {
  total: 42,
  known: 34,
  unknown: 8,
  alerts: 12,
  db: true // MongoDB status simulation
};

export const mockAlertBreakdown = {
  unknown_entry: 8,
  face_hidden: 4
};

export const mockPeople = {
  total: 56,
  member: 42,
  staff: 14
};

export const mockAnalytics = {
  total_known: 1284,
  total_unknown: 156,
  daily: [
    { label: "Mon", known: 24, unknown: 3 },
    { label: "Tue", known: 28, unknown: 5 },
    { label: "Wed", known: 34, unknown: 2 },
    { label: "Thu", known: 31, unknown: 4 },
    { label: "Fri", known: 40, unknown: 6 },
    { label: "Sat", known: 15, unknown: 1 },
    { label: "Sun", known: 12, unknown: 2 }
  ],
  hours: [
    { _id: 8, count: 5 },
    { _id: 9, count: 12 },
    { _id: 10, count: 24 },
    { _id: 11, count: 18 },
    { _id: 12, count: 15 },
    { _id: 13, count: 21 },
    { _id: 14, count: 22 },
    { _id: 15, count: 17 },
    { _id: 16, count: 32 },
    { _id: 17, count: 41 },
    { _id: 18, count: 29 },
    { _id: 19, count: 14 },
    { _id: 20, count: 8 }
  ]
};

export const mockViolations = [
  {
    type: "unknown_entry",
    crop_path: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=60",
    image_path: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=60",
    triggered_at: "2026-07-21 14:32:11",
    triggered_at_epoch: 1784635931,
    seen_with: [{ name: "Alex Jones" }],
    detection_id: "det_9a8b7c6d5e",
    location: "Main Entrance",
    action: "checkin"
  },
  {
    type: "face_hidden",
    crop_path: "", // No crop due to hidden face
    image_path: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=60",
    triggered_at: "2026-07-21 13:15:02",
    triggered_at_epoch: 1784631302,
    seen_with: [],
    detection_id: "det_1a2b3c4d5e",
    location: "Cardio Section",
    action: "entry"
  },
  {
    type: "unknown_entry",
    crop_path: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=60",
    image_path: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600&auto=format&fit=crop&q=60",
    triggered_at: "2026-07-21 11:04:45",
    triggered_at_epoch: 1784623485,
    seen_with: [{ name: "Sarah Smith" }, { name: "Coach Mike" }],
    detection_id: "det_3f4g5h6j7k",
    location: "Weight Room Gate",
    action: "checkin"
  },
  {
    type: "face_hidden",
    crop_path: "",
    image_path: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=600&auto=format&fit=crop&q=60",
    triggered_at: "2026-07-21 09:20:18",
    triggered_at_epoch: 1784617218,
    seen_with: [],
    detection_id: "det_7x8y9z0w1v",
    location: "Lobby Exit",
    action: "checkout"
  }
];

export const mockDetections = [
  {
    timestamp: "2026-07-21 15:01:22",
    timestamp_epoch: 1784637682,
    known_count: 2,
    unknown_count: 0,
    trigger: "ping",
    image_path: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=60"
  },
  {
    timestamp: "2026-07-21 14:55:04",
    timestamp_epoch: 1784637304,
    known_count: 1,
    unknown_count: 0,
    trigger: "grab",
    image_path: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=60"
  },
  {
    timestamp: "2026-07-21 14:32:11",
    timestamp_epoch: 1784635931,
    known_count: 1,
    unknown_count: 1,
    trigger: "burst",
    image_path: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=300&auto=format&fit=crop&q=60"
  },
  {
    timestamp: "2026-07-21 13:15:02",
    timestamp_epoch: 1784631302,
    known_count: 0,
    unknown_count: 1,
    trigger: "ping",
    image_path: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=300&auto=format&fit=crop&q=60"
  },
  {
    timestamp: "2026-07-21 12:44:59",
    timestamp_epoch: 1784629499,
    known_count: 3,
    unknown_count: 0,
    trigger: "burst",
    image_path: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&auto=format&fit=crop&q=60"
  }
];

export const mockTopLocations = [
  { location: "Main Entrance", action: "checkin", count: 24 },
  { location: "Cardio Section", action: "entry", count: 18 },
  { location: "Weight Room Gate", action: "checkin", count: 12 },
  { location: "Lobby Exit", action: "checkout", count: 5 }
];

export const mockServerUsage = {
  totals: {
    grand_total: 8245,
    known_total: 6120,
    unknown_total: 2125,
    indexed_total: 1450,
    searched_total: 6795,
    known_indexed: 950,
    known_searched: 5170,
    unknown_indexed: 500,
    unknown_searched: 1625
  },
  daily: [
    { date: "2026-07-15", known_indexed: 10, known_searched: 120, unknown_indexed: 2, unknown_searched: 45, grand_total: 177 },
    { date: "2026-07-16", known_indexed: 15, known_searched: 145, unknown_indexed: 5, unknown_searched: 52, grand_total: 217 },
    { date: "2026-07-17", known_indexed: 22, known_searched: 130, unknown_indexed: 1, unknown_searched: 38, grand_total: 191 },
    { date: "2026-07-18", known_indexed: 5, known_searched: 95, unknown_indexed: 0, unknown_searched: 24, grand_total: 124 },
    { date: "2026-07-19", known_indexed: 2, known_searched: 80, unknown_indexed: 1, unknown_searched: 19, grand_total: 102 },
    { date: "2026-07-20", known_indexed: 34, known_searched: 180, unknown_indexed: 8, unknown_searched: 60, grand_total: 282 },
    { date: "2026-07-21", known_indexed: 18, known_searched: 210, unknown_indexed: 4, unknown_searched: 55, grand_total: 287 }
  ]
};

export const mockBillingSummary = {
  month: "2026-07",
  search_total: 18450,
  free_search_limit: 15000,
  billable_search: 3450,
  rate_search: 0.010,
  training_total: 1240,
  free_training_limit: 1000,
  billable_training: 240,
  rate_training: 0.015,
  amount_due: 38.10
};

export const mockInvoices = [
  {
    month: "2026-07",
    search_total: 18450,
    free_search_limit: 15000,
    billable_search: 3450,
    rate_search: 0.010,
    training_total: 1240,
    free_training_limit: 1000,
    billable_training: 240,
    rate_training: 0.015,
    amount_due: 38.10,
    status: "unpaid"
  },
  {
    month: "2026-06",
    search_total: 14200,
    free_search_limit: 15000,
    billable_search: 0,
    rate_search: 0.010,
    training_total: 980,
    free_training_limit: 1000,
    billable_training: 0,
    rate_training: 0.015,
    amount_due: 0.00,
    status: "paid"
  },
  {
    month: "2026-05",
    search_total: 16100,
    free_search_limit: 15000,
    billable_search: 1100,
    rate_search: 0.010,
    training_total: 1150,
    free_training_limit: 1000,
    billable_training: 150,
    rate_training: 0.015,
    amount_due: 13.25,
    status: "paid"
  }
];

export const mockPersons = [
  {
    _id: "p_alex",
    name: "Alex Jones",
    role: "member",
    total_appearances: 142,
    last_seen: "2026-07-21 14:32:11",
    photo_path: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
    package_expiry: "2026-08-04 23:59:59",
    days_left: 14,
    images: [
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80"
    ]
  },
  {
    _id: "p_sarah",
    name: "Sarah Smith",
    role: "member",
    total_appearances: 96,
    last_seen: "2026-07-21 11:04:45",
    photo_path: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
    package_expiry: "2026-07-29 23:59:59",
    days_left: 8,
    images: [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80"
    ]
  },
  {
    _id: "p_mike",
    name: "Coach Mike",
    role: "staff",
    total_appearances: 310,
    last_seen: "2026-07-21 11:04:45",
    photo_path: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&auto=format&fit=crop&q=80",
    package_expiry: "2027-01-01 23:59:59",
    days_left: 164,
    images: [
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80"
    ]
  },
  {
    _id: "p_emily",
    name: "Emily Watson",
    role: "member",
    total_appearances: 45,
    last_seen: "2026-07-20 18:22:10",
    photo_path: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&auto=format&fit=crop&q=80",
    package_expiry: "2026-09-12 23:59:59",
    days_left: 53,
    images: [
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&auto=format&fit=crop&q=80"
    ]
  }
];

export const mockUnknowns = [
  {
    seq: 1,
    name: "Unknown #1",
    seen_count: 5,
    created_at: "2026-07-16 09:12:45",
    last_seen: "2026-07-21 14:32:11",
    photo_path: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    images: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80"
    ]
  },
  {
    seq: 2,
    name: "Unknown #2",
    seen_count: 2,
    created_at: "2026-07-18 11:32:00",
    last_seen: "2026-07-21 11:04:45",
    photo_path: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
    images: [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80"
    ]
  },
  {
    seq: 3,
    name: "Unknown #3",
    seen_count: 12,
    created_at: "2026-07-10 08:44:11",
    last_seen: "2026-07-20 19:10:04",
    photo_path: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80",
    images: [
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80"
    ]
  }
];

export const mockEntryLogs = [
  {
    id: "log_1",
    time: "2026-07-21 15:01:22",
    time_epoch: 1784637682,
    end_time: "2026-07-21 15:02:40",
    end_time_epoch: 1784637760,
    trigger: "ping",
    location: "Main Entrance",
    action: "checkin",
    known_count: 2,
    unknown_count: 0,
    frame_count: 4,
    known_names: ["Alex Jones", "Sarah Smith"],
    images: [
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&auto=format&fit=crop&q=60"
    ]
  },
  {
    id: "log_2",
    time: "2026-07-21 14:32:11",
    time_epoch: 1784635931,
    end_time: "2026-07-21 14:32:11",
    end_time_epoch: 1784635931,
    trigger: "burst",
    location: "Main Entrance",
    action: "checkin",
    known_count: 1,
    unknown_count: 1,
    frame_count: 1,
    known_names: ["Alex Jones"],
    images: [
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=300&auto=format&fit=crop&q=60"
    ]
  },
  {
    id: "log_3",
    time: "2026-07-21 13:15:02",
    time_epoch: 1784631302,
    end_time: "2026-07-21 13:15:02",
    end_time_epoch: 1784631302,
    trigger: "ping",
    location: "Cardio Section",
    action: "entry",
    known_count: 0,
    unknown_count: 1,
    frame_count: 1,
    known_names: [],
    images: [
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=300&auto=format&fit=crop&q=60"
    ]
  }
];

export const mockCameras = [
  {
    _id: "cam_main",
    name: "Main entrance USB",
    type: "usb",
    source: "0",
    location: "Main Entrance",
    action: "checkin",
    status: "active",
    roi: { x: 50, y: 30, w: 600, h: 400 }
  },
  {
    _id: "cam_lobby",
    name: "Lobby IP dome",
    type: "ip",
    source: "rtsp://192.168.1.100/stream1",
    location: "Lobby Exit",
    action: "checkout",
    status: "active",
    roi: null
  }
];

export const mockDuplicateReviews = [
  {
    id: "pair_1",
    similarity: 92.4,
    p1: { name: "Alex Jones", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" },
    p2: { name: "Alex J.", photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80" }
  }
];

export const mockConsoleLogs = [
  "[Startup] Initializing AntiCheat pipeline...",
  "[Startup] MongoEngine successfully connected to mongodb://localhost:27017/anticheat",
  "[Prewarm] ArcFace + SSD ready",
  "[Prewarm] Facenet512 ready",
  "[Prewarm] All models preloaded in 4210ms",
  "[Camera] Scanning for USB video devices...",
  "[Camera] Found Camera 0 (Integrated Webcam)",
  "[Camera] Connecting to Main entrance USB [USB: 0]...",
  "[Camera] Connected! Resolution: 1280x720 (SSD: area active)",
  "[Camera] Connecting to Lobby IP dome [IP: rtsp://192.168.1.100/stream1]...",
  "[Camera] Connected! Resolution: 1920x1080",
  "[Pipeline] Live surveillance monitoring active",
  "[Sync] Running automated dataset sync with Server Rekognition collection...",
  "[Sync] Synced 56 faces successfully, 0 errors",
  "[Pipeline] [Main Entrance] Capture trigger: burst (2 people detected)",
  "[Server] Sent image to SearchFacesByImage: found match Alex Jones (98.4%)",
  "[Server] Sent image to SearchFacesByImage: no matches in collection",
  "[Alert] Unknown Entry detected at Main Entrance! Alert saved.",
  "[Pipeline] [Cardio Section] Capture trigger: ping (1 person detected)",
  "[Pipeline] [Cardio Section] SSD Face extraction failed: face hidden or high profile angle",
  "[Alert] Face Hidden detected at Cardio Section! Alert saved."
];
