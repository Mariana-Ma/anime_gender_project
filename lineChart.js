// lineChart.js

dataReady.then(() => {
    buildLineChart(TOP2000_ANIME, TOP2000_ANIME_CHARS);
}).catch(err => {
    console.error("Data loading error:", err);
});

function buildLineChart(anime, anime_chars) {
    const animeById = {};
    anime.forEach(d => {
        if (d.start_date) {
            d.year = new Date(d.start_date).getFullYear();
        }
        animeById[d.anime_id] = d;
    });

    const mainChars = anime_chars.filter(d =>
        d.role === "Main" &&
        (d.gender === "Male" || d.gender === "Female")
    );

    console.log("Total main chars:", mainChars.length);
    console.log("Female:", mainChars.filter(d => d.gender === "Female").length);
    console.log("Male:", mainChars.filter(d => d.gender === "Male").length);
    const yearCounts = {};
    mainChars.forEach(d => {
        const a = animeById[d.anime_id];
        if (!a || !a.year) return;
        if (!yearCounts[a.year]) yearCounts[a.year] = { Male: 0, Female: 0 };
        yearCounts[a.year][d.gender]++;
    });

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
    subtitleEl.innerHTML = "% of anime per year where ≥50% of main characters are female (1990–2024). Line shows 5-year rolling average.<br>Dots show the raw % of female MCs for that year.<br>Click on a dot to see more details.";    
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
            label: "% Female Main Characters ↑",
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
            Plot.ruleY([0.5], {
                stroke: "#aaa",
                strokeWidth: 1,
                strokeDasharray: "4,4"
            }),
            Plot.line(smoothed, {
                x: "year",
                y: "smoothed",
                stroke: "#e75480",
                strokeWidth: 3
            }),
            Plot.areaY(smoothed, {
                x: "year",
                y: "smoothed",
                y2: 0,
                fill: "#e75480",
                fillOpacity: 0.08
            }),
            Plot.dot(rows, {
                x: "year",
                y: "femalePct",
                fill: "#e5b2ed",
                fillOpacity: 0.4,
                r: 4
            }),
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
        line-height: 1.6;
    `;
    document.body.appendChild(tooltip);

    const dots = plot.querySelectorAll("circle");
    dots.forEach((dot, i) => {
        const d = rows[i];
        if (!d) return;

        dot.style.cursor = "pointer";
        dot.addEventListener("mouseover", () => dot.setAttribute("r", 7));
        dot.addEventListener("mouseout", () => dot.setAttribute("r", 4));

        dot.addEventListener("click", (e) => {
            tooltip.style.display = "block";
            tooltip.style.left = `${e.clientX + 12}px`;
            tooltip.style.top  = `${e.clientY - 10}px`;
            tooltip.innerHTML = `
                <strong>${d.year}</strong><br>
                Female: <span style="color:#e75480">${Math.round(d.femalePct * 100)}%</span>
                (${d.femaleCount} chars)<br>
                Male: <span style="color:#4a90e2">${Math.round((1 - d.femalePct) * 100)}%</span>
                (${d.maleCount} chars)<br>
                <span style="color:#aaa;font-size:11px">${d.total} total main chars</span>
            `;
        });
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest("circle")) {
            tooltip.style.display = "none";
        }
    });

    const noteEl = document.createElement("p");
    noteEl.style.fontFamily = "system-ui, sans-serif";
    noteEl.style.fontSize = "12px";
    noteEl.style.color = "#999";
    noteEl.style.marginTop = "8px";
    noteEl.textContent = 
    `Based on ${mainChars.length.toLocaleString()} main characters from top 
    2000 anime (years with fewer than 10 main characters excluded).`;
    container.appendChild(noteEl);
}