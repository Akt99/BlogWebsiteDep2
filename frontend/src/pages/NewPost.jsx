import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { fetchCsrf } from "../lib/api.js";
import PageWrapper from "../ui/PageWrapper.jsx";

export default function NewPost() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    img_url: "",
    body: ""
  });

  useEffect(() => { fetchCsrf(); }, []);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    await fetchCsrf();
    await api.post("/posts", form);
    nav("/");
  };

  return (
    <PageWrapper>
      <h2 className="text-center mb-3">Create New Post</h2>

      <form onSubmit={submit}>
        <input
          className="form-control mb-3"
          name="title"
          placeholder="Title"
          onChange={onChange}
        />

        <input
          className="form-control mb-3"
          name="subtitle"
          placeholder="Subtitle"
          onChange={onChange}
        />

        <input
          className="form-control mb-3"
          name="img_url"
          placeholder="Image URL (optional)"
          onChange={onChange}
        />

        <textarea
          className="form-control mb-3"
          rows="6"
          name="body"
          placeholder="Body (HTML allowed)"
          onChange={onChange}
        />

        <button className="btn btn-primary w-100">Publish</button>
      </form>
    </PageWrapper>
  );
}
