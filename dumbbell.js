// dumbbell.js

Promise.all([
    d3.csv("cleaned_data/anime.csv", d3.autoType),
    d3.csv("data/anime_characters.csv", d3.autoType),
    d3.csv("cleaned_data/character_personalities_final.csv", d3.autoType)
]).then(([anime, anime_chars, chars]) => {
    const genderByChar = {};
    chars.forEach(c => {
        genderByChar[c.character_id] = c.gender;
    });
    anime_chars.forEach(d => {
        d.gender = genderByChar[d.character_id] ?? null;
    });

    buildDumbbell(anime, anime_chars);
}).catch(err => {
    console.error("Data loading error:", err);
});

function buildDumbbell(anime, anime_chars) {
    const validChars = anime_chars.filter(d =>
        (d.gender === "Male" || d.gender === "Female") &&
        (d.role === "Main" || d.role === "Supporting")
    );

    const animeById = {};
    anime.forEach(d => { animeById[d.anime_id] = d; });

    const container = document.getElementById("dumbbell-plot");
    container.innerHTML = "";

    // --- Toggle row 1: Bin mode ---
    const binToggleDiv = document.createElement("div");
    binToggleDiv.style.marginBottom = "8px";
    binToggleDiv.style.display = "flex";
    binToggleDiv.style.gap = "8px";

    const binModes = [
        { key: "members", label: "By Popularity" },
        { key: "score",   label: "By Score" }
    ];

    let currentBinMode = "members";
    let currentGender = "Female";

    const makeBtn = (label, isActive, onClick) => {
        const btn = document.createElement("button");
        btn.textContent = label;
        btn.style.padding = "6px 16px";
        btn.style.border = "1px solid #ccc";
        btn.style.borderRadius = "4px";
        btn.style.cursor = "pointer";
        btn.style.fontFamily = "system-ui, sans-serif";
        btn.style.fontSize = "13px";
        btn.style.background = isActive ? "#333" : "#fff";
        btn.style.color = isActive ? "#fff" : "#333";
        btn.addEventListener("click", onClick);
        return btn;
    };

    // Bin mode buttons
    binModes.forEach(mode => {
        const btn = makeBtn(mode.label, mode.key === currentBinMode, () => {
            currentBinMode = mode.key;
            updateBinButtons();
            renderChart();
        });
        btn.dataset.binMode = mode.key;
        binToggleDiv.appendChild(btn);
    });

    // --- Toggle row 2: Gender ---
    const genderToggleDiv = document.createElement("div");
    genderToggleDiv.style.marginBottom = "16px";
    genderToggleDiv.style.display = "flex";
    genderToggleDiv.style.gap = "8px";

    ["Female", "Male"].forEach(gender => {
        const btn = makeBtn(gender, gender === currentGender, () => {
            currentGender = gender;
            updateGenderButtons();
            renderChart();
        });
        btn.dataset.gender = gender;
        btn.style.background = gender === currentGender
            ? (gender === "Female" ? GENDER_COLORS.Female : GENDER_COLORS.Male)
            : "#fff";
        btn.style.color = gender === currentGender ? "#fff" : "#333";
        btn.style.borderColor = gender === currentGender
            ? (gender === "Female" ? GENDER_COLORS.Female : GENDER_COLORS.Male)
            : "#ccc";
        genderToggleDiv.appendChild(btn);
    });

    container.appendChild(binToggleDiv);
    container.appendChild(genderToggleDiv);

    const plotContainer = document.createElement("div");
    plotContainer.id = "dumbbell-inner";
    container.appendChild(plotContainer);

    const noteEl = document.createElement("p");
    noteEl.style.fontFamily = "system-ui, sans-serif";
    noteEl.style.fontSize = "12px";
    noteEl.style.color = "#999";
    noteEl.style.marginTop = "8px";
    container.appendChild(noteEl);

    function updateBinButtons() {
        binToggleDiv.querySelectorAll("button").forEach(b => {
            const isActive = b.dataset.binMode === currentBinMode;
            b.style.background = isActive ? "#333" : "#fff";
            b.style.color = isActive ? "#fff" : "#333";
        });
    }

    function updateGenderButtons() {
        genderToggleDiv.querySelectorAll("button").forEach(b => {
            const isActive = b.dataset.gender === currentGender;
            const color = b.dataset.gender === "Female" ? GENDER_COLORS.Female : GENDER_COLORS.Male;
            b.style.background = isActive ? color : "#fff";
            b.style.color = isActive ? "#fff" : "#333";
            b.style.borderColor = isActive ? color : "#ccc";
        });
    }

    const memberBins = [
        { label: "Under 10k",   min: 0,      max: 10000   },
        { label: "10k – 50k",   min: 10000,  max: 50000   },
        { label: "50k – 200k",  min: 50000,  max: 200000  },
        { label: "200k – 500k", min: 200000, max: 500000  },
        { label: "500k+",       min: 500000, max: Infinity }
    ];

    const scoreBins = [
        { label: "6.0 – 7.0", min: 6.0, max: 7.0      },
        { label: "7.0 – 7.5", min: 7.0, max: 7.5      },
        { label: "7.5 – 8.0", min: 7.5, max: 8.0      },
        { label: "8.0 – 8.5", min: 8.0, max: 8.5      },
        { label: "8.5+",      min: 8.5, max: Infinity  }
    ];

    function getBinnedData(binMode, gender) {
        const bins = binMode === "members" ? memberBins : scoreBins;

        const counts = {};
        bins.forEach(b => {
            counts[b.label] = {
                Main:       { Male: 0, Female: 0 },
                Supporting: { Male: 0, Female: 0 }
            };
        });

        validChars.forEach(d => {
            const a = animeById[d.anime_id];
            if (!a) return;
            const val = binMode === "members" ? a.members : a.score;
            if (!val) return;
            const bin = bins.find(b => val >= b.min && val < b.max);
            if (!bin) return;
            counts[bin.label][d.role][d.gender]++;
        });

        const rows = [];
        bins.forEach(b => {
            const roles = counts[b.label];

            const total = roles.Main[gender] + roles.Supporting[gender];
            if (total === 0) return;

            const mainPct = roles.Main[gender] / total;
            const suppPct = roles.Supporting[gender] / total;

            rows.push({
                label:     b.label,
                main:      mainPct,
                supporting: suppPct,
                mainCount: roles.Main[gender],
                suppCount: roles.Supporting[gender],
                total,
                gap:       mainPct - suppPct  // positive = more main than supporting
            });
        });

        return rows;
    }

    function renderChart() {
        plotContainer.innerHTML = "";

        const rows = getBinnedData(currentBinMode, currentGender);
        const labels = rows.map(r => r.label);

        const dotColor = currentGender === "Female" ? GENDER_COLORS.Female : GENDER_COLORS.Male;
        const suppColor = currentGender === "Female" ? "#f0a8c0" : "#a8c0f0";

        const dotData = rows.flatMap(r => [
            { label: r.label, value: r.main,       role: "Main",       count: r.mainCount, total: r.total },
            { label: r.label, value: r.supporting,  role: "Supporting", count: r.suppCount, total: r.total }
        ]);

        const segData = rows.map(r => ({
            label: r.label,
            x1: r.main,
            x2: r.supporting,
            gap: r.gap
        }));

        const titles = {
            members: `${currentGender} Characters: Main vs Supporting Role by Popularity`,
            score:   `${currentGender} Characters: Main vs Supporting Role by Score`
        };

        const subtitles = {
            members: `Of all ${currentGender.toLowerCase()} characters in each popularity tier, what % are main vs supporting? A gap where supporting > main suggests sidelining.`,
            score:   `Of all ${currentGender.toLowerCase()} characters in each score tier, what % are main vs supporting? A gap where supporting > main suggests sidelining.`
        };

        const titleEl = document.createElement("h3");
        titleEl.textContent = titles[currentBinMode];
        titleEl.style.fontFamily = "system-ui, sans-serif";
        titleEl.style.marginBottom = "4px";
        plotContainer.appendChild(titleEl);

        const subtitleEl = document.createElement("p");
        subtitleEl.textContent = subtitles[currentBinMode];
        subtitleEl.style.fontFamily = "system-ui, sans-serif";
        subtitleEl.style.fontSize = "13px";
        subtitleEl.style.color = "#666";
        subtitleEl.style.marginBottom = "12px";
        plotContainer.appendChild(subtitleEl);

        const plot = Plot.plot({
            width: 900,
            height: 380,
            marginLeft: 120,
            marginBottom: 40,
            marginTop: 40,
            x: {
                label: `% of ${currentGender.toLowerCase()} characters in this role →`,
                domain: [0, 1],
                tickFormat: d => `${Math.round(d * 100)}%`,
                grid: true
            },
            y: {
                label: null,
                domain: labels
            },
            color: {
                domain: ["Main", "Supporting"],
                range: [dotColor, suppColor],
                legend: true
            },
            style: {
                fontSize: "14px",
                fontFamily: "system-ui, sans-serif",
                background: "transparent"
            },
            marks: [
                // Connecting lines
                Plot.link(segData, {
                    y: "label",
                    x1: "x1",
                    x2: "x2",
                    stroke: d => d.gap > 0.02 ? dotColor : d.gap < -0.02 ? suppColor : "#ccc",
                    strokeWidth: 2.5,
                    strokeOpacity: 0.6
                }),

                // Dots
                Plot.dot(dotData, {
                    y: "label",
                    x: "value",
                    fill: "role",
                    r: 8,
                    title: d => {
                        const pct = Math.round(d.value * 100);
                        return `${d.label} — ${d.role}\n${pct}% of ${currentGender.toLowerCase()} chars (${d.count} of ${d.total})`;
                    }
                }),

                // 50% reference line
                Plot.ruleX([0.5], {
                    stroke: "#aaa",
                    strokeWidth: 1,
                    strokeDasharray: "4,4"
                }),

                // Gap annotations
                Plot.text(rows, {
                    y: "label",
                    x: d => (d.main + d.supporting) / 2,
                    text: d => {
                        const gapPct = Math.round(Math.abs(d.gap) * 100);
                        return gapPct > 2 ? `${gapPct}%` : "";
                    },
                    dy: -12,
                    fontSize: 11,
                    fill: "#888"
                })
            ]
        });

        plotContainer.appendChild(plot);

        noteEl.textContent = `Based on ${validChars.filter(d => d.gender === currentGender).length.toLocaleString()} ${currentGender.toLowerCase()} characters across top 2000 anime.`;
    }

    renderChart();
}