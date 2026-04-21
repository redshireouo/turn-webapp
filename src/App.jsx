import { useEffect, useState } from "react";
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
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("後端錯誤內容：", errorText);
        throw new Error(`後端回傳失敗：${response.status}`);
      }

      const data = await response.json();
      console.log("後端回傳：", data);
      setResult(data);
    } catch (error) {
      console.error("分析失敗：", error);
      alert("分析失敗，請確認 backend 有啟動，或稍等 Render 冷啟動完成");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!result?.announcement) return;

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

        <div className="content-grid">
          <VideoPreview title="原始影片" videoUrl={previewUrl} />
          <ResultPanel result={result} isAnalyzing={isAnalyzing} />
        </div>
      </main>
    </div>
  );
}

export default App;