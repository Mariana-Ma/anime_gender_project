// stackedBar.js

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

    buildStackedBar(anime, anime_chars);
}).catch(err => {
    console.error("Data loading error:", err);
});

function buildStackedBar(anime, anime_chars) {
    const mainChars = anime_chars.filter(d =>
        d.role === "Main" && (d.gender === "Male" || d.gender === "Female")
    );

    const animeById = {};
    anime.forEach(d => { animeById[d.anime_id] = d; });

    const container = document.getElementById("stackedbar-plot");
    container.innerHTML = "";

    // Toggle buttons
    const toggleDiv = document.createElement("div");
    toggleDiv.style.marginBottom = "16px";
    toggleDiv.style.display = "flex";
    toggleDiv.style.gap = "8px";

    const modes = [
        { key: "genre", label: "By Genre" },
        { key: "score", label: "By Score" },
        { key: "members", label: "By Popularity" }
    ];

    let currentMode = "genre";

    modes.forEach(mode => {
        const btn = document.createElement("button");
        btn.textContent = mode.label;
        btn.dataset.mode = mode.key;
        btn.style.padding = "6px 16px";
        btn.style.border = "1px solid #ccc";
        btn.style.borderRadius = "4px";
        btn.style.cursor = "pointer";
        btn.style.background = mode.key === currentMode ? "#333" : "#fff";
        btn.style.color = mode.key === currentMode ? "#fff" : "#333";
        btn.style.fontFamily = "system-ui, sans-serif";
        btn.style.fontSize = "13px";
        btn.addEventListener("click", () => {
            currentMode = mode.key;
            toggleDiv.querySelectorAll("button").forEach(b => {
                b.style.background = b.dataset.mode === currentMode ? "#333" : "#fff";
                b.style.color = b.dataset.mode === currentMode ? "#fff" : "#333";
            });
            renderChart(currentMode);
        });
        toggleDiv.appendChild(btn);
    });

    container.appendChild(toggleDiv);

    const plotContainer = document.createElement("div");
    plotContainer.id = "plot-inner";
    container.appendChild(plotContainer);

    const noteEl = document.createElement("p");
    noteEl.style.fontFamily = "system-ui, sans-serif";
    noteEl.style.fontSize = "14px";
    noteEl.style.color = "#999";
    noteEl.style.marginTop = "8px";
    container.appendChild(noteEl);

    function getGenreData() {
        const genreByAnime = {};
        anime.forEach(d => {
            if (d.primary_genre && ALLOWED_GENRES.has(d.primary_genre)) {
                genreByAnime[d.anime_id] = d.primary_genre;
            }
        });

        const counts = {};
        mainChars.forEach(d => {
            const group = genreByAnime[d.anime_id];
            if (!group) return;
            if (!counts[group]) counts[group] = { Male: 0, Female: 0 };
            counts[group][d.gender]++;
        });

        return { counts, fixedOrder: null };
    }

    function getScoreData() {
        const scoreBins = [
            { label: "6.0 – 7.0", min: 6.0, max: 7.0 },
            { label: "7.0 – 7.5", min: 7.0, max: 7.5 },
            { label: "7.5 – 8.0", min: 7.5, max: 8.0 },
            { label: "8.0 – 8.5", min: 8.0, max: 8.5 },
            { label: "8.5+", min: 8.5, max: Infinity },
            //{ label: "9.0+",      min: 9.0, max: Infinity }
        ];

        const counts = {};
        scoreBins.forEach(b => counts[b.label] = { Male: 0, Female: 0 });

        mainChars.forEach(d => {
            const a = animeById[d.anime_id];
            if (!a || !a.score) return;
            const bin = scoreBins.find(b => a.score >= b.min && a.score < b.max);
            if (!bin) return;
            counts[bin.label][d.gender]++;
        });

        return { counts, fixedOrder: scoreBins.map(b => b.label) };
    }

    function getMembersData() {
        const memberBins = [
            { label: "Under 200k",    min: 0,   max: 200000 },
            { label: "200k – 500k",   min: 200000,   max: 500000 },
            { label: "500k – 1M",  min: 500000,  max: 1000000 },
            { label: "1M - 2M",        min: 1000000,  max: 2000000 },
            { label: "2M+",        min: 2000000,  max: Infinity}
        ];

        const counts = {};
        memberBins.forEach(b => counts[b.label] = { Male: 0, Female: 0 });

        mainChars.forEach(d => {
            const a = animeById[d.anime_id];
            if (!a || !a.members) return;
            const bin = memberBins.find(b => a.members >= b.min && a.members < b.max);
            if (!bin) return;
            counts[bin.label][d.gender]++;
        });

        return { counts, fixedOrder: memberBins.map(b => b.label) };
    }

    function buildTidyData(counts, fixedOrder) {
        const tidyData = [];
        const femalePct = {};

        Object.entries(counts).forEach(([group, c]) => {
            const total = c.Male + c.Female;
            if (total === 0) return;
            femalePct[group] = c.Female / total;
            tidyData.push({ group, gender: "Female", value: c.Female / total, count: c.Female, total });
            tidyData.push({ group, gender: "Male",   value: c.Male / total,   count: c.Male,   total });
        });

        const sortedGroups = fixedOrder
            ? fixedOrder.filter(g => counts[g] && (counts[g].Male + counts[g].Female) > 0)
            : Object.keys(femalePct).sort((a, b) => femalePct[b] - femalePct[a]);

        return { tidyData, sortedGroups };
    }

    function renderChart(mode) {
        plotContainer.innerHTML = "";

        let counts, fixedOrder;
        if (mode === "genre")        ({ counts, fixedOrder } = getGenreData());
        else if (mode === "score")   ({ counts, fixedOrder } = getScoreData());
        else                         ({ counts, fixedOrder } = getMembersData());

        const { tidyData, sortedGroups } = buildTidyData(counts, fixedOrder);

        const titles = {
            genre:   "Gender Ratio of Main Characters by Genre",
            score:   "Gender Ratio of Main Characters by Score",
            members: "Gender Ratio of Main Characters by Popularity"
        };

        const subtitles = {
            genre:   "Sorted by % female main characters. Hover bars for details.",
            score:   "From lowest to highest rated anime. Hover bars for details.",
            members: "From niche to mainstream anime. Hover bars for details."
        };

        const titleEl = document.createElement("h3");
        titleEl.textContent = titles[mode];
        titleEl.style.fontFamily = "system-ui, sans-serif";
        titleEl.style.marginBottom = "4px";
        plotContainer.appendChild(titleEl);

        const subtitleEl = document.createElement("p");
        subtitleEl.textContent = subtitles[mode];
        subtitleEl.style.fontFamily = "system-ui, sans-serif";
        subtitleEl.style.fontSize = "13px";
        subtitleEl.style.color = "#666";
        subtitleEl.style.marginBottom = "12px";
        plotContainer.appendChild(subtitleEl);

        const plot = Plot.plot({
            width: 825,
            height: 475,
            marginLeft: 120,
            marginBottom: 60,
            marginTop: 40,
            x: {
                label: "% of Main Characters",
                domain: [0, 1],
                tickFormat: d => `${Math.round(d * 100)}%`,
                grid: true
            },
            y: {
                label: null,
                domain: sortedGroups
            },
            color: {
                domain: ["Female", "Male"],
                range: [GENDER_COLORS.Female, GENDER_COLORS.Male],
                legend: true
            },
            style: {
                fontSize: "14px",
                fontFamily: "system-ui, sans-serif",
                background: "transparent"
            },
            marks: [
                Plot.barX(tidyData, {
                    y: "group",
                    x: "value",
                    fill: "gender",
                    order: ["Female", "Male"],
                    title: d => {
                        const pct = Math.round(d.value * 100);
                        return `${d.group} — ${d.gender}\n${pct}% (${d.count} of ${d.total} main characters)`;
                    }
                }),
                Plot.ruleX([0.5], {
                    stroke: "white",
                    strokeWidth: 2,
                    strokeDasharray: "4,4"
                })
            ]
        });

        plotContainer.appendChild(plot);

        const total = Object.values(counts).reduce((s, c) => s + c.Male + c.Female, 0);
        noteEl.textContent = `Based on ${total.toLocaleString()} main characters across top 2000 anime.`;
    }

    renderChart("genre");
}