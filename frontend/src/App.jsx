import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Home from './pages/Home.jsx'
import Post from './pages/Post.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import NewPost from './pages/NewPost.jsx'
import Navbar from './ui/Navbar.jsx'
import Footer from './ui/Footer.jsx'
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import ThreeBG from './ui/ThreeBG.jsx'
import { fetchCsrf } from './lib/api.js'

import "bootstrap/dist/css/bootstrap.min.css"
import "./index.css"

// wrapper to conditionally show the background
function BackgroundWrapper({ children }) {
  const location = useLocation();

  // All pages except home use ThreeBG
  const showBG = location.pathname !== "/";

  return (
    <>
      {showBG && <ThreeBG />}
      <div className="app-content">{children}
        <Footer/>
      </div>

    </>
  );
}

export default function App() {
  useEffect(() => { fetchCsrf() }, []);

  return (
    <BrowserRouter>
      <Navbar />

      <BackgroundWrapper>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/post/:id" element={<Post />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/new-post" element={<NewPost />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </BackgroundWrapper>

      
    </BrowserRouter>
  );
}
