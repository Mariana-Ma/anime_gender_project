// lineChart.js

Promise.all([
    d3.csv("../cleaned_data/anime.csv", d3.autoType),
    d3.csv("../data/anime_characters.csv", d3.autoType),
    d3.csv("../cleaned_data/character_personalities_final.csv", d3.autoType)
]).then(([anime, anime_chars, chars]) => {
    const genderByChar = {};
    chars.forEach(c => {
        genderByChar[c.character_id] = c.gender;
    });
    anime_chars.forEach(d => {
        d.gender = genderByChar[d.character_id] ?? null;
    });

    buildLineChart(anime, anime_chars);
}).catch(err => {
    console.error("Data loading error:", err);
});

function buildLineChart(anime, anime_chars) {
    // Extract year from start_date
    const animeById = {};
    anime.forEach(d => {
        if (d.start_date) {
            d.year = new Date(d.start_date).getFullYear();
        }
        animeById[d.anime_id] = d;
    });

    // Only main characters with known gender
    const mainChars = anime_chars.filter(d =>
        d.role === "Main" &&
        (d.gender === "Male" || d.gender === "Female")
    );

    // Count male/female main chars per year
    const yearCounts = {};
    mainChars.forEach(d => {
        const a = animeById[d.anime_id];
        if (!a || !a.year) return;
        if (!yearCounts[a.year]) yearCounts[a.year] = { Male: 0, Female: 0 };
        yearCounts[a.year][d.gender]++;
    });

    // Build tidy data, filter to years with enough data
    const rows = Object.entries(yearCounts)
        .map(([year, counts]) => {
            const total = counts.Male + counts.Female;
            return {
                year: +year,
                femalePct: counts.Female / total,
                total,
                femaleCount: counts.Female,
                maleCount: counts.Male
            };
        })
        .filter(d => d.year >= 1990 && d.year <= 2024 && d.total >= 10)
        .sort((a, b) => a.year - b.year);

    // 5-year rolling average for smoothing
    const smoothed = rows.map((d, i) => {
        const window = rows.slice(Math.max(0, i - 2), i + 3);
        const avg = d3.mean(window, w => w.femalePct);
        return { ...d, smoothed: avg };
    });

    const container = document.getElementById("linechart-plot");
    container.innerHTML = "";

    const titleEl = document.createElement("h3");
    titleEl.textContent = "Female Representation Among Main Characters Over Time";
    titleEl.style.fontFamily = "system-ui, sans-serif";
    titleEl.style.marginBottom = "4px";
    container.appendChild(titleEl);

    const subtitleEl = document.createElement("p");
    subtitleEl.textContent = "% of main characters that are female per year (1990–2024). Line shows 5-year rolling average.";
    subtitleEl.style.fontFamily = "system-ui, sans-serif";
    subtitleEl.style.fontSize = "13px";
    subtitleEl.style.color = "#666";
    subtitleEl.style.marginBottom = "12px";
    container.appendChild(subtitleEl);

    const plot = Plot.plot({
        width: 900,
        height: 450,
        marginLeft: 60,
        marginBottom: 50,
        marginTop: 40,
        x: {
            label: "Year →",
            tickFormat: d => `${d}`,
            grid: true
        },
        y: {
            label: "% Female Main Characters →",
            domain: [0, 1],
            tickFormat: d => `${Math.round(d * 100)}%`,
            grid: true
        },
        style: {
            fontSize: "14px",
            fontFamily: "system-ui, sans-serif",
            background: "transparent"
        },
        marks: [
            // 50% reference line
            Plot.ruleY([0.5], {
                stroke: "#aaa",
                strokeWidth: 1,
                strokeDasharray: "4,4"
            }),
            // Raw dots per year
            Plot.dot(rows, {
                x: "year",
                y: "femalePct",
                fill: "#e5b2ed",
                fillOpacity: 0.4,
                r: 4,
                title: d => `${d.year}\n${Math.round(d.femalePct * 100)}% female\n(${d.femaleCount} female, ${d.maleCount} male)`
            }),
            // Smoothed line
            Plot.line(smoothed, {
                x: "year",
                y: "smoothed",
                stroke: "#e75480",
                strokeWidth: 3
            }),
            // Area under smoothed line
            Plot.areaY(smoothed, {
                x: "year",
                y: "smoothed",
                y2: 0,
                fill: "#e75480",
                fillOpacity: 0.08
            }),
            // Annotation at 50% line
            Plot.text([{ year: 1991, femalePct: 0.51 }], {
                x: "year",
                y: "femalePct",
                text: () => "50% parity",
                fill: "#aaa",
                fontSize: 11,
                dy: -8
            })
        ]
    });

    container.appendChild(plot);

    const noteEl = document.createElement("p");
    noteEl.style.fontFamily = "system-ui, sans-serif";
    noteEl.style.fontSize = "12px";
    noteEl.style.color = "#999";
    noteEl.style.marginTop = "8px";
    noteEl.textContent = `Based on ${mainChars.length.toLocaleString()} main characters from top 2000 anime (years with fewer than 10 main characters excluded).`;
    container.appendChild(noteEl);
}