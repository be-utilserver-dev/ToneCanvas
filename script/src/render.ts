// render.ts

const editor = document.getElementById("editer") as HTMLCanvasElement;
const preview = document.getElementById("preview") as HTMLCanvasElement;

type Dot = {
	x: number,
	y: number
}

function getCtx(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
	return canvas.getContext("2d") as CanvasRenderingContext2D;
}

function clearCanvas(canvas: HTMLCanvasElement) {
	const ctx = getCtx(canvas);
	ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawPoint(canvas: HTMLCanvasElement, p: Point) {
	const ctx = getCtx(canvas);

	ctx.font = "16px Arial";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	// 선택된 점인지 확인 (selectedPoint는 main.ts의 전역 변수)
	if (p === selectedPoint) {
		ctx.fillStyle = "#00FF00"; // 초록색 강조
		// 선택된 점 뒤에 후광(Glow) 효과를 주고 싶다면 아래 주석 해제
		// ctx.shadowBlur = 10;
		// ctx.shadowColor = "#00FF00";
	} else {
		ctx.fillStyle = "white";
		ctx.shadowBlur = 0;
	}

	const icon = (p.type === "point") ? "⬤" : "◆";
	ctx.fillText(icon, p.x, p.y);

	// 그림자 효과 초기화 (다른 점들에 영향을 주지 않도록)
	ctx.shadowBlur = 0;
}

function drawGhostPoint(canvas: HTMLCanvasElement, x: number, y: number, p: Point | "point" | "control" | null) {
	if (!p) return;
	const ctx = getCtx(canvas);

	// 1. 투명도 있는 흰색 설정
	ctx.fillStyle = "rgba(255, 255, 255, 0.6)"; // #FFFFFFA0와 비슷함
	ctx.font = "16px Arial";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	// 2. 타입 판별 (객체면 내부 type을, 문자열이면 그 자체를 사용)
	const type = typeof p === "object" ? p.type : p;
	const icon = type === "point" ? "⬤" : "◆";

	// 3. 텍스트 그리기
	ctx.fillText(icon, x, y);
}

function drawLines(canvas: HTMLCanvasElement, points: Point[]) {
	const ctx = getCtx(canvas);
	const all = [{ x: 0, y: 200, type: "point" as const }, ...points, { x: 600, y: 200, type: "point" as const }];

	const pointOnly = all.filter(p => p.type === "point");
	const controlOnly = all.filter(p => p.type === "control");

	// --- 1. 본체 파형 (실선) 그리기 ---
	ctx.beginPath();
	ctx.setLineDash([]); // 실선 보장
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
		} else if (betweenControls.length === 1) {
			ctx.quadraticCurveTo(betweenControls[0].x, betweenControls[0].y, nextP.x, nextP.y);
		} else {
			ctx.bezierCurveTo(betweenControls[0].x, betweenControls[0].y, betweenControls[1].x, betweenControls[1].y, nextP.x, nextP.y);
		}
	}
	ctx.stroke(); // 실선 먼저 출력

	// --- 2. 조절점 가이드 (점선) 그리기 ---
	ctx.beginPath();
	ctx.setLineDash([5, 5]); // 점선 설정
	ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"; // 가이드는 좀 더 연하게

	for (let i = 0; i < pointOnly.length - 1; i++) {
		const thisP = pointOnly[i];
		const nextP = pointOnly[i + 1];
		const betweenControls = controlOnly.filter(c => c.x > thisP.x && c.x < nextP.x);

		if (betweenControls.length === 1) {
			const c = betweenControls[0];
			ctx.moveTo(thisP.x, thisP.y);
			ctx.lineTo(c.x, c.y);
			ctx.lineTo(nextP.x, nextP.y);
		} else if (betweenControls.length >= 2) {
			const c1 = betweenControls[0];
			const c2 = betweenControls[1];
			ctx.moveTo(thisP.x, thisP.y);
			ctx.lineTo(c1.x, c1.y);
			ctx.moveTo(nextP.x, nextP.y);
			ctx.lineTo(c2.x, c2.y);
		}
	}
	ctx.stroke(); // 점선 출력
	ctx.setLineDash([]); // 다른 그리기에 영향 안 주도록 초기화
}

function drawGhost(
	canvas: HTMLCanvasElement,
	ghost: Point | "point" | "control" | null,
	points: Point[],
	currentMousePos: { x: number, y: number }
) {
	if (!ghost) return;
	const ctx = getCtx(canvas);
	const type = typeof ghost === "object" ? ghost.type : ghost;
	const Mousepos = currentMousePos;

	// 드래그 중인 원본 점은 제외하고 계산
	const others = points.filter(p => p !== ghost);

	ctx.save();
	ctx.beginPath();
	ctx.setLineDash([5, 5]);
	ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";

	// 1. 마우스 위치 기준 왼쪽/오른쪽 가장 가까운 일반 점(point) 찾기
	const beforeP = others.filter(p => p.x < Mousepos.x && p.type === "point").slice(-1)[0] || { x: 0, y: 200 };
	const nextP = others.filter(p => p.x > Mousepos.x && p.type === "point")[0] || { x: 600, y: 200 };

	if (type === "point") {
		// --- 일반 점(point) 고스트일 때 ---
		// 왼쪽 구간 곡선 확인
		const leftControls = others.filter(p => p.type === "control" && p.x > beforeP.x && p.x < Mousepos.x);
		ctx.moveTo(beforeP.x, beforeP.y);
		if (leftControls.length === 1) {
			ctx.quadraticCurveTo(leftControls[0].x, leftControls[0].y, Mousepos.x, Mousepos.y);
		} else if (leftControls.length >= 2) {
			ctx.bezierCurveTo(leftControls[0].x, leftControls[0].y, leftControls[1].x, leftControls[1].y, Mousepos.x, Mousepos.y);
		} else {
			ctx.lineTo(Mousepos.x, Mousepos.y);
		}

		// 오른쪽 구간 곡선 확인
		const rightControls = others.filter(p => p.type === "control" && p.x > Mousepos.x && p.x < nextP.x);
		if (rightControls.length === 1) {
			ctx.quadraticCurveTo(rightControls[0].x, rightControls[0].y, nextP.x, nextP.y);
		} else if (rightControls.length >= 2) {
			ctx.bezierCurveTo(rightControls[0].x, rightControls[0].y, rightControls[1].x, rightControls[1].y, nextP.x, nextP.y);
		} else {
			ctx.lineTo(nextP.x, nextP.y);
		}

	} else {
		// --- 조절 점(control) 고스트일 때 ---
		// 현재 마우스 위치를 조절점으로 사용해서 beforeP와 nextP 사이를 곡선으로 연결
		const otherControls = others.filter(p => p.type === "control" && p.x > beforeP.x && p.x < nextP.x);

		ctx.moveTo(beforeP.x, beforeP.y);
		if (otherControls.length === 0) {
			// 마우스가 유일한 조절점일 때 (2차 베지어)
			ctx.quadraticCurveTo(Mousepos.x, Mousepos.y, nextP.x, nextP.y);
		} else {
			// 이미 다른 조절점이 하나 있다면 (3차 베지어)
			// 마우스 위치와 기존 조절점의 순서에 따라 c1, c2 결정
			const controls = [...otherControls, { x: Mousepos.x, y: Mousepos.y, type: "control" as const }];
			controls.sort((a, b) => a.x - b.x);
			ctx.bezierCurveTo(controls[0].x, controls[0].y, controls[1].x, controls[1].y, nextP.x, nextP.y);
		}
	}

	ctx.stroke();
	ctx.restore();

	// 고스트 아이콘 그리기
	drawGhostPoint(canvas, Mousepos.x, Mousepos.y, type);
}

/** 실제 출력 중인 파형(Waveform) 시각화 */
function drawOscilloscope(canvas: HTMLCanvasElement, data: any) {
   const ctx = canvas.getContext("2d");
   if (!ctx || !data) return;

   ctx.clearRect(0, 0, canvas.width, canvas.height);
   
   // 파형이 안정적으로 보이게 하기 위해 '상승 엣지' 트리거링
   let triggerOffset = 0;
   for (let i = 0; i < data.length - 1; i++) {
      if (data[i] < 128 && data[i+1] >= 128) {
         triggerOffset = i;
         break;
      }
   }

   ctx.beginPath();
   ctx.strokeStyle = "#00ff88";
   ctx.lineWidth = 2;

   // 캔버스 너비에 맞춰 2주기 정도만 보여주기
   const samplesToShow = data.length / 2; 
   const step = canvas.width / samplesToShow;

   for (let i = 0; i < samplesToShow; i++) {
      const idx = (triggerOffset + i) % data.length;
      const v = data[idx] / 255; // 0.0 ~ 1.0
      const y = canvas.height - (v * canvas.height); // Y축 반전 보정

      if (i === 0) ctx.moveTo(i * step, y);
      else ctx.lineTo(i * step, y);
   }
   ctx.stroke();
}

function drawLoopRange(canvas: HTMLCanvasElement, start: number, end: number) {
   const ctx = getCtx(canvas);
   const h = canvas.height;

   // 1. 루프 바깥 영역 어둡게 처리 (선택 사항)
   ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
   ctx.fillRect(0, 0, start, h);
   ctx.fillRect(end, 0, canvas.width - end, h);

   // 2. 루프 시작/끝 선 (네온 그린 느낌)
   ctx.setLineDash([5, 3]);
   ctx.strokeStyle = "#00ff88aa";
   ctx.lineWidth = 2;

   // Start Line
   ctx.beginPath();
   ctx.moveTo(start, 0);
   ctx.lineTo(start, h);
   ctx.stroke();

   // End Line
   ctx.beginPath();
   ctx.moveTo(end, 0);
   ctx.lineTo(end, h);
   ctx.stroke();
   
   ctx.setLineDash([]);
   
   // 3. 루프 핸들 (선 상단에 작은 삼각형이나 사각형)
   ctx.fillStyle = "#00ff88";
   ctx.fillRect(start - 5, 0, 10, 10);
   ctx.fillRect(end - 5, 0, 10, 10);
}

function drawGrid(canvas: HTMLCanvasElement) {
   const ctx = getCtx(canvas);
   const w = canvas.width;
   const h = canvas.height;
   const step = 20; // SNAP_SIZE와 동일하게 설정

   ctx.beginPath();
   ctx.strokeStyle = "#2a2a2a"; // 아주 연한 회색/검정
   ctx.lineWidth = 1;

   // 세로선
   for (let x = 0; x <= w; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
   }
   // 가로선
   for (let y = 0; y <= h; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
   }
   ctx.stroke();
}