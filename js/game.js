const SAVE_KEY = "bioquest_save_v1";
const state = { view: "home", difficulty: "facil", amount: 10, deck: [], index: 0, score: 0, streak: 0, answered: false, selected: null, showMore: false, history: [] };
const $ = (id) => document.getElementById(id);
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function show(view) {
  state.view = view;
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  const el = $(view);
  if (el) el.classList.add("active");
}
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.style.display = "block";
  setTimeout(() => (t.style.display = "none"), 1800);
}
function countByDiff() {
  const c = { facil: 0, medio: 0, dificil: 0 };
  QUESTIONS.forEach((q) => c[q.difficulty]++);
  return c;
}
function renderHomeCounts() {
  const c = countByDiff();
  $("n-facil").textContent = c.facil + " preguntas";
  $("n-medio").textContent = c.medio + " preguntas";
  $("n-dificil").textContent = c.dificil + " preguntas";
  $("n-total").textContent = QUESTIONS.length;
  const saved = loadSave();
  $("btn-continue").style.display = saved ? "inline-block" : "none";
}
function startGame(diff, amount) {
  state.difficulty = diff;
  let pool = getByDifficulty(diff);
  pool = shuffle(pool);
  const n = Math.min(amount, pool.length);
  state.amount = n;
  state.deck = pool.slice(0, n);
  state.index = 0; state.score = 0; state.streak = 0;
  state.answered = false; state.selected = null; state.showMore = false; state.history = [];
  saveGame(); renderQuestion(); show("play");
}
function currentQ() { return state.deck[state.index]; }
function renderQuestion() {
  const q = currentQ();
  if (!q) return finish();
  state.answered = false; state.selected = null; state.showMore = false;
  $("q-text").textContent = q.q;
  $("q-meta").textContent = `Unidad ${q.unit} · ${q.topic} · ${labelDiff(q.difficulty)}`;
  $("progress-label").textContent = `${state.index + 1} / ${state.deck.length}`;
  $("score-label").textContent = `Puntos: ${state.score}`;
  $("streak-label").textContent = state.streak >= 2 ? `Racha x${state.streak}` : "Racha: —";
  $("bar-fill").style.width = `${(state.index / state.deck.length) * 100}%`;
  const box = $("options"); box.innerHTML = "";
  q.options.forEach((opt, i) => {
    const b = document.createElement("button");
    b.className = "opt";
    b.textContent = String.fromCharCode(65 + i) + ")  " + opt;
    b.onclick = () => choose(i);
    box.appendChild(b);
  });
  $("feedback").style.display = "none";
  $("btn-next").style.display = "none";
  $("btn-more").style.display = "none";
  $("more-box").classList.remove("show");
}
function labelDiff(d) { return { facil: "Fácil", medio: "Medio", dificil: "Difícil" }[d] || d; }
function choose(i) {
  if (state.answered) return;
  state.answered = true; state.selected = i;
  const q = currentQ();
  const ok = i === q.correct;
  if (ok) {
    state.score += q.difficulty === "dificil" ? 15 : q.difficulty === "medio" ? 10 : 5;
    state.streak += 1;
    if (state.streak === 3) toast("¡Racha de 3! 🔥");
    if (state.streak === 5) toast("¡Imparable! 🧬");
  } else state.streak = 0;
  state.history.push({ q: q.q, ok, topic: q.topic });
  const buttons = [...$("options").children];
  buttons.forEach((b, idx) => {
    b.disabled = true;
    if (idx === q.correct) b.classList.add("correct");
    else if (idx === i && !ok) b.classList.add("wrong");
    else b.classList.add("dim");
  });
  const fb = $("feedback");
  fb.style.display = "block";
  fb.className = "feedback " + (ok ? "ok" : "no");
  fb.innerHTML = ok
    ? `<h4>✅ ¡Correcto! ${streakPhrase()}</h4><p>${q.explanation}</p>`
    : `<h4>❌ Casi. La respuesta correcta era la ${String.fromCharCode(65 + q.correct)}.</h4><p>${q.explanation}</p>`;
  $("more-box").textContent = q.more;
  $("more-box").classList.remove("show");
  $("btn-more").style.display = "inline-block";
  $("btn-more").textContent = "Ver más del tema";
  $("btn-next").style.display = "inline-block";
  $("btn-next").textContent = state.index + 1 >= state.deck.length ? "Ver resultados" : "Siguiente";
  saveGame();
}
function streakPhrase() {
  if (state.streak >= 5) return "¡Eres una mitocondria de energía!";
  if (state.streak >= 3) return "¡Qué buena adaptación!";
  return "Sigue así.";
}
function toggleMore() {
  const box = $("more-box");
  const show = !box.classList.contains("show");
  box.classList.toggle("show", show);
  $("btn-more").textContent = show ? "Ocultar extra" : "Ver más del tema";
}
function next() {
  if (state.index + 1 >= state.deck.length) finish();
  else { state.index += 1; saveGame(); renderQuestion(); }
}
function finish() {
  clearSave(); show("result");
  const total = state.deck.length;
  const aciertos = state.history.filter((h) => h.ok).length;
  const pct = total ? Math.round((aciertos / total) * 100) : 0;
  $("res-score").textContent = `${aciertos}/${total}`;
  $("res-pct").textContent = pct + "%";
  $("res-points").textContent = state.score + " pts";
  let msg = "Buen intento. Repasa los temas marcados y vuelve a jugar.";
  let emoji = "📘";
  if (pct === 100) { msg = "¡Genoma perfecto! Dominas este nivel."; emoji = "🏆"; }
  else if (pct >= 80) { msg = "Excelente. Ya casi eres una célula eucariota de libro."; emoji = "🌟"; }
  else if (pct >= 60) { msg = "Vas bien. Un poco más de estudio y subes de nivel."; emoji = "💪"; }
  $("res-emoji").textContent = emoji;
  $("res-msg").textContent = msg;
  const fails = state.history.filter((h) => !h.ok);
  const box = $("res-fails");
  if (!fails.length) box.innerHTML = "<p>No tuviste errores. ¡Increíble!</p>";
  else box.innerHTML = "<h3>Para repasar</h3>" + fails.map((f) => `<div class="diff-card" style="margin-top:8px"><strong>${f.topic}</strong><p>${f.q}</p></div>`).join("");
}
function pauseGame() { saveGame(); show("paused"); }
function resumeGame() {
  const s = loadSave();
  if (!s) { show("home"); return; }
  Object.assign(state, s);
  if (state.index >= state.deck.length) { finish(); return; }
  renderQuestion(); show("play");
}
function saveGame() {
  const data = { difficulty: state.difficulty, amount: state.amount, deck: state.deck, index: state.index, score: state.score, streak: state.streak, history: state.history, savedAt: Date.now() };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) {}
}
function loadSave() {
  try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
function goHome() { show("home"); renderHomeCounts(); }
function init() {
  renderHomeCounts(); show("home");
  $("btn-facil").onclick = () => startGame("facil", numQuestions());
  $("btn-medio").onclick = () => startGame("medio", numQuestions());
  $("btn-dificil").onclick = () => startGame("dificil", numQuestions());
  $("btn-mixto").onclick = () => startGame("mixto", numQuestions());
  $("btn-continue").onclick = resumeGame;
  $("btn-temario").onclick = () => show("temario");
  $("btn-how").onclick = () => show("how");
  $("btn-next").onclick = next;
  $("btn-more").onclick = toggleMore;
  $("btn-pause").onclick = pauseGame;
  $("btn-resume").onclick = resumeGame;
  $("btn-quit").onclick = () => { if (confirm("¿Salir? La partida queda guardada.")) goHome(); };
  $("btn-abandon").onclick = () => { clearSave(); goHome(); };
  $("btn-again").onclick = () => startGame(state.difficulty, state.amount);
  ["btn-home1", "btn-home3", "btn-home4"].forEach((id) => { const el = $(id); if (el) el.onclick = goHome; });
}
function numQuestions() {
  const v = parseInt($("amount").value, 10);
  return Number.isFinite(v) ? v : 10;
}
document.addEventListener("DOMContentLoaded", init);
