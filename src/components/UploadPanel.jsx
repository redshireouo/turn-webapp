function UploadPanel({ selectedFile, onFileChange, onAnalyze, isAnalyzing }) {
  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    onFileChange(file);
  };

  return (
    <section className="panel upload-panel">
      <h2>1. 上傳影片</h2>

      <input type="file" accept="video/*" onChange={handleInputChange} />

      {selectedFile && (
        <p className="file-name">已選擇：{selectedFile.name}</p>
      )}

      <button
        className="analyze-btn"
        onClick={onAnalyze}
        disabled={!selectedFile || isAnalyzing}
      >
        {isAnalyzing ? "分析中..." : "開始分析"}
      </button>
    </section>
  );
}

export default UploadPanel;