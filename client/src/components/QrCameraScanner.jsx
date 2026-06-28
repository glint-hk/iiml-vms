import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, RefreshCw, X } from 'lucide-react';

export default function QrCameraScanner({ onScan, onClose }) {
  const [state, setState] = useState('idle'); // idle | requesting | scanning | error
  const [errorMsg, setErrorMsg] = useState('');
  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState(null);
  const scannerRef = useRef(null);
  const ELEMENT_ID = 'iiml-qr-reader';

  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!devices || devices.length === 0) {
          setErrorMsg('No camera found on this device.');
          setState('error');
          return;
        }
        setCameras(devices);
        // Prefer back/environment camera on mobile
        const back = devices.find((d) =>
          /back|rear|environment/i.test(d.label)
        );
        setCameraId(back?.id || devices[0].id);
      })
      .catch(() => {
        setErrorMsg('Camera permission denied. Allow camera access and try again.');
        setState('error');
      });
  }, []);

  useEffect(() => {
    if (cameraId) startScanner(cameraId);
    // cleanup on unmount
    return () => stopScanner();
  }, [cameraId]);

  async function startScanner(id) {
    setState('requesting');
    const scanner = new Html5Qrcode(ELEMENT_ID);
    scannerRef.current = scanner;

    try {
      await scanner.start(
        id,
        { fps: 12, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
        (decoded) => {
          stopScanner().then(() => onScan(decoded));
        },
        () => {} // per-frame errors are normal — ignore
      );
      setState('scanning');
    } catch (err) {
      setErrorMsg(
        err?.message?.includes('Permission')
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : `Camera error: ${err?.message || 'unknown'}`
      );
      setState('error');
    }
  }

  async function stopScanner() {
    const s = scannerRef.current;
    if (s) {
      try {
        if (s.isScanning) await s.stop();
        s.clear();
      } catch (_) {}
      scannerRef.current = null;
    }
  }

  async function switchCamera(id) {
    await stopScanner();
    setCameraId(id);
  }

  async function retry() {
    setErrorMsg('');
    setState('idle');
    if (cameraId) {
      await startScanner(cameraId);
    } else {
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices.length) {
            const back = devices.find((d) => /back|rear|environment/i.test(d.label));
            setCameraId(back?.id || devices[0].id);
          }
        })
        .catch(() => {
          setErrorMsg('Still no camera access. Check browser settings.');
          setState('error');
        });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: 'rgba(26,39,68,0.90)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-iiml-gold/20 flex items-center justify-center">
              <Camera size={16} className="text-iiml-gold" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Scan QR Pass</p>
              <p className="text-white/40 text-xs">Point at visitor's QR code</p>
            </div>
          </div>
          <button
            onClick={() => { stopScanner(); onClose(); }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X size={16} className="text-white/70" />
          </button>
        </div>

        {/* Viewfinder area */}
        <div className="relative mx-4 mb-4">
          <div className="relative rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '1/1' }}>
            {/* html5-qrcode mounts here */}
            <div id={ELEMENT_ID} className="w-full h-full" />

            {/* Corner frame overlay */}
            {state === 'scanning' && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Top-left corner */}
                <div className="absolute top-6 left-6 w-10 h-10 border-t-3 border-l-3 border-iiml-gold rounded-tl-lg" style={{ borderWidth: '3px' }} />
                {/* Top-right corner */}
                <div className="absolute top-6 right-6 w-10 h-10 border-t-3 border-r-3 border-iiml-gold rounded-tr-lg" style={{ borderWidth: '3px' }} />
                {/* Bottom-left corner */}
                <div className="absolute bottom-6 left-6 w-10 h-10 border-b-3 border-l-3 border-iiml-gold rounded-bl-lg" style={{ borderWidth: '3px' }} />
                {/* Bottom-right corner */}
                <div className="absolute bottom-6 right-6 w-10 h-10 border-b-3 border-r-3 border-iiml-gold rounded-br-lg" style={{ borderWidth: '3px' }} />
                {/* Scan line */}
                <div
                  className="absolute left-[12%] right-[12%] h-0.5 bg-iiml-gold/70"
                  style={{
                    top: '50%',
                    boxShadow: '0 0 8px 2px rgba(201,162,39,0.5)',
                    animation: 'scanline 2s ease-in-out infinite',
                  }}
                />
              </div>
            )}

            {/* Loading overlay */}
            {state === 'requesting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-iiml-gold animate-spin mb-3" />
                <p className="text-white/70 text-xs">Starting camera…</p>
              </div>
            )}

            {/* Error overlay */}
            {state === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6">
                <CameraOff size={40} className="text-white/30 mb-4" />
                <p className="text-white text-sm font-semibold text-center mb-1">Camera unavailable</p>
                <p className="text-white/50 text-xs text-center mb-5">{errorMsg}</p>
                <button
                  onClick={retry}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-iiml-gold/20 border border-iiml-gold/30 text-iiml-gold text-sm font-semibold"
                >
                  <RefreshCw size={14} /> Retry
                </button>
              </div>
            )}
          </div>

          {/* Camera switch row */}
          {cameras.length > 1 && state === 'scanning' && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {cameras.map((cam) => (
                <button
                  key={cam.id}
                  onClick={() => switchCamera(cam.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    cam.id === cameraId
                      ? 'bg-iiml-gold text-iiml-navy'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  {cam.label.length > 22 ? cam.label.slice(0, 22) + '…' : cam.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-white/30 text-xs pb-5">
          QR code is detected automatically — no button needed
        </p>
      </div>

      <style>{`
        @keyframes scanline {
          0%, 100% { transform: translateY(-50px); opacity: 0.4; }
          50% { transform: translateY(50px); opacity: 1; }
        }
        /* Hide html5-qrcode's own UI chrome */
        #iiml-qr-reader video { width: 100% !important; height: 100% !important; object-fit: cover; }
        #iiml-qr-reader img { display: none !important; }
        #iiml-qr-reader > div:last-child { display: none !important; }
      `}</style>
    </div>
  );
}
