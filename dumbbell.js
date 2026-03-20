// dumbbell.js

dataReady.then(() => {
    buildDumbbell(TOP2000_ANIME, TOP2000_ANIME_CHARS, CHARACTERS);
}).catch(err => {
    console.error("Data loading error:", err);
});

function buildDumbbell(anime, anime_chars, chars) {
    // Build gender lookup
    const genderByChar = {};
    chars.forEach(c => {
        genderByChar[c.character_id] = c.gender;
    });

    const scrapedCharIds = new Set(chars.map(c => c.character_id));

    // Assign gender to anime_chars
    anime_chars.forEach(d => {
        d.gender = genderByChar[d.character_id] ?? null;
    });

    // Filter to known gender, known role, from scraped set
    const validChars = anime_chars.filter(d =>
        (d.gender === "Male" || d.gender === "Female") &&
        (d.role === "Main" || d.role === "Supporting") &&
        scrapedCharIds.has(d.character_id)
    );

    const animeById = {};
    anime.forEach(d => { animeById[d.anime_id] = d; });

    const container = document.getElementById("dumbbell-plot");
    container.innerHTML = "";

    // Toggle: Gender 
    const genderToggleDiv = document.createElement("div");
    genderToggleDiv.style.cssText = `margin-bottom: 16px; display: flex; gap: 8px;`;

    let currentGender = "Female";

    const makeBtn = (label, isActive, onClick) => {
        const btn = document.createElement("button");
        btn.textContent = label;
        btn.style.cssText = `
            padding: 6px 16px; border: 1px solid #ccc;
            border-radius: 4px; cursor: pointer;
            font-family: system-ui, sans-serif; font-size: 13px;
            background: ${isActive ? "#333" : "#fff"};
            color: ${isActive ? "#fff" : "#333"};
        `;
        btn.addEventListener("click", onClick);
        return btn;
    };

    ["Female", "Male"].forEach(gender => {
        const color = gender === "Female" ? GENDER_COLORS.Female : GENDER_COLORS.Male;
        const btn = makeBtn(gender, gender === currentGender, () => {
            currentGender = gender;
            updateGenderButtons();
            renderChart();
        });
        btn.dataset.gender = gender;
        btn.style.background = gender === currentGender ? color : "#fff";
        btn.style.color = gender === currentGender ? "#fff" : "#333";
        btn.style.borderColor = gender === currentGender ? color : "#ccc";
        genderToggleDiv.appendChild(btn);
    });

    container.appendChild(genderToggleDiv);

    const plotContainer = document.createElement("div");
    plotContainer.id = "dumbbell-inner";
    container.appendChild(plotContainer);

    const noteEl = document.createElement("p");
    noteEl.style.cssText = `font-family: system-ui, sans-serif; font-size: 12px; color: #999; margin-top: 8px;`;
    container.appendChild(noteEl);

    function updateGenderButtons() {
        genderToggleDiv.querySelectorAll("button").forEach(b => {
            const isActive = b.dataset.gender === currentGender;
            const color = b.dataset.gender === "Female" ? GENDER_COLORS.Female : GENDER_COLORS.Male;
            b.style.background  = isActive ? color : "#fff";
            b.style.color       = isActive ? "#fff" : "#333";
            b.style.borderColor = isActive ? color : "#ccc";
        });
    }

    const scoreBins = [
        { label: "8.5+",      min: 8.5, max: Infinity },
        { label: "8.0 – 8.5", min: 8.0, max: 8.5 },
        { label: "7.5 – 8.0", min: 7.5, max: 8.0 },
        { label: "7.0 – 7.5", min: 7.0, max: 7.5 },
        { label: "6.0 – 7.0", min: 6.0, max: 7.0 }
    ];

    function getBinnedData(gender) {
        const counts = {};
        scoreBins.forEach(b => {
            counts[b.label] = {
                Main:       { Male: 0, Female: 0 },
                Supporting: { Male: 0, Female: 0 }
            };
        });

        validChars.forEach(d => {
            const a = animeById[d.anime_id];
            if (!a || !a.score) return;
            const bin = scoreBins.find(b => a.score >= b.min && a.score < b.max);
            if (!bin) return;
            counts[bin.label][d.role][d.gender]++;
        });

        const rows = [];
        scoreBins.forEach(b => {
            const roles = counts[b.label];
            const total = roles.Main[gender] + roles.Supporting[gender];
            if (total === 0) return;

            const mainPct = roles.Main[gender] / total;
            const suppPct = roles.Supporting[gender] / total;

            rows.push({
                label:      b.label,
                main:       mainPct,
                supporting: suppPct,
                mainCount:  roles.Main[gender],
                suppCount:  roles.Supporting[gender],
                total,
                gap:        mainPct - suppPct
            });
        });

        return rows;
    }

    function renderChart() {
        plotContainer.innerHTML = "";

        const rows = getBinnedData(currentGender);
        const labels = rows.map(r => r.label);

        const dotColor  = currentGender === "Female" ? GENDER_COLORS.Female : GENDER_COLORS.Male;
        const suppColor = currentGender === "Female" ? "#f0a8c0" : "#a8c0f0";

        const dotData = rows.flatMap(r => [
            { label: r.label, value: r.main,        role: "Main",       count: r.mainCount, total: r.total },
            { label: r.label, value: r.supporting,  role: "Supporting", count: r.suppCount, total: r.total }
        ]);

        const segData = rows.map(r => ({
            label: r.label,
            x1: r.main,
            x2: r.supporting,
            gap: r.gap
        }));

        const titleEl = document.createElement("h3");
        titleEl.textContent = `${currentGender} Characters: Main vs Supporting Role by Score`;
        titleEl.style.cssText = `font-family: system-ui, sans-serif; margin-bottom: 4px;`;
        plotContainer.appendChild(titleEl);

        const subtitleEl = document.createElement("p");
        subtitleEl.textContent = `Of all ${currentGender.toLowerCase()} characters in each score tier, what % are main vs supporting? Click on the dots to learn more.`;
        subtitleEl.style.cssText = `font-family: system-ui, sans-serif; font-size: 13px; color: #666; margin-bottom: 12px;`;
        plotContainer.appendChild(subtitleEl);

        const plot = Plot.plot({
            width: 800,
            height: 350,
            marginLeft: 120,
            marginBottom: 40,
            marginTop: 30,
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
                Plot.link(segData, {
                    y: "label",
                    x1: "x1",
                    x2: "x2",
                    stroke: d => d.gap > 0.02 ? dotColor : d.gap < -0.02 ? suppColor : "#ccc",
                    strokeWidth: 2.5,
                    strokeOpacity: 0.6
                }),
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
                Plot.ruleX([0.5], {
                    stroke: "#aaa",
                    strokeWidth: 1,
                    strokeDasharray: "4,4"
                }),
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
        
        const yLabelEl = document.createElement("p");
        yLabelEl.textContent = "Average Score (1-10) ↑";
        yLabelEl.style.cssText = `
            font-family: system-ui, sans-serif;
            font-size: 14px;
            margin: 0 0 -40px 60px;
        `;
        plotContainer.appendChild(yLabelEl);

        plotContainer.appendChild(plot);

        const legendDiv = plot.querySelector("div");
        if (legendDiv) {
            legendDiv.style.cssText = `
                position: absolute;
                top: 0;
                right: 350px;
                font-family: system-ui, sans-serif;
                font-size: 13px;
            `;
            plot.style.position = "relative";
        }

        // Tooltip
        const tooltip = document.createElement("div");
        tooltip.style.cssText = `
            position: fixed;
            background: white;
            border: 1px solid #eee;
            border-radius: 8px;
            padding: 10px 14px;
            font-family: system-ui, sans-serif;
            font-size: 13px;
            color: #333;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            pointer-events: none;
            display: none;
            z-index: 100;
            line-height: 1.8;
            max-width: 240px;
        `;
        document.body.appendChild(tooltip);

        const dots = plot.querySelectorAll("circle");
        dots.forEach((dot, i) => {
            const d = dotData[i];
            if (!d) return;

            dot.style.cursor = "pointer";
            dot.addEventListener("mouseover", () => dot.setAttribute("r", 11));
            dot.addEventListener("mouseout", () => dot.setAttribute("r", 8));

            dot.addEventListener("click", (e) => {
                e.stopPropagation();
                const pct = Math.round(d.value * 100);
                const otherPct = 100 - pct;
                const otherRole = d.role === "Main" ? "Supporting" : "Main";
                const roleColor = d.role === "Main" ? dotColor : suppColor;

                tooltip.style.display = "block";
                tooltip.style.left = `${e.clientX + 14}px`;
                tooltip.style.top  = `${e.clientY - 10}px`;
                tooltip.innerHTML = `
                    <strong>${d.label} score range</strong><br>
                    <span style="color:${roleColor}">
                        <strong>${pct}%</strong> of ${currentGender.toLowerCase()} characters
                        are <strong>${d.role.toLowerCase()}</strong>
                    </span><br>
                    <span style="color:#aaa">${otherPct}% are ${otherRole.toLowerCase()}</span><br>
                    <span style="color:#bbb;font-size:11px">${d.count} of ${d.total} ${currentGender.toLowerCase()} chars</span>
                `;
            });
        });

        document.addEventListener("click", () => {
            tooltip.style.display = "none";
        });

        const total = validChars.filter(d => d.gender === currentGender).length;
        noteEl.textContent = `Based on ${total.toLocaleString()} ${currentGender.toLowerCase()} characters across top 2000 anime.`;
    }

    renderChart();
}