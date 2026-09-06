CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assessments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sleep_duration REAL NOT NULL,
  work_hours REAL NOT NULL,
  mood_level INTEGER NOT NULL,
  screen_time REAL NOT NULL,
  physical_activity REAL NOT NULL,
  heart_rate INTEGER NOT NULL,
  blood_oxygen REAL NOT NULL,
  stress_score INTEGER NOT NULL,
  stress_level VARCHAR(20) NOT NULL,
  summary TEXT NOT NULL,
  factors TEXT NOT NULL,
  recommendations TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
