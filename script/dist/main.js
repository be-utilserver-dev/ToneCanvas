"use strict";
let points = [];
let selectedPoint = null;
let GhostPoint = null;
let currentMousePos = { x: 0, y: 0 };
let loopStart = 0;
let loopEnd = 600;
let isDraggingLoop = null;
let isAltPressed = false;
let isPlaying = false;
const SNAP_SIZE = 20;
const propPanel = document.getElementById("property");
const propType = document.getElementById("type");
const propX = document.getElementById("x");
const propY = document.getElementById("y");
const propClose = document.getElementById("prop-close");
const playBtn = document.getElementById("playButton");
function getMousePos(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    if (isAltPressed) {
        x = Math.round(x / SNAP_SIZE) * SNAP_SIZE;
        y = Math.round(y / SNAP_SIZE) * SNAP_SIZE;
    }
    return { x, y };
}
function addPoint(x, y, type) {
    let newX = x;
    while (points.some(p => Math.abs(p.x - newX) < 0.1)) {
        newX += 0.1;
    }
    const newPoint = { type, x: newX, y };
    points.push(newPoint);
    points.sort((a, b) => a.x - b.x);
    selectedPoint = newPoint;
    return newPoint;
}
function findPoint(x, y, threshold = 15) {
    const tSq = threshold * threshold;
    for (const p of points) {
        const dx = p.x - x;
        const dy = p.y - y;
        if (dx * dx + dy * dy <= tSq)
            return p;
    }
    return null;
}
function syncPointToUI() {
    if (!selectedPoint) {
        propPanel.classList.remove("active");
        return;
    }
    propPanel.classList.add("active");
    if (document.activeElement !== propX)
        propX.value = selectedPoint.x.toFixed(2);
    if (document.activeElement !== propY)
        propY.value = selectedPoint.y.toFixed(2);
    if (document.activeElement !== propType)
        propType.value = selectedPoint.type;
}
function setupEvents() {
    editor.addEventListener("mousedown", (e) => {
        const pos = getMousePos(editor, e);
        const loopThreshold = 10;
        const handleHeight = 30;
        if (pos.y <= handleHeight) {
            if (Math.abs(pos.x - loopStart) < loopThreshold) {
                isDraggingLoop = "start";
                return;
            }
            if (Math.abs(pos.x - loopEnd) < loopThreshold) {
                isDraggingLoop = "end";
                return;
            }
        }
        const foundPoint = findPoint(pos.x, pos.y);
        if (e.button === 0) {
            if (!foundPoint) {
                GhostPoint = "point";
                selectedPoint = null;
            }
            else {
                selectedPoint = foundPoint;
            }
        }
        else if (e.button === 2) {
            if (!foundPoint) {
                GhostPoint = "control";
            }
            else {
                GhostPoint = foundPoint;
            }
        }
    });
    window.addEventListener("mousemove", (e) => {
        currentMousePos = getMousePos(editor, e);
        if (isDraggingLoop === "start") {
            loopStart = Math.max(0, Math.min(currentMousePos.x, loopEnd - 10));
        }
        else if (isDraggingLoop === "end") {
            loopEnd = Math.min(editor.width, Math.max(currentMousePos.x, loopStart + 10));
        }
    });
    window.addEventListener("mouseup", (e) => {
        isDraggingLoop = null;
        if (!GhostPoint)
            return;
        const pos = getMousePos(editor, e);
        if (typeof GhostPoint === "object") {
            let newX = pos.x;
            while (points.some(p => p !== GhostPoint && Math.abs(p.x - newX) < 0.1)) {
                newX += 0.1;
            }
            GhostPoint.x = newX;
            GhostPoint.y = pos.y;
        }
        else {
            addPoint(pos.x, pos.y, GhostPoint);
        }
        points.sort((a, b) => a.x - b.x);
        GhostPoint = null;
    });
    window.addEventListener("keydown", (e) => {
        if (e.key === "Alt") {
            isAltPressed = true;
            e.preventDefault();
        }
    });
    window.addEventListener("keyup", (e) => {
        if (e.key === "Alt")
            isAltPressed = false;
        if (e.key === "Escape") {
            selectedPoint = null;
            GhostPoint = null;
        }
        if (e.key === "Delete") {
            if (selectedPoint) {
                points = points.filter(p => p !== selectedPoint);
                selectedPoint = null;
            }
        }
    });
    editor.addEventListener("contextmenu", (e) => e.preventDefault());
}
function initPropertySystem() {
    const calculateFormula = (input, currentVal) => {
        try {
            const { sin, cos, tan, asin, acos, atan, PI, abs, sqrt, pow, exp, log, random, round, floor, ceil } = Math;
            const result = new Function('sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'pi', 'PI', 'abs', 'sqrt', 'pow', 'exp', 'log', 'random', 'round', 'floor', 'ceil', `return ${input}`)(sin, cos, tan, asin, acos, atan, PI, PI, abs, sqrt, pow, exp, log, random, round, floor, ceil);
            return typeof result === 'number' && !isNaN(result) ? result : currentVal;
        }
        catch (e) {
            console.warn("Formula Error:", e);
            return currentVal;
        }
    };
    propX.onchange = () => {
        if (selectedPoint) {
            const newVal = calculateFormula(propX.value, selectedPoint.x);
            selectedPoint.x = Math.max(0, Math.min(600, newVal));
            points.sort((a, b) => a.x - b.x);
            if (isPlaying)
                updateLiveWaveform(points, loopStart, loopEnd);
            syncPointToUI();
        }
    };
    propY.onchange = () => {
        if (selectedPoint) {
            const newVal = calculateFormula(propY.value, selectedPoint.y);
            selectedPoint.y = Math.max(0, Math.min(400, newVal));
            if (isPlaying)
                updateLiveWaveform(points, loopStart, loopEnd);
            syncPointToUI();
        }
    };
    propType.onchange = () => {
        if (selectedPoint) {
            selectedPoint.type = propType.value;
            if (isPlaying)
                updateLiveWaveform(points, loopStart, loopEnd);
        }
    };
    propClose.onclick = () => {
        selectedPoint = null;
        syncPointToUI();
    };
}
let currentPlayX = 0;
function drawloop() {
    clearCanvas(editor);
    drawGrid(editor);
    drawLoopRange(editor, loopStart, loopEnd);
    drawLines(editor, points);
    points.forEach(p => drawPoint(editor, p));
    if (typeof drawGhost === 'function') {
        drawGhost(editor, GhostPoint, points, currentMousePos);
    }
    if (preview && isPlaying && analyser && dataArray) {
        try {
            analyser.getByteTimeDomainData(dataArray);
            drawOscilloscope(preview, dataArray);
        }
        catch (e) {
            console.error("Preview drawing error:", e);
        }
    }
    syncPointToUI();
    requestAnimationFrame(drawloop);
}
function init() {
    if (!editor)
        return;
    initPropertySystem();
    setupEvents();
    if (playBtn) {
        playBtn.onclick = async () => {
            if (!isPlaying) {
                if (audioCtx.state === 'suspended') {
                    await audioCtx.resume();
                }
                if (points.length < 2) {
                    alert("점을 최소 2개 찍어주세요!");
                    return;
                }
                console.log("Audio Start");
                playWaveform(points, loopStart, loopEnd);
                playBtn.innerText = "Stop Waveform";
                playBtn.style.background = "#ff4444";
                isPlaying = true;
            }
            else {
                stopWaveform();
                playBtn.innerText = "Play Waveform";
                playBtn.style.background = "#00ff88";
                isPlaying = false;
            }
        };
    }
    drawloop();
}
window.addEventListener('load', init);
