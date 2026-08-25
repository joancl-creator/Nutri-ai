const DATA_KEY = "nutri_ai_data";

const NUTRI_AI_API = "https://nutri-ai-api.joancl20122000.workers.dev";

const state = {
  foods: [],
  data: JSON.parse(localStorage.getItem(DATA_KEY) || "null") || {
    profile: {
      name: "Usuario",
      kcal: 2400,
      protein: 160,
      carbs: 250,
      fat: 70
    },
    days: {}
  },
  view: "home",
  selectedDate: new Date().toISOString().slice(0, 10),
  pendingQuickMeal: null
};

const $ = s => document.querySelector(s);

const esc = s =>
  String(s ?? "").replace(
    /[&<>"']/g,
    m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m])
  );

const save = () =>
  localStorage.setItem(DATA_KEY, JSON.stringify(state.data));

const todayISO = () =>
  new Date().toISOString().slice(0, 10);

const today = () =>
  state.selectedDate;

const currentDay = () =>
  state.data.days[today()] || { meals: [] };

const day = () =>
  state.data.days[today()] ||= { meals: [] };


/* =========================
   TOTALES
========================= */

function totals(d = currentDay()) {

  return (d?.meals || [])
    .flatMap(m => m.items || [])
    .reduce(
      (a, i) => ({
        kcal: a.kcal + (Number(i.kcal) || 0),
        p: a.p + (Number(i.p) || 0),
        c: a.c + (Number(i.c) || 0),
        f: a.f + (Number(i.f) || 0)
      }),
      {
        kcal: 0,
        p: 0,
        c: 0,
        f: 0
      }
    );
}


function fmt(n) {
  return Math.round(Number(n) || 0);
}


function pct(v, t) {
  return Math.min(
    100,
    Math.max(
      0,
      t ? v / t * 100 : 0
    )
  );
}


/* =========================
   FECHAS
========================= */

function dateLabel(s = today()) {

  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(
    new Date(s + "T12:00:00")
  );
}


function shortDateLabel(s) {

  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(
    new Date(s + "T12:00:00")
  );
}


/* =========================
   ICONOS
========================= */

function mealIcon(name) {

  return ({
    Desayuno: "☀️",
    Comida: "🍽️",
    Merienda: "☕",
    Cena: "🌙"
  })[name] || "🍴";
}


/* =========================
   NAVEGACIÓN FECHAS
========================= */

function shiftDate(days) {

  const d = new Date(
    today() + "T12:00:00"
  );

  d.setDate(
    d.getDate() + days
  );

  state.selectedDate =
    d.toISOString().slice(0, 10);

  render();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function prevDay() {
  shiftDate(-1);
}


function nextDay() {
  shiftDate(1);
}


function goToday() {

  state.selectedDate =
    todayISO();

  render();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function changeDate(v) {

  if (!v) return;

  state.selectedDate = v;

  render();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function selectDiaryDate(v) {

  state.selectedDate = v;
  state.view = "home";

  render();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================
   REPARAR COMIDAS ANTIGUAS
========================= */

function repairStoredMeals() {

  let changed = false;

  for (const d of Object.values(
    state.data.days || {}
  )) {

    for (const m of d.meals || []) {

      for (const item of m.items || []) {

        const food = state.foods.find(
          f => f.id === item.foodId
        );

        if (
          !food ||
          !Number.isFinite(
            Number(item.qty)
          )
        ) {
          continue;
        }

        const qty = Number(item.qty);

        const factor =
          food.unit === "unidad"
            ? qty
            : qty / 100;

        const values = {
          kcal: food.kcal * factor,
          p: food.p * factor,
          c: food.c * factor,
          f: food.f * factor
        };

        for (
          const key of Object.keys(values)
        ) {

          if (
            Math.abs(
              (Number(item[key]) || 0) -
              values[key]
            ) > 0.001
          ) {

            item[key] =
              values[key];

            changed = true;
          }
        }

        item.label =
          `${food.name} · ${qty}${
            food.unit === "unidad"
              ? " ud"
              : food.unit
          }`;
      }
    }
  }

  if (changed) save();
}


/* =========================
   CARGAR FOODS.JSON
========================= */

fetch("./data/foods.json")
  .then(r => {

    if (!r.ok) {
      throw new Error(
        "foods.json"
      );
    }

    return r.json();
  })

  .then(x => {

    state.foods = x;

    repairStoredMeals();

    render();
  })

  .catch(() => {

    render();

    setTimeout(
      () =>
        showToast(
          "No se pudo cargar la base de alimentos."
        ),
      300
    );
  });


/* =========================
   RENDER PRINCIPAL
========================= */

function render() {

  const t = totals();

  document.documentElement.style.setProperty(
    "--progress",
    pct(
      t.kcal,
      state.data.profile.kcal
    ) + "%"
  );

  $("#app").innerHTML = `

  <main class="app">

    <header class="top">

      <div>

        <div class="brand">
          NUTRI<span>·</span>AI
        </div>

        <div class="date">
          ${esc(dateLabel())}
        </div>

      </div>

      <button
        class="icon-btn"
        onclick="openSettings()"
      >
        ⚙️
      </button>

    </header>


    <div class="date-nav card">

      <button
        class="date-nav-btn"
        onclick="prevDay()"
        aria-label="Día anterior"
      >
        ‹
      </button>

      <button
        class="today-btn"
        onclick="goToday()"
      >
        Hoy
      </button>

      <input
        class="date-picker"
        type="date"
        value="${today()}"
        onchange="changeDate(this.value)"
        aria-label="Seleccionar fecha"
      >

      <button
        class="date-nav-btn"
        onclick="nextDay()"
        aria-label="Día siguiente"
      >
        ›
      </button>

    </div>


    <section
      id="home"
      class="view ${
        state.view === "home"
          ? "active"
          : ""
      }"
    >
      ${homeView()}
    </section>


    <section
      id="add"
      class="view ${
        state.view === "add"
          ? "active"
          : ""
      }"
    >
      ${addView()}
    </section>


    <section
      id="diary"
      class="view ${
        state.view === "diary"
          ? "active"
          : ""
      }"
    >
      ${diaryView()}
    </section>


    <section
      id="ai"
      class="view ${
        state.view === "ai"
          ? "active"
          : ""
      }"
    >
      ${aiView()}
    </section>


    <section
      id="progress"
      class="view ${
        state.view === "progress"
          ? "active"
          : ""
      }"
    >
      ${progressView()}
    </section>


    <nav class="nav">

      ${nav(
        "home",
        "⌂",
        "Inicio"
      )}

      ${nav(
        "add",
        "＋",
        "Añadir"
      )}

      ${nav(
        "diary",
        "▤",
        "Diario"
      )}

      ${nav(
        "ai",
        "✦",
        "IA"
      )}

      ${nav(
        "progress",
        "◌",
        "Progreso"
      )}

    </nav>

  </main>


  <div
    id="modal"
    class="modal-back"
  ></div>

  <div
    id="toast"
    class="toast"
  ></div>

  `;
}


/* =========================
   NAV
========================= */

function nav(id, icon, label) {

  return `
    <button
      class="${
        state.view === id
          ? "active"
          : ""
      }"
      onclick="go('${id}')"
    >

      <span class="nav-icon">
        ${icon}
      </span>

      ${label}

    </button>
  `;
}


/* =========================
   HOME
========================= */

function homeView() {

  const t = totals();
  const p = state.data.profile;

  const rem =
    Math.max(
      0,
      p.kcal - t.kcal
    );

  const d = currentDay();

  return `

  <div class="hero">


    <div class="card progress-card">

      <div
        class="ring"
        style="
          --progress:${pct(
            t.kcal,
            p.kcal
          )}%
        "
      >

        <div class="ring-inner">

          <div class="ring-kcal">
            ${fmt(t.kcal)}
          </div>

          <div class="ring-label">
            de ${fmt(p.kcal)} kcal
          </div>

        </div>

      </div>

    </div>


    <div class="card summary">

      <div class="eyebrow">
        Te quedan
      </div>

      <div class="remaining">
        ${fmt(rem)} kcal
      </div>


      <div class="macro-grid">

        ${macro(
          "Proteína",
          t.p,
          p.protein,
          "g"
        )}

        ${macro(
          "Carbohidratos",
          t.c,
          p.carbs,
          "g"
        )}

        ${macro(
          "Grasas",
          t.f,
          p.fat,
          "g"
        )}

      </div>

    </div>

  </div>


  <div class="section-head">

    <div class="section-title">

      Comidas de ${
        state.selectedDate === todayISO()
          ? "hoy"
          : esc(
              shortDateLabel(
                today()
              )
            )
      }

    </div>

    <button
      class="link-btn"
      onclick="go('add')"
    >
      ＋ Añadir
    </button>

  </div>


  <div class="meal-list">

    ${
      d.meals.length
        ? d.meals
            .map(mealHTML)
            .join("")
        : `
          <div class="card empty">

            <strong>
              Aún no hay comidas
            </strong>

            Añade lo que has comido
            y construiremos tu día.

          </div>
        `
    }

  </div>

  `;
}


function macro(
  name,
  val,
  target,
  unit
) {

  return `
  <div class="macro">

    <div class="macro-name">
      ${name}
    </div>

    <div class="macro-val">
      ${fmt(val)}${unit}
    </div>

    <div class="macro-target">
      / ${fmt(target)}${unit}
    </div>

  </div>
  `;
}


/* =========================
   MEAL HTML
========================= */

function mealHTML(m, i) {

  let t =
    m.items.reduce(
      (a, x) =>
        a +
        (Number(x.kcal) || 0),
      0
    );

  const hasAI =
    m.items.some(
      x =>
        x.foodId === null ||
        x.foodId === undefined
    );

  return `

  <div class="card meal">

    <div class="meal-icon">
      ${mealIcon(m.name)}
    </div>


    <div class="meal-main">

      <div class="meal-name">

        ${esc(m.name)}

        ${
          hasAI
            ? `
              <span
                style="
                  font-size:10px;
                  color:var(--green);
                  margin-left:5px;
                "
              >
                ✦ IA
              </span>
            `
            : ""
        }

      </div>


      <div class="meal-sub">

        ${m.items
          .map(
            x =>
              esc(x.label)
          )
          .join(" · ")}

      </div>

    </div>


    <div class="meal-kcal">
      ${fmt(t)} kcal
    </div>


    <div class="meal-actions">

      <button
        class="mini"
        onclick="editMeal(${i})"
      >
        ✎
      </button>

      <button
        class="mini"
        onclick="removeMeal(${i})"
      >
        ×
      </button>

    </div>

  </div>

  `;
}


/* =========================================================
   AÑADIR
========================================================= */

function addView() {

  return `

  <div class="section-head">

    <div>

      <div class="eyebrow">
        Registro
      </div>

      <div class="section-title">
        ¿Qué has comido?
      </div>

    </div>

  </div>


  <div class="card ai-card">

    <div class="ai-orb">
      ✦
    </div>


    <div class="ai-title">
      Describe tu comida
    </div>


    <div class="ai-text">

      Escribe de forma natural lo que
      has comido y Nutri AI estimará
      las calorías, proteínas,
      carbohidratos y grasas.

    </div>


    <div
      class="field"
      style="margin-top:16px"
    >

      <textarea
        id="quickMealText"
        class="quick-meal-input"
        rows="5"
        placeholder="Ejemplo: He desayunado un bowl de yogur con un puñado de nueces, arándanos y fresas."
      ></textarea>

    </div>


    <div class="chips">

      <button
        class="chip"
        onclick="
          setQuickMealExample(
            'Desayuno'
          )
        "
      >
        ☀️ Desayuno
      </button>


      <button
        class="chip"
        onclick="
          setQuickMealExample(
            'Comida'
          )
        "
      >
        🍽️ Comida
      </button>


      <button
        class="chip"
        onclick="
          setQuickMealExample(
            'Merienda'
          )
        "
      >
        ☕ Merienda
      </button>


      <button
        class="chip"
        onclick="
          setQuickMealExample(
            'Cena'
          )
        "
      >
        🌙 Cena
      </button>

    </div>


    <div class="field">

      <label>
        Tipo de comida
      </label>

      <select id="quickMealType">

        <option>
          Desayuno
        </option>

        <option>
          Comida
        </option>

        <option>
          Merienda
        </option>

        <option>
          Cena
        </option>

      </select>

    </div>


    <button
      class="primary"
      onclick="analyzeQuickMeal()"
    >
      ✦ Calcular y guardar
    </button>


    <div
      id="quickMealResult"
      style="margin-top:14px"
    ></div>

  </div>


  <div class="section-head">

    <div>
      <div class="section-title">
        Introducción exacta
      </div>
    </div>

  </div>


  <div class="card ai-card">

    <div class="ai-text">

      Si quieres introducir cantidades
      exactas, también puedes utilizar
      el buscador completo de alimentos.

    </div>


    <button
      class="secondary"
      onclick="openMeal()"
    >
      ＋ Añadir alimentos manualmente
    </button>

  </div>

  `;
}


/* =========================================================
   DIARIO
========================================================= */

function diaryView() {

  const entries =
    Object.entries(
      state.data.days
    )
    .filter(
      ([, d]) =>
        (d.meals || []).length
    )
    .sort(
      (a, b) =>
        b[0].localeCompare(a[0])
    );

  return `

  <div class="section-head">

    <div>

      <div class="eyebrow">
        Historial
      </div>

      <div class="section-title">
        Tus días
      </div>

    </div>

  </div>


  <div class="card">

    ${
      entries.length

        ? entries
            .map(
              ([date, d]) => {

                const t =
                  totals(d);

                const p =
                  state.data.profile;

                return `

                <button
                  class="day-row day-row-btn"
                  onclick="
                    selectDiaryDate(
                      '${date}'
                    )
                  "
                >

                  <div>

                    <strong>
                      ${esc(
                        dateLabel(date)
                      )}
                    </strong>

                    <div
                      class="bar"
                      style="
                        --w:${pct(
                          t.kcal,
                          p.kcal
                        )}%
                      "
                    >
                      <span></span>
                    </div>

                  </div>


                  <div>

                    <strong>
                      ${fmt(t.kcal)} kcal
                    </strong>

                    <div class="meal-sub">
                      ${fmt(t.p)} g proteína
                    </div>

                  </div>

                </button>

                `;
              }
            )
            .join("")

        : `
          <div class="empty">
            Todavía no tienes historial.
          </div>
        `
    }

  </div>

  `;
}


/* =========================================================
   INTELIGENCIA ARTIFICIAL
========================================================= */

function aiView() {

  const t = totals();
  const p = state.data.profile;

  const rem =
    Math.max(
      0,
      p.kcal - t.kcal
    );

  const rp =
    Math.max(
      0,
      p.protein - t.p
    );

  return `

  <div class="section-head">

    <div>

      <div class="eyebrow">
        Nutri Intelligence
      </div>

      <div class="section-title">
        Tu asistente
      </div>

    </div>

  </div>


  <div class="card ai-card">

    <div class="ai-orb">
      ✦
    </div>


    <div class="ai-title">
      Análisis de hoy
    </div>


    <div
      id="aiTodayText"
      class="ai-text"
    >
      ${getLocalAdvice(
        t,
        p,
        rem,
        rp
      )}
    </div>


    <div class="chips">

      <button
        class="chip"
        onclick="askAIAboutToday()"
      >
        ✦ Analizar con IA
      </button>


      <button
        class="chip"
        onclick="askAIMenu()"
      >
        ✨ Crear menú
      </button>


      <button
        class="chip"
        onclick="askAIHabits()"
      >
        ◈ Analizar hábitos
      </button>

    </div>

  </div>


  <div class="section-head">

    <div class="section-title">
      Preguntas rápidas
    </div>

  </div>


  <div class="card ai-card">

    <div class="chips">

      <button
        class="chip"
        onclick="
          askAIQuestion(
            '¿Qué puedo cenar hoy?'
          )
        "
      >
        ¿Qué puedo cenar?
      </button>


      <button
        class="chip"
        onclick="askAIWeek()"
      >
        Analiza mi semana
      </button>


      <button
        class="chip"
        onclick="
          askAIQuestion(
            'Créame un menú completo para mañana adaptado a mis objetivos.'
          )
        "
      >
        Menú de mañana
      </button>

    </div>

  </div>


  <div id="aiResponseCard"></div>

  `;
}


function getLocalAdvice(
  t,
  p,
  rem,
  rp
) {

  if (rp > 35) {

    return `
      Hoy te quedan ${fmt(rem)} kcal
      y ${fmt(rp)} g de proteína.
      Prioriza una comida rica en
      proteína y ajusta la guarnición
      a tus calorías restantes.
    `;
  }


  if (rp > 0) {

    return `
      Vas muy bien: te quedan
      ${fmt(rp)} g de proteína.
      Elige una comida que complete
      proteína sin pasarte de
      ${fmt(rem)} kcal.
    `;
  }


  return `
    Has alcanzado tu objetivo de
    proteína. Si tienes hambre,
    prioriza volumen y alimentos
    poco densos en calorías.
  `;
}


/* =========================================================
   LLAMADA IA
========================================================= */

async function askNutriAI(message) {

  const card =
    $("#aiResponseCard");

  if (card) {

    card.innerHTML = `

      <div class="card ai-card">

        <div class="ai-orb">
          ✦
        </div>

        <div class="ai-title">
          Nutri AI está pensando...
        </div>

        <div class="ai-text">
          Analizando tus datos...
        </div>

      </div>

    `;
  }


  try {

    const response =
      await fetch(
        NUTRI_AI_API,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            message: message
          })
        }
      );


    const data =
      await response.json();


    if (
      !response.ok ||
      !data.success
    ) {

      throw new Error(
        data?.error ||
        "No se pudo conectar con la IA"
      );
    }


    if (card) {

      const safeText =
        esc(
          data.response || ""
        ).replace(
          /\n/g,
          "<br>"
        );


      card.innerHTML = `

        <div class="card ai-card">

          <div class="ai-orb">
            ✦
          </div>

          <div class="ai-title">
            Nutri AI
          </div>

          <div class="ai-text">
            ${safeText}
          </div>

        </div>

      `;
    }


    return data.response;

  } catch (error) {

    console.error(
      "Nutri AI error:",
      error
    );


    if (card) {

      card.innerHTML = `

        <div class="card ai-card">

          <div class="ai-orb">
            ⚠️
          </div>

          <div class="ai-title">
            No se pudo conectar
          </div>

          <div class="ai-text">

            No hemos podido conectar
            con Nutri AI.
            Comprueba la conexión
            e inténtalo de nuevo.

          </div>

        </div>

      `;
    }


    return null;
  }
}


/* =========================================================
   CONTEXTO DE HOY
========================================================= */

function buildTodayContext() {

  const t = totals();
  const p = state.data.profile;
  const d = currentDay();


  const meals =
    (d.meals || [])
      .map(
        m => ({
          name: m.name,

          foods:
            (m.items || [])
              .map(
                i => ({
                  name: i.label,
                  kcal: fmt(i.kcal),
                  protein: fmt(i.p),
                  carbs: fmt(i.c),
                  fat: fmt(i.f)
                })
              )
        })
      );


  return `

Fecha: ${today()}

Objetivos diarios:

- Calorías: ${fmt(p.kcal)} kcal
- Proteína: ${fmt(p.protein)} g
- Carbohidratos: ${fmt(p.carbs)} g
- Grasas: ${fmt(p.fat)} g

Consumido hoy:

- Calorías: ${fmt(t.kcal)} kcal
- Proteína: ${fmt(t.p)} g
- Carbohidratos: ${fmt(t.c)} g
- Grasas: ${fmt(t.f)} g

Comidas registradas:

${JSON.stringify(
  meals,
  null,
  2
)}

  `;
}


/* =========================================================
   ANÁLISIS HOY
========================================================= */

async function askAIAboutToday() {

  const context =
    buildTodayContext();


  return askNutriAI(`

Analiza mi alimentación de hoy
utilizando los datos reales de
Nutri AI.

${context}

Quiero que analices:

1. Cómo voy respecto a mis objetivos.
2. Si estoy llegando correctamente
   a proteína.
3. Si mis calorías están bien
   encaminadas.
4. Qué debería priorizar en la
   siguiente comida.
5. Si detectas algún desequilibrio
   importante.

Sé práctico, claro y conciso.

No inventes alimentos ni cantidades
que no aparezcan en los datos.

  `);
}


/* =========================================================
   MENÚ
========================================================= */

async function askAIMenu() {

  const context =
    buildTodayContext();


  return askNutriAI(`

Quiero que me ayudes a completar
mi alimentación de hoy.

Estos son mis datos reales:

${context}

Crea una propuesta de comida o
comidas para completar el día
teniendo en cuenta:

- Calorías restantes.
- Proteína restante.
- Carbohidratos.
- Grasas.
- Lo que ya he comido.

Propón cantidades aproximadas.

Indica las calorías y proteína
aproximadas de cada propuesta.

Intenta que sea un menú realista
y fácil de preparar.

  `);
}


/* =========================================================
   HÁBITOS
========================================================= */

async function askAIHabits() {

  const days =
    Object.entries(
      state.data.days || {}
    )
    .sort(
      ([a], [b]) =>
        b.localeCompare(a)
    )
    .slice(0, 14)
    .map(
      ([date, d]) => {

        const t =
          totals(d);

        return {
          date: date,
          kcal: fmt(t.kcal),
          protein: fmt(t.p),
          carbs: fmt(t.c),
          fat: fmt(t.f)
        };
      }
    );


  const p =
    state.data.profile;


  return askNutriAI(`

Analiza mis hábitos alimentarios
utilizando los últimos días
registrados en Nutri AI.

Mis objetivos:

${JSON.stringify(
  p,
  null,
  2
)}

Mi historial:

${JSON.stringify(
  days,
  null,
  2
)}

Busca patrones importantes
relacionados con:

- Calorías.
- Proteína.
- Regularidad.
- Días con exceso.
- Días con déficit.
- Consumo de proteína.
- Qué debería mejorar.

Dame recomendaciones prácticas
y fáciles de aplicar.

  `);
}


async function askAIWeek() {
  return askAIHabits();
}


/* =========================================================
   PREGUNTAS IA
========================================================= */

async function askAIQuestion(
  question
) {

  const context =
    buildTodayContext();


  return askNutriAI(`

Responde a esta pregunta
del usuario:

"${question}"

Ten en cuenta estos datos reales
de Nutri AI:

${context}

Si propones comida, intenta
ajustarla a las calorías y proteína
que todavía me quedan hoy.

Responde de forma clara,
práctica y personalizada.

  `);
}


/* =========================================================
   NUEVA FUNCIÓN:
   REGISTRO DE COMIDA POR FRASE
========================================================= */

function setQuickMealExample(
  type
) {

  const input =
    $("#quickMealText");

  const select =
    $("#quickMealType");


  if (select) {
    select.value = type;
  }


  if (!input) return;


  const examples = {

    Desayuno:
      "He desayunado un bowl de yogur con un puñado de nueces, arándanos y fresas.",

    Comida:
      "He comido salmón con arroz blanco y una ensalada pequeña.",

    Merienda:
      "He merendado un yogur con un plátano y un puñado de nueces.",

    Cena:
      "He cenado pechuga de pollo con patata cocida y ensalada."

  };


  input.value =
    examples[type] || "";
}


/* =========================================================
   ANALIZAR COMIDA ESCRITA
========================================================= */

async function analyzeQuickMeal() {

  const input =
    $("#quickMealText");

  const type =
    $("#quickMealType");

  const result =
    $("#quickMealResult");


  if (!input || !result) {
    return;
  }


  const text =
    input.value.trim();


  if (!text) {

    showToast(
      "Describe primero lo que has comido."
    );

    return;
  }


  result.innerHTML = `

    <div class="ai-text">

      ✦ Analizando tu comida...

    </div>

  `;


  try {

    const response =
      await fetch(
        NUTRI_AI_API,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            message: `

Quiero registrar una comida
en mi diario nutricional.

Tipo de comida:

${type.value}

Descripción del usuario:

"${text}"

Calcula una ESTIMACIÓN razonable de:

- Calorías
- Proteínas
- Carbohidratos
- Grasas

El usuario puede no proporcionar
gramos exactos.

Cuando diga expresiones como:

- un puñado
- una ración
- un plato
- una pequeña cantidad
- una rodaja
- unas fresas
- unos arándanos
- un filete
- una lata
- un bowl

utiliza una cantidad estándar
razonable.

Si no se especifica el tamaño,
utiliza una porción habitual.

No inventes cantidades absurdas.

IMPORTANTE:

Devuelve EXCLUSIVAMENTE JSON válido
con esta estructura:

{
  "mealName":"${type.value}",
  "description":"descripción resumida",
  "kcal":0,
  "p":0,
  "c":0,
  "f":0,
  "items":[
    {
      "name":"alimento",
      "quantity":"cantidad aproximada",
      "kcal":0,
      "p":0,
      "c":0,
      "f":0
    }
  ]
}

Los números deben ser números,
no texto.

No utilices Markdown.

            `

          })
        }
      );


    const data =
      await response.json();


    if (
      !response.ok ||
      !data.success
    ) {

      throw new Error(
        data?.error ||
        "No se pudo analizar la comida"
      );
    }


    let raw =
      data.response || "";


    raw =
      raw
        .replace(
          /^```json/i,
          ""
        )
        .replace(
          /^```/i,
          ""
        )
        .replace(
          /```$/i,
          ""
        )
        .trim();


    const meal =
      JSON.parse(raw);


    if (
      typeof meal.kcal !==
        "number" ||

      typeof meal.p !==
        "number" ||

      typeof meal.c !==
        "number" ||

      typeof meal.f !==
        "number"
    ) {

      throw new Error(
        "Respuesta inválida de IA"
      );
    }


    state.pendingQuickMeal =
      meal;


    result.innerHTML = `

      <div
        class="card"
        style="
          padding:16px;
          margin-top:12px;
        "
      >

        <div class="eyebrow">
          Estimación
        </div>


        <div
          style="
            font-size:25px;
            font-weight:800;
            margin-top:6px;
          "
        >
          ${fmt(meal.kcal)}
          kcal
        </div>


        <div
          class="macro-grid"
          style="margin-top:12px"
        >

          ${macro(
            "Proteína",
            meal.p,
            0,
            "g"
          )}

          ${macro(
            "Carbohidratos",
            meal.c,
            0,
            "g"
          )}

          ${macro(
            "Grasas",
            meal.f,
            0,
            "g"
          )}

        </div>


        <div
          class="ai-text"
          style="
            margin-top:14px;
          "
        >

          ${esc(
            meal.description ||
            text
          )}

        </div>


        ${
          meal.items?.length
            ? `

              <div
                style="
                  margin-top:14px;
                  border-top:1px solid var(--line);
                  padding-top:12px;
                "
              >

                ${meal.items
                  .map(
                    item => `

                    <div
                      style="
                        display:flex;
                        justify-content:space-between;
                        gap:10px;
                        padding:6px 0;
                        font-size:12px;
                      "
                    >

                      <span>
                        ${esc(
                          item.name
                        )}
                        ·
                        ${esc(
                          item.quantity
                        )}
                      </span>

                      <strong>
                        ${fmt(
                          item.kcal
                        )} kcal
                      </strong>

                    </div>

                    `
                  )
                  .join("")}

              </div>

            `
            : ""
        }


        <button
          class="primary"
          onclick="saveQuickMeal()"
        >
          ✓ Añadir al día
        </button>


        <button
          class="secondary"
          onclick="
            document.getElementById(
              'quickMealResult'
            ).innerHTML=''
          "
        >
          Cancelar
        </button>

      </div>

    `;

  } catch (error) {

    console.error(
      "Quick meal error:",
      error
    );


    result.innerHTML = `

      <div class="ai-text">

        ⚠️ No hemos podido interpretar
        la comida.

        Inténtalo describiéndola de
        forma un poco más sencilla.

      </div>

    `;
  }
}


/* =========================================================
   GUARDAR COMIDA DE IA
========================================================= */

function saveQuickMeal() {

  const meal =
    state.pendingQuickMeal;


  if (!meal) {

    showToast(
      "No hay ninguna comida para guardar."
    );

    return;
  }


  const name =
    meal.mealName ||
    "Comida";


  const items =
    (meal.items || [])
      .map(
        item => ({

          foodId: null,

          label:
            `${item.name} · ${item.quantity}`,

          qty: 1,

          kcal:
            Number(item.kcal) || 0,

          p:
            Number(item.p) || 0,

          c:
            Number(item.c) || 0,

          f:
            Number(item.f) || 0

        })
      );


  if (!items.length) {

    items.push({

      foodId: null,

      label:
        meal.description ||
        "Comida estimada por IA",

      qty: 1,

      kcal:
        Number(meal.kcal) || 0,

      p:
        Number(meal.p) || 0,

      c:
        Number(meal.c) || 0,

      f:
        Number(meal.f) || 0

    });
  }


  day().meals.push({

    name: name,

    items: items,

    source: "ai",

    estimated: true

  });


  save();


  state.pendingQuickMeal =
    null;


  state.view =
    "home";


  render();


  showToast(
    `${name} añadida · ${fmt(
      meal.kcal
    )} kcal`
  );
}


/* =========================================================
   PROGRESO
========================================================= */

function progressView() {

  const dates =
    Object.keys(
      state.data.days
    )
    .filter(
      d =>
        (
          state.data.days[d]
            .meals || []
        ).length
    )
    .sort()
    .slice(-7);


  const p =
    state.data.profile;


  const rows =
    dates
      .map(d => {

        const t =
          totals(
            state.data.days[d]
          );


        return `

        <button
          class="day-row day-row-btn"
          onclick="
            selectDiaryDate(
              '${d}'
            )
          "
        >

          <div>

            <strong>

              ${esc(
                new Date(
                  d + "T12:00:00"
                ).toLocaleDateString(
                  "es-ES",
                  {
                    weekday: "short",
                    day: "numeric"
                  }
                )
              )}

            </strong>


            <div
              class="bar"
              style="
                --w:${pct(
                  t.kcal,
                  p.kcal
                )}%
              "
            >

              <span></span>

            </div>

          </div>


          <div>

            <strong>
              ${fmt(t.kcal)}
            </strong>

            <div class="meal-sub">
              ${fmt(t.p)} g P
            </div>

          </div>

        </button>

        `;
      })
      .join("");


  return `

  <div class="section-head">

    <div>

      <div class="eyebrow">
        Evolución
      </div>

      <div class="section-title">
        Progreso
      </div>

    </div>

  </div>


  <div class="stat-grid">


    <div class="card stat">

      <div class="stat-label">
        Objetivo diario
      </div>

      <div class="stat-value">
        ${fmt(p.kcal)} kcal
      </div>

    </div>


    <div class="card stat">

      <div class="stat-label">
        Proteína objetivo
      </div>

      <div class="stat-value">
        ${fmt(p.protein)} g
      </div>

    </div>


  </div>


  <div class="section-head">

    <div class="section-title">
      Últimos 7 días
    </div>

  </div>


  <div class="card">

    ${
      rows ||

      `
      <div class="empty">
        Registra varios días
        para ver tendencias.
      </div>
      `
    }

  </div>

  `;
}


/* =========================================================
   NAVEGACIÓN
========================================================= */

function go(v) {

  state.view = v;

  render();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   MODAL DE ALIMENTOS
========================================================= */

function openMeal(
  defaultName = "Comida",
  existing = null,
  index = -1
) {

  const m =
    existing || {
      name: defaultName,
      items: []
    };


  const options =
    state.foods
      .map(
        f => `

        <option
          value="${esc(f.id)}"
        >
          ${esc(f.name)}
        </option>

        `
      )
      .join("");


  $("#modal").innerHTML = `

  <div class="modal">


    <div class="modal-head">

      <h2>
        ${
          existing
            ? "Editar"
            : "Añadir"
        }
        comida
      </h2>


      <button
        class="icon-btn"
        onclick="closeModal()"
      >
        ×
      </button>

    </div>


    <div class="form-grid">


      <div class="field">

        <label>
          Comida
        </label>

        <select id="mealName">

          ${
            [
              "Desayuno",
              "Comida",
              "Merienda",
              "Cena"
            ]
              .map(
                x => `

                <option
                  ${
                    m.name === x
                      ? "selected"
                      : ""
                  }
                >
                  ${x}
                </option>

                `
              )
              .join("")
          }

        </select>

      </div>


      <div class="field">

        <label>
          Buscar alimento
        </label>

        <input
          id="foodSearch"
          class="food-search"
          placeholder="Ej. arroz, pollo, huevo, papaya..."
          oninput="searchFoods()"
        >

      </div>


      <div
        id="foodResults"
        class="food-results"
      ></div>


      <div id="items">

        ${m.items
          .map(
            (x, i) =>
              itemRow(
                x,
                i,
                options
              )
          )
          .join("")}

      </div>


      <button
        class="secondary"
        onclick="addBlankItem()"
      >
        ＋ Añadir otro alimento
      </button>


      <button
        class="primary"
        onclick="
          saveMeal(${index})
        "
      >
        ${
          existing
            ? "Guardar cambios"
            : "Añadir al día"
        }
      </button>


    </div>

  </div>

  `;


  $("#modal").classList.add(
    "show"
  );
}


/* =========================================================
   FILA DE ALIMENTO
========================================================= */

function itemRow(
  x,
  i,
  options
) {

  return `

  <div
    class="add-row"
    data-row="${i}"
  >

    <select class="food">

      ${options.replace(
        `value="${esc(
          x.foodId
        )}"`,
        `value="${esc(
          x.foodId
        )}" selected`
      )}

    </select>


    <input
      class="qty"
      type="number"
      min="0"
      step="0.1"
      value="${x.qty}"
      placeholder="cantidad"
    >


    <button
      class="remove"
      onclick="
        this.parentElement.remove()
      "
    >
      ×
    </button>

  </div>

  `;
}


/* =========================================================
   AÑADIR FILA
========================================================= */

function addBlankItem() {

  const options =
    state.foods
      .map(
        f => `

        <option
          value="${esc(f.id)}"
        >
          ${esc(f.name)}
        </option>

        `
      )
      .join("");


  $("#items")
    .insertAdjacentHTML(
      "beforeend",

      itemRow(
        {
          foodId:
            state.foods[0]?.id ||
            "",

          qty: 100
        },

        Date.now(),

        options
      )
    );
}


/* =========================================================
   BUSCADOR DE ALIMENTOS
========================================================= */

function searchFoods() {

  const q =
    $("#foodSearch")
      .value
      .toLowerCase()
      .trim();


  const found =
    state.foods
      .filter(
        f =>
          f.name
            .toLowerCase()
            .includes(q)
      )
      .slice(0, 12);


  $("#foodResults").innerHTML =
    q
      ? found
          .map(
            f => `

            <button
              class="food-result"
              onclick="
                addFood(
                  '${esc(f.id)}'
                )
              "
            >

              ${esc(f.name)}

              <small>

                ${f.kcal} kcal ·
                ${f.p} P ·
                ${f.c} C ·
                ${f.f} G /

                ${
                  f.unit === "g"
                    ? "100 g"
                    : f.unit === "ml"
                      ? "100 ml"
                      : f.unit
                }

              </small>

            </button>

            `
          )
          .join("")

      : "";
}


/* =========================================================
   AÑADIR ALIMENTO
========================================================= */

function addFood(id) {

  const f =
    state.foods.find(
      x => x.id === id
    );


  if (!f) return;


  const options =
    state.foods
      .map(
        x => `

        <option
          value="${esc(x.id)}"
        >
          ${esc(x.name)}
        </option>

        `
      )
      .join("");


  $("#items")
    .insertAdjacentHTML(
      "beforeend",

      itemRow(
        {
          foodId: f.id,

          qty:
            f.unit === "unidad"
              ? 1
              : 100
        },

        Date.now(),

        options
      )
    );


  $("#foodSearch").value =
    "";

  $("#foodResults").innerHTML =
    "";
}


/* =========================================================
   GUARDAR COMIDA MANUAL
========================================================= */

function saveMeal(index) {

  const name =
    $("#mealName").value;


  const items =
    [
      ...document.querySelectorAll(
        "#items .add-row"
      )
    ]

    .map(r => {

      const food =
        state.foods.find(
          f =>
            f.id ===
            r.querySelector(
              ".food"
            ).value
        );


      const qty =
        Number(
          r.querySelector(
            ".qty"
          ).value
        ) || 0;


      if (!food) {
        return null;
      }


      const factor =
        food.unit === "unidad"
          ? qty
          : qty / 100;


      return {

        foodId:
          food.id,

        label:
          `${food.name} · ${qty}${
            food.unit ===
            "unidad"
              ? " ud"
              : food.unit
          }`,

        qty: qty,

        kcal:
          food.kcal *
          factor,

        p:
          food.p *
          factor,

        c:
          food.c *
          factor,

        f:
          food.f *
          factor

      };

    })

    .filter(
      x =>
        x &&
        x.qty > 0
    );


  if (!items.length) {

    return showToast(
      "Añade al menos un alimento."
    );
  }


  if (index >= 0) {

    day().meals[index] = {

      name,

      items

    };

  } else {

    day().meals.push({

      name,

      items

    });

  }


  save();

  closeModal();

  state.view =
    "home";

  render();

  showToast(
    "Comida guardada"
  );
}


/* =========================================================
   EDITAR COMIDA
========================================================= */

function editMeal(i) {

  openMeal(
    currentDay()
      .meals[i]
      .name,

    currentDay()
      .meals[i],

    i
  );
}


/* =========================================================
   ELIMINAR COMIDA
========================================================= */

function removeMeal(i) {

  if (
    confirm(
      "¿Eliminar esta comida?"
    )
  ) {

    day()
      .meals
      .splice(i, 1);


    if (
      !day().meals.length
    ) {

      delete state.data.days[
        today()
      ];

    }


    save();

    render();

    showToast(
      "Comida eliminada"
    );
  }
}


/* =========================================================
   MODAL
========================================================= */

function closeModal() {

  $("#modal")?.classList.remove(
    "show"
  );
}


/* =========================================================
   AJUSTES
========================================================= */

function openSettings() {

  const p =
    state.data.profile;


  $("#modal").innerHTML = `

  <div class="modal">


    <div class="modal-head">

      <h2>
        Perfil y objetivos
      </h2>


      <button
        class="icon-btn"
        onclick="closeModal()"
      >
        ×
      </button>

    </div>


    <div class="form-grid">


      <div class="field">

        <label>
          Nombre
        </label>

        <input
          id="sName"
          value="${esc(p.name)}"
        >

      </div>


      <div class="field">

        <label>
          Calorías objetivo / día
        </label>

        <input
          id="sK"
          type="number"
          value="${p.kcal}"
        >

      </div>


      <div class="field">

        <label>
          Proteína / día (g)
        </label>

        <input
          id="sP"
          type="number"
          value="${p.protein}"
        >

      </div>


      <div class="field">

        <label>
          Carbohidratos / día (g)
        </label>

        <input
          id="sC"
          type="number"
          value="${p.carbs}"
        >

      </div>


      <div class="field">

        <label>
          Grasas / día (g)
        </label>

        <input
          id="sF"
          type="number"
          value="${p.fat}"
        >

      </div>


      <button
        class="primary"
        onclick="saveSettings()"
      >
        Guardar objetivos
      </button>


      <button
        class="secondary"
        onclick="exportData()"
      >
        ↓ Exportar copia de seguridad
      </button>


      <button
        class="secondary"
        onclick="
          document
            .getElementById(
              'importFile'
            )
            .click()
        "
      >
        ↑ Importar copia de seguridad
      </button>


      <input
        id="importFile"
        type="file"
        accept="application/json,.json"
        hidden
        onchange="importData(event)"
      >


    </div>

  </div>

  `;


  $("#modal").classList.add(
    "show"
  );
}


/* =========================================================
   GUARDAR AJUSTES
========================================================= */

function saveSettings() {

  Object.assign(
    state.data.profile,

    {

      name:
        $("#sName")
          .value
          .trim() ||
        "Usuario",

      kcal:
        +$("#sK").value ||
        2400,

      protein:
        +$("#sP").value ||
        160,

      carbs:
        +$("#sC").value ||
        250,

      fat:
        +$("#sF").value ||
        70

    }
  );


  save();

  closeModal();

  render();

  showToast(
    "Objetivos actualizados"
  );
}


/* =========================================================
   EXPORTAR
========================================================= */

function exportData() {

  const payload = {

    app: "Nutri AI",

    version: 3,

    exportedAt:
      new Date()
        .toISOString(),

    data:
      state.data

  };


  const blob =
    new Blob(
      [
        JSON.stringify(
          payload,
          null,
          2
        )
      ],
      {
        type:
          "application/json"
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const a =
    document.createElement(
      "a"
    );


  a.href = url;

  a.download =
    `nutri-ai-backup-${todayISO()}.json`;


  document.body.appendChild(
    a
  );

  a.click();

  a.remove();


  URL.revokeObjectURL(
    url
  );


  showToast(
    "Copia de seguridad exportada"
  );
}


/* =========================================================
   IMPORTAR
========================================================= */

function importData(event) {

  const file =
    event.target.files?.[0];


  if (!file) return;


  const reader =
    new FileReader();


  reader.onload = () => {

    try {

      const parsed =
        JSON.parse(
          reader.result
        );


      const data =
        parsed.data ||
        parsed;


      if (

        !data ||

        typeof data !==
          "object" ||

        !data.profile ||

        typeof data.days !==
          "object"

      ) {

        throw new Error(
          "Formato"
        );
      }


      if (
        !confirm(
          "La importación reemplazará los datos actuales. ¿Continuar?"
        )
      ) {

        return;
      }


      state.data = {

        profile: {

          name:
            String(
              data.profile.name ||
              "Usuario"
            ),

          kcal:
            Number(
              data.profile.kcal
            ) || 2400,

          protein:
            Number(
              data.profile.protein
            ) || 160,

          carbs:
            Number(
              data.profile.carbs
            ) || 250,

          fat:
            Number(
              data.profile.fat
            ) || 70

        },

        days:
          data.days

      };


      repairStoredMeals();

      save();

      closeModal();

      render();

      showToast(
        "Datos importados correctamente"
      );

    } catch (e) {

      showToast(
        "El archivo no es una copia válida de Nutri AI."
      );
    }
  };


  reader.readAsText(
    file
  );
}


/* =========================================================
   TOAST
========================================================= */

function showToast(t) {

  const x =
    $("#toast");


  if (!x) return;


  x.textContent = t;

  x.classList.add(
    "show"
  );


  setTimeout(
    () =>
      x.classList.remove(
        "show"
      ),
    2300
  );
}


/* =========================================================
   FUNCIONES GLOBALES
========================================================= */

window.go =
  go;

window.openMeal =
  openMeal;

window.closeModal =
  closeModal;

window.searchFoods =
  searchFoods;

window.addFood =
  addFood;

window.addBlankItem =
  addBlankItem;

window.saveMeal =
  saveMeal;

window.editMeal =
  editMeal;

window.removeMeal =
  removeMeal;

window.openSettings =
  openSettings;

window.saveSettings =
  saveSettings;

window.showToast =
  showToast;

window.prevDay =
  prevDay;

window.nextDay =
  nextDay;

window.goToday =
  goToday;

window.changeDate =
  changeDate;

window.selectDiaryDate =
  selectDiaryDate;

window.exportData =
  exportData;

window.importData =
  importData;


/* IA */

window.askAIAboutToday =
  askAIAboutToday;

window.askAIMenu =
  askAIMenu;

window.askAIHabits =
  askAIHabits;

window.askAIWeek =
  askAIWeek;

window.askAIQuestion =
  askAIQuestion;


/* NUEVA ENTRADA RÁPIDA */

window.setQuickMealExample =
  setQuickMealExample;

window.analyzeQuickMeal =
  analyzeQuickMeal;

window.saveQuickMeal =
  saveQuickMeal;


/* =========================================================
   CERRAR MODAL TOCANDO FUERA
========================================================= */

window.addEventListener(
  "click",
  e => {

    if (
      e.target.id ===
      "modal"
    ) {

      closeModal();

    }

  }
);


/* =========================================================
   SERVICE WORKER
========================================================= */

if (
  "serviceWorker" in
  navigator
) {

  navigator.serviceWorker
    .register(
      "./sw.js"
    )
    .catch(() => {});

}
