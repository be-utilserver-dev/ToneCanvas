"use strict";
const editor = document.getElementById("editer");
const preview = document.getElementById("preview");
function getCtx(canvas) {
    return canvas.getContext("2d");
}
function clearCanvas(canvas) {
    const ctx = getCtx(canvas);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}
function drawPoint(canvas, p) {
    const ctx = getCtx(canvas);
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (p === selectedPoint) {
        ctx.fillStyle = "#00FF00";
    }
    else {
        ctx.fillStyle = "white";
        ctx.shadowBlur = 0;
    }
    const icon = (p.type === "point") ? "⬤" : "◆";
    ctx.fillText(icon, p.x, p.y);
    ctx.shadowBlur = 0;
}
function drawGhostPoint(canvas, x, y, p) {
    if (!p)
        return;
    const ctx = getCtx(canvas);
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const type = typeof p === "object" ? p.type : p;
    const icon = type === "point" ? "⬤" : "◆";
    ctx.fillText(icon, x, y);
}
function drawLines(canvas, points) {
    const ctx = getCtx(canvas);
    const all = [{ x: 0, y: 200, type: "point" }, ...points, { x: 600, y: 200, type: "point" }];
    const pointOnly = all.filter(p => p.type === "point");
    const controlOnly = all.filter(p => p.type === "control");
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1.5;
    if (pointOnly.length > 0) {
        ctx.moveTo(pointOnly[0].x, pointOnly[0].y);
    }
    for (let i = 0; i < pointOnly.length - 1; i++) {
        const thisP = pointOnly[i];
        const nextP = pointOnly[i + 1];
        const betweenControls = controlOnly.filter(c => c.x > thisP.x && c.x < nextP.x);
        if (betweenControls.length === 0) {
            ctx.lineTo(nextP.x, nextP.y);
        }
        else if (betweenControls.length === 1) {
            ctx.quadraticCurveTo(betweenControls[0].x, betweenControls[0].y, nextP.x, nextP.y);
        }
        else {
            ctx.bezierCurveTo(betweenControls[0].x, betweenControls[0].y, betweenControls[1].x, betweenControls[1].y, nextP.x, nextP.y);
        }
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    for (let i = 0; i < pointOnly.length - 1; i++) {
        const thisP = pointOnly[i];
        const nextP = pointOnly[i + 1];
        const betweenControls = controlOnly.filter(c => c.x > thisP.x && c.x < nextP.x);
        if (betweenControls.length === 1) {
            const c = betweenControls[0];
            ctx.moveTo(thisP.x, thisP.y);
            ctx.lineTo(c.x, c.y);
            ctx.lineTo(nextP.x, nextP.y);
        }
        else if (betweenControls.length >= 2) {
            const c1 = betweenControls[0];
            const c2 = betweenControls[1];
            ctx.moveTo(thisP.x, thisP.y);
            ctx.lineTo(c1.x, c1.y);
            ctx.moveTo(nextP.x, nextP.y);
            ctx.lineTo(c2.x, c2.y);
        }
    }
    ctx.stroke();
    ctx.setLineDash([]);
}
function drawGhost(canvas, ghost, points, currentMousePos) {
    if (!ghost)
        return;
    const ctx = getCtx(canvas);
    const type = typeof ghost === "object" ? ghost.type : ghost;
    const Mousepos = currentMousePos;
    const others = points.filter(p => p !== ghost);
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    const beforeP = others.filter(p => p.x < Mousepos.x && p.type === "point").slice(-1)[0] || { x: 0, y: 200 };
    const nextP = others.filter(p => p.x > Mousepos.x && p.type === "point")[0] || { x: 600, y: 200 };
    if (type === "point") {
        const leftControls = others.filter(p => p.type === "control" && p.x > beforeP.x && p.x < Mousepos.x);
        ctx.moveTo(beforeP.x, beforeP.y);
        if (leftControls.length === 1) {
            ctx.quadraticCurveTo(leftControls[0].x, leftControls[0].y, Mousepos.x, Mousepos.y);
        }
        else if (leftControls.length >= 2) {
            ctx.bezierCurveTo(leftControls[0].x, leftControls[0].y, leftControls[1].x, leftControls[1].y, Mousepos.x, Mousepos.y);
        }
        else {
            ctx.lineTo(Mousepos.x, Mousepos.y);
        }
        const rightControls = others.filter(p => p.type === "control" && p.x > Mousepos.x && p.x < nextP.x);
        if (rightControls.length === 1) {
            ctx.quadraticCurveTo(rightControls[0].x, rightControls[0].y, nextP.x, nextP.y);
        }
        else if (rightControls.length >= 2) {
            ctx.bezierCurveTo(rightControls[0].x, rightControls[0].y, rightControls[1].x, rightControls[1].y, nextP.x, nextP.y);
        }
        else {
            ctx.lineTo(nextP.x, nextP.y);
        }
    }
    else {
        const otherControls = others.filter(p => p.type === "control" && p.x > beforeP.x && p.x < nextP.x);
        ctx.moveTo(beforeP.x, beforeP.y);
        if (otherControls.length === 0) {
            ctx.quadraticCurveTo(Mousepos.x, Mousepos.y, nextP.x, nextP.y);
        }
        else {
            const controls = [...otherControls, { x: Mousepos.x, y: Mousepos.y, type: "control" }];
            controls.sort((a, b) => a.x - b.x);
            ctx.bezierCurveTo(controls[0].x, controls[0].y, controls[1].x, controls[1].y, nextP.x, nextP.y);
        }
    }
    ctx.stroke();
    ctx.restore();
    drawGhostPoint(canvas, Mousepos.x, Mousepos.y, type);
}
function drawOscilloscope(canvas, data) {
    const ctx = canvas.getContext("2d");
    if (!ctx || !data)
        return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let triggerOffset = 0;
    for (let i = 0; i < data.length - 1; i++) {
        if (data[i] < 128 && data[i + 1] >= 128) {
            triggerOffset = i;
            break;
        }
    }
    ctx.beginPath();
    ctx.strokeStyle = "#00ff88";
    ctx.lineWidth = 2;
    const samplesToShow = data.length / 2;
    const step = canvas.width / samplesToShow;
    for (let i = 0; i < samplesToShow; i++) {
        const idx = (triggerOffset + i) % data.length;
        const v = data[idx] / 255;
        const y = canvas.height - (v * canvas.height);
        if (i === 0)
            ctx.moveTo(i * step, y);
        else
            ctx.lineTo(i * step, y);
    }
    ctx.stroke();
}
function drawLoopRange(canvas, start, end) {
    const ctx = getCtx(canvas);
    const h = canvas.height;
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(0, 0, start, h);
    ctx.fillRect(end, 0, canvas.width - end, h);
    ctx.setLineDash([5, 3]);
    ctx.strokeStyle = "#00ff88aa";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(start, 0);
    ctx.lineTo(start, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(end, 0);
    ctx.lineTo(end, h);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#00ff88";
    ctx.fillRect(start - 5, 0, 10, 10);
    ctx.fillRect(end - 5, 0, 10, 10);
}
function drawGrid(canvas) {
    const ctx = getCtx(canvas);
    const w = canvas.width;
    const h = canvas.height;
    const step = 20;
    ctx.beginPath();
    ctx.strokeStyle = "#2a2a2a";
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
    }
    ctx.stroke();
}
