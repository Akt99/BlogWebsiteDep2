import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { fetchAdminInfo } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [admin, setAdmin] = useState(null);
  const { me } = useAuth();
  const navigate = useNavigate();

  async function loadPosts() {
    const { data } = await api.get("/posts");
    setPosts(data);
  }

  // Load posts once
  useEffect(() => { loadPosts(); }, []);

  // Fetch admin contact (with env fallback) once
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const info = await fetchAdminInfo();
        const fallback = {
          name: import.meta.env.VITE_ADMIN_NAME,
          email: import.meta.env.VITE_ADMIN_EMAIL,
        };
        const out =
          info && (info.name || info.email)
            ? { name: info.name, email: info.email }
            : (fallback.name || fallback.email) ? fallback : null;
        if (alive) setAdmin(out);
      } catch {
        // ignore; leave admin null
      }
    })();
    return () => { alive = false; };
  }, []);

  async function togglePin(id) {
    await api.patch(`/posts/${id}/pin`,{});
    loadPosts();
  }
  async function delPost(id) {
    if (confirm("Delete this post?")) {
      try {
        await api.delete(`/posts/${id}`);
        loadPosts();
      } catch (e) {
        console.error(e);
        alert("Failed to delete post.");
      }
    }
  }

  const heroImage =
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop";

  return (
    <>
      {/* Hero header */}
      <section className="page-hero mb-4">
        <img src={heroImage} alt="Hero" className="hero-image" />
        <div className="hero-overlay">
          <div className="content text-center text-white">
            <p className="text-uppercase mb-1" style={{ letterSpacing: ".12em", opacity: .9 }}>Akt's Blog</p>
            <h1 className="display-5 fw-bold mb-1">Ideas and scribbles</h1>
            <p className="mb-0" style={{ opacity: .95 }}>I haven’t been everywhere, but it’s on my list</p>
          </div>
        </div>
      </section>

      {/* CTA + identities */}
      <div className="container">
        <div className="cta-wrap mb-3 d-flex justify-content-center align-items-center gap-3 flex-wrap">
          <button
            className="btn btn-cta"
            disabled={!me?.authenticated}
            title={me?.authenticated ? "Create a new post" : "Log in to write a post"}
            onClick={() => navigate("/new-post")}
          >
            <span className="me-2">＋</span> New Post
          </button>

          {me?.authenticated && (
            <div className="text-muted small">
              Signed in as <strong>{me.name}</strong> ({me.email})
              {me.is_admin ? " — Admin" : ""}
            </div>
          )}

          {(admin?.name || admin?.email) && (
            <div className="text-muted small">
              <span className="mx-2">•</span>
              Admin: <strong>{admin?.name || "—"}</strong>
              {admin?.email ? ` (${admin.email})` : ""}
            </div>
          )}
        </div>
      </div>

      <div className="container py-2">
        <div className="d-flex flex-column gap-3">
          {posts.map(p => (
            <div key={p.id} className="card-post p-3">
              <div className="d-flex align-items-center">
                <img src={p.img_url} alt="" className="post-thumb me-3 d-none d-sm-block" loading="lazy" />
                <div className="flex-grow-1">
                  <h3 className="h5 mb-1">
                    {p.pinned && <span className="me-2" title="Pinned">📌</span>}
                    <Link to={`/post/${p.id}`} className="link-clean">{p.title}</Link>
                  </h3>
                  <div className="text-muted small">{p.subtitle} — {p.date}</div>
                </div>
                {me?.is_admin && (
                  <div className="btn-group ms-3">
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => togglePin(p.id)}>
                      {p.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => delPost(p.id)}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {posts.length === 0 && <div className="text-muted">No posts yet.</div>}
        </div>
      </div>
    </>
  );
}
