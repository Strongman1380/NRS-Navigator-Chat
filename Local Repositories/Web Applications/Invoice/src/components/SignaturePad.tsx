import React, { useRef, useEffect, useState } from 'react';

interface SignaturePadProps {
  value: string;           // base64 data URL (may be empty)
  employeeName: string;    // shown as typed-name fallback
  onChange: (dataUrl: string) => void;
}

export function SignaturePad({ value, employeeName, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(!!value);
  const [mode, setMode] = useState<'typed' | 'drawn'>(value ? 'drawn' : 'typed');
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Load existing signature
  useEffect(() => {
    if (value && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0);
      };
      img.src = value;
    }
  }, []);

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    setIsDrawing(true);
    setHasDrawn(true);
    lastPoint.current = getPos(e);
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.beginPath();
    const p = lastPoint.current;
    ctx.moveTo(p.x, p.y);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext('2d')!;
    const p = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPoint.current = p;
  }

  function endDraw() {
    if (!isDrawing) return;
    setIsDrawing(false);
    onChange(canvasRef.current!.toDataURL());
  }

  function clearCanvas() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange('');
  }

  function switchMode(m: 'typed' | 'drawn') {
    setMode(m);
    if (m === 'typed') {
      clearCanvas();
    }
  }

  return (
    <div className="sig-pad">
      <div className="sig-mode-tabs">
        <button
          className={`sig-tab ${mode === 'typed' ? 'active' : ''}`}
          onClick={() => switchMode('typed')}
          type="button"
        >
          Typed
        </button>
        <button
          className={`sig-tab ${mode === 'drawn' ? 'active' : ''}`}
          onClick={() => switchMode('drawn')}
          type="button"
        >
          Draw (finger / mouse)
        </button>
      </div>

      {mode === 'typed' ? (
        <div className="sig-typed">
          {employeeName
            ? <span className="sig-name-display">{employeeName}</span>
            : <span className="sig-placeholder">Enter your name above to preview</span>}
        </div>
      ) : (
        <div className="sig-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={380}
            height={100}
            className="sig-canvas"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          {!hasDrawn && (
            <div className="sig-hint">Sign here</div>
          )}
          {hasDrawn && (
            <button onClick={clearCanvas} type="button" className="sig-clear">
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
