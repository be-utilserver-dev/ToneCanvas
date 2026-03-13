// main.ts

// --- 1. 타입 정의 ---
type Point = {
   type: "point" | "control";
   x: number;
   y: number;
};

// --- 2. 상태 변수 (최상단 배치로 에러 방지) ---
let points: Point[] = [];
let selectedPoint: Point | null = null;
let GhostPoint: Point | "point" | "control" | null = null;
let currentMousePos = { x: 0, y: 0 };

// 루프 및 시스템 상태
let loopStart = 0;
let loopEnd = 600;
let isDraggingLoop = null as "start" | "end" | null;
let isAltPressed = false;
let isPlaying = false; // 에러 원인이었던 변수

const SNAP_SIZE = 20;

// --- 3. HTML 요소 참조 ---
const propPanel = document.getElementById("property") as HTMLDivElement;
const propType = document.getElementById("type") as HTMLSelectElement;
const propX = document.getElementById("x") as HTMLInputElement;
const propY = document.getElementById("y") as HTMLInputElement;
const propClose = document.getElementById("prop-close") as HTMLSpanElement;
const playBtn = document.getElementById("playButton") as HTMLButtonElement;

// --- 4. 유틸리티 함수 ---

/** 마우스 좌표 계산 (Alt 스냅 포함) */
function getMousePos(canvas: HTMLCanvasElement, e: MouseEvent) {
   const rect = canvas.getBoundingClientRect();
   let x = e.clientX - rect.left;
   let y = e.clientY - rect.top;

   if (isAltPressed) {
      x = Math.round(x / SNAP_SIZE) * SNAP_SIZE;
      y = Math.round(y / SNAP_SIZE) * SNAP_SIZE;
   }
   return { x, y };
}

/** 점 추가 */
function addPoint(x: number, y: number, type: "point" | "control"): Point {
   let newX = x;
   while (points.some(p => Math.abs(p.x - newX) < 0.1)) {
      newX += 0.1;
   }
   const newPoint: Point = { type, x: newX, y };
   points.push(newPoint);
   points.sort((a, b) => a.x - b.x);
   selectedPoint = newPoint;
   return newPoint;
}

/** 점 찾기 */
function findPoint(x: number, y: number, threshold = 15): Point | null {
   const tSq = threshold * threshold;
   for (const p of points) {
      const dx = p.x - x;
      const dy = p.y - y;
      if (dx * dx + dy * dy <= tSq) return p;
   }
   return null;
}

// --- 5. 시스템 로직 (UI 동기화) ---

function syncPointToUI() {
   if (!selectedPoint) {
      propPanel.classList.remove("active");
      return;
   }

   propPanel.classList.add("active");

   if (document.activeElement !== propX) propX.value = selectedPoint.x.toFixed(2);
   if (document.activeElement !== propY) propY.value = selectedPoint.y.toFixed(2);
   if (document.activeElement !== propType) propType.value = selectedPoint.type;
}

// --- 6. 이벤트 핸들러 ---

function setupEvents() {
   editor.addEventListener("mousedown", (e) => {
      const pos = getMousePos(editor, e);
      
      // 루프 바 드래그 우선 체크
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
      if (e.button === 0) { // 좌클릭
         if (!foundPoint) {
            GhostPoint = "point";
            selectedPoint = null;
         } else {
            selectedPoint = foundPoint;
         }
      } else if (e.button === 2) { // 우클릭
         if (!foundPoint) {
            GhostPoint = "control";
         } else {
            GhostPoint = foundPoint;
         }
      }
   });

   window.addEventListener("mousemove", (e) => {
      currentMousePos = getMousePos(editor, e);

      if (isDraggingLoop === "start") {
         loopStart = Math.max(0, Math.min(currentMousePos.x, loopEnd - 10));
      } else if (isDraggingLoop === "end") {
         loopEnd = Math.min(editor.width, Math.max(currentMousePos.x, loopStart + 10));
      }
   });

   window.addEventListener("mouseup", (e) => {
      isDraggingLoop = null;

      if (!GhostPoint) return;
      const pos = getMousePos(editor, e);

      if (typeof GhostPoint === "object") {
         let newX = pos.x;
         while (points.some(p => p !== GhostPoint && Math.abs(p.x - newX) < 0.1)) {
            newX += 0.1;
         }
         GhostPoint.x = newX;
         GhostPoint.y = pos.y;
      } else {
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
      if (e.key === "Alt") isAltPressed = false;
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

// main.ts

function initPropertySystem() {
   /** 수식을 안전하게 계산하는 내부 함수 */
   const calculateFormula = (input: string, currentVal: number): number => {
      try {
         // Math 함수들을 로컬 스코프로 가져와서 'Math.' 없이 사용 가능하게 함
         const { 
            sin, cos, tan, asin, acos, atan, 
          PI, abs, sqrt, pow, exp, log, 
            random, round, floor, ceil 
         } = Math;

         // 수식 계산 (Function 생성자 사용)
         const result = new Function(
            'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 
            'pi', 'PI', 'abs', 'sqrt', 'pow', 'exp', 'log', 
            'random', 'round', 'floor', 'ceil', 
            `return ${input}`
         )(
            sin, cos, tan, asin, acos, atan, 
            PI, PI, abs, sqrt, pow, exp, log, 
            random, round, floor, ceil
         );

         return typeof result === 'number' && !isNaN(result) ? result : currentVal;
      } catch (e) {
         console.warn("Formula Error:", e);
         return currentVal;
      }
   };

   // X 좌표 입력 (수식 지원)
   propX.onchange = () => {
      if (selectedPoint) {
         const newVal = calculateFormula(propX.value, selectedPoint.x);
         // 캔버스 범위 내로 제한 (0~600)
         selectedPoint.x = Math.max(0, Math.min(600, newVal));
         points.sort((a, b) => a.x - b.x);
         
         if (isPlaying) updateLiveWaveform(points, loopStart, loopEnd);
         syncPointToUI(); // 계산된 결과값으로 UI 갱신
      }
   };

   // Y 좌표 입력 (수식 지원)
   propY.onchange = () => {
      if (selectedPoint) {
         const newVal = calculateFormula(propY.value, selectedPoint.y);
         // 캔버스 범위 내로 제한 (0~400)
         selectedPoint.y = Math.max(0, Math.min(400, newVal));
         
         if (isPlaying) updateLiveWaveform(points, loopStart, loopEnd);
         syncPointToUI(); // 계산된 결과값으로 UI 갱신
      }
   };

   propType.onchange = () => {
      if (selectedPoint) {
         selectedPoint.type = propType.value as "point" | "control";
         if (isPlaying) updateLiveWaveform(points, loopStart, loopEnd);
      }
   };

   propClose.onclick = () => {
      selectedPoint = null;
      syncPointToUI();
   };
}

// --- 7. 메인 루프 ---

let currentPlayX = 0;

function drawloop() {
   // 1. 메인 에디터 (작업대) 그리기
   clearCanvas(editor);
   drawGrid(editor);
   drawLoopRange(editor, loopStart, loopEnd);
   drawLines(editor, points);
   points.forEach(p => drawPoint(editor, p));
   
   // 마우스 위치에 따른 고스트 포인트 (선택 사항)
   if (typeof drawGhost === 'function') {
      drawGhost(editor, GhostPoint, points, currentMousePos);
   }

   // 2. 프리뷰 (오실로스코프) 그리기
   if (preview && isPlaying && analyser && dataArray) {
   try {
      // (dataArray as any)를 사용해 엄격한 타입 체크를 완전히 우회합니다.
      analyser.getByteTimeDomainData(dataArray as any);
      drawOscilloscope(preview, dataArray);
   } catch (e) {
      console.error("Preview drawing error:", e);
   }
}

   // 속성창 UI 갱신
   syncPointToUI();

   // 무한 루프
   requestAnimationFrame(drawloop);
}

// --- 8. 초기화 및 실행 ---

function init() {
   if (!editor) return;
   
   initPropertySystem();
   setupEvents();
   
   // 재생 버튼 설정
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
         } else {
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