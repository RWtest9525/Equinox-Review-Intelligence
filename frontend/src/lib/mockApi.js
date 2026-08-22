/**
 * Client-side Database & API Engine for Equinox Reviews Intelligence
 * Provides persistent local storage, seed data, and offline/demo execution.
 */

const STORAGE_PREFIX = "equinox_db_";

function getStore(key, defaultVal) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStore(key, val) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
  } catch {}
}

const TOPICS = [
  "Payments", "Login", "KYC", "Customer Support", "Performance", "Bugs",
  "UI/UX", "Notifications", "Pricing", "Offers", "Cashback", "Account",
  "Security", "Verification", "Features", "General"
];

const COUNTRIES = [
  "India", "United States", "United Kingdom", "Germany", "Brazil",
  "Indonesia", "Nigeria", "Canada", "Australia", "United Arab Emirates"
];

const NAMES = [
  "Aarav Sharma", "Priya Patel", "John Miller", "Sofia Rossi", "Chen Wei",
  "Fatima Khan", "Lucas Silva", "Emma Johnson", "Rahul Verma", "Ananya Reddy",
  "David Cohen", "Yuki Tanaka", "Omar Hassan", "Grace Lee", "Nikhil Gupta",
  "Isabella Garcia", "Mohammed Ali", "Olivia Brown", "Sanjay Kumar", "Mia Wilson"
];

const POS_TEMPLATES = [
  "Love the {t}! Everything works smoothly and lightning fast.",
  "Great {t} experience, very reliable, clean interface and easy to use.",
  "The {t} is excellent, best app in this category by far.",
  "Smooth {t} and clean interface. Highly recommend to everyone!",
  "Impressed with the {t}. Keep up the great work team.",
  "Outstanding updates! The {t} improved tremendously in this version."
];

const NEG_TEMPLATES = [
  "{t} keeps failing and nobody helped me. Very frustrating experience.",
  "Terrible {t} experience. The app crashed twice while I was trying to pay.",
  "I am extremely disappointed with the {t}. Please fix this urgently.",
  "{t} is broken after the latest update. I'm losing trust in this app.",
  "Worst {t} ever, could not complete what I wanted to do.",
  "Money got deducted but the {t} did not go through. No response from support."
];

const NEU_TEMPLATES = [
  "The {t} is okay but could definitely be improved.",
  "{t} works fine mostly, sometimes a bit slow under poor network.",
  "Average {t}, nothing special but it does the basic job.",
  "Decent {t}, hope more customization features are added soon."
];

function generateId() {
  return "id_" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function initSeedDB() {
  let initialized = getStore("initialized", false);
  if (initialized) return;

  const orgInternal = {
    id: "org_internal_1",
    name: "Equinox Intelligence",
    type: "internal",
    plan: "enterprise",
    status: "active",
    is_demo: true,
    created_at: new Date().toISOString(),
  };

  const orgClient1 = {
    id: "org_client_1",
    name: "POP Technologies",
    type: "client",
    plan: "pro",
    status: "active",
    is_demo: true,
    created_at: new Date().toISOString(),
  };

  const users = [
    {
      id: "user_admin",
      name: "Equinox Admin",
      email: "admin@equinox.ai",
      password: "password123", // fallback
      role: "super_admin",
      organization_id: orgInternal.id,
      status: "active",
      created_at: new Date().toISOString(),
    },
    {
      id: "user_client_admin",
      name: "Rajesh Kumar",
      email: "rajesh@pop.pe",
      password: "password123",
      role: "client_admin",
      organization_id: orgClient1.id,
      status: "active",
      created_at: new Date().toISOString(),
    }
  ];

  const apps = [
    {
      id: "app_1",
      organization_id: orgInternal.id,
      name: "POP UPI & Cards",
      package_id: "pe.pop.app",
      app_store_id: "id1671912903",
      platform: "both",
      country: "India",
      category: "Finance",
      logo: "https://images.unsplash.com/photo-1644310885721-98c5c7f94ca3?crop=entropy&cs=srgb&fm=jpg&w=128",
      current_rating: 4.6,
      review_count: 14200,
      versions: ["3.4.1", "3.4.0", "3.3.9"],
      google_play_status: "connected",
      app_store_status: "connected",
      is_demo: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "app_2",
      organization_id: orgInternal.id,
      name: "ZenPay Global Wallet",
      package_id: "com.zenpay.wallet",
      app_store_id: "id1528912901",
      platform: "both",
      country: "United States",
      category: "Finance",
      logo: "https://images.unsplash.com/photo-1644318295821-12c4ddf2a36e?crop=entropy&cs=srgb&fm=jpg&w=128",
      current_rating: 4.3,
      review_count: 8520,
      versions: ["2.1.0", "2.0.8"],
      google_play_status: "connected",
      app_store_status: "connected",
      is_demo: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "app_3",
      organization_id: orgInternal.id,
      name: "ShopSphere Buyer",
      package_id: "com.shopsphere.shopping",
      app_store_id: "id1498112999",
      platform: "google_play",
      country: "United Kingdom",
      category: "Shopping",
      logo: "https://images.unsplash.com/photo-1555421689-491a97ff2040?crop=entropy&cs=srgb&fm=jpg&w=128",
      current_rating: 4.1,
      review_count: 22100,
      versions: ["5.2.0", "5.1.8"],
      google_play_status: "connected",
      app_store_status: "not_connected",
      is_demo: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "app_4",
      organization_id: orgInternal.id,
      name: "MediCare Plus Health",
      package_id: "com.medicare.plus",
      app_store_id: "id1612019922",
      platform: "both",
      country: "India",
      category: "Medical",
      logo: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?crop=entropy&cs=srgb&fm=jpg&w=128",
      current_rating: 4.5,
      review_count: 6400,
      versions: ["1.9.4", "1.9.0"],
      google_play_status: "connected",
      app_store_status: "connected",
      is_demo: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "app_5",
      organization_id: orgClient1.id,
      name: "POP Merchant POS",
      package_id: "pe.pop.merchant",
      app_store_id: "id1671912905",
      platform: "google_play",
      country: "India",
      category: "Business",
      logo: "https://images.unsplash.com/photo-1556742049-0a67e55722c0?crop=entropy&cs=srgb&fm=jpg&w=128",
      current_rating: 4.4,
      review_count: 3200,
      versions: ["2.0.1", "1.9.8"],
      google_play_status: "connected",
      app_store_status: "not_connected",
      is_demo: true,
      created_at: new Date().toISOString(),
    }
  ];

  const reviews = [];
  const now = Date.now();
  const DAY_MS = 86400000;

  apps.forEach((app) => {
    for (let i = 0; i < 40; i++) {
      const daysAgo = Math.floor(Math.random() * 90);
      const reviewDate = new Date(now - daysAgo * DAY_MS - Math.floor(Math.random() * 86400000)).toISOString();
      const ratingDist = [5, 5, 5, 5, 4, 4, 4, 3, 2, 1];
      const rating = ratingDist[Math.floor(Math.random() * ratingDist.length)];
      const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
      let sentiment = "neutral";
      let text = "";

      if (rating >= 4) {
        sentiment = "positive";
        text = POS_TEMPLATES[Math.floor(Math.random() * POS_TEMPLATES.length)].replace("{t}", topic);
      } else if (rating <= 2) {
        sentiment = "negative";
        text = NEG_TEMPLATES[Math.floor(Math.random() * NEG_TEMPLATES.length)].replace("{t}", topic);
      } else {
        sentiment = "neutral";
        text = NEU_TEMPLATES[Math.floor(Math.random() * NEU_TEMPLATES.length)].replace("{t}", topic);
      }

      const replied = Math.random() < 0.6;
      reviews.push({
        id: generateId(),
        organization_id: app.organization_id,
        application_id: app.id,
        platform: app.platform === "both" ? (Math.random() > 0.4 ? "google_play" : "app_store") : app.platform,
        rating,
        text,
        reviewer_name: NAMES[Math.floor(Math.random() * NAMES.length)],
        country: app.country,
        app_version: app.versions[0],
        sentiment,
        topic,
        reply_status: replied ? "published" : "unreplied",
        reply_source: replied ? (Math.random() > 0.5 ? "ai" : "manual") : null,
        published_reply: replied ? "Thank you for sharing your feedback with us! We appreciate you taking the time." : null,
        reply_at: replied ? reviewDate : null,
        created_at: reviewDate,
      });
    }
  });

  const competitors = [
    {
      id: "comp_1",
      application_id: "app_1",
      organization_id: orgInternal.id,
      name: "Google Pay India",
      package_id: "com.google.android.apps.nbu.paisa.user",
      platform: "google_play",
      current_rating: 4.4,
      review_count: 850000,
      created_at: new Date().toISOString(),
    },
    {
      id: "comp_2",
      application_id: "app_1",
      organization_id: orgInternal.id,
      name: "PhonePe UPI",
      package_id: "com.phonepe.app",
      platform: "google_play",
      current_rating: 4.5,
      review_count: 1200000,
      created_at: new Date().toISOString(),
    },
    {
      id: "comp_3",
      application_id: "app_2",
      organization_id: orgInternal.id,
      name: "Revolut",
      package_id: "com.revolut.revolut",
      platform: "both",
      current_rating: 4.7,
      review_count: 450000,
      created_at: new Date().toISOString(),
    }
  ];

  setStore("organizations", [orgInternal, orgClient1]);
  setStore("users", users);
  setStore("applications", apps);
  setStore("reviews", reviews);
  setStore("competitors", competitors);
  setStore("initialized", true);
}

// Initialize seed on module load
initSeedDB();

export async function handleMockRequest(method, url, data, params = {}) {
  initSeedDB();
  const normalizedUrl = url.replace(/^\/api/, "").split("?")[0];
  const query = { ...params };
  const userToken = localStorage.getItem("equinox_token");
  const users = getStore("users", []);
  const orgs = getStore("organizations", []);
  const apps = getStore("applications", []);
  let reviews = getStore("reviews", []);
  const competitors = getStore("competitors", []);

  // Determine current user
  let currentUser = users[0];
  if (userToken) {
    const found = users.find((u) => u.id === userToken || u.email === userToken);
    if (found) currentUser = found;
  }

  // 1. Auth: Login
  if (normalizedUrl === "/auth/login" && method.toLowerCase() === "post") {
    const { email, password } = data || {};
    let user = users.find((u) => u.email.toLowerCase() === (email || "").toLowerCase());
    if (!user) {
      // Auto-create or allow clean demo login
      user = {
        id: generateId(),
        name: email.split("@")[0] || "User",
        email: email.toLowerCase(),
        password: password || "password",
        role: "client_admin",
        organization_id: orgs[0]?.id || "org_internal_1",
        status: "active",
        created_at: new Date().toISOString(),
      };
      users.push(user);
      setStore("users", users);
    }
    const token = user.id;
    return {
      status: 200,
      data: {
        access_token: token,
        token_type: "bearer",
        user: { id: user.id, name: user.name, email: user.email, role: user.role, organization_id: user.organization_id },
      },
    };
  }

  // 2. Auth: Register
  if (normalizedUrl === "/auth/register" && method.toLowerCase() === "post") {
    const { name, email, password, organization_name } = data || {};
    const orgId = generateId();
    const newOrg = {
      id: orgId,
      name: organization_name || `${name}'s Organization`,
      type: "client",
      plan: "starter",
      status: "active",
      is_demo: false,
      created_at: new Date().toISOString(),
    };
    orgs.push(newOrg);
    setStore("organizations", orgs);

    const newUser = {
      id: generateId(),
      name: name || "User",
      email: (email || "").toLowerCase(),
      password: password || "password",
      role: "client_admin",
      organization_id: orgId,
      status: "active",
      created_at: new Date().toISOString(),
    };
    users.push(newUser);
    setStore("users", users);

    return {
      status: 200,
      data: {
        access_token: newUser.id,
        token_type: "bearer",
        user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, organization_id: newUser.organization_id },
      },
    };
  }

  // 3. Auth: /auth/me
  if (normalizedUrl === "/auth/me") {
    const org = orgs.find((o) => o.id === currentUser.organization_id) || orgs[0];
    return {
      status: 200,
      data: {
        user: { id: currentUser.id, name: currentUser.name, email: currentUser.email, role: currentUser.role, organization_id: currentUser.organization_id },
        organization: org,
      },
    };
  }

  // 4. Applications: GET, POST, DELETE
  if (normalizedUrl === "/applications" && method.toLowerCase() === "get") {
    let scopedApps = apps;
    if (currentUser.role !== "super_admin") {
      scopedApps = apps.filter((a) => a.organization_id === currentUser.organization_id || a.is_demo);
    }
    return { status: 200, data: { applications: scopedApps } };
  }

  if (normalizedUrl === "/applications" && method.toLowerCase() === "post") {
    const newApp = {
      id: generateId(),
      organization_id: currentUser.organization_id || orgs[0].id,
      name: data.name || "My New App",
      package_id: data.package_id || "com.app.example",
      app_store_id: data.app_store_id || "",
      platform: data.platform || "both",
      country: data.country || "United States",
      category: data.category || "Tools",
      logo: data.logo || "https://images.unsplash.com/photo-1644310885721-98c5c7f94ca3?crop=entropy&cs=srgb&fm=jpg&w=128",
      current_rating: 4.5,
      review_count: 120,
      versions: ["1.0.0"],
      google_play_status: "connected",
      app_store_status: "connected",
      is_demo: false,
      created_at: new Date().toISOString(),
    };
    apps.unshift(newApp);
    setStore("applications", apps);
    return { status: 200, data: { application: newApp } };
  }

  if (normalizedUrl.startsWith("/applications/") && method.toLowerCase() === "delete") {
    const appId = normalizedUrl.split("/applications/")[1];
    const filtered = apps.filter((a) => a.id !== appId);
    setStore("applications", filtered);
    return { status: 200, data: { ok: true, deleted: appId } };
  }

  // 5. Reviews: GET, POST /reply, export
  if (normalizedUrl === "/reviews" && method.toLowerCase() === "get") {
    let filtered = [...reviews];
    if (query.application_id && query.application_id !== "all") {
      filtered = filtered.filter((r) => r.application_id === query.application_id);
    }
    if (query.platform && query.platform !== "all") {
      filtered = filtered.filter((r) => r.platform === query.platform);
    }
    if (query.rating) {
      filtered = filtered.filter((r) => Number(r.rating) === Number(query.rating));
    }
    if (query.sentiment && query.sentiment !== "all") {
      filtered = filtered.filter((r) => r.sentiment === query.sentiment);
    }
    if (query.topic && query.topic !== "all") {
      filtered = filtered.filter((r) => r.topic === query.topic);
    }
    if (query.reply_status && query.reply_status !== "all") {
      filtered = filtered.filter((r) => r.reply_status === query.reply_status);
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      filtered = filtered.filter((r) => (r.text || "").toLowerCase().includes(q) || (r.reviewer_name || "").toLowerCase().includes(q));
    }

    const total = filtered.length;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 25;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return {
      status: 200,
      data: {
        reviews: paginated,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  if (normalizedUrl === "/reviews/summary") {
    let filtered = [...reviews];
    if (query.application_id && query.application_id !== "all") {
      filtered = filtered.filter((r) => r.application_id === query.application_id);
    }
    const total = filtered.length;
    const stars = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const sentiments = { positive: 0, neutral: 0, negative: 0 };
    filtered.forEach((r) => {
      if (stars[r.rating] !== undefined) stars[r.rating]++;
      if (sentiments[r.sentiment] !== undefined) sentiments[r.sentiment]++;
    });
    return {
      status: 200,
      data: {
        total,
        rating_avg: total ? Number((filtered.reduce((a, b) => a + b.rating, 0) / total).toFixed(2)) : 4.5,
        rating_distribution: stars,
        sentiment_distribution: sentiments,
        unreplied_count: filtered.filter((r) => r.reply_status === "unreplied").length,
      },
    };
  }

  if (normalizedUrl.includes("/reply") && method.toLowerCase() === "post") {
    const parts = normalizedUrl.split("/");
    const reviewId = parts[2];
    const replyText = data?.reply || "Thank you for your valuable feedback!";
    const reviewIndex = reviews.findIndex((r) => r.id === reviewId);
    if (reviewIndex !== -1) {
      reviews[reviewIndex].reply_status = "published";
      reviews[reviewIndex].reply_source = "ai";
      reviews[reviewIndex].published_reply = replyText;
      reviews[reviewIndex].reply_at = new Date().toISOString();
      setStore("reviews", reviews);
    }
    return { status: 200, data: { ok: true, review_id: reviewId, reply: replyText } };
  }

  // 6. Analytics: Dashboard KPIs & Trends
  if (normalizedUrl === "/analytics/dashboard" || normalizedUrl === "/analytics/overview") {
    let filtered = [...reviews];
    if (query.application_id && query.application_id !== "all") {
      filtered = filtered.filter((r) => r.application_id === query.application_id);
    }
    const total = filtered.length || 1;
    const avgRating = Number((filtered.reduce((acc, r) => acc + r.rating, 0) / total).toFixed(2));
    const posCount = filtered.filter((r) => r.sentiment === "positive").length;
    const negCount = filtered.filter((r) => r.sentiment === "negative").length;
    const neuCount = total - posCount - negCount;

    return {
      status: 200,
      data: {
        kpis: {
          current_rating: avgRating || 4.52,
          rating_change: +0.08,
          total_reviews: total,
          review_growth: "+14.2%",
          sentiment_score: Math.round((posCount / total) * 100) || 78,
          positive_pct: Math.round((posCount / total) * 100) || 74,
          negative_pct: Math.round((negCount / total) * 100) || 12,
          neutral_pct: Math.round((neuCount / total) * 100) || 14,
          response_rate: 86.4,
          avg_response_time: "2.4 hrs",
        },
        forecast: {
          projected_rating_30d: Number((avgRating + 0.05).toFixed(2)),
          confidence: 0.92,
          trend: "upward",
        },
      },
    };
  }

  if (normalizedUrl === "/analytics/rating-trend" || normalizedUrl === "/analytics/rating-trends") {
    const days = Number(query.days) || 30;
    const series = [];
    const nowTs = Date.now();
    let current = 4.3;
    for (let i = days; i >= 0; i -= 2) {
      const dt = new Date(nowTs - i * 86400000);
      current = Math.min(4.9, Math.max(3.8, current + (Math.random() * 0.06 - 0.02)));
      series.push({
        date: dt.toISOString().split("T")[0],
        rating: Number(current.toFixed(2)),
        moving_avg: Number((current - 0.02).toFixed(2)),
        reviews: Math.floor(Math.random() * 25 + 5),
        avg_incoming: Number((current + 0.05).toFixed(2)),
      });
    }
    const forecast = [
      { date: series[series.length - 1].date, forecast: series[series.length - 1].rating },
      { date: new Date(nowTs + 7 * 86400000).toISOString().split("T")[0], forecast: Number((current + 0.04).toFixed(2)) },
      { date: new Date(nowTs + 14 * 86400000).toISOString().split("T")[0], forecast: Number((current + 0.08).toFixed(2)) },
    ];
    return { status: 200, data: { series, forecast } };
  }

  if (normalizedUrl === "/analytics/review-volume") {
    const days = Number(query.days) || 30;
    const series = [];
    const nowTs = Date.now();
    for (let i = days; i >= 0; i -= 2) {
      const dt = new Date(nowTs - i * 86400000);
      const pos = Math.floor(Math.random() * 20 + 8);
      const neg = Math.floor(Math.random() * 6 + 1);
      const neu = Math.floor(Math.random() * 8 + 2);
      series.push({
        date: dt.toISOString().split("T")[0],
        total: pos + neg + neu,
        positive: pos,
        negative: neg,
        neutral: neu,
      });
    }
    return { status: 200, data: { series } };
  }

  if (normalizedUrl === "/analytics/rating-distribution") {
    return {
      status: 200,
      data: {
        distribution: [
          { star: 5, count: 850, percentage: 68 },
          { star: 4, count: 210, percentage: 17 },
          { star: 3, count: 95, percentage: 7 },
          { star: 2, count: 45, percentage: 4 },
          { star: 1, count: 50, percentage: 4 },
        ],
      },
    };
  }

  if (normalizedUrl === "/analytics/sentiment-breakdown") {
    return {
      status: 200,
      data: {
        breakdown: {
          positive: 74,
          neutral: 14,
          negative: 12,
        },
        drivers: [
          { topic: "Payments", sentiment: "positive", score: 88, mention_count: 320 },
          { topic: "UI/UX", sentiment: "positive", score: 84, mention_count: 240 },
          { topic: "Customer Support", sentiment: "negative", score: 32, mention_count: 110 },
          { topic: "Performance", sentiment: "neutral", score: 62, mention_count: 95 },
        ],
      },
    };
  }

  if (normalizedUrl === "/analytics/topic-breakdown") {
    return {
      status: 200,
      data: {
        topics: [
          { topic: "Payments", count: 420, sentiment_score: 82, positive: 340, negative: 40, neutral: 40 },
          { topic: "Login & Auth", count: 280, sentiment_score: 75, positive: 210, negative: 40, neutral: 30 },
          { topic: "UI/UX Experience", count: 240, sentiment_score: 90, positive: 216, negative: 12, neutral: 12 },
          { topic: "Customer Support", count: 180, sentiment_score: 45, positive: 70, negative: 85, neutral: 25 },
          { topic: "Performance", count: 150, sentiment_score: 68, positive: 100, negative: 30, neutral: 20 },
        ],
      },
    };
  }

  if (normalizedUrl === "/analytics/benchmarking") {
    return {
      status: 200,
      data: {
        metrics: [
          { name: "Average Rating", your_app: 4.54, competitor_avg: 4.38, delta: "+0.16" },
          { name: "Response Rate", your_app: "88%", competitor_avg: "62%", delta: "+26%" },
          { name: "Positive Sentiment", your_app: "76%", competitor_avg: "68%", delta: "+8%" },
          { name: "Weekly Volume", your_app: 340, competitor_avg: 290, delta: "+50" },
        ],
      },
    };
  }

  // 7. AI Intelligence & Search
  if (normalizedUrl === "/ai/executive-summary") {
    return {
      status: 200,
      data: {
        summary: "Overall app reputation remains strongly positive across Google Play and App Store with a 4.5+ average rating. Customer sentiment for Payments and UI/UX is exceptionally high (84%+ positive). Key area for improvement is support turnaround time on transaction reversals.",
        key_positives: [
          "Payment reliability praised in 88% of transaction-related reviews.",
          "Latest release 3.4.1 resolved prior login lag complaints.",
          "High rating retention among daily active users.",
        ],
        key_risks: [
          "Customer support response delays flagged in negative 1-star reviews.",
          "Occasional biometric authentication glitches on specific Android models.",
        ],
        action_recommendations: [
          "Implement instant auto-replies for KYC-related inquiries.",
          "Target next sprint on biometric fallback reliability.",
        ],
      },
    };
  }

  if (normalizedUrl === "/ai/generate-reply" && method.toLowerCase() === "post") {
    const text = data?.review_text || "";
    const rating = Number(data?.rating) || 5;
    let reply = "Thank you for taking the time to share your feedback! We are thrilled to hear you had a great experience with our app.";
    if (rating <= 2) {
      reply = "We apologize for the inconvenience you experienced. Please reach out to our dedicated support team with your registered details so we can investigate and resolve this immediately for you.";
    } else if (rating === 3) {
      reply = "Thank you for your constructive feedback. We're continuously working to refine and improve your experience. Stay tuned for upcoming updates!";
    }
    return { status: 200, data: { reply, confidence: 0.96, model: "equinox-ai-v2" } };
  }

  if (normalizedUrl === "/ai/search" && method.toLowerCase() === "post") {
    const q = (data?.query || "").toLowerCase();
    const matches = reviews.filter((r) => r.text.toLowerCase().includes(q)).slice(0, 10);
    return {
      status: 200,
      data: {
        results: matches,
        insight: `Found ${matches.length} matching reviews discussing "${data?.query}". Overall sentiment trend for this topic is positive.`,
      },
    };
  }

  // 8. Competitors
  if (normalizedUrl === "/competitors") {
    return { status: 200, data: { competitors } };
  }

  // 9. Google Play Sync simulation
  if (normalizedUrl === "/gplay/sync" || normalizedUrl === "/gplay/resolve") {
    return {
      status: 200,
      data: {
        success: true,
        message: "Successfully synchronized live reviews from Google Play Store",
        imported: 40,
        fetched: 40,
      },
    };
  }

  // Default fallback
  return { status: 200, data: { ok: true } };
}
