// traits.js

d3.json("cleaned_data/trait_stats.json").then(data => {
    buildTraitCharts(data);
});

function buildTraitCharts(data) {
    buildBarChart(data);
    buildDotPlot(data);
}

function buildBarChart(data) {
    const container = document.getElementById("traits-bar-plot");
    container.innerHTML = "";

    const titleEl = document.createElement("h3");
    titleEl.textContent = "Most Gendered Personality Traits in Anime";
    titleEl.style.fontFamily = "system-ui, sans-serif";
    titleEl.style.marginBottom = "4px";
    container.appendChild(titleEl);

    const subtitleEl = document.createElement("p");
    subtitleEl.textContent = "Selected traits with strong gender skew and high occurrence count. Bars show % of characters of that gender described with each trait.";
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

    // Top 6 most common for females by count
    const femaleTraits = [...data]
    .sort((a, b) => b.female_count - a.female_count)
    .slice(0, 8)
    .map(d => d.trait)
    .filter(t => !maleTraits.includes(t))
    .filter(t => t !== "popular");; // remove duplicates

    // Order: male traits at top (most male-skewed first), female at bottom
    const traitOrder = [...maleTraits, ...femaleTraits]
    .map(t => data.find(d => d.trait === t))
    .filter(Boolean)
    .sort((a, b) => a.female_share - b.female_share)  // most male-skewed first
    .map(d => d.trait);

    // Filter data to just these traits
    const traitByName = {};
    data.forEach(d => { traitByName[d.trait] = d; });

    const selected = traitOrder
        .filter(t => traitByName[t])
        .map(t => traitByName[t]);

    // Build diverging data — male goes negative, female positive
    const divergingData = selected.flatMap(d => [
        { trait: d.trait, value: -d.male_pct,  gender: "Male",   display: d.male_pct,   female_share: d.female_share, section: maleTraits.includes(d.trait) ? "male" : "female" },
        { trait: d.trait, value:  d.female_pct, gender: "Female", display: d.female_pct, female_share: d.female_share, section: maleTraits.includes(d.trait) ? "male" : "female" }
    ]);

    const maxVal = d3.max(selected, d => Math.max(d.male_pct, d.female_pct));

    const plot = Plot.plot({
        width: 900,
        height: 420,
        marginLeft: 90,
        marginRight: 80,
        marginBottom: 50,
        marginTop: 30,
        x: {
            label: "← Male   |   Female →",
            domain: [-maxVal * 1.15, maxVal * 1.15],
            tickFormat: d => `${Math.round(Math.abs(d) * 100)}%`,
            grid: true
        },
        y: {
            label: null,
            domain: traitOrder
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
            // Separator line between male and female trait sections
            Plot.ruleY(["tsundere"], {
                stroke: "#ddd",
                strokeWidth: 1,
                strokeDasharray: "4,4",
                y1: d => d,
                dy: 14
            }),

            // Center line
            Plot.ruleX([0], {
                stroke: "#999",
                strokeWidth: 1.5
            }),

            // Diverging bars
            Plot.barX(divergingData, {
                y: "trait",
                x1: 0,
                x2: "value",
                fill: "gender",
                title: d => {
                    const pct = Math.round(d.display * 100);
                    const femalePct = Math.round(d.female_share * 100);
                    return `${d.trait} — ${d.gender}\n${pct}% of ${d.gender.toLowerCase()} characters\n${femalePct}% of all occurrences are female`;
                }
            }),

            /*
            // Value labels
            Plot.text(divergingData, {
                y: "trait",
                x: "value",
                text: d => `${Math.round(d.display * 100)}%`,
                dx: d => d.gender === "Male" ? -4 : 4,
                textAnchor: d => d.gender === "Male" ? "end" : "start",
                fontSize: 13,
                fill: "#555"
            })
            */
        ]
    });

    const plotContainer = document.createElement("div");
    container.appendChild(plotContainer);
    plotContainer.appendChild(plot);

    // Section labels
    const labelDiv = document.createElement("div");
    labelDiv.style.display = "flex";
    labelDiv.style.justifyContent = "space-between";
    labelDiv.style.fontFamily = "system-ui, sans-serif";
    labelDiv.style.fontSize = "12px";
    labelDiv.style.color = "#888";
    labelDiv.style.marginTop = "4px";
    plotContainer.appendChild(labelDiv);

    const noteEl = document.createElement("p");
    noteEl.style.fontFamily = "system-ui, sans-serif";
    noteEl.style.fontSize = "12px";
    noteEl.style.color = "#999";
    noteEl.style.marginTop = "8px";
    noteEl.textContent = "Traits selected based on both strength of gender skew and total occurrence count. Males skew toward competence and control; females toward appearance, emotion and anime archetypes.";
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
function buildDotPlot(data) {
    const container = document.getElementById("traits-dot-plot");
    container.innerHTML = "";

    const titleEl = document.createElement("h3");
    titleEl.textContent = "Personality Profile: Male vs Female Characters";
    titleEl.style.fontFamily = "system-ui, sans-serif";
    titleEl.style.marginBottom = "4px";
    container.appendChild(titleEl);

    const subtitleEl = document.createElement("p");
    subtitleEl.textContent = "Most common traits overall. Bars show difference in % — positive means more common in male characters, negative means more common in female characters.";
    subtitleEl.style.fontFamily = "system-ui, sans-serif";
    subtitleEl.style.fontSize = "13px";
    subtitleEl.style.color = "#666";
    subtitleEl.style.marginBottom = "12px";
    container.appendChild(subtitleEl);

    // Top 8 for each gender, union, deduplicated
    const topMaleTraits = [...data]
        .sort((a, b) => b.male_count - a.male_count)
        .slice(0, 8)
        .map(d => d.trait);

    const topFemaleTraits = [...data]
        .sort((a, b) => b.female_count - a.female_count)
        .slice(0, 8)
        .map(d => d.trait);

    const selectedTraits = [...new Set([...topMaleTraits, ...topFemaleTraits])];

    const traitByName = {};
    data.forEach(d => { traitByName[d.trait] = d; });

    // Build rows with gap = male_pct - female_pct
    const rows = selectedTraits
        .filter(t => traitByName[t])
        .map(t => {
            const d = traitByName[t];
            return {
                trait: t,
                male_pct: d.male_pct,
                female_pct: d.female_pct,
                male_count: d.male_count,
                female_count: d.female_count,
                total: d.total,
                gap: d.male_pct - d.female_pct  // positive = more male
            };
        })
        .sort((a, b) => b.gap - a.gap);  // most male at top, most female at bottom

    const traitOrder = rows.map(r => r.trait);
    const maxAbs = d3.max(rows, r => Math.abs(r.gap));

    const plot = Plot.plot({
        width: 900,
        height: 420,
        marginLeft: 110,
        marginRight: 60,
        marginBottom: 60,
        marginTop: 30,
        x: {
            label: "← More common in females   |   More common in males →",
            domain: [-maxAbs * 1.3, maxAbs * 1.3],
            tickFormat: d => `${d > 0 ? "+" : ""}${d.toFixed(1)}%`,
            grid: true,
            labelOffset: 45
        },
        y: {
            label: null,
            domain: traitOrder
        },
        style: {
            fontSize: "13px",
            fontFamily: "system-ui, sans-serif",
            background: "transparent"
        },
        marks: [
            // Center line
            Plot.ruleX([0], {
                stroke: "#999",
                strokeWidth: 1.5
            }),

            // Bars from 0
            Plot.barX(rows, {
                y: "trait",
                x1: 0,
                x2: "gap",
                fill: d => d.gap > 0 ? GENDER_COLORS.Male : GENDER_COLORS.Female,
                fillOpacity: 0.8,
                title: d => {
                    const gap = d.gap.toFixed(1);
                    return `${d.trait}\nMale: ${d.male_pct.toFixed(1)}% (${d.male_count} chars)\nFemale: ${d.female_pct.toFixed(1)}% (${d.female_count} chars)\nGap: ${gap > 0 ? "+" : ""}${gap}%`;
                }
            }),

            // Dots at the end of each bar
            Plot.dot(rows, {
                y: "trait",
                x: "gap",
                fill: d => d.gap > 0 ? GENDER_COLORS.Male : GENDER_COLORS.Female,
                r: 6,
                title: d => `${d.trait}: ${d.gap > 0 ? "+" : ""}${d.gap.toFixed(1)}% (${d.gap > 0 ? "more male" : "more female"})`
            }),

            // Value labels
            Plot.text(rows, {
                y: "trait",
                x: "gap",
                text: d => `${d.gap > 0 ? "+" : ""}${d.gap.toFixed(1)}%`,
                dx: d => d.gap > 0 ? 8 : -8,
                textAnchor: d => d.gap > 0 ? "start" : "end",
                fontSize: 11,
                fill: d => d.gap > 0 ? GENDER_COLORS.Male : GENDER_COLORS.Female
            }),

            // Sample size annotations
            Plot.text(rows, {
                y: "trait",
                x: -maxAbs * 1.3,
                text: d => `n=${d.total}`,
                textAnchor: "start",
                fontSize: 10,
                fill: "#bbb",
                dx: 2
            })
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
    noteEl.textContent = "Shows top 8 most common traits for each gender (union). Gap = male% minus female%. n = total characters with that trait.";
    container.appendChild(noteEl);
}