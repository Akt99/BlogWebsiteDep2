import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api, { fetchCsrf, fetchMe, onAuthChange, notifyAuthChanged } from "../lib/api.js";

export default function Navbar() {
  const {me, setMe, logout} = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      await fetchCsrf();           // ensure CSRF cookie exists
      const data = await fetchMe(); // { authenticated, name, email, is_admin }
      if (mounted) setMe(data);
    })();

    const off = onAuthChange(async () => {
      const data = await fetchMe();
      setMe(data);
    });
    return () => { mounted = false; off();};
  }, [setMe]);

  const linkCls = (path) =>
    "nav-link navLink" + (location.pathname === path ? " active" : "");

  async function onLogout(e) {
    e.preventDefault();
    try{ await logout();

     }
    finally{
    navigate("/");
  }}

  return (
    <>
      {/* Admin info bar */}
      {me?.authenticated && me?.is_admin && (
        <div className="py-1 text-bg-dark">
          <div className="container d-flex gap-4 small ">
            <div>
              Admin: <span className="fw-semibold">{me.name}</span>
            </div>
            <div>
              Admin email: <span className="fw-semibold"><strong>{me.email}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Main navbar */}
      <nav className="navbar navbar-expand bg-light navbar-light border-bottom mb-3">
        <div className="container">
          <Link className="navbar-brand fw-bold" to="/">Blog</Link>

          <div className="navbar-nav me-auto">
            <Link className={linkCls("/")} to="/">Home</Link>
            <Link className={linkCls("/about")} to="/about">About</Link>
            <Link className={linkCls("/contact")} to="/contact">Contact</Link>
          </div>

          <div className="navbar-nav ms-auto">
            {/* Show New Post only for admin */}
            {me?.authenticated  && (
              <Link className={linkCls("/new-post")} to="/new-post">New Post</Link>
            )}

            {!me?.authenticated ? (
              <>
                <Link className={linkCls("/login")} to="/login">Login</Link>
                <Link className={linkCls("/register")} to="/register">Register</Link>
              </>
            ) : (
              <a href="#" className="nav-link navlink" onClick={onLogout}>Logout</a>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
