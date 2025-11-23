import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { fetchCsrf, fetchMe } from "../lib/api.js";
import PageWrapper from "../ui/PageWrapper.jsx";

export default function Post() {
  const { id } = useParams();
  const nav = useNavigate();
  const [post, setPost] = useState(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [me, setMe] = useState(null);

  async function load() {
    await fetchCsrf();
    setMe(await fetchMe());
    const { data } = await api.get(`/posts/${id}`);
    setPost(data);
  }

  useEffect(() => { load(); }, [id]);

  async function addComment(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post(`/posts/${id}/comments`, { text });
      setPost(p => ({ ...p, comments: [...(p.comments || []), res.data] }));
      setText("");
    } catch (err) {
      const s = err.response?.status;
      setError(
        s === 401 ? "Please log in first." :
        s === 400 ? "Enter a comment." :
        "Failed to add comment."
      );
    }
  }

  async function togglePin() {
    try {
      await api.patch(`/posts/${id}/pin`);
      await load();
    } catch {
      alert("Could not update pin.");
    }
  }

  async function delPost() {
    if (!confirm("Delete this post?")) return;
    try {
      await api.delete(`/posts/${id}`);
      nav("/");
    } catch {
      alert("Could not delete the post.");
    }
  }

  async function deleteComment(cid) {
    if (!confirm("Delete this comment?")) return;

    try {
      await api.delete(`/comments/${cid}`);
      setPost(p => ({
        ...p,
        comments: p.comments.filter(c => c.id !== cid)
      }));
    } catch (err) {
      console.error(err);
      alert("Failed to delete comment");
    }
  }

  if (!post) return <PageWrapper>Loading…</PageWrapper>;

  return (
  <PageWrapper>
   <div
  style={{
    width: "min(850px, 95%)",
    height: "80vh",
    margin: "0 auto",
    padding: "0",
    background: "rgba(0,0,0,0.35)",
    backdropFilter: "blur(12px)",
    borderRadius: "18px",
    color: "white",
    boxShadow: "0 8px 25px rgba(0,0,0,0.4)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  }}
>
  {/* HEADER (always visible) */}
  <div
    style={{
      padding: "1.5rem",
      borderBottom: "1px solid rgba(255,255,255,0.12)",
      textAlign: "center"
    }}
  >
    <h2 className="fw-bold" style={{ fontSize: "2rem", marginBottom: "0.3rem" }}>
      {post.pinned && <span className="me-2">📌</span>}
      {post.title}
    </h2>
    <p style={{ opacity: 0.8, margin: 0 }}>
      {post.subtitle} — {post.date}
    </p>
  </div>

  {/* SCROLLABLE CONTENT */}
  <div
    style={{
      flex: 1,
      overflowY: "auto",
      padding: "1.5rem 1.8rem"
    }}
  >
    {/* ADMIN BUTTONS */}
    {me?.is_admin && (
      <div className="d-flex justify-content-center gap-2 mb-4">
        <button className="btn btn-outline-light btn-sm" onClick={togglePin}>
          {post.pinned ? "Unpin" : "Pin"}
        </button>
        <button className="btn btn-outline-danger btn-sm" onClick={delPost}>
          Delete
        </button>
      </div>
    )}

    {post.img_url && (
      <img
        src={post.img_url}
        className="img-fluid rounded mb-4"
        style={{
          width: "100%",
          borderRadius: "12px",
          objectFit: "cover"
        }}
      />
    )}

    <div
      className="mb-4"
      style={{ color: "white" }}
      dangerouslySetInnerHTML={{ __html: post.body }}
    />

    <h4 className="mt-4 mb-3">Comments</h4>

    {post.comments?.length ? (
      <div className="list-group mb-4">
        {post.comments.map((c) => (
          <div
            className="list-group-item d-flex align-items-start gap-3"
            key={c.id}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "white"
            }}
          >
            <img
              src={c.avatar || "https://www.gravatar.com/avatar/?d=retro&s=40"}
              alt="avatar"
              width="40"
              height="40"
              className="rounded-circle flex-shrink-0"
            />

            <div className="flex-grow-1">
              <div className="fw-semibold">{c.author_name || "Anonymous"}</div>
              <div>{c.text}</div>
            </div>

            {(me?.is_admin || me?.id === post.author_id) && (
              <button
                className="btn btn-sm btn-danger"
                onClick={() => deleteComment(c.id)}
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
    ) : (
      <div className="text-muted mb-4">No comments yet.</div>
    )}

    <form onSubmit={addComment}>
      <textarea
        className="form-control mb-2"
        rows="3"
        placeholder="Write a comment…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {error && <div className="text-danger small mb-2">{error}</div>}
      <button className="btn btn-success mt-2">Post Comment</button>
    </form>
  </div>
</div>
  </PageWrapper>
);
}