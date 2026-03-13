// audio.ts

// --- 1. 전역 오디오 상태 변수 ---
const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
let currentSource: AudioBufferSourceNode | null = null;
let analyser: AnalyserNode | null = null;
let dataArray: any = null;

// --- 2. 유틸리티: 에디터와 100% 일치하는 Y값 계산 ---
function getYFromCanvas(x: number, points: Point[]): number {
   // 에디터 drawLines와 동일하게 가상 시작/끝점 추가하여 경계값 처리
   const all = [{ x: 0, y: 200, type: "point" as const }, ...points, { x: 600, y: 200, type: "point" as const }];
   const pointOnly = all.filter(p => p.type === "point");
   const controlOnly = all.filter(p => p.type === "control");

   for (let i = 0; i < pointOnly.length - 1; i++) {
      const thisP = pointOnly[i];
      const nextP = pointOnly[i + 1];

      if (x >= thisP.x && x <= nextP.x) {
         const t = (x - thisP.x) / (nextP.x - thisP.x);
         const bC = controlOnly.filter(c => c.x > thisP.x && c.x < nextP.x);

         if (bC.length === 0) {
            // 1. 직선 (Linear)
            return thisP.y + (nextP.y - thisP.y) * t;
         } else if (bC.length === 1) {
            // 2. 2차 베지어 (Quadratic)
            return Math.pow(1 - t, 2) * thisP.y + 2 * (1 - t) * t * bC[0].y + Math.pow(t, 2) * nextP.y;
         } else {
            // 3. 3차 베지어 (Cubic)
            return Math.pow(1 - t, 3) * thisP.y +
                   3 * Math.pow(1 - t, 2) * t * bC[0].y +
                   3 * (1 - t) * Math.pow(t, 2) * bC[1].y +
                   Math.pow(t, 3) * nextP.y;
         }
      }
   }
   return 200;
}

// --- 3. 실시간 파형 업데이트 엔진 ---
/** * 재생 중인 버퍼의 내용을 수정합니다. 
 * 주의: 이 방식은 버퍼의 '내용'만 바꾸므로 주기가 변하지는 않습니다.
 */
function updateLiveWaveform(points: Point[], loopStart: number, loopEnd: number): void {
   if (!currentSource || !currentSource.buffer) return;

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

// --- 4. 재생 및 정지 로직 ---

/** * 파형을 재생합니다. 
 * 루프 길이에 따라 주파수가 결정되도록 설정되었습니다.
 */
function playWaveform(points: Point[], loopStart: number, loopEnd: number) {
   stopWaveform(); // 중복 재생 방지

   analyser = audioCtx.createAnalyser();
   analyser.fftSize = 2048; 
   dataArray = new Uint8Array(analyser.frequencyBinCount);

   const sampleRate = audioCtx.sampleRate;
   
   // [중요] 루프 너비에 따른 주파수 계산
   // 너비가 600일 때 220Hz라면, 너비가 300이 되면 440Hz가 됩니다.
   const loopWidth = Math.max(10, loopEnd - loopStart); 
   const baseFrequency = 220; 
   const actualFrequency = baseFrequency * (600 / loopWidth);

   // 한 주기 분량의 버퍼 생성
   const bufferSize = Math.floor(sampleRate / actualFrequency);
   const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
   const data = buffer.getChannelData(0);

   // 버퍼에 파형 데이터 채우기
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

/** 재생 정지 */
function stopWaveform() {
   if (currentSource) {
      try { currentSource.stop(); } catch(e) {}
      currentSource.disconnect();
      currentSource = null;
   }
   if (analyser) {
      analyser.disconnect();
      analyser = null;
   }
}