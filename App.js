import { useState, useEffect, useRef } from "react";

const EMOTIONS = [
  { emoji: "🌟", label: "빛나는",    color: "#FFD700", bg: "#FFF9E6" },
  { emoji: "😊", label: "행복한",    color: "#FF8C69", bg: "#FFF0EB" },
  { emoji: "😌", label: "평온한",    color: "#7EC8A4", bg: "#EDF7F2" },
  { emoji: "🤔", label: "생각많은",  color: "#7EB5D6", bg: "#EBF4FA" },
  { emoji: "😔", label: "우울한",    color: "#9B8EC4", bg: "#F2EFF9" },
  { emoji: "😤", label: "힘든",      color: "#E07D6A", bg: "#FCECEA" },
  { emoji: "😴", label: "피곤한",    color: "#A8B5C0", bg: "#F0F3F5" },
  { emoji: "🥰", label: "사랑스런",  color: "#E884A0", bg: "#FEF0F4" },
];

const todayStr = () => new Date().toISOString().split("T")[0];

const formatDate = (dateStr) =>
  new Date(dateStr + "T00:00:00").toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });

const STORAGE_KEY = "maum-diary-entries";

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch { return {}; }
}
function saveEntries(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Section 카드 ──────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{
      marginBottom: 18,
      background: "rgba(255,255,255,0.72)",
      borderRadius: 22,
      padding: "18px 18px 16px",
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      border: "1px solid rgba(255,255,255,0.92)",
      boxShadow: "0 2px 18px rgba(200,155,120,0.09)",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#9B7B60", marginBottom: 14, fontFamily: "sans-serif", letterSpacing: 0.4 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ── 메인 앱 ──────────────────────────────────────────────
export default function App() {
  const [view, setView]               = useState("write"); // write | history | detail
  const [entries, setEntries]         = useState(loadEntries);
  const [detailEntry, setDetailEntry] = useState(null);
  const [saved, setSaved]             = useState(false);
  const [shareToast, setShareToast]   = useState("");
  const [installPrompt, setInstallPrompt] = useState(null);

  // 오늘 폼 상태
  const today = todayStr();
  const existing = entries[today] || {};
  const [emotion,      setEmotion]      = useState(existing.emotion      ?? null);
  const [emotionScore, setEmotionScore] = useState(existing.emotionScore ?? 5);
  const [g1, setG1] = useState(existing.gratitude1 ?? "");
  const [g2, setG2] = useState(existing.gratitude2 ?? "");
  const [g3, setG3] = useState(existing.gratitude3 ?? "");
  const [note, setNote]   = useState(existing.note  ?? "");
  const [photo, setPhoto] = useState(existing.photo ?? null);
  const [photoName, setPhotoName] = useState(existing.photoName ?? "");
  const fileRef = useRef();

  // PWA 설치 배너 감지
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then(() => setInstallPrompt(null));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // 이미지 압축 (최대 1200px)
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width  = img.width  * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        setPhoto(canvas.toDataURL("image/jpeg", 0.82));
        setPhotoName(file.name);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!emotion) return;
    const entry = {
      date: today, emotion, emotionScore,
      gratitude1: g1, gratitude2: g2, gratitude3: g3,
      note, photo, photoName,
      savedAt: new Date().toISOString(),
    };
    const next = { ...entries, [today]: entry };
    setEntries(next);
    saveEntries(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const handleShare = async (entry) => {
    const lines = [
      `${formatDate(entry.date)}`,
      ``,
      `${entry.emotion?.emoji} 오늘의 감정: ${entry.emotion?.label} (${entry.emotionScore}/10)`,
      ``,
      `✨ 오늘 감사한 것들`,
      entry.gratitude1 && `1. ${entry.gratitude1}`,
      entry.gratitude2 && `2. ${entry.gratitude2}`,
      entry.gratitude3 && `3. ${entry.gratitude3}`,
      entry.note && `\n💭 ${entry.note}`,
      ``,
      `#마음일기 #감사일기 #오늘하루 #감정기록`,
    ].filter(Boolean).join("\n");

    if (navigator.share) {
      try {
        const shareData = { title: "오늘의 마음일기", text: lines };
        if (entry.photo) {
          try {
            const res  = await fetch(entry.photo);
            const blob = await res.blob();
            const file = new File([blob], entry.photoName || "diary.jpg", { type: blob.type });
            if (navigator.canShare?.({ files: [file] })) shareData.files = [file];
          } catch (_) {}
        }
        await navigator.share(shareData);
        return;
      } catch (_) {}
    }
    // 폴백: 클립보드
    try {
      await navigator.clipboard.writeText(lines);
      setShareToast("📋 클립보드에 복사됐어요! SNS에 붙여넣기 하세요");
    } catch (_) {
      setShareToast("공유하기가 지원되지 않는 브라우저예요");
    }
    setTimeout(() => setShareToast(""), 3000);
  };

  const sortedDates = Object.keys(entries).sort((a, b) => b.localeCompare(a));

  // ── 공통 스타일 ────────────────────────────────────────
  const inputStyle = {
    width: "100%", border: "1.5px solid rgba(200,170,150,0.28)",
    borderRadius: 13, padding: "10px 13px", resize: "none",
    fontFamily: "'Noto Serif KR', serif", fontSize: 15, color: "#3D2B1F",
    background: "rgba(255,255,255,0.65)", outline: "none", lineHeight: 1.65,
    WebkitAppearance: "none",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(150deg, #FFF8F0 0%, #FFF2F6 55%, #F2F0FF 100%)",
      fontFamily: "'Noto Serif KR', Georgia, serif",
      position: "relative", overflowX: "hidden",
    }}>
      {/* 배경 장식 */}
      <div style={{ position:"fixed", top:-90, right:-90, width:320, height:320, borderRadius:"50%", background:"rgba(255,175,130,0.15)", filter:"blur(48px)", pointerEvents:"none", zIndex:0 }} />
      <div style={{ position:"fixed", bottom:-70, left:-70, width:280, height:280, borderRadius:"50%", background:"rgba(180,155,255,0.13)", filter:"blur(48px)", pointerEvents:"none", zIndex:0 }} />

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 0 110px", position:"relative", zIndex:1 }}>

        {/* 헤더 */}
        <div style={{ padding: "44px 24px 20px", textAlign: "center" }}>
          {installPrompt && (
            <button onClick={handleInstall} style={{
              display:"block", margin:"0 auto 16px", padding:"9px 22px",
              background:"linear-gradient(135deg,#FFB088,#FF8FA0)", border:"none",
              borderRadius:99, color:"#fff", fontFamily:"sans-serif", fontSize:13,
              fontWeight:700, cursor:"pointer", boxShadow:"0 4px 14px rgba(255,140,110,0.35)",
            }}>
              📲 홈 화면에 설치하기
            </button>
          )}
          <div style={{ fontSize:12, letterSpacing:5, color:"#C4A882", textTransform:"uppercase", marginBottom:8, fontFamily:"sans-serif" }}>
            Daily Reflection
          </div>
          <h1 style={{ fontSize:30, fontWeight:700, color:"#3D2B1F", margin:0, lineHeight:1.2 }}>
            오늘의 마음
          </h1>
          <div style={{ fontSize:13, color:"#B0937A", marginTop:8, fontFamily:"sans-serif" }}>
            {formatDate(today)}
          </div>
        </div>

        {/* 탭 */}
        <div style={{ display:"flex", margin:"0 24px 22px", background:"rgba(255,255,255,0.68)", borderRadius:18, padding:4, backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", border:"1px solid rgba(255,255,255,0.9)" }}>
          {[["write","✏️ 오늘 기록"],["history","📖 지난 기록"]].map(([v,label]) => (
            <button key={v} onClick={() => { setView(v); setDetailEntry(null); }} style={{
              flex:1, padding:"10px 0", border:"none", borderRadius:14, cursor:"pointer",
              fontFamily:"sans-serif", fontSize:14, fontWeight:700, transition:"all .22s",
              background: view===v ? "linear-gradient(135deg,#FFB088,#FF8FA0)" : "transparent",
              color: view===v ? "#fff" : "#B0937A",
              boxShadow: view===v ? "0 4px 14px rgba(255,140,110,0.28)" : "none",
            }}>{label}</button>
          ))}
        </div>

        {/* ── 쓰기 뷰 ─────────────────────────────────── */}
        {view === "write" && (
          <div style={{ padding:"0 24px" }}>

            <Section title="지금 감정이 어때요?">
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
                {EMOTIONS.map((e) => (
                  <button key={e.label} onClick={() => setEmotion(e)} style={{
                    padding:"12px 4px", borderRadius:17,
                    border:`2.5px solid ${emotion?.label===e.label ? e.color : "transparent"}`,
                    background: emotion?.label===e.label ? e.bg : "rgba(255,255,255,0.55)",
                    cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:5,
                    transform: emotion?.label===e.label ? "scale(1.06)" : "scale(1)",
                    transition:"all .18s",
                    boxShadow: emotion?.label===e.label ? `0 5px 18px ${e.color}44` : "none",
                  }}>
                    <span style={{ fontSize:26 }}>{e.emoji}</span>
                    <span style={{ fontSize:11, color:"#7A6050", fontFamily:"sans-serif", fontWeight:700 }}>{e.label}</span>
                  </button>
                ))}
              </div>

              {emotion && (
                <div style={{ marginTop:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#B0937A", fontFamily:"sans-serif", marginBottom:6 }}>
                    <span>힘들어요 😔</span><span>최고예요 🌟</span>
                  </div>
                  <input type="range" min={1} max={10} value={emotionScore}
                    onChange={e => setEmotionScore(+e.target.value)}
                    style={{ width:"100%", accentColor: emotion.color, cursor:"pointer" }} />
                  <div style={{ textAlign:"center", fontSize:14, color: emotion.color, fontWeight:700, fontFamily:"sans-serif", marginTop:4 }}>
                    {emotionScore} / 10
                  </div>
                </div>
              )}
            </Section>

            <Section title="✨ 오늘 감사한 것 3가지">
              {[[g1,setG1,"첫 번째 감사한 것..."],[g2,setG2,"두 번째 감사한 것..."],[g3,setG3,"세 번째 감사한 것..."]].map(([val,setter,ph],i) => (
                <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:10 }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#FFB088,#FF8FA0)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:"#fff", fontWeight:700, flexShrink:0, marginTop:5, fontFamily:"sans-serif" }}>{i+1}</div>
                  <textarea value={val} onChange={e=>setter(e.target.value)} placeholder={ph} rows={2} style={inputStyle} />
                </div>
              ))}
            </Section>

            <Section title="💭 한 줄 메모 (선택)">
              <textarea value={note} onChange={e=>setNote(e.target.value)}
                placeholder="오늘 기억하고 싶은 것, 내일의 나에게 전하는 말..."
                rows={3} style={inputStyle} />
            </Section>

            <Section title="📷 오늘의 사진 (선택)">
              <input type="file" accept="image/*" capture="environment" ref={fileRef} onChange={handlePhotoUpload} style={{ display:"none" }} />
              {photo ? (
                <div style={{ position:"relative", borderRadius:18, overflow:"hidden" }}>
                  <img src={photo} alt="오늘" style={{ width:"100%", display:"block", maxHeight:280, objectFit:"cover" }} />
                  <button onClick={()=>{setPhoto(null);setPhotoName("");}} style={{ position:"absolute", top:10, right:10, background:"rgba(0,0,0,0.48)", border:"none", borderRadius:"50%", width:34, height:34, color:"#fff", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                </div>
              ) : (
                <button onClick={()=>fileRef.current.click()} style={{
                  width:"100%", height:118, border:"2px dashed rgba(200,165,140,0.45)", borderRadius:18,
                  background:"rgba(255,255,255,0.45)", cursor:"pointer",
                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, color:"#C4A882", fontFamily:"sans-serif",
                }}>
                  <span style={{ fontSize:34 }}>📷</span>
                  <span style={{ fontSize:13, fontWeight:700 }}>사진 추가하기</span>
                </button>
              )}
            </Section>

            <button onClick={handleSave} disabled={!emotion} style={{
              width:"100%", padding:"16px", border:"none", borderRadius:20, cursor: emotion ? "pointer" : "not-allowed",
              background: emotion ? "linear-gradient(135deg,#FFB088 0%,#FF8FA0 50%,#C8A8E8 100%)" : "rgba(210,200,195,0.35)",
              color: emotion ? "#fff" : "#C0AFA8",
              fontFamily:"sans-serif", fontSize:16, fontWeight:800, letterSpacing:0.8,
              boxShadow: emotion ? "0 8px 26px rgba(255,135,110,0.32)" : "none",
              transition:"all .2s",
            }}>
              {saved ? "✓ 저장됐어요!" : "오늘의 기록 저장하기"}
            </button>

            {entries[today] && (
              <button onClick={()=>handleShare(entries[today])} style={{
                width:"100%", padding:"14px", border:"1.5px solid rgba(200,170,148,0.4)", borderRadius:20,
                cursor:"pointer", background:"rgba(255,255,255,0.68)", color:"#B0937A",
                fontFamily:"sans-serif", fontSize:15, fontWeight:700, marginTop:12,
                backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
              }}>
                📤 인스타그램 / SNS 공유하기
              </button>
            )}
          </div>
        )}

        {/* ── 히스토리 뷰 ──────────────────────────────── */}
        {view === "history" && !detailEntry && (
          <div style={{ padding:"0 24px" }}>
            {sortedDates.length === 0 ? (
              <div style={{ textAlign:"center", padding:"64px 0", color:"#C4A882", fontFamily:"sans-serif" }}>
                <div style={{ fontSize:52, marginBottom:14 }}>📖</div>
                <div style={{ fontSize:15, lineHeight:1.7 }}>아직 기록이 없어요.<br />첫 번째 일기를 써보세요!</div>
              </div>
            ) : sortedDates.map(date => {
              const e = entries[date];
              return (
                <button key={date} onClick={()=>{ setDetailEntry(e); setView("detail"); }} style={{
                  width:"100%", textAlign:"left", padding:"16px 18px", borderRadius:20, border:"none",
                  background:"rgba(255,255,255,0.74)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)",
                  cursor:"pointer", marginBottom:13,
                  boxShadow:"0 2px 18px rgba(200,155,120,0.10)",
                  display:"flex", alignItems:"center", gap:14,
                  borderLeft:`4.5px solid ${e.emotion?.color ?? "#FFB088"}`,
                }}>
                  <span style={{ fontSize:34 }}>{e.emotion?.emoji ?? "📝"}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, color:"#B0937A", fontFamily:"sans-serif" }}>{formatDate(date)}</div>
                    <div style={{ fontSize:14, color:"#3D2B1F", marginTop:2, fontWeight:700 }}>{e.emotion?.label} · {e.emotionScore}/10</div>
                    <div style={{ fontSize:12, color:"#C4A882", marginTop:3, fontFamily:"sans-serif", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {[e.gratitude1, e.gratitude2, e.gratitude3].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  {e.photo && <img src={e.photo} alt="" style={{ width:54, height:54, borderRadius:12, objectFit:"cover", flexShrink:0 }} />}
                </button>
              );
            })}
          </div>
        )}

        {/* ── 상세 뷰 ──────────────────────────────────── */}
        {view === "detail" && detailEntry && (
          <div style={{ padding:"0 24px" }}>
            <button onClick={()=>{ setView("history"); setDetailEntry(null); }} style={{ background:"none", border:"none", cursor:"pointer", color:"#B0937A", fontFamily:"sans-serif", fontSize:14, padding:"0 0 18px", display:"flex", alignItems:"center", gap:6, fontWeight:700 }}>
              ← 목록으로
            </button>

            <div style={{ background:"rgba(255,255,255,0.8)", borderRadius:26, padding:"26px", backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)", boxShadow:"0 8px 36px rgba(200,155,120,0.13)" }}>
              <div style={{ fontSize:12, color:"#C4A882", fontFamily:"sans-serif", letterSpacing:1 }}>{formatDate(detailEntry.date)}</div>
              <div style={{ display:"flex", alignItems:"center", gap:14, margin:"14px 0 20px" }}>
                <span style={{ fontSize:48 }}>{detailEntry.emotion?.emoji}</span>
                <div>
                  <div style={{ fontSize:22, fontWeight:700, color:"#3D2B1F" }}>{detailEntry.emotion?.label}</div>
                  <div style={{ fontSize:14, color: detailEntry.emotion?.color, fontFamily:"sans-serif", fontWeight:700 }}>감정 점수 {detailEntry.emotionScore} / 10</div>
                </div>
              </div>

              {detailEntry.photo && (
                <img src={detailEntry.photo} alt="" style={{ width:"100%", borderRadius:18, marginBottom:20, maxHeight:270, objectFit:"cover", display:"block" }} />
              )}

              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:12, letterSpacing:2, color:"#C4A882", fontFamily:"sans-serif", marginBottom:10 }}>✨ 감사한 것들</div>
                {[detailEntry.gratitude1, detailEntry.gratitude2, detailEntry.gratitude3].filter(Boolean).map((g,i) => (
                  <div key={i} style={{ display:"flex", gap:10, marginBottom:9, alignItems:"flex-start" }}>
                    <span style={{ color:"#FFB088", fontWeight:800, fontFamily:"sans-serif", flexShrink:0 }}>{i+1}.</span>
                    <span style={{ fontSize:15, color:"#3D2B1F", lineHeight:1.65 }}>{g}</span>
                  </div>
                ))}
              </div>

              {detailEntry.note && (
                <div style={{ padding:"14px 16px", background:"rgba(255,240,228,0.55)", borderRadius:15, borderLeft:"3.5px solid #FFB088", marginBottom:18 }}>
                  <div style={{ fontSize:12, color:"#C4A882", fontFamily:"sans-serif", marginBottom:6 }}>💭 메모</div>
                  <div style={{ fontSize:15, color:"#3D2B1F", lineHeight:1.7 }}>{detailEntry.note}</div>
                </div>
              )}

              <button onClick={()=>handleShare(detailEntry)} style={{
                width:"100%", padding:"14px", border:"1.5px solid rgba(200,168,144,0.4)", borderRadius:18,
                cursor:"pointer", background:"rgba(255,255,255,0.68)", color:"#B0937A",
                fontFamily:"sans-serif", fontSize:15, fontWeight:700,
              }}>
                📤 공유하기
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 공유 토스트 */}
      {shareToast && (
        <div style={{ position:"fixed", bottom:110, left:"50%", transform:"translateX(-50%)", background:"rgba(50,35,25,0.86)", color:"#fff", padding:"12px 26px", borderRadius:99, fontFamily:"sans-serif", fontSize:14, backdropFilter:"blur(10px)", zIndex:200, whiteSpace:"nowrap", boxShadow:"0 4px 20px rgba(0,0,0,0.2)" }}>
          {shareToast}
        </div>
      )}
    </div>
  );
}
