"use strict";
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let currentSource = null;
let analyser = null;
let dataArray = null;
function getYFromCanvas(x, points) {
    const all = [{ x: 0, y: 200, type: "point" }, ...points, { x: 600, y: 200, type: "point" }];
    const pointOnly = all.filter(p => p.type === "point");
    const controlOnly = all.filter(p => p.type === "control");
    for (let i = 0; i < pointOnly.length - 1; i++) {
        const thisP = pointOnly[i];
        const nextP = pointOnly[i + 1];
        if (x >= thisP.x && x <= nextP.x) {
            const t = (x - thisP.x) / (nextP.x - thisP.x);
            const bC = controlOnly.filter(c => c.x > thisP.x && c.x < nextP.x);
            if (bC.length === 0) {
                return thisP.y + (nextP.y - thisP.y) * t;
            }
            else if (bC.length === 1) {
                return Math.pow(1 - t, 2) * thisP.y + 2 * (1 - t) * t * bC[0].y + Math.pow(t, 2) * nextP.y;
            }
            else {
                return Math.pow(1 - t, 3) * thisP.y +
                    3 * Math.pow(1 - t, 2) * t * bC[0].y +
                    3 * (1 - t) * Math.pow(t, 2) * bC[1].y +
                    Math.pow(t, 3) * nextP.y;
            }
        }
    }
    return 200;
}
function updateLiveWaveform(points, loopStart, loopEnd) {
    if (!currentSource || !currentSource.buffer)
        return;
    const data = currentSource.buffer.getChannelData(0);
    const len = data.length;
    const loopWidth = loopEnd - loopStart;
    for (let i = 0; i < len; i++) {
        const progress = i / len;
        const xPos = loopStart + (progress * loopWidth);
        const yPos = getYFromCanvas(xPos, points);
        data[i] = (200 - yPos) / 200;
    }
}
function playWaveform(points, loopStart, loopEnd) {
    stopWaveform();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    const sampleRate = audioCtx.sampleRate;
    const loopWidth = Math.max(10, loopEnd - loopStart);
    const baseFrequency = 220;
    const actualFrequency = baseFrequency * (600 / loopWidth);
    const bufferSize = Math.floor(sampleRate / actualFrequency);
    const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        const progress = i / bufferSize;
        const xPos = loopStart + (progress * loopWidth);
        data[i] = (200 - getYFromCanvas(xPos, points)) / 200;
    }
    currentSource = audioCtx.createBufferSource();
    currentSource.buffer = buffer;
    currentSource.loop = true;
    currentSource.connect(analyser);
    analyser.connect(audioCtx.destination);
    currentSource.start();
}
function stopWaveform() {
    if (currentSource) {
        try {
            currentSource.stop();
        }
        catch (e) { }
        currentSource.disconnect();
        currentSource = null;
    }
    if (analyser) {
        analyser.disconnect();
        analyser = null;
    }
}
