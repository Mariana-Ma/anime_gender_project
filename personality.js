// traits.js

d3.json("cleaned_data/trait_stats.json").then(data => {
    buildTraitCharts(data);
});

function buildTraitCharts(data) {
    buildBarChart(data);
}

function buildBarChart(data) {
    const container = document.getElementById("traits-bar-plot");
    container.innerHTML = "";

    const titleEl = document.createElement("h3");
    titleEl.textContent = "Most Common Personality Traits by Gender";
    titleEl.style.fontFamily = "system-ui, sans-serif";
    titleEl.style.marginBottom = "4px";
    container.appendChild(titleEl);

    const subtitleEl = document.createElement("p");
    subtitleEl.textContent = "Top traits for male and female characters. Bars show % of characters of that gender described with each trait.";
    subtitleEl.style.fontFamily = "system-ui, sans-serif";
    subtitleEl.style.fontSize = "13px";
    subtitleEl.style.color = "#666";
    subtitleEl.style.marginBottom = "12px";
    container.appendChild(subtitleEl);

    // Top 6 most common for males by count
    const maleTraits = [...data]
        .sort((a, b) => b.male_count - a.male_count)
        .slice(0, 7)
        .map(d => d.trait)
        .filter(t => t !== "popular");

    // Top 6 most common for females by count, no duplicates
    const femaleTraits = [...data]
        .sort((a, b) => b.female_count - a.female_count)
        .slice(0, 8)
        .map(d => d.trait)
        .filter(t => !maleTraits.includes(t))
        .filter(t => t !== "popular");

    // Sort by female_share ascending - most male-skewed at top
    const traitOrder = [...maleTraits, ...femaleTraits]
        .map(t => data.find(d => d.trait === t))
        .filter(Boolean)
        .sort((a, b) => a.female_share - b.female_share)
        .map(d => d.trait);

    const traitByName = {};
    data.forEach(d => { traitByName[d.trait] = d; });

    // Build tidy data — one row per trait per gender
    const tidyData = traitOrder
        .filter(t => traitByName[t])
        .flatMap(t => {
            const d = traitByName[t];
            return [
                { trait: t, gender: "Male",   value: d.male_pct*100,   count: d.male_count,   female_share: d.female_share },
                { trait: t, gender: "Female", value: d.female_pct*100, count: d.female_count, female_share: d.female_share }
            ];
        });

    const maxVal = d3.max(tidyData, d => d.value);

    const plot = Plot.plot({
        width: 900,
        height: 420,
        marginLeft: 50,
        marginRight: 20,
        marginBottom: 60,
        marginTop: 30,
        x: {
            axis: null,
            label: null,
            tickFormat: () => ""  // hide Female/Male labels under each group
        },
        fx: {
            label: null,
            domain: traitOrder,
            padding: 0.3
        },
        y: {
            label: "% of characters →",
            tickFormat: d => d + "%", 
            grid: true,
        },
        color: {
            domain: ["Female", "Male"],
            range: [GENDER_COLORS.Female, GENDER_COLORS.Male],
            legend: true
        },
        style: {
            fontSize: "13px",
            fontFamily: "system-ui, sans-serif",
            background: "transparent"
        },
        marks: [
            Plot.barY(tidyData, {
                fx: "trait",
                x: "gender",
                y: "value",
                fill: "gender",
                title: d => `${d.trait} — ${d.gender}\n${d.value.toFixed(1)}% of ${d.gender.toLowerCase()} characters\n(${d.count} characters)`
            }),
            Plot.ruleY([0])
        ]
    });

    const plotContainer = document.createElement("div");
    container.appendChild(plotContainer);
    plotContainer.appendChild(plot);

    const noteEl = document.createElement("p");
    noteEl.style.fontFamily = "system-ui, sans-serif";
    noteEl.style.fontSize = "12px";
    noteEl.style.color = "#999";
    noteEl.style.marginTop = "8px";
    noteEl.textContent = "Top traits by count for male and female characters. Sorted from most male-skewed (top) to most female-skewed (bottom).";
    container.appendChild(noteEl);
}

/*
function buildRadarChart(data) {
    const container = document.getElementById("traits-radar-plot");
    container.innerHTML = "";

    const titleEl = document.createElement("h3");
    titleEl.textContent = "Personality Profile: Male vs Female Characters";
    titleEl.style.fontFamily = "system-ui, sans-serif";
    titleEl.style.marginBottom = "4px";
    container.appendChild(titleEl);

    const subtitleEl = document.createElement("p");
    subtitleEl.textContent = "Top 12 most common traits for each gender, showing % of characters with that trait. Larger area = more characters described that way.";
    subtitleEl.style.fontFamily = "system-ui, sans-serif";
    subtitleEl.style.fontSize = "13px";
    subtitleEl.style.color = "#666";
    subtitleEl.style.marginBottom = "12px";
    container.appendChild(subtitleEl);

    // Pick top 12 traits by total frequency
    const top12 = [...data]
        .sort((a, b) => b.total - a.total)
        .slice(0, 12);

    const traits = top12.map(d => d.trait);
    const n = traits.length;
    const cx = 400, cy = 280, r = 220;

    // Scale
    const maxVal = d3.max(top12, d => Math.max(d.male_pct, d.female_pct));
    const scale = r / maxVal;

    function getPoints(values) {
        return values.map((v, i) => {
            const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
            const dist = v * scale;
            return [cx + dist * Math.cos(angle), cy + dist * Math.sin(angle)];
        });
    }

    const maleValues = top12.map(d => d.male_pct);
    const femaleValues = top12.map(d => d.female_pct);

    const malePoints = getPoints(maleValues);
    const femalePoints = getPoints(femaleValues);

    function pointsToPath(pts) {
        return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + " Z";
    }

    // Grid circles
    const gridLevels = [0.25, 0.5, 0.75, 1.0];

    const gridCircles = gridLevels.map(level => {
        const pts = traits.map((_, i) => {
            const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
            const dist = level * r;
            return [cx + dist * Math.cos(angle), cy + dist * Math.sin(angle)];
        });
        return `<polygon points="${pts.map(p => p.join(",")).join(" ")}" 
                    fill="none" stroke="#ddd" stroke-width="1"/>`;
    }).join("\n");

    // Axis lines and labels
    const axes = traits.map((trait, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const x2 = cx + r * Math.cos(angle);
        const y2 = cy + r * Math.sin(angle);
        const lx = cx + (r + 28) * Math.cos(angle);
        const ly = cy + (r + 28) * Math.sin(angle);
        const anchor = Math.cos(angle) > 0.1 ? "start" : Math.cos(angle) < -0.1 ? "end" : "middle";
        return `
            <line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" 
                  stroke="#ddd" stroke-width="1"/>
            <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" 
                  text-anchor="${anchor}" dominant-baseline="middle"
                  font-size="12" font-family="system-ui, sans-serif" fill="#555">${trait}</text>
        `;
    }).join("\n");

    // Grid labels
    const gridLabels = gridLevels.map(level => {
        const y = cy - level * r;
        const pct = Math.round(level * maxVal * 100);
        return `<text x="${cx + 4}" y="${y.toFixed(1)}" font-size="10" fill="#aaa" 
                      font-family="system-ui, sans-serif">${pct}%</text>`;
    }).join("\n");

    const svg = `
    <svg width="800" height="560" xmlns="http://www.w3.org/2000/svg">
        ${gridCircles}
        ${axes}
        ${gridLabels}

        <!-- Male polygon -->
        <path d="${pointsToPath(malePoints)}" 
              fill="${GENDER_COLORS.Male}" fill-opacity="0.25" 
              stroke="${GENDER_COLORS.Male}" stroke-width="2.5"/>

        <!-- Female polygon -->
        <path d="${pointsToPath(femalePoints)}" 
              fill="${GENDER_COLORS.Female}" fill-opacity="0.25" 
              stroke="${GENDER_COLORS.Female}" stroke-width="2.5"/>

        <!-- Male dots -->
        ${malePoints.map((p, i) => `
            <circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4" 
                    fill="${GENDER_COLORS.Male}">
                <title>${traits[i]}: ${Math.round(maleValues[i] * 100)}% of male chars</title>
            </circle>`).join("")}

        <!-- Female dots -->
        ${femalePoints.map((p, i) => `
            <circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4" 
                    fill="${GENDER_COLORS.Female}">
                <title>${traits[i]}: ${Math.round(femaleValues[i] * 100)}% of female chars</title>
            </circle>`).join("")}

        <!-- Legend -->
        <rect x="20" y="20" width="12" height="12" fill="${GENDER_COLORS.Male}" fill-opacity="0.6"/>
        <text x="38" y="31" font-size="13" font-family="system-ui, sans-serif" fill="#333">Male</text>
        <rect x="20" y="42" width="12" height="12" fill="${GENDER_COLORS.Female}" fill-opacity="0.6"/>
        <text x="38" y="53" font-size="13" font-family="system-ui, sans-serif" fill="#333">Female</text>
    </svg>`;

    container.innerHTML += svg;

    const noteEl = document.createElement("p");
    noteEl.style.fontFamily = "system-ui, sans-serif";
    noteEl.style.fontSize = "12px";
    noteEl.style.color = "#999";
    noteEl.style.marginTop = "8px";
    noteEl.textContent = "Top 12 traits by total frequency. Values show % of characters of that gender described with each trait.";
    container.appendChild(noteEl);
}
*/
