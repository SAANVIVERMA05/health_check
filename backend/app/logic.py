import json


def assess(data: dict) -> dict:
    score = 0
    factors: list[str] = []
    recommendations: list[str] = []

    if data["sleep_duration"] < 7:
        score += 20
        factors.append("Short sleep duration")
        recommendations.append("Aim for 7–9 hours of consistent sleep tonight.")
    if data["work_hours"] > 9:
        score += 15
        factors.append("Long workday")
        recommendations.append("Take a five-minute reset break every 90 minutes.")
    if data["mood_level"] <= 4:
        score += 20
        factors.append("Low mood")
        recommendations.append("Try a 10-minute breathing exercise or connect with someone you trust.")
    if data["screen_time"] > 7:
        score += 15
        factors.append("High screen time")
        recommendations.append("Create a screen-free wind-down window before bed.")
    if data["physical_activity"] < 30:
        score += 15
        factors.append("Low physical activity")
        recommendations.append("Add a brisk 20–30 minute walk to your day.")
    if data["heart_rate"] > 90:
        score += 10
        factors.append("Elevated resting heart rate")
        recommendations.append("Slow your breathing and check your heart rate again after resting.")
    if data["blood_oxygen"] < 95:
        score += 10
        factors.append("Lower blood oxygen")
        recommendations.append("Recheck your reading. Seek medical advice if it stays low or symptoms appear.")

    level = "Low" if score < 30 else "Medium" if score < 60 else "High"
    if not factors:
        factors = ["No significant risk signals detected"]
        recommendations = ["Keep your current routine and protect time for recovery."]
    summary = {
        "Low": "Your signals look balanced today. Keep protecting the habits that help you recover.",
        "Medium": "A few patterns suggest your system could use more recovery today.",
        "High": "Your current signals point to a high stress load. Prioritize recovery and support today.",
    }[level]
    return {
        "stress_score": min(score, 100),
        "stress_level": level,
        "summary": summary,
        "factors": json.dumps(factors),
        "recommendations": json.dumps(recommendations),
    }
