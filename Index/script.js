document.addEventListener('DOMContentLoaded', () => {
    // 1. Configuration (les "props" de ton ancien fichier)
    const config = {
        background: "#000000",
        dotColor: "#FFFFFF",
        lineColor: "#80ACFF",
        trailColor: "#2664EB",
        spacing: 30,
        radius: 400,
        strength: 4,
        trail: true
    };

    // 2. Récupération des éléments DOM
    const host = document.getElementById("kinetic-container");
    const canvas = document.getElementById("kinetic-canvas");
    const ctx = canvas.getContext("2d");

    if (!host || !canvas || !ctx) return;

    // 3. Initialisation des variables
    const GAP = Math.max(8, config.spacing);
    const R = Math.max(1, config.radius);
    const PULL = (Math.max(1, Math.min(10, config.strength)) / 10) * 4;

    let W = 1;
    let H = 1;
    let cols = [];
    let dots = [];
    
    // Variables pour la souris et la traînée
    let mouse = { x: -9999, y: -9999, active: false };
    let trailArr = [];

    // 4. Fonction de construction de la grille
    const build = (mw, mh) => {
        const rect = host.getBoundingClientRect();
        W = Math.max(1, Math.floor(mw ?? rect.width));
        H = Math.max(1, Math.floor(mh ?? rect.height));
        
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(W * dpr);
        canvas.height = Math.floor(H * dpr);
        canvas.style.width = W + "px";
        canvas.style.height = H + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        cols = [];
        dots = [];
        const nCols = Math.floor(W / GAP) + 2;
        const nRows = Math.floor(H / GAP) + 2;
        
        for (let c = 0; c < nCols; c++) {
            const col = [];
            for (let rIdx = 0; rIdx < nRows; rIdx++) {
                const hx = c * GAP;
                const hy = rIdx * GAP;
                const d = { hx, hy, x: hx, y: hy, vx: 0, vy: 0 };
                col.push(d);
                dots.push(d);
            }
            cols.push(col);
        }
    };

    build();

    // 5. Gestion du redimensionnement
    const ro = new ResizeObserver((entries) => {
        const cr = entries[0]?.contentRect;
        build(cr?.width, cr?.height);
    });
    ro.observe(host);

    // 6. Gestion de la souris
    const setMouse = (clientX, clientY) => {
        const rect = canvas.getBoundingClientRect();
        const mx = clientX - rect.left;
        const my = clientY - rect.top;
        mouse.x = mx;
        mouse.y = my;
        mouse.active = true;
        
        const now = performance.now();
        trailArr.push({ x: mx, y: my, t: now });
        if (trailArr.length > 80) trailArr.shift();
    };

    host.addEventListener("mousemove", (e) => setMouse(e.clientX, e.clientY));
    host.addEventListener("mouseleave", () => {
        mouse.active = false;
        mouse.x = -9999;
        mouse.y = -9999;
    });
    host.addEventListener("touchmove", (e) => {
        const t = e.touches[0];
        if (t) setMouse(t.clientX, t.clientY);
    }, { passive: true });
    host.addEventListener("touchend", () => {
        mouse.active = false;
        mouse.x = -9999;
        mouse.y = -9999;
    });

    // 7. Boucle d'animation
    const frame = () => {
        ctx.clearRect(0, 0, W, H);

        // Mise à jour de la physique (attraction)
        for (const d of dots) {
            let ax = (d.hx - d.x) * 0.08;
            let ay = (d.hy - d.y) * 0.08;
            
            if (mouse.active) {
                const dx = mouse.x - d.x;
                const dy = mouse.y - d.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < R && dist > 0.001) {
                    const f = (1 - dist / R) * PULL;
                    ax += (dx / dist) * f;
                    ay += (dy / dist) * f;
                }
            }
            d.vx = (d.vx + ax) * 0.82;
            d.vy = (d.vy + ay) * 0.82;
            d.x += d.vx;
            d.y += d.vy;
        }

        // Dessin des lignes de la grille
        for (let c = 0; c < cols.length; c++) {
            for (let rIdx = 0; rIdx < cols[c].length; rIdx++) {
                const d = cols[c][rIdx];
                const right = cols[c + 1]?.[rIdx];
                const down = cols[c]?.[rIdx + 1];
                
                const prox = mouse.active
                    ? Math.max(0, 1 - Math.sqrt((mouse.x - d.x) ** 2 + (mouse.y - d.y) ** 2) / R)
                    : 0;
                
                if (right) {
                    ctx.globalAlpha = 0.06 + prox * 0.7;
                    ctx.strokeStyle = config.lineColor;
                    ctx.lineWidth = 0.5 + prox * 1.5;
                    ctx.beginPath();
                    ctx.moveTo(d.x, d.y);
                    ctx.lineTo(right.x, right.y);
                    ctx.stroke();
                }
                if (down) {
                    ctx.globalAlpha = 0.06 + prox * 0.7;
                    ctx.strokeStyle = config.lineColor;
                    ctx.lineWidth = 0.5 + prox * 1.5;
                    ctx.beginPath();
                    ctx.moveTo(d.x, d.y);
                    ctx.lineTo(down.x, down.y);
                    ctx.stroke();
                }
            }
        }

        // Dessin des points
        for (const d of dots) {
            const prox = mouse.active
                ? Math.max(0, 1 - Math.sqrt((mouse.x - d.x) ** 2 + (mouse.y - d.y) ** 2) / R)
                : 0;
            ctx.globalAlpha = 0.22 + prox * 0.78;
            ctx.fillStyle = config.dotColor;
            ctx.beginPath();
            ctx.arc(d.x, d.y, 0.8 + prox * 2.2, 0, 2 * Math.PI);
            ctx.fill();
        }

        // Dessin de la traînée de la souris
        if (config.trail) {
            const now = performance.now();
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            for (let i = 1; i < trailArr.length; i++) {
                const a = trailArr[i - 1];
                const b = trailArr[i];
                const age = now - b.t;
                if (age > 260) continue;
                
                ctx.globalAlpha = Math.max(0, 1 - age / 260) * 0.85;
                ctx.strokeStyle = config.trailColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }
        }

        ctx.globalAlpha = 1;
        requestAnimationFrame(frame);
    };

    // Lancement de l'animation
    requestAnimationFrame(frame);
});