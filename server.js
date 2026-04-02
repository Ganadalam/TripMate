import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const SERVICE_KEY = process.env.SERVICE_KEY;

// 브라우저에서 직접 접근할 수 있도록 CORS 헤더 추가
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  next();
});

// 관광지 목록 (LocgoHubTarService1)
app.get("/api/tours", async (req, res) => {
  const { areaCode, sigunguCode, numOfRows = "30", pageNo = "1" } = req.query;
  const params = new URLSearchParams({
    serviceKey: SERVICE_KEY,
    numOfRows,
    pageNo,
    MobileOS: "ETC",
    MobileApp: "TripMate",
    _type: "json",
  });
  if (areaCode) params.set("areaCode", areaCode);
  if (sigunguCode) params.set("sigunguCode", sigunguCode);

  const url = `https://apis.data.go.kr/B551011/LocgoHubTarService1/locgoHubTarList?${params}`;
  try {
    const r = await fetch(url);
    const text = await r.text();
    let json;
    try { json = JSON.parse(text); }
    catch {
      console.error("[tours] JSON 파싱 실패:", text.slice(0, 300));
      return res.status(502).json({ error: "Upstream parse error" });
    }
    res.json(json);
  } catch (e) {
    console.error("[tours] fetch 실패:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// 축제/행사 목록 (searchFestival1)
app.get("/api/festival", async (req, res) => {
  const { eventStartDate, eventEndDate, numOfRows = "30", pageNo = "1", areaCode } = req.query;

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const params = new URLSearchParams({
    serviceKey: SERVICE_KEY,
    numOfRows,
    pageNo,
    MobileOS: "ETC",
    MobileApp: "TripMate",
    _type: "json",
    eventStartDate: eventStartDate || today,
    eventEndDate:   eventEndDate   || today.slice(0, 4) + "1231",
    listYN: "Y",
    arrange: "A",
  });
  if (areaCode) params.set("areaCode", areaCode);

  const url = `https://apis.data.go.kr/B551011/KorService1/searchFestival1?${params}`;
  try {
    const r = await fetch(url);
    const text = await r.text();
    let json;
    try { json = JSON.parse(text); }
    catch {
      console.error("[festival] JSON 파싱 실패:", text.slice(0, 300));
      return res.status(502).json({ error: "Upstream parse error" });
    }
    res.json(json);
  } catch (e) {
    console.error("[festival] fetch 실패:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.listen(4000, () => console.log("🚀 TripMate proxy server :4000"));
