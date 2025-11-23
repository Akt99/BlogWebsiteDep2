import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { fetchCsrf, notifyAuthChanged } from "../lib/api.js";
import PageWrapper from "../ui/PageWrapper.jsx";

export default function Login() {
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");

  useEffect(() =>{
    async function load(){
      await fetchCsrf();
    }
    load();
  },[]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await fetchCsrf();
      await api.post("/login", form);
      notifyAuthChanged();
      nav("/");
    } catch {
      setErr("Login failed.");
    }
  };

  return (
    <PageWrapper>
      <h2 className="text-center mb-3">Welcome Back</h2>
      {err && <div className="alert alert-danger py-2">{err}</div>}

      <form onSubmit={submit}>
        <input className="form-control mb-3" type="email" placeholder="Email Address"
          onChange={(e) => setForm({ ...form, email: e.target.value })} />

        <input className="form-control mb-3" type="password" placeholder="Password"
          onChange={(e) => setForm({ ...form, password: e.target.value })} />

        <button className="btn btn-primary w-100 mb-3">Log In</button>

        <div className="text-center small">
          Don't have an account? <a href="/register">Register</a>
        </div>
      </form>
    </PageWrapper>
  );
}
