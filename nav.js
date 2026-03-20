// nav.js

document.addEventListener("DOMContentLoaded", () => {
    const sections = document.querySelectorAll("section");

    // Create nav container
    const nav = document.createElement("div");
    nav.style.cssText = `
        position: fixed;
        right: 24px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        flex-direction: column;
        gap: 12px;
        z-index: 1000;
    `;
    document.body.appendChild(nav);

    // Create one dot per section
    const dots = [];
    sections.forEach((section, i) => {
        const dot = document.createElement("button");
        dot.title = section.querySelector("h2, h3")?.textContent || `Section ${i + 1}`;
        dot.style.cssText = `
            width: 10px;
            height: 10px;
            border-radius: 50%;
            border: 2px solid #e75480;
            background: transparent;
            cursor: pointer;
            padding: 0;
            transition: background 0.2s ease, transform 0.2s ease;
        `;
        dot.addEventListener("click", () => {
            section.scrollIntoView({ behavior: "smooth" });
        });
        dot.addEventListener("mouseover", () => {
            dot.style.transform = "scale(1.4)";
        });
        dot.addEventListener("mouseout", () => {
            dot.style.transform = "scale(1)";
        });
        nav.appendChild(dot);
        dots.push(dot);
    });

    // Highlight active dot based on scroll position
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const i = Array.from(sections).indexOf(entry.target);
            if (entry.isIntersecting) {
                dots.forEach(d => d.style.background = "transparent");
                dots[i].style.background = "#e75480";
            }
        });
    }, { threshold: 0.4 });

    sections.forEach(section => observer.observe(section));
});