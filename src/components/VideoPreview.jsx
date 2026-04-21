function VideoPreview({ title, videoUrl }) {
  return (
    <section className="panel">
      <h2>{title}</h2>

      {videoUrl ? (
        <video className="video-box" controls src={videoUrl} />
      ) : (
        <div className="empty-box">尚未上傳影片</div>
      )}
    </section>
  );
}

export default VideoPreview;