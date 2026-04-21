import { useEffect, useRef, useState } from "react";
import UploadPanel from "./components/UploadPanel";
import VideoPreview from "./components/VideoPreview";
import ResultPanel from "./components/ResultPanel";

function App() {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  console.log("API_BASE_URL =", API_BASE_URL);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraPreview, setCameraPreview] = useState("");
  const [autoAnalyzing, setAutoAnalyzing] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const autoAnalyzeIntervalRef = useRef(null);
  const lastAnnouncementRef = useRef("");
  const lastAnnouncementTimeRef = useRef(0);

  const handleFileChange = (file) => {
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setResult(null);

    const formData = new FormData();
    formData.append("video", selectedFile);

    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
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
      console.log("影片分析後端回傳：", data);
      setResult(data);
    } catch (error) {
      console.error("分析失敗：", error);
      alert("分析失敗，請確認 backend 有啟動，或稍等 Render 冷啟動完成");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startCamera = async () => {
    try {
      setCameraError("");
      setResult(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraOn(true);
    } catch (error) {
      console.error("開啟攝像頭失敗：", error);
      setCameraError("無法開啟攝像頭，請確認權限已允許");
      setCameraOn(false);
    }
  };

  const stopCamera = () => {
    stopAutoAnalyze();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOn(false);
  };

  const captureAndAnalyzeFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (isAnalyzing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const previewDataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCameraPreview(previewDataUrl);

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
        console.log("影格分析後端回傳：", data);
        setResult(data);
      } catch (error) {
        console.error("影格分析失敗：", error);
      } finally {
        setIsAnalyzing(false);
      }
    }, "image/jpeg", 0.9);
  };

  const startAutoAnalyze = () => {
    if (!cameraOn) return;
    if (autoAnalyzeIntervalRef.current) return;

    setAutoAnalyzing(true);

    autoAnalyzeIntervalRef.current = setInterval(() => {
      captureAndAnalyzeFrame();
    }, 1000);
  };

  const stopAutoAnalyze = () => {
    if (autoAnalyzeIntervalRef.current) {
      clearInterval(autoAnalyzeIntervalRef.current);
      autoAnalyzeIntervalRef.current = null;
    }
    setAutoAnalyzing(false);
  };

  useEffect(() => {
    if (!result?.announcement) return;

    const now = Date.now();
    const sameAnnouncement = lastAnnouncementRef.current === result.announcement;
    const withinCooldown = now - lastAnnouncementTimeRef.current < 3000;

    if (sameAnnouncement && withinCooldown) {
      return;
    }

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

  useEffect(() => {
    return () => {
      stopAutoAnalyze();

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>待轉辨識 Web App</h1>
        <p>上傳影片後分析待轉牌（sign）與待轉格（square）</p>
      </header>

      <main className="container">
        <UploadPanel
          selectedFile={selectedFile}
          onFileChange={handleFileChange}
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
        />

        <section className="panel" style={{ marginBottom: "24px" }}>
          <h2>3. 攝像頭模式（第二版）</h2>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
            <button onClick={startCamera} disabled={cameraOn}>
              開啟攝像頭
            </button>

            <button onClick={stopCamera} disabled={!cameraOn}>
              關閉攝像頭
            </button>

            <button onClick={captureAndAnalyzeFrame} disabled={!cameraOn || isAnalyzing}>
              拍一張分析
            </button>

            <button onClick={startAutoAnalyze} disabled={!cameraOn || autoAnalyzing}>
              開始即時分析
            </button>

            <button onClick={stopAutoAnalyze} disabled={!autoAnalyzing}>
              停止即時分析
            </button>
          </div>

          {cameraError && (
            <p style={{ color: "red", marginBottom: "12px" }}>{cameraError}</p>
          )}

          <p style={{ marginBottom: "12px", color: "#555" }}>
            攝像頭狀態：{cameraOn ? "已開啟" : "未開啟"} ｜ 即時分析狀態：
            {autoAnalyzing ? "進行中" : "未啟動"}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <h3>即時攝像頭畫面</h3>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  maxWidth: "480px",
                  background: "#000",
                  borderRadius: "12px",
                }}
              />
            </div>

            <div>
              <h3>拍攝影格預覽</h3>
              {cameraPreview ? (
                <img
                  src={cameraPreview}
                  alt="camera frame preview"
                  style={{
                    width: "100%",
                    maxWidth: "480px",
                    borderRadius: "12px",
                    border: "1px solid #ddd",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    maxWidth: "480px",
                    height: "270px",
                    border: "1px dashed #bbb",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#777",
                    background: "#fafafa",
                  }}
                >
                  尚未拍攝影格
                </div>
              )}
            </div>
          </div>

          <canvas ref={canvasRef} style={{ display: "none" }} />
        </section>

        <div className="content-grid">
          <VideoPreview title="原始影片" videoUrl={previewUrl} />
          <ResultPanel result={result} isAnalyzing={isAnalyzing} />
        </div>
      </main>
    </div>
  );
}

export default App;