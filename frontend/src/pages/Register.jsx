import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { fetchCsrf } from "../lib/api.js";
import PageWrapper from "../ui/PageWrapper.jsx";

export default function Register() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");

  useEffect(() => {
  async function load() {
    await fetchCsrf();
  }
  load();
}, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await fetchCsrf();
      await api.post("/register", form);
      nav("/login");
    } catch (err) {
      setErr("Registration error.");
    }
  };

  return (
    <PageWrapper>
      <h2 className="text-center mb-3">Create Your Account</h2>
      {err && <div className="alert alert-danger py-2">{err}</div>}

      <form onSubmit={submit}>
        <input className="form-control mb-3" placeholder="Name"
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="form-control mb-3" type="email" placeholder="Email"
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="form-control mb-3" type="password" placeholder="Password"
          onChange={(e) => setForm({ ...form, password: e.target.value })} />

        <button className="btn btn-primary w-100">Register</button>
      </form>
    </PageWrapper>
  );
}
