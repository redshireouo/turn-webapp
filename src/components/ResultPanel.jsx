function ResultPanel({ result, isAnalyzing }) {
  return (
    <section className="panel">
      <h2>2. 分析結果</h2>

      {isAnalyzing && (
        <div className="empty-box">
          <div>
            <p>影片分析中，請稍候...</p>
            <p style={{ fontSize: "14px", color: "#666" }}>
              影片越長，分析時間越久
            </p>
          </div>
        </div>
      )}

      {!isAnalyzing && !result && (
        <div className="empty-box">尚未開始分析</div>
      )}

      {!isAnalyzing && result && (
        <>
          {result.output_video_url ? (
            <video
              key={result.output_video_url}
              className="video-box"
              controls
              autoPlay
              muted
            >
              <source src={result.output_video_url} type="video/mp4" />
              您的瀏覽器不支援影片播放
            </video>
          ) : (
            <div className="empty-box">沒有可顯示的結果影片</div>
          )}

          <div className="result-card result-alert">
            <h3>播報結果</h3>
            <p className="announcement">
              {result.announcement || "未偵測到待轉相關目標"}
            </p>
          </div>

          <div className="result-card">
            <h3>辨識摘要</h3>
            <ul>
              <li>是否偵測到待轉牌 sign：{result.has_sign ? "是" : "否"}</li>
              <li>是否偵測到待轉格 square：{result.has_square ? "是" : "否"}</li>
              <li>偵測結果筆數：{result.detections?.length || 0}</li>
            </ul>
          </div>

          <div className="result-card">
            <h3>偵測時間點 / 結果</h3>
            {result.detections?.length > 0 ? (
              <ul>
                {result.detections.map((item, index) => (
                  <li key={index}>
                    frame {item.frame}｜{item.class}｜confidence: {item.confidence}
                  </li>
                ))}
              </ul>
            ) : (
              <p>沒有偵測到目標</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default ResultPanel;