import { useEffect, useRef, useState } from "react";

function App() {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const videoRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const lastAnnouncementRef = useRef("");
  const lastAnnouncementTimeRef = useRef(0);

  const startCamera = async () => {
    try {
      setPermissionError("");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraReady(true);
    } catch (error) {
      console.error("開啟鏡頭失敗：", error);
      setPermissionError("無法開啟鏡頭，請確認已允許相機權限。");
    }
  };

  const stopAll = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const captureAndAnalyzeFrame = async () => {
    if (!videoRef.current || !captureCanvasRef.current) return;
    if (isAnalyzing) return;

    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    setIsAnalyzing(true);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setIsAnalyzing(false);
        return;
      }

      const formData = new FormData();
      formData.append("image", blob, "frame.jpg");

      try {
        const response = await fetch(`${API_BASE_URL}/predict-frame`, {
          method: "POST",
          headers: {
            "ngrok-skip-browser-warning": "1",
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("後端錯誤內容：", errorText);
          throw new Error(`後端回傳失敗：${response.status}`);
        }

        const data = await response.json();
        console.log("predict-frame 回傳：", data);
        setResult(data);
      } catch (error) {
        console.error("影格分析失敗：", error);
      } finally {
        setIsAnalyzing(false);
      }
    }, "image/jpeg", 0.9);
  };

  const drawDetections = () => {
    if (!videoRef.current || !overlayCanvasRef.current) return;

    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const displayWidth = video.clientWidth;
    const displayHeight = video.clientHeight;

    canvas.width = displayWidth;
    canvas.height = displayHeight;
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    if (!result?.detections?.length) return;
    if (!result?.image_size) return;

    const sourceWidth = result.image_size.width;
    const sourceHeight = result.image_size.height;

    const scaleX = displayWidth / sourceWidth;
    const scaleY = displayHeight / sourceHeight;

    result.detections.forEach((det) => {
      const { class: cls, bbox } = det;
      if (!bbox) return;

      const color = cls === "sign" ? "#ff2d2d" : "#ffd400";

      const x = bbox.x1 * scaleX;
      const y = bbox.y1 * scaleY;
      const w = (bbox.x2 - bbox.x1) * scaleX;
      const h = (bbox.y2 - bbox.y1) * scaleY;

      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, w, h);
    });
  };

  useEffect(() => {
    startCamera();

    return () => {
      stopAll();
    };
  }, []);

  useEffect(() => {
    if (!cameraReady) return;

    captureAndAnalyzeFrame();

    intervalRef.current = setInterval(() => {
      captureAndAnalyzeFrame();
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [cameraReady]);

  useEffect(() => {
    drawDetections();
  }, [result]);

  useEffect(() => {
    const handleResize = () => drawDetections();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [result]);

  useEffect(() => {
    if (!result?.announcement) return;

    const now = Date.now();
    const sameAnnouncement = lastAnnouncementRef.current === result.announcement;
    const withinCooldown = now - lastAnnouncementTimeRef.current < 3000;

    if (sameAnnouncement && withinCooldown) return;

    lastAnnouncementRef.current = result.announcement;
    lastAnnouncementTimeRef.current = now;

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(result.announcement);
    utterance.lang = "zh-TW";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    synth.speak(utterance);
  }, [result]);

  return (
    <div className="app-shell">
      {!cameraReady && (
        <div className="permission-layer">
          <div className="permission-card">
            <h1>待轉辨識</h1>
            <p>請允許開啟鏡頭，以開始即時辨識。</p>
            <button onClick={startCamera}>開啟鏡頭</button>
            {permissionError && <p className="error-text">{permissionError}</p>}
          </div>
        </div>
      )}

      <div className="video-stage">
        <video ref={videoRef} autoPlay playsInline muted className="live-video" />
        <canvas ref={overlayCanvasRef} className="overlay-canvas" />
      </div>

      <canvas ref={captureCanvasRef} style={{ display: "none" }} />
    </div>
  );
}

export default App;